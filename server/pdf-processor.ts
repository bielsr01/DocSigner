import { PDFDocument, PDFForm, PDFTextField, rgb } from 'pdf-lib';
import fs from 'fs';
import path from 'path';
import mammoth from 'mammoth';

export interface PDFVariable {
  name: string;
  type: 'text' | 'date' | 'number';
  placeholder: string;
}

export interface DocumentData {
  [key: string]: string | number | Date;
}

export class PDFProcessor {
  /**
   * Extract variables from template by scanning for {{variable}} patterns
   * Supports both PDF and Word documents (.docx)
   */
  static async extractVariables(filePath: string): Promise<PDFVariable[]> {
    try {
      const variables: PDFVariable[] = [];
      const foundVariables = new Set<string>();
      const extension = path.extname(filePath).toLowerCase();

      if (extension === '.pdf') {
        // Handle PDF files
        const pdfBytes = fs.readFileSync(filePath);
        const pdfDoc = await PDFDocument.load(pdfBytes);

        // Get form fields if they exist
        const form = pdfDoc.getForm();
        const fields = form.getFields();
        
        for (const field of fields) {
          const fieldName = field.getName();
          // Check if field name follows {{variable}} pattern
          const match = fieldName.match(/^{{(.+)}}$/);
          if (match) {
            const varName = match[1].trim();
            if (!foundVariables.has(varName)) {
              foundVariables.add(varName);
              variables.push({
                name: varName,
                type: this.guessVariableType(varName),
                placeholder: `{{${varName}}}`
              });
            }
          }
        }
      } else if (extension === '.docx') {
        // Handle Word documents
        const result = await mammoth.extractRawText({ path: filePath });
        const text = result.value;
        
        // Find all {{variable}} patterns in the text
        const variableMatches = text.match(/{{[^}]+}}/g);
        
        if (variableMatches) {
          for (const match of variableMatches) {
            const varName = match.replace(/[{}]/g, '').trim();
            if (!foundVariables.has(varName)) {
              foundVariables.add(varName);
              variables.push({
                name: varName,
                type: this.guessVariableType(varName),
                placeholder: `{{${varName}}}`
              });
            }
          }
        }
      }

      // If no variables found, add common variables as examples
      if (variables.length === 0) {
        variables.push(
          { name: 'nome', type: 'text', placeholder: '{{nome}}' },
          { name: 'data', type: 'date', placeholder: '{{data}}' },
          { name: 'documento', type: 'text', placeholder: '{{documento}}' },
          { name: 'valor', type: 'number', placeholder: '{{valor}}' }
        );
      }

      return variables;
    } catch (error) {
      console.error('Error extracting variables from template:', error);
      throw new Error('Failed to extract variables from template');
    }
  }

  /**
   * Generate document from template by replacing variables
   */
  static async generateDocument(
    templatePath: string,
    data: DocumentData,
    outputPath: string
  ): Promise<void> {
    try {
      console.log('Generating document from template:', templatePath);
      console.log('Variables data:', data);
      
      const extension = path.extname(templatePath).toLowerCase();
      
      if (extension === '.docx') {
        return await this.generateFromDocx(templatePath, data, outputPath);
      } else if (extension === '.pdf') {
        return await this.generateFromPdf(templatePath, data, outputPath);
      } else {
        throw new Error(`Unsupported template format: ${extension}`);
      }
    } catch (error) {
      console.error('Error generating document:', error);
      throw error; // Re-throw to preserve original error
    }
  }

  /**
   * Generate PDF from PDF template
   */
  private static async generateFromPdf(
    templatePath: string,
    data: DocumentData,
    outputPath: string
  ): Promise<void> {
    try {
      const templateBytes = fs.readFileSync(templatePath);
      const pdfDoc = await PDFDocument.load(templateBytes);
      
      // Try to fill form fields first
      const form = pdfDoc.getForm();
      const fields = form.getFields();
      
      for (const field of fields) {
        const fieldName = field.getName();
        const match = fieldName.match(/^{{(.+)}}$/);
        
        if (match) {
          const varName = match[1].trim();
          if (data[varName] !== undefined) {
            if (field instanceof PDFTextField) {
              const value = this.formatValue(data[varName], this.guessVariableType(varName));
              field.setText(value);
            }
          }
        }
      }

      // If no form fields, create a new approach by drawing text
      if (fields.length === 0) {
        // This is a simplified approach - in production you'd want more sophisticated text replacement
        const pages = pdfDoc.getPages();
        const firstPage = pages[0];
        
        // Add text at predefined positions (this is just an example)
        if (data['nome']) {
          firstPage.drawText(`Nome: ${data['nome']}`, {
            x: 50,
            y: 750,
            size: 12,
            color: rgb(0, 0, 0),
          });
        }
        
        if (data['data']) {
          firstPage.drawText(`Data: ${this.formatValue(data['data'], 'date')}`, {
            x: 50,
            y: 720,
            size: 12,
            color: rgb(0, 0, 0),
          });
        }
      }

      // Flatten form to prevent further editing
      if (fields.length > 0) {
        form.flatten();
      }

      // Save the generated document
      const pdfBytes = await pdfDoc.save();
      fs.writeFileSync(outputPath, pdfBytes);
      
    } catch (error) {
      console.error('Error generating PDF from PDF template:', error);
      throw error;
    }
  }

  /**
   * Generate PDF from DOCX template
   */
  private static async generateFromDocx(
    templatePath: string,
    data: DocumentData,
    outputPath: string
  ): Promise<void> {
    try {
      const mammoth = require('mammoth');
      
      // Read DOCX and convert to HTML
      const result = await mammoth.convertToHtml({ path: templatePath });
      let html = result.value;
      
      // Replace variables in HTML
      for (const [key, value] of Object.entries(data)) {
        const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
        html = html.replace(regex, String(value));
      }
      
      // For now, create a simple PDF with the replaced content
      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage([612, 792]); // Letter size
      
      // Extract text from HTML (simplified)
      const textContent = html.replace(/<[^>]*>/g, ' ').replace(/\\s+/g, ' ').trim();
      
      // Add text to PDF (word wrap would be needed for production)
      const lines = this.wrapText(textContent, 80);
      let yPosition = 750;
      
      for (const line of lines) {
        if (yPosition < 50) {
          // Add new page if content is too long
          const newPage = pdfDoc.addPage([612, 792]);
          yPosition = 750;
          newPage.drawText(line, {
            x: 50,
            y: yPosition,
            size: 12,
            color: rgb(0, 0, 0),
          });
        } else {
          page.drawText(line, {
            x: 50,
            y: yPosition,
            size: 12,
            color: rgb(0, 0, 0),
          });
        }
        yPosition -= 20;
      }
      
      // Save the generated PDF
      const pdfBytes = await pdfDoc.save();
      fs.writeFileSync(outputPath, pdfBytes);
      console.log('Successfully generated PDF from DOCX template');
      
    } catch (error) {
      console.error('Error generating PDF from DOCX template:', error);
      throw error;
    }
  }

  /**
   * Simple text wrapping utility
   */
  private static wrapText(text: string, maxLength: number): string[] {
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';
    
    for (const word of words) {
      if ((currentLine + word).length <= maxLength) {
        currentLine += (currentLine ? ' ' : '') + word;
      } else {
        if (currentLine) lines.push(currentLine);
        currentLine = word;
      }
    }
    if (currentLine) lines.push(currentLine);
    
    return lines.slice(0, 30); // Limit to 30 lines for safety
  }

  /**
   * Create a test template with variables
   */
  static async createTestTemplate(outputPath: string): Promise<void> {
    try {
      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage([600, 800]);
      
      // Create form with fields for variables
      const form = pdfDoc.getForm();
      
      // Add title
      page.drawText('CONTRATO DE PRESTAÇÃO DE SERVIÇOS', {
        x: 150,
        y: 750,
        size: 16,
        color: rgb(0, 0, 0),
      });
      
      // Add form fields for variables
      const nomeField = form.createTextField('{{nome}}');
      nomeField.setText('{{nome}}');
      nomeField.addToPage(page, { x: 50, y: 650, width: 200, height: 25 });
      
      const dataField = form.createTextField('{{data}}');
      dataField.setText('{{data}}');
      dataField.addToPage(page, { x: 300, y: 650, width: 200, height: 25 });
      
      // Add some static text
      page.drawText('Nome do contratado:', {
        x: 50,
        y: 680,
        size: 12,
        color: rgb(0, 0, 0),
      });
      
      page.drawText('Data do contrato:', {
        x: 300,
        y: 680,
        size: 12,
        color: rgb(0, 0, 0),
      });
      
      // Save
      const pdfBytes = await pdfDoc.save();
      fs.writeFileSync(outputPath, pdfBytes);
      
    } catch (error) {
      console.error('Error creating test template:', error);
      throw error;
    }
  }

  /**
   * Guess variable type based on name patterns
   */
  private static guessVariableType(varName: string): string {
    const name = varName.toLowerCase();
    if (name.includes('data') || name.includes('date') || name.includes('prazo') || name.includes('vencimento')) {
      return 'date';
    } else if (name.includes('valor') || name.includes('preco') || name.includes('custo') || name.includes('total')) {
      return 'number';
    } else if (name.includes('email')) {
      return 'email';
    } else {
      return 'text';
    }
  }

  /**
   * Format value according to type
   */
  private static formatValue(value: any, type: string): string {
    switch (type) {
      case 'date':
        if (value instanceof Date) {
          return value.toLocaleDateString('pt-BR');
        } else if (typeof value === 'string' && value.match(/^\d{4}-\d{2}-\d{2}/)) {
          return new Date(value).toLocaleDateString('pt-BR');
        } else {
          return String(value);
        }
      case 'number':
        return typeof value === 'number' ? value.toLocaleString('pt-BR') : String(value);
      default:
        return String(value);
    }
  }
}