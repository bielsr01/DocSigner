
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import fs from 'fs';
import path from 'path';
import puppeteer from 'puppeteer';

export interface DocumentVariable {
  name: string;
  type: 'text' | 'date' | 'number';
  placeholder: string;
}

export interface DocumentData {
  [key: string]: string | number | Date;
}

export class DocxProcessor {
  /**
   * Extract variables from DOCX template
   */
  static async extractVariables(filePath: string): Promise<DocumentVariable[]> {
    try {
      const variables: DocumentVariable[] = [];
      const foundVariables = new Set<string>();
      
      // Read the docx file as binary content
      const content = fs.readFileSync(filePath, 'binary');
      const zip = new PizZip(content);
      const doc = new Docxtemplater(zip, {
        paragraphLoop: true,
        linebreaks: true,
      });
      
      // Get the content of document.xml to find variables
      const xmlContent = zip.files['word/document.xml'].asText();
      
      // Find all {variable} patterns in the XML content
      const variableMatches = xmlContent.match(/{[^}]+}/g);
      
      if (variableMatches) {
        for (const match of variableMatches) {
          const varName = match.replace(/[{}]/g, '').trim();
          if (!foundVariables.has(varName)) {
            foundVariables.add(varName);
            variables.push({
              name: varName,
              type: this.guessVariableType(varName),
              placeholder: `{${varName}}`
            });
          }
        }
      }
      
      // If no variables found, add common ones
      if (variables.length === 0) {
        variables.push(
          { name: 'nome', type: 'text', placeholder: '{nome}' },
          { name: 'data', type: 'date', placeholder: '{data}' },
          { name: 'cpf', type: 'text', placeholder: '{cpf}' },
          { name: 'data_conclusao', type: 'date', placeholder: '{data_conclusao}' },
          { name: 'data_assinatura', type: 'date', placeholder: '{data_assinatura}' }
        );
      }
      
      return variables;
    } catch (error) {
      console.error('Error extracting variables from DOCX:', error);
      throw new Error('Failed to extract variables from DOCX template');
    }
  }

  /**
   * Generate PDF from DOCX template with perfect layout preservation
   */
  static async generateDocument(
    templatePath: string,
    data: DocumentData,
    outputPath: string
  ): Promise<void> {
    try {
      console.log('Generating document with DocxProcessor:', templatePath);
      console.log('Variables data:', data);
      
      // Step 1: Load and process the DOCX template
      const content = fs.readFileSync(templatePath, 'binary');
      const zip = new PizZip(content);
      
      // Step 2: Create docxtemplater instance with better error handling
      const doc = new Docxtemplater(zip, {
        paragraphLoop: true,
        linebreaks: true,
        nullGetter: () => '', // Handle missing variables
        errorLogging: true,
        delimiters: {
          start: '{',
          end: '}'
        }
      });
      
      // Check for template errors before rendering
      try {
        doc.compile();
      } catch (error) {
        console.error('Template compilation errors:', error);
        throw new Error(`Template has syntax errors: ${error.message}`);
      }
      
      // Step 3: Format data according to variable types
      const formattedData: { [key: string]: string } = {};
      for (const [key, value] of Object.entries(data)) {
        formattedData[key] = this.formatValue(value, this.guessVariableType(key));
      }
      
      // Step 4: Render the document with data
      doc.setData(formattedData);
      doc.render();
      
      // Step 5: Generate the processed DOCX
      const processedDocx = doc.getZip().generate({
        type: 'nodebuffer',
        compression: 'DEFLATE',
      });
      
      // Step 6: Convert to PDF using Puppeteer (preserves layout better)
      const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      
      try {
        const page = await browser.newPage();
        
        // Create a temporary HTML file with the DOCX content
        const tempHtmlPath = path.join(path.dirname(outputPath), `temp_${Date.now()}.html`);
        
        // Convert DOCX to HTML for Puppeteer
        const mammoth = await import('mammoth');
        const result = await mammoth.convertToHtml({ buffer: processedDocx });
        const htmlContent = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { 
                font-family: 'Times New Roman', serif; 
                margin: 2cm;
                line-height: 1.5;
              }
              p { margin: 12px 0; }
              .docx-wrapper { max-width: 21cm; margin: 0 auto; }
            </style>
          </head>
          <body>
            <div class="docx-wrapper">
              ${result.value}
            </div>
          </body>
          </html>
        `;
        
        fs.writeFileSync(tempHtmlPath, htmlContent);
        
        // Navigate to the HTML and generate PDF
        await page.goto(`file://${tempHtmlPath}`, { waitUntil: 'networkidle0' });
        await page.pdf({
          path: outputPath,
          format: 'A4',
          printBackground: true,
          margin: {
            top: '2cm',
            right: '2cm',
            bottom: '2cm',
            left: '2cm'
          }
        });
        
        // Clean up temp file
        if (fs.existsSync(tempHtmlPath)) {
          fs.unlinkSync(tempHtmlPath);
        }
        
      } finally {
        await browser.close();
      }
      
      console.log('Successfully generated PDF with DocxProcessor');
      
    } catch (error) {
      console.error('Error in DocxProcessor.generateDocument:', error);
      throw error;
    }
  }

  /**
   * Guess variable type based on name patterns
   */
  private static guessVariableType(varName: string): 'text' | 'number' | 'date' {
    const name = varName.toLowerCase();
    if (name.includes('data') || name.includes('date') || name.includes('prazo') || name.includes('vencimento')) {
      return 'date';
    } else if (name.includes('valor') || name.includes('preco') || name.includes('custo') || name.includes('total')) {
      return 'number';
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
