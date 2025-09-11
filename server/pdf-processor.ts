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
      const libre = await import('libreoffice-convert');
      
      console.log('Processing DOCX template with libreoffice-convert:', templatePath);
      console.log('Template data:', data);
      
      // Read the original DOCX file
      const docxBuffer = fs.readFileSync(templatePath);
      
      // Create a temporary file to process with replaced variables
      const tempDir = path.dirname(outputPath);
      const tempDocxPath = path.join(tempDir, `temp_${Date.now()}_${path.basename(templatePath)}`);
      
      try {
        // First, extract the DOCX content and replace variables
        const JSZip = await import('jszip');
        const zip = await JSZip.default.loadAsync(docxBuffer);
        
        // Find and process document.xml (main content)
        const docXml = await zip.file('word/document.xml')?.async('text');
        if (docXml) {
          let processedXml = docXml;
          
          // Replace variables in the XML content
          for (const [key, value] of Object.entries(data)) {
            const formattedValue = this.formatValue(value, this.guessVariableType(key));
            // Handle various possible XML encodings of the template variables
            const patterns = [
              new RegExp(`{{\\s*${key}\\s*}}`, 'g'),
              new RegExp(`&#x7B;&#x7B;\\s*${key}\\s*&#x7D;&#x7D;`, 'g'),
              new RegExp(`&lt;t&gt;{{${key}}}&lt;/t&gt;`, 'g')
            ];
            
            for (const pattern of patterns) {
              processedXml = processedXml.replace(pattern, String(formattedValue));
            }
          }
          
          // Update the zip with processed content
          zip.file('word/document.xml', processedXml);
        }
        
        // Generate the modified DOCX
        const modifiedDocxBuffer = await zip.generateAsync({ type: 'nodebuffer' });
        fs.writeFileSync(tempDocxPath, modifiedDocxBuffer);
        
        console.log('Variables replaced in DOCX, converting to PDF...');
        
        // Convert the processed DOCX to PDF using libreoffice-convert
        const pdfBuffer = await libre.default.convert(modifiedDocxBuffer, '.pdf', undefined);
        
        // Write the PDF to the output path
        fs.writeFileSync(outputPath, pdfBuffer);
        console.log('Successfully generated PDF from DOCX template with libreoffice-convert');
        
      } finally {
        // Clean up temporary file
        if (fs.existsSync(tempDocxPath)) {
          fs.unlinkSync(tempDocxPath);
        }
      }
      
    } catch (error) {
      console.error('Error generating PDF from DOCX template:', error);
      
      // Fallback: try direct conversion without variable replacement
      try {
        console.log('Attempting fallback: direct DOCX to PDF conversion...');
        const libre = await import('libreoffice-convert');
        const docxBuffer = fs.readFileSync(templatePath);
        const pdfBuffer = await libre.default.convert(docxBuffer, '.pdf', undefined);
        fs.writeFileSync(outputPath, pdfBuffer);
        console.log('Fallback conversion successful');
      } catch (fallbackError) {
        console.error('Fallback conversion also failed:', fallbackError);
        throw new Error(`DOCX to PDF conversion failed: ${error.message}`);
      }
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