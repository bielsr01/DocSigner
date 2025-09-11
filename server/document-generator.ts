import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { execFile } from 'child_process';
import { promisify } from 'util';

// Fix for __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';

// Promisify execFile for async/await usage
const execFileAsync = promisify(execFile);

/**
 * Enum para engines de conversão DOCX→PDF disponíveis
 */
enum ConverterEngine {
  LIBREOFFICE = 'libreoffice',
  ONLYOFFICE_HTTP = 'onlyoffice-http'
}

/**
 * GERADOR DE DOCUMENTOS - SISTEMA ROBUSTO DOCX→PDF
 * Usa template DOCX real com substituição de variáveis
 * Preserva layout original do template
 * SEM FALLBACK - Falha se DOCX processing não funcionar
 * SISTEMA PLUGGABLE: Suporta LibreOffice (atual) e OnlyOffice HTTP (futuro)
 */
export class DocumentGenerator {

  /**
   * Determina qual engine de conversão usar baseado na variável de ambiente DOC_CONVERTER
   * @returns Engine de conversão selecionado
   */
  private static getConverterEngine(): ConverterEngine {
    const envConverter = process.env.DOC_CONVERTER?.toLowerCase();
    
    switch (envConverter) {
      case 'onlyoffice-http':
        return ConverterEngine.ONLYOFFICE_HTTP;
      case 'libreoffice':
      default:
        return ConverterEngine.LIBREOFFICE;
    }
  }

  /**
   * Gera documento PDF usando template DOCX real
   * Substitui variáveis {{nome}}, {{cpf}}, etc. preservando layout
   * FALHA se não conseguir processar DOCX (sem fallback)
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

    // ETAPA 1: Validar variáveis obrigatórias
    this.validateRequiredVariables(variables);

    // ETAPA 2: Processar template DOCX com substituição de variáveis
    await this.processDocxTemplate(templatePath, variables, outputPath);
    console.log('✅ DocumentGenerator: PDF gerado com sucesso usando template DOCX!');
  }

  /**
   * Valida que todas as variáveis obrigatórias estão presentes e não-vazias
   */
  private static validateRequiredVariables(variables: Record<string, any>): void {
    const requiredKeys = ["nome", "cpf", "data_conclusao", "data_assinatura"];
    
    console.log('🔍 Validando variáveis obrigatórias...');
    
    const missingKeys: string[] = [];
    const emptyKeys: string[] = [];

    requiredKeys.forEach(key => {
      if (!(key in variables)) {
        missingKeys.push(key);
      } else if (!variables[key] || String(variables[key]).trim() === '') {
        emptyKeys.push(key);
      }
    });

    if (missingKeys.length > 0 || emptyKeys.length > 0) {
      let errorMessage = 'Validação de variáveis falhou:';
      
      if (missingKeys.length > 0) {
        errorMessage += `\n• Variáveis ausentes: ${missingKeys.join(', ')}`;
      }
      
      if (emptyKeys.length > 0) {
        errorMessage += `\n• Variáveis vazias: ${emptyKeys.join(', ')}`;
      }

      console.error('❌', errorMessage);
      throw new Error(errorMessage);
    }

    console.log('✅ Todas as variáveis obrigatórias estão presentes e válidas');
  }

  /**
   * Processa template DOCX com substituição de variáveis e converte para PDF
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

    // Criar diretório temporário
    const tempDir = path.join(__dirname, '..', 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
      console.log(`📁 Diretório temporário criado: ${tempDir}`);
    }

    // Criar arquivos temporários
    const timestamp = Date.now();
    const tempDocxPath = path.join(tempDir, `temp_${timestamp}.docx`);
    const tempPdfPath = path.join(tempDir, `temp_${timestamp}.pdf`);

    try {
      // Salvar DOCX processado no disco
      fs.writeFileSync(tempDocxPath, processedDocxBuffer);
      console.log(`💾 DOCX temporário salvo: ${tempDocxPath}`);

      // Converter DOCX para PDF usando LibreOffice via file-based conversion
      await this.convertDocxToPdf(tempDocxPath, tempDir);

      // Verificar se PDF foi gerado
      if (!fs.existsSync(tempPdfPath)) {
        throw new Error(`PDF não foi gerado pelo LibreOffice: ${tempPdfPath}`);
      }

      // Mover PDF para destino final
      fs.copyFileSync(tempPdfPath, outputPath);
      console.log(`✅ PDF gerado e salvo em: ${outputPath}`);

    } finally {
      // Limpar arquivos temporários
      this.cleanupTempFiles([tempDocxPath, tempPdfPath]);
    }
  }

  /**
   * Converte DOCX para PDF usando o engine selecionado via DOC_CONVERTER
   * Sistema pluggable que suporta LibreOffice (padrão) e OnlyOffice HTTP (futuro)
   */
  private static async convertDocxToPdf(docxPath: string, outputDir: string): Promise<void> {
    const engine = this.getConverterEngine();
    console.log(`🔄 Convertendo DOCX para PDF usando engine: ${engine}`);

    switch (engine) {
      case ConverterEngine.LIBREOFFICE:
        await this.convertWithLibreOffice(docxPath, outputDir);
        break;
      
      case ConverterEngine.ONLYOFFICE_HTTP:
        await this.convertWithOnlyOfficeHttp(docxPath, outputDir);
        break;
        
      default:
        throw new Error(`Engine de conversão não suportado: ${engine}`);
    }
  }

  /**
   * Converte DOCX para PDF usando LibreOffice via linha de comando
   * File-based conversion (mais estável que buffer-based)
   * ENGINE PADRÃO: Funciona local via child_process
   */
  private static async convertWithLibreOffice(docxPath: string, outputDir: string): Promise<void> {
    console.log('📋 Usando LibreOffice para conversão DOCX→PDF...');

    const sofficeCommand = 'soffice';
    const args = [
      '--headless',
      '--convert-to',
      'pdf',
      '--outdir',
      outputDir,
      docxPath
    ];

    console.log(`📝 Comando LibreOffice: ${sofficeCommand} ${args.join(' ')}`);

    try {
      const { stdout, stderr } = await execFileAsync(sofficeCommand, args, {
        timeout: 30000 // 30 segundos timeout
      });

      if (stdout) {
        console.log('📤 LibreOffice stdout:', stdout.trim());
      }

      if (stderr) {
        console.log('📤 LibreOffice stderr:', stderr.trim());
      }

      console.log('✅ LibreOffice conversão concluída');

    } catch (error: any) {
      console.error('❌ Erro na conversão LibreOffice:', {
        code: error.code,
        signal: error.signal,
        stdout: error.stdout,
        stderr: error.stderr,
        message: error.message
      });

      // Mensagens de erro mais específicas baseadas no tipo de erro
      let errorMessage = 'Falha na conversão DOCX→PDF: ';
      
      if (error.code === 'ENOENT') {
        errorMessage += 'LibreOffice não encontrado. Instale o LibreOffice no sistema.';
      } else if (error.signal === 'SIGTERM') {
        errorMessage += 'Timeout na conversão (>30s). Documento muito complexo ou sistema lento.';
      } else if (error.stderr) {
        errorMessage += `LibreOffice error: ${error.stderr}`;
      } else {
        errorMessage += error.message;
      }

      throw new Error(errorMessage);
    }
  }

  /**
   * Converte DOCX para PDF usando OnlyOffice via API HTTP
   * ENGINE FUTURO: Para uso com OnlyOffice Server remoto
   * 
   * IMPLEMENTAÇÃO FUTURA:
   * - Enviar DOCX via HTTP POST para OnlyOffice Server
   * - Aguardar conversão via polling ou webhook  
   * - Baixar PDF resultante
   * - Configurar endpoint via ONLYOFFICE_SERVER_URL env var
   * - Implementar autenticação JWT se necessária
   * - Timeout configurável para conversões grandes
   * - Retry logic para falhas de rede
   * 
   * CONFIGURAÇÃO FUTURA:
   * - ONLYOFFICE_SERVER_URL=https://onlyoffice.company.com
   * - ONLYOFFICE_JWT_SECRET=secret_key
   * - ONLYOFFICE_TIMEOUT_MS=60000
   */
  private static async convertWithOnlyOfficeHttp(docxPath: string, outputDir: string): Promise<void> {
    console.log('🚧 Tentando usar OnlyOffice HTTP...');
    
    // TODO: Implementar integração via HTTP API quando OnlyOffice estiver disponível
    // Estrutura planejada:
    // 1. Ler DOCX file do disco
    // 2. POST /api/convert com multipart/form-data
    // 3. Poll /api/convert/status/{jobId} até completion
    // 4. GET /api/convert/download/{jobId} para baixar PDF
    // 5. Salvar PDF no outputDir
    
    throw new Error('OnlyOffice HTTP converter não implementado ainda. Use DOC_CONVERTER=libreoffice');
  }

  /**
   * Remove arquivos temporários com log de limpeza
   */
  private static cleanupTempFiles(filePaths: string[]): void {
    console.log('🧹 Limpando arquivos temporários...');
    
    let cleanedCount = 0;
    
    filePaths.forEach(filePath => {
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          console.log(`🗑️ Removido: ${path.basename(filePath)}`);
          cleanedCount++;
        }
      } catch (cleanupError) {
        console.warn(`⚠️ Falha ao remover ${path.basename(filePath)}:`, cleanupError);
      }
    });

    console.log(`✅ Limpeza concluída: ${cleanedCount} arquivos removidos`);
  }
}