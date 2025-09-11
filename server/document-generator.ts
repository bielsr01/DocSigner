import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { execFile } from 'child_process';
import { promisify } from 'util';
import * as crypto from 'crypto';
import jwt from 'jsonwebtoken';

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
  ONLYOFFICE_HTTP = 'onlyoffice-http',
  ONLYOFFICE_BUILDER = 'onlyoffice-builder'
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
      case 'onlyoffice-builder':
        return ConverterEngine.ONLYOFFICE_BUILDER;
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
        const engine = this.getConverterEngine();
        const engineName = engine === ConverterEngine.ONLYOFFICE_HTTP ? 'OnlyOffice HTTP' : 
                          engine === ConverterEngine.ONLYOFFICE_BUILDER ? 'OnlyOffice Builder' : 'LibreOffice';
        throw new Error(`PDF não foi gerado pelo ${engineName}: ${tempPdfPath}`);
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
      
      case ConverterEngine.ONLYOFFICE_BUILDER:
        await this.convertWithOnlyOfficeBuilder(docxPath, outputDir);
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
   * Converte DOCX para PDF usando OnlyOffice Document Server via API HTTP
   * 
   * FUNCIONALIDADES IMPLEMENTADAS:
   * - Upload DOCX para OnlyOffice Server
   * - Conversão síncrona e assíncrona com polling
   * - Autenticação JWT opcional
   * - Download automático do PDF resultante
   * - Error handling robusto para timeouts e falhas de rede
   * - Retry logic para conversões temporariamente falhas
   * 
   * VARIÁVEIS DE AMBIENTE:
   * - ONLYOFFICE_SERVER_URL: URL base do OnlyOffice Server (obrigatório)
   * - ONLYOFFICE_JWT_SECRET: Chave secreta para JWT auth (opcional)
   * - ONLYOFFICE_TIMEOUT_MS: Timeout em ms (padrão: 60000)
   * - ONLYOFFICE_ASYNC: true=async com polling, false=sync (padrão: false)
   * - ONLYOFFICE_MAX_RETRIES: Máximo de tentativas (padrão: 3)
   */
  private static async convertWithOnlyOfficeHttp(docxPath: string, outputDir: string): Promise<void> {
    console.log('🌐 Usando OnlyOffice Document Server para conversão DOCX→PDF...');
    
    // Validar configuração obrigatória
    const serverUrl = process.env.ONLYOFFICE_SERVER_URL;
    if (!serverUrl) {
      throw new Error('ONLYOFFICE_SERVER_URL não configurado. Configure a URL do OnlyOffice Document Server.');
    }

    // Configurações com valores padrão
    const jwtSecret = process.env.ONLYOFFICE_JWT_SECRET;
    const timeoutMs = parseInt(process.env.ONLYOFFICE_TIMEOUT_MS || '60000');
    const isAsync = process.env.ONLYOFFICE_ASYNC?.toLowerCase() === 'true';
    const maxRetries = parseInt(process.env.ONLYOFFICE_MAX_RETRIES || '3');

    console.log(`📋 Configuração OnlyOffice:`, {
      serverUrl: serverUrl.replace(/\/+$/, ''), // Remove trailing slashes
      hasJWT: !!jwtSecret,
      timeoutMs,
      isAsync,
      maxRetries
    });

    // Gerar nome único para o arquivo PDF de saída (deve coincidir com processDocxTemplate)
    const timestamp = Date.now();
    const outputFileName = `temp_${timestamp}.pdf`;
    const outputPath = path.join(outputDir, outputFileName);

    let retryCount = 0;
    
    while (retryCount <= maxRetries) {
      try {
        // Etapa 1: Fazer upload do DOCX e obter URL pública
        const docxUrl = await this.uploadDocxToTempServer(docxPath);
        
        // Etapa 2: Solicitar conversão ao OnlyOffice
        const conversionResult = await this.requestOnlyOfficeConversion(
          docxUrl, 
          serverUrl, 
          jwtSecret, 
          timeoutMs, 
          isAsync
        );
        
        // Etapa 3: Baixar PDF resultante
        await this.downloadConvertedPdf(conversionResult.fileUrl, outputPath, timeoutMs);
        
        console.log(`✅ OnlyOffice conversão concluída: ${outputPath}`);
        return;
        
      } catch (error: any) {
        retryCount++;
        console.error(`❌ Tentativa ${retryCount}/${maxRetries + 1} falhou:`, error.message);
        
        if (retryCount > maxRetries) {
          throw new Error(`OnlyOffice conversão falhou após ${maxRetries + 1} tentativas: ${error.message}`);
        }
        
        // Aguardar antes da próxima tentativa (exponential backoff)
        const backoffDelay = Math.min(1000 * Math.pow(2, retryCount - 1), 10000);
        console.log(`⏳ Aguardando ${backoffDelay}ms antes da próxima tentativa...`);
        await new Promise(resolve => setTimeout(resolve, backoffDelay));
      }
    }
  }

  /**
   * Faz upload do DOCX para um servidor temporário e retorna URL pública
   * NOTA: Em produção, você pode usar seu próprio servidor web ou serviço de storage
   * Para simplificar, esta implementação assume que você tem um endpoint HTTP acessível
   */
  private static async uploadDocxToTempServer(docxPath: string): Promise<string> {
    console.log('📤 Fazendo upload do DOCX para servidor temporário...');
    
    // Ler o arquivo DOCX
    const docxBuffer = fs.readFileSync(docxPath);
    const fileName = `temp_${Date.now()}_${path.basename(docxPath)}`;
    
    // IMPLEMENTAÇÃO SIMPLIFICADA: Usar servidor HTTP local
    // Em produção, substitua por seu serviço de upload preferido (AWS S3, etc.)
    const localServerUrl = process.env.LOCAL_SERVER_URL || 'http://localhost:3000';
    const uploadUrl = `${localServerUrl}/uploads/temp/${fileName}`;
    
    // Salvar arquivo temporariamente em pasta acessível via HTTP
    const tempUploadDir = path.join(__dirname, '..', 'uploads', 'temp');
    if (!fs.existsSync(tempUploadDir)) {
      fs.mkdirSync(tempUploadDir, { recursive: true });
    }
    
    const tempFilePath = path.join(tempUploadDir, fileName);
    fs.writeFileSync(tempFilePath, docxBuffer);
    
    console.log(`📁 DOCX disponível em: ${uploadUrl}`);
    return uploadUrl;
  }

  /**
   * Solicita conversão ao OnlyOffice Document Server
   */
  private static async requestOnlyOfficeConversion(
    docxUrl: string,
    serverUrl: string,
    jwtSecret: string | undefined,
    timeoutMs: number,
    isAsync: boolean
  ): Promise<{ fileUrl: string }> {
    console.log('🔄 Solicitando conversão ao OnlyOffice Document Server...');
    
    // Endpoint de conversão (versões novas usam /converter, antigas /ConvertService.ashx)
    const conversionEndpoint = `${serverUrl.replace(/\/+$/, '')}/ConvertService.ashx`;
    
    // Gerar chave única para a conversão
    const conversionKey = this.generateConversionKey();
    
    // Payload da requisição
    const payload = {
      async: isAsync,
      filetype: 'docx',
      key: conversionKey,
      outputtype: 'pdf',
      title: `converted_${Date.now()}.pdf`,
      url: docxUrl
    };

    console.log('📝 Payload da conversão:', JSON.stringify(payload, null, 2));

    // Adicionar JWT se configurado
    let requestBody: any = payload;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };

    if (jwtSecret) {
      console.log('🔐 Adicionando autenticação JWT...');
      
      // Implementação JWT segura usando jsonwebtoken com HS256
      const jwtToken = this.createSecureJWT(payload, jwtSecret);
      requestBody = { ...payload, token: jwtToken };
    }

    try {
      // Fazer requisição HTTP
      const response = await fetch(conversionEndpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody),
        signal: AbortSignal.timeout(timeoutMs)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('📥 Resposta OnlyOffice:', JSON.stringify(result, null, 2));

      // Verificar se houve erro
      if (result.error !== undefined) {
        throw new Error(`OnlyOffice API error ${result.error}: ${this.getOnlyOfficeErrorMessage(result.error)}`);
      }

      // Se conversão assíncrona, fazer polling
      if (isAsync && result.endConvert !== true) {
        console.log('⏳ Conversão assíncrona iniciada, fazendo polling...');
        return await this.pollOnlyOfficeConversion(conversionEndpoint, conversionKey, jwtSecret, timeoutMs);
      }

      // Conversão síncrona ou assíncrona concluída
      if (!result.fileUrl) {
        throw new Error('OnlyOffice não retornou URL do arquivo convertido');
      }

      console.log('✅ Conversão OnlyOffice concluída');
      return { fileUrl: result.fileUrl };

    } catch (error: any) {
      if (error.name === 'TimeoutError') {
        throw new Error(`Timeout na conversão OnlyOffice (>${timeoutMs}ms)`);
      }
      throw error;
    }
  }

  /**
   * Faz polling para conversão assíncrona
   */
  private static async pollOnlyOfficeConversion(
    conversionEndpoint: string,
    conversionKey: string,
    jwtSecret: string | undefined,
    timeoutMs: number
  ): Promise<{ fileUrl: string }> {
    const startTime = Date.now();
    const pollInterval = 2000; // 2 segundos entre polls
    
    while (Date.now() - startTime < timeoutMs) {
      console.log('🔄 Verificando status da conversão...');
      
      const payload = { key: conversionKey };
      let requestBody: any = payload;
      
      if (jwtSecret) {
        const jwtToken = this.createSecureJWT(payload, jwtSecret);
        requestBody = { ...payload, token: jwtToken };
      }

      try {
        const response = await fetch(conversionEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
          signal: AbortSignal.timeout(10000) // 10s timeout por poll
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();
        
        if (result.error !== undefined) {
          throw new Error(`OnlyOffice polling error ${result.error}: ${this.getOnlyOfficeErrorMessage(result.error)}`);
        }

        if (result.endConvert === true && result.fileUrl) {
          console.log('✅ Conversão assíncrona concluída');
          return { fileUrl: result.fileUrl };
        }

        // Aguardar próximo poll
        await new Promise(resolve => setTimeout(resolve, pollInterval));
        
      } catch (error: any) {
        console.warn('⚠️ Erro no polling, tentando novamente...', error.message);
        await new Promise(resolve => setTimeout(resolve, pollInterval));
      }
    }
    
    throw new Error(`Timeout no polling da conversão OnlyOffice (>${timeoutMs}ms)`);
  }

  /**
   * Baixa o PDF convertido do OnlyOffice
   */
  private static async downloadConvertedPdf(fileUrl: string, outputPath: string, timeoutMs: number): Promise<void> {
    console.log(`📥 Baixando PDF convertido: ${fileUrl}`);
    
    try {
      const response = await fetch(fileUrl, {
        signal: AbortSignal.timeout(timeoutMs)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const pdfBuffer = await response.arrayBuffer();
      fs.writeFileSync(outputPath, Buffer.from(pdfBuffer));
      
      console.log(`💾 PDF salvo: ${outputPath} (${pdfBuffer.byteLength} bytes)`);
      
    } catch (error: any) {
      if (error.name === 'TimeoutError') {
        throw new Error(`Timeout no download do PDF (>${timeoutMs}ms)`);
      }
      throw error;
    }
  }

  /**
   * Gera chave única para conversão OnlyOffice (mínimo 12 caracteres)
   */
  private static generateConversionKey(): string {
    return `conv_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
  }

  /**
   * Cria JWT seguro para autenticação OnlyOffice usando jsonwebtoken
   * Implementa HS256 corretamente conforme especificação OnlyOffice
   */
  private static createSecureJWT(payload: any, secret: string): string {
    // OnlyOffice espera payload no campo 'payload' quando usando JWT
    const tokenPayload = {
      payload: payload,
      iss: 'document-generator',
      aud: 'onlyoffice',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (5 * 60) // 5 minutos de validade
    };

    return jwt.sign(tokenPayload, secret, {
      algorithm: 'HS256',
      header: {
        alg: 'HS256',
        typ: 'JWT'
      }
    });
  }

  /**
   * Converte códigos de erro OnlyOffice em mensagens legíveis
   */
  private static getOnlyOfficeErrorMessage(errorCode: number): string {
    const errorMessages: Record<number, string> = {
      '-1': 'Erro desconhecido',
      '-2': 'Timeout na conversão',
      '-3': 'Erro na conversão do documento',
      '-4': 'Erro no download do documento de origem',
      '-5': 'Formato de arquivo não suportado',
      '-6': 'Documento corrompido ou inválido',
      '-7': 'Documento protegido por senha',
      '-8': 'Parâmetros inválidos'
    };
    
    return errorMessages[errorCode] || `Erro OnlyOffice ${errorCode}`;
  }

  /**
   * Converte DOCX para PDF usando OnlyOffice Document Builder (biblioteca JavaScript)
   * 
   * VANTAGENS DO DOCUMENT BUILDER:
   * - ✅ Biblioteca JavaScript nativa (sem servidor externo)
   * - ✅ Performance superior ao LibreOffice (sem fork de processo)
   * - ✅ API programática completa para manipulação de documentos
   * - ✅ Melhor compatibilidade com DOCX (engine OnlyOffice nativo)
   * - ✅ Zero configuração (NPM install apenas)
   * - ✅ Execução local (sem dependências de rede)
   * 
   * INSTALAÇÃO: npm install @onlyoffice/documentbuilder
   * USO: export DOC_CONVERTER=onlyoffice-builder
   */
  private static async convertWithOnlyOfficeBuilder(docxPath: string, outputDir: string): Promise<void> {
    console.log('📚 Usando OnlyOffice Document Builder para conversão DOCX→PDF...');
    
    try {
      // Importar OnlyOffice Document Builder dinamicamente
      const docBuilder = await import('@onlyoffice/documentbuilder');
      
      // Gerar nome do arquivo PDF de saída (deve coincidir com processDocxTemplate)
      const timestamp = Date.now();
      const outputFileName = `temp_${timestamp}.pdf`;
      const outputPath = path.join(outputDir, outputFileName);
      
      console.log(`📄 Convertendo: ${path.basename(docxPath)} → ${outputFileName}`);
      
      // Inicializar Document Builder
      console.log('🔧 Inicializando OnlyOffice Document Builder...');
      
      // Abrir documento DOCX existente
      console.log(`📂 Abrindo documento: ${docxPath}`);
      const oDocument = docBuilder.GetDocument(docxPath);
      
      if (!oDocument) {
        throw new Error('Falha ao abrir documento DOCX com OnlyOffice Document Builder');
      }
      
      console.log('✅ Documento DOCX carregado com sucesso');
      
      // Converter para PDF e salvar
      console.log(`💾 Salvando como PDF: ${outputPath}`);
      const saveResult = oDocument.SaveAs(outputPath, 'pdf');
      
      if (!saveResult) {
        throw new Error('Falha na conversão DOCX→PDF com OnlyOffice Document Builder');
      }
      
      // Verificar se arquivo foi criado
      if (!fs.existsSync(outputPath)) {
        throw new Error(`PDF não foi gerado: ${outputPath}`);
      }
      
      const pdfStats = fs.statSync(outputPath);
      console.log(`✅ OnlyOffice Document Builder conversão concluída: ${pdfStats.size} bytes`);
      
    } catch (error: any) {
      console.error('❌ Erro na conversão OnlyOffice Document Builder:', error);
      
      // Mensagens de erro específicas
      let errorMessage = 'Falha na conversão DOCX→PDF com OnlyOffice Document Builder: ';
      
      if (error.code === 'MODULE_NOT_FOUND' && error.message.includes('@onlyoffice/documentbuilder')) {
        errorMessage += 'Módulo @onlyoffice/documentbuilder não encontrado. Execute: npm install @onlyoffice/documentbuilder';
      } else if (error.message.includes('GetDocument')) {
        errorMessage += 'Falha ao abrir documento DOCX. Verifique se o arquivo está válido.';
      } else if (error.message.includes('SaveAs')) {
        errorMessage += 'Falha na conversão para PDF. Documento pode estar corrompido.';
      } else {
        errorMessage += error.message;
      }
      
      throw new Error(errorMessage);
    }
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