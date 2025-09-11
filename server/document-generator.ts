import * as fs from 'fs';
import * as path from 'path';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import * as libreoffice from 'libreoffice-convert';
import { promisify } from 'util';

/**
 * GERADOR DE DOCUMENTOS - VERSÃO CORRIGIDA
 * Usa template DOCX real com substituição de variáveis
 * Preserva layout original do template
 * Fallback para pdf-lib se processamento DOCX falhar
 */
export class DocumentGenerator {
  /**
   * Promisified libreoffice converter (more reliable than docx-pdf)
   */
  private static libreofficeConvert = promisify(libreoffice.convert);

  /**
   * Gera documento PDF usando template DOCX real
   * Substitui variáveis {{nome}}, {{cpf}}, etc. preservando layout
   */
  static async generateDocument(
    templatePath: string,
    variables: Record<string, any>,
    outputPath: string
  ): Promise<void> {
    console.log('🚀 DocumentGenerator: Iniciando geração com template DOCX...');
    console.log(`Template: ${templatePath}`);
    console.log(`Variables:`, JSON.stringify(variables, null, 2));
    console.log(`Output: ${outputPath}`);

    try {
      // TENTATIVA 1: Processar template DOCX com substituição de variáveis
      await this.processDocxTemplate(templatePath, variables, outputPath);
      console.log('✅ DocumentGenerator: PDF gerado com sucesso usando template DOCX!');

    } catch (docxError: any) {
      console.warn('⚠️ Processamento DOCX falhou, tentando fallback...', docxError.message);
      
      try {
        // FALLBACK: Usar pdf-lib como último recurso
        await this.fallbackToPdfLib(variables, outputPath);
        console.log('✅ DocumentGenerator: PDF gerado com sucesso usando fallback pdf-lib!');
        
      } catch (fallbackError: any) {
        console.error('❌ Todos os métodos de geração falharam:', {
          docxError: docxError.message,
          fallbackError: fallbackError.message
        });
        throw new Error(`Falha completa na geração do documento: DOCX(${docxError.message}) + Fallback(${fallbackError.message})`);
      }
    }
  }

  /**
   * Processa template DOCX com substituição de variáveis
   */
  private static async processDocxTemplate(
    templatePath: string,
    variables: Record<string, any>,
    outputPath: string
  ): Promise<void> {
    console.log('📄 Processando template DOCX...');

    // Verificar se template existe
    if (!fs.existsSync(templatePath)) {
      throw new Error(`Template não encontrado: ${templatePath}`);
    }

    // Carregar template DOCX
    const templateBuffer = fs.readFileSync(templatePath);
    console.log(`📁 Template carregado: ${templateBuffer.length} bytes`);

    // Criar PizZip do template
    const zip = new PizZip(templateBuffer);

    // Configurar Docxtemplater com configuração tolerante
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
      delimiters: { start: '{{', end: '}}' },
      nullGetter: () => ''
    });

    // Substituir variáveis no template
    console.log('🔄 Substituindo variáveis no template...');
    doc.render(variables);

    // Gerar buffer do DOCX processado
    const processedDocxBuffer = doc.getZip().generate({ 
      type: 'nodebuffer',
      compression: 'DEFLATE'
    });

    // Criar arquivo DOCX temporário
    const tempDir = path.join(__dirname, '..', 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const tempDocxPath = path.join(tempDir, `temp_${Date.now()}.docx`);
    fs.writeFileSync(tempDocxPath, processedDocxBuffer);
    console.log(`💾 DOCX temporário salvo: ${tempDocxPath}`);

    try {
      // Converter DOCX para PDF usando LibreOffice (mais confiável)
      console.log('🔄 Convertendo DOCX para PDF usando LibreOffice...');
      
      const pdfBuffer = await this.libreofficeConvert(processedDocxBuffer, '.pdf', undefined);
      fs.writeFileSync(outputPath, pdfBuffer);
      
      console.log(`✅ PDF gerado: ${outputPath}`);

    } finally {
      // Limpar arquivo temporário
      try {
        fs.unlinkSync(tempDocxPath);
        console.log('🧹 Arquivo temporário removido');
      } catch (cleanupError) {
        console.warn('⚠️ Falha ao remover arquivo temporário:', cleanupError);
      }
    }
  }

  /**
   * Fallback: Gera PDF usando pdf-lib (implementação atual)
   */
  private static async fallbackToPdfLib(
    variables: Record<string, any>,
    outputPath: string
  ): Promise<void> {
    console.log('🔧 Usando fallback pdf-lib...');

    // Criar PDF do zero usando pdf-lib (código original mantido)
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
  }
}