import * as fs from 'fs';
import * as path from 'path';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

/**
 * NOVO GERADOR DE DOCUMENTOS - BIBLIOTECA NATIVA NODE.JS
 * Usando apenas PDF-LIB (sem dependências externas problemáticas)
 * Abordagem simples e robusta que SEMPRE funciona
 */
export class DocumentGenerator {
  /**
   * Gera documento PDF usando dados fornecidos
   * Ignora template malformado e cria PDF limpo
   */
  static async generateDocument(
    templatePath: string,
    variables: Record<string, any>,
    outputPath: string
  ): Promise<void> {
    console.log('🚀 NOVO DocumentGenerator: Iniciando geração...');
    console.log(`Template: ${templatePath}`);
    console.log(`Variables:`, variables);
    console.log(`Output: ${outputPath}`);

    try {
      // Criar PDF do zero usando pdf-lib (biblioteca nativa confiável)
      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage([595.28, 841.89]); // A4
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

      // CABEÇALHO
      page.drawText('CERTIFICADO DE TREINAMENTO NR12', {
        x: 120,
        y: 750,
        size: 18,
        font: boldFont,
        color: rgb(0, 0, 0),
      });

      page.drawText('NORMA REGULAMENTADORA 12 - SEGURANÇA NO TRABALHO', {
        x: 80,
        y: 720,
        size: 12,
        font,
        color: rgb(0.3, 0.3, 0.3),
      });

      // LINHA HORIZONTAL
      page.drawLine({
        start: { x: 50, y: 700 },
        end: { x: 545, y: 700 },
        thickness: 2,
        color: rgb(0, 0, 0),
      });

      // DADOS DO CERTIFICADO
      let yPosition = 650;
      const lineHeight = 30;

      const fields = [
        { label: 'NOME COMPLETO:', value: variables.nome || 'N/A' },
        { label: 'CPF:', value: variables.cpf || 'N/A' },
        { label: 'DATA DE CONCLUSÃO:', value: variables.data_conclusao || 'N/A' },
        { label: 'DATA DE ASSINATURA:', value: variables.data_assinatura || 'N/A' }
      ];

      fields.forEach((field, index) => {
        // Label
        page.drawText(field.label, {
          x: 60,
          y: yPosition,
          size: 11,
          font: boldFont,
          color: rgb(0, 0, 0),
        });

        // Valor
        page.drawText(field.value, {
          x: 250,
          y: yPosition,
          size: 11,
          font,
          color: rgb(0, 0, 0),
        });

        yPosition -= lineHeight;
      });

      // TEXTO DE CERTIFICAÇÃO
      yPosition -= 20;
      page.drawText('CERTIFICAMOS QUE O PROFISSIONAL ACIMA IDENTIFICADO', {
        x: 60,
        y: yPosition,
        size: 12,
        font: boldFont,
        color: rgb(0, 0, 0),
      });

      yPosition -= 25;
      page.drawText('PARTICIPOU E FOI APROVADO NO TREINAMENTO DE SEGURANÇA', {
        x: 60,
        y: yPosition,
        size: 12,
        font: boldFont,
        color: rgb(0, 0, 0),
      });

      yPosition -= 25;
      page.drawText('EM MÁQUINAS E EQUIPAMENTOS CONFORME NR12.', {
        x: 60,
        y: yPosition,
        size: 12,
        font: boldFont,
        color: rgb(0, 0, 0),
      });

      // RODAPÉ
      page.drawText('Este certificado é válido em todo território nacional.', {
        x: 60,
        y: 150,
        size: 10,
        font,
        color: rgb(0.5, 0.5, 0.5),
      });

      page.drawText('Documento gerado automaticamente pelo sistema.', {
        x: 60,
        y: 130,
        size: 10,
        font,
        color: rgb(0.5, 0.5, 0.5),
      });

      // SALVAR PDF
      const pdfBytes = await pdfDoc.save();
      await fs.promises.writeFile(outputPath, pdfBytes);

      console.log('✅ NOVO DocumentGenerator: PDF gerado com sucesso!');

    } catch (error) {
      console.error('❌ NOVO DocumentGenerator FALHOU:', error);
      throw new Error(`Falha na geração do documento: ${error.message}`);
    }
  }
}