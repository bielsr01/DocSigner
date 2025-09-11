import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { execFile, spawn } from 'child_process';
import { promisify } from 'util';
import * as crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { SecurityUtils, decryptPassword } from './security-utils';

// Fix for __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import type { IStorage } from './storage.js';

// Promisify execFile for async/await usage
const execFileAsync = promisify(execFile);

/**
 * Enum para engines de conversão DOCX→PDF disponíveis
 */
enum ConverterEngine {
  LIBREOFFICE = 'libreoffice',
  ONLYOFFICE_HTTP = 'onlyoffice-http',
  ONLYOFFICE_LOCAL = 'onlyoffice-local'
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
      case 'onlyoffice-local':
      case 'onlyoffice-builder': // Backward compatibility alias
        return ConverterEngine.ONLYOFFICE_LOCAL;
      case 'libreoffice':
      default:
        return ConverterEngine.LIBREOFFICE;
    }
  }

  /**
   * Gera e assina automaticamente documento PDF usando template DOCX real
   * Substitui variáveis {{nome}}, {{cpf}}, etc. preservando layout
   * Após a geração, automaticamente assina o PDF usando o primeiro certificado ativo do usuário
   * FALHA se não conseguir processar DOCX ou assinar (sem fallback)
   * 
   * @returns {Promise<{signed: boolean}>} Indica se o documento foi assinado ou apenas gerado
   */
  static async generateAndSignDocument(
    templatePath: string,
    variables: Record<string, any>,
    outputPath: string,
    userId: string,
    documentId: string,
    storage: IStorage
  ): Promise<{signed: boolean}> {
    console.log('🚀🔐 DocumentGenerator: Iniciando geração e assinatura automática...');
    console.log(`Template: ${templatePath}`);
    console.log(`Variables:`, JSON.stringify(variables, null, 2));
    console.log(`Output: ${outputPath}`);
    console.log(`User ID: ${userId}`);
    console.log(`Document ID: ${documentId}`);

    try {
      // ETAPA 1: Gerar PDF usando o método existente
      console.log('📄 ETAPA 1: Gerando PDF...');
      await this.generateDocument(templatePath, variables, outputPath);
      console.log('✅ PDF gerado com sucesso');

      // ETAPA 2: Buscar certificado ativo do usuário
      console.log('🔍 ETAPA 2: Buscando certificado ativo do usuário...');
      const certificate = await storage.getFirstActiveCertificate(userId);
      
      if (!certificate) {
        console.log('⚠️ Nenhum certificado ativo encontrado - mantendo documento não assinado');
        
        // Atualizar status do documento para "ready" (gerado mas não assinado)
        await storage.updateDocument(documentId, {
          status: 'ready'
        }, userId);

        console.log('✅ Status do documento atualizado para "ready" (não assinado)');
        
        // Log da atividade
        await storage.createActivityLog({
          type: 'document',
          action: 'document_generated',
          refId: documentId,
          status: 'success',
          message: 'Documento gerado com sucesso (não assinado - sem certificado ativo)',
          details: 'PDF gerado usando template DOCX mas não assinado por falta de certificado ativo'
        }, userId);

        return { signed: false };
      }

      console.log(`✅ Certificado encontrado: ${certificate.name} (${certificate.type})`);

      // ETAPA 3: Assinar o PDF usando PHP script
      console.log('🔐 ETAPA 3: Assinando PDF...');
      
      // Registrar tentativa de assinatura no banco
      const signature = await storage.createSignature({
        documentId,
        certificateId: certificate.id,
        provider: 'FPDI/TCPDF',
        status: 'processing'
      }, userId);

      try {
        await this.signPdfWithCertificate(outputPath, certificate, storage, userId);
        
        // Atualizar assinatura como concluída
        await storage.updateSignature(signature.id, {
          status: 'completed',
          signedAt: new Date()
        }, userId);

        console.log('✅ PDF assinado com sucesso');

        // Atualizar status do documento para "signed"
        await storage.updateDocument(documentId, {
          status: 'signed'
        }, userId);

        console.log('✅ Status do documento atualizado para "signed"');

        // Log da atividade
        await storage.createActivityLog({
          type: 'document',
          action: 'document_signed',
          refId: documentId,
          status: 'success',
          message: `Documento assinado automaticamente com certificado "${certificate.name}"`,
          details: `Certificado: ${certificate.name} (${certificate.type}) | Provedor: FPDI/TCPDF`
        }, userId);

        return { signed: true };

      } catch (signError: any) {
        console.error('❌ Erro na assinatura do PDF:', signError);

        // Atualizar assinatura como falhada
        await storage.updateSignature(signature.id, {
          status: 'failed',
          errorMessage: signError.message
        }, userId);

        // Atualizar status do documento para "ready" (gerado mas não assinado devido a erro)
        await storage.updateDocument(documentId, {
          status: 'ready'
        }, userId);

        // Log do erro
        await storage.createActivityLog({
          type: 'document',
          action: 'document_sign_failed',
          refId: documentId,
          status: 'error',
          message: `Falha na assinatura automática: ${signError.message}`,
          details: `Certificado: ${certificate.name} | Erro: ${signError.message}`
        }, userId);

        // Re-throw para que o caller saiba que houve erro na assinatura
        throw new Error(`Falha na assinatura automática: ${signError.message}`);
      }

    } catch (error: any) {
      console.error('❌ Erro no processo de geração e assinatura:', error);
      throw error;
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

    // SECURITY: Validar e carregar template de forma segura
    let validatedTemplatePath: string;
    let templateBuffer: Buffer;
    
    try {
      validatedTemplatePath = SecurityUtils.validateTemplatePath(templatePath);
      
      // Verificar se template existe de forma segura
      if (!SecurityUtils.safeFileExists(templatePath, 'uploads')) {
        throw new Error(`Template não encontrado: ${templatePath}`);
      }
      
      // Carregar template DOCX de forma segura
      templateBuffer = SecurityUtils.safeReadFile(templatePath, 'uploads');
    } catch (securityError: any) {
      throw new Error(`SECURITY: Template path inválido - ${securityError.message}`);
    }
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
                          engine === ConverterEngine.ONLYOFFICE_LOCAL ? 'OnlyOffice Local' : 'LibreOffice';
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
        // ⏸️ PAUSADO - Usando OnlyOffice Local para testes
        console.log('⏸️ LibreOffice pausado - forçando OnlyOffice Local');
        await this.convertWithOnlyOfficeLocal(docxPath, outputDir);
        break;
      
      case ConverterEngine.ONLYOFFICE_HTTP:
        await this.convertWithOnlyOfficeHttp(docxPath, outputDir);
        break;
      
      case ConverterEngine.ONLYOFFICE_LOCAL:
        await this.convertWithOnlyOfficeLocal(docxPath, outputDir);
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
    const timeoutMs = parseInt(process.env.ONLYOFFICE_TIMEOUT_MS || '120000');
    const isAsync = process.env.ONLYOFFICE_ASYNC?.toLowerCase() === 'true';
    const maxRetries = parseInt(process.env.ONLYOFFICE_MAX_RETRIES || '3');

    console.log(`📋 Configuração OnlyOffice:`, {
      serverUrl: serverUrl.replace(/\/+$/, ''), // Remove trailing slashes
      hasJWT: !!jwtSecret,
      timeoutMs,
      isAsync,
      maxRetries
    });

    // Gerar nome do arquivo PDF de saída (DEVE coincidir com expectativa de processDocxTemplate)
    const outputFileName = path.basename(docxPath).replace(/\.docx$/i, '.pdf');
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
   * Converte DOCX para PDF usando OnlyOffice Document Builder via spawn/exec (opção local)
   * 
   * VANTAGENS DO DOCUMENT BUILDER LOCAL:
   * - ✅ Execução local via binário nativo (sem servidor externo)
   * - ✅ Performance superior ao LibreOffice (engine OnlyOffice otimizado)
   * - ✅ Melhor compatibilidade com DOCX (engine OnlyOffice nativo)
   * - ✅ Script .docbuilder customizável para necessidades específicas
   * - ✅ Controle total sobre processo de conversão
   * 
   * VARIÁVEIS DE AMBIENTE:
   * - ONLYOFFICE_BUILDER_PATH: Path para executável docbuilder (padrão: auto-detect)
   * - ONLYOFFICE_BUILDER_DATA_PATH: Path para dados OnlyOffice (opcional)
   * - ONLYOFFICE_BUILDER_TIMEOUT_MS: Timeout em ms (padrão: 30000)
   * 
   * USO: export DOC_CONVERTER=onlyoffice-local
   */
  private static async convertWithOnlyOfficeLocal(docxPath: string, outputDir: string): Promise<void> {
    console.log('🏠 Usando OnlyOffice X2T Converter para conversão DOCX→PDF...');
    
    // Configurações com valores padrão
    const x2tPath = process.env.ONLYOFFICE_X2T_PATH || await this.detectOnlyOfficeX2TPath();
    const timeoutMs = parseInt(process.env.ONLYOFFICE_X2T_TIMEOUT_MS || '60000');

    console.log(`📋 Configuração OnlyOffice X2T Converter:`, {
      x2tPath: x2tPath || 'auto-detect',
      timeoutMs
    });

    // Verificar se OnlyOffice X2T está disponível
    if (!x2tPath || !fs.existsSync(x2tPath)) {
      throw new Error(`OnlyOffice X2T não encontrado. Instale ou configure ONLYOFFICE_X2T_PATH. Path atual: ${x2tPath}`);
    }

    // Gerar nome do arquivo PDF de saída (DEVE coincidir com expectativa de processDocxTemplate)
    const outputFileName = path.basename(docxPath).replace(/\.docx$/i, '.pdf');
    const outputPath = path.join(outputDir, outputFileName);

    console.log(`📄 Convertendo: ${path.basename(docxPath)} → ${outputFileName}`);

    try {
      console.log('🚀 Executando OnlyOffice X2T Converter...');
      console.log(`📝 Comando: ${x2tPath} "${docxPath}" "${outputPath}"`);
      
      // Executar OnlyOffice X2T diretamente: x2t input.docx output.pdf
      const startTime = Date.now();
      const { stdout, stderr } = await execFileAsync(x2tPath, [docxPath, outputPath], {
        timeout: timeoutMs,
        cwd: path.dirname(x2tPath)
      });
      
      const duration = Date.now() - startTime;
      
      // Verificar se houve erros no stderr
      if (stderr && stderr.includes('Empty sFileFrom or sFileTo')) {
        throw new Error('Parâmetros inválidos fornecidos ao x2t.');
      }
      
      // Verificar se arquivo PDF foi gerado
      if (!fs.existsSync(outputPath)) {
        throw new Error(`PDF não foi gerado pelo OnlyOffice X2T: ${outputPath}`);
      }
      
      const pdfStats = fs.statSync(outputPath);
      console.log(`✅ OnlyOffice X2T conversão concluída em ${duration}ms: ${pdfStats.size} bytes`);
      
    } catch (error: any) {
      console.error('❌ Erro na conversão OnlyOffice X2T:', error);
      throw error;
    }
  }

  /**
   * Detecta automaticamente o path do OnlyOffice X2T Converter
   */
  private static async detectOnlyOfficeX2TPath(): Promise<string | null> {
    console.log('🔍 Detectando OnlyOffice X2T Converter...');
    
    // Paths comuns onde OnlyOffice X2T pode estar instalado
    const commonPaths = [
      // Path local no projeto (se baixado)
      path.join(__dirname, '..', 'onlyoffice-builder', 'opt', 'onlyoffice', 'documentbuilder', 'x2t'),
      // Paths padrão do sistema
      '/opt/onlyoffice/documentbuilder/x2t',
      '/usr/bin/x2t',
      '/usr/local/bin/x2t',
      // Path relativo
      './onlyoffice-builder/opt/onlyoffice/documentbuilder/x2t'
    ];

    for (const x2tPath of commonPaths) {
      console.log(`🔍 Verificando: ${x2tPath}`);
      
      try {
        // Resolver path absoluto
        const absolutePath = path.resolve(x2tPath);
        
        if (fs.existsSync(absolutePath) && fs.statSync(absolutePath).isFile()) {
          // Verificar se é executável (Linux/Unix)
          try {
            fs.accessSync(absolutePath, fs.constants.F_OK | fs.constants.X_OK);
            console.log(`✅ OnlyOffice X2T detectado: ${absolutePath}`);
            return absolutePath;
          } catch (accessError) {
            console.log(`⚠️ Arquivo encontrado mas não é executável: ${absolutePath}`);
          }
        }
      } catch (error) {
        // Continuar para próximo path
      }
    }

    console.log('❌ OnlyOffice X2T não detectado automaticamente');
    return null;
  }

  /**
   * Detecta automaticamente o path do OnlyOffice Document Builder (LEGACY)
   */
  private static async detectOnlyOfficeBuilderPath(): Promise<string | null> {
    console.log('🔍 Detectando OnlyOffice Document Builder...');
    
    // Paths comuns onde OnlyOffice Document Builder pode estar instalado
    const commonPaths = [
      // Path local no projeto (se baixado)
      path.join(__dirname, '..', 'onlyoffice-builder', 'opt', 'onlyoffice', 'documentbuilder', 'docbuilder'),
      path.join(__dirname, '..', 'onlyoffice-builder', 'usr', 'bin', 'onlyoffice-documentbuilder'),
      // Paths padrão do sistema
      '/opt/onlyoffice/documentbuilder/docbuilder',
      '/usr/bin/onlyoffice-documentbuilder',
      '/usr/local/bin/onlyoffice-documentbuilder',
      // Path relativo
      './onlyoffice-builder/opt/onlyoffice/documentbuilder/docbuilder',
      './onlyoffice-builder/usr/bin/onlyoffice-documentbuilder'
    ];

    for (const builderPath of commonPaths) {
      console.log(`🔍 Verificando: ${builderPath}`);
      
      try {
        // Resolver path absoluto
        const absolutePath = path.resolve(builderPath);
        
        if (fs.existsSync(absolutePath) && fs.statSync(absolutePath).isFile()) {
          // Verificar se é executável (Linux/Unix)
          try {
            fs.accessSync(absolutePath, fs.constants.F_OK | fs.constants.X_OK);
            console.log(`✅ OnlyOffice Document Builder detectado: ${absolutePath}`);
            return absolutePath;
          } catch (accessError) {
            console.log(`⚠️ Arquivo encontrado mas não é executável: ${absolutePath}`);
          }
        }
      } catch (error) {
        // Continuar para próximo path
      }
    }

    console.log('❌ OnlyOffice Document Builder não detectado automaticamente');
    return null;
  }

  /**
   * Gera script .docbuilder para conversão DOCX→PDF
   */
  private static async generateDocBuilderScript(
    inputDocxPath: string, 
    outputPdfPath: string, 
    dataPath?: string
  ): Promise<string> {
    console.log('📝 Gerando script .docbuilder...');

    // Converter para paths absolutos
    const absoluteInputPath = path.resolve(inputDocxPath);
    const absoluteOutputPath = path.resolve(outputPdfPath);

    // Script .docbuilder template
    const scriptContent = `
// OnlyOffice Document Builder Script - Conversão DOCX→PDF
// Gerado automaticamente pelo DocumentGenerator

// Inicializar builder
builder.OpenFile("${absoluteInputPath.replace(/\\/g, '\\\\')}");

// Salvar como PDF
builder.SaveFile("pdf", "${absoluteOutputPath.replace(/\\/g, '\\\\')}");

// Fechar arquivo
builder.CloseFile();
    `.trim();

    // Criar arquivo script temporário
    const timestamp = Date.now();
    const tempDir = path.join(__dirname, '..', 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const scriptPath = path.join(tempDir, `docbuilder_script_${timestamp}.docbuilder`);
    fs.writeFileSync(scriptPath, scriptContent, 'utf8');

    console.log(`📄 Script .docbuilder criado: ${scriptPath}`);
    console.log(`📄 Conteúdo do script:\n${scriptContent}`);

    return scriptPath;
  }

  /**
   * Executa script .docbuilder usando spawn/exec
   */
  private static async executeDocBuilderScript(
    builderPath: string, 
    scriptPath: string, 
    timeoutMs: number
  ): Promise<void> {
    console.log('🚀 Executando OnlyOffice Document Builder...');

    const args = [scriptPath];
    console.log(`📝 Comando: ${builderPath} ${args.join(' ')}`);

    try {
      const { stdout, stderr } = await execFileAsync(builderPath, args, {
        timeout: timeoutMs,
        cwd: path.dirname(builderPath) // Executar no diretório do builder
      });

      if (stdout && stdout.trim()) {
        console.log('📤 OnlyOffice Builder stdout:', stdout.trim());
      }

      if (stderr && stderr.trim()) {
        console.log('📤 OnlyOffice Builder stderr:', stderr.trim());
      }

      console.log('✅ OnlyOffice Document Builder executado com sucesso');

    } catch (error: any) {
      console.error('❌ Erro na execução OnlyOffice Document Builder:', {
        code: error.code,
        signal: error.signal,
        stdout: error.stdout,
        stderr: error.stderr,
        message: error.message
      });

      // Mensagens de erro específicas baseadas no tipo de erro
      let errorMessage = 'Falha na execução OnlyOffice Document Builder: ';
      
      if (error.code === 'ENOENT') {
        errorMessage += `Executável não encontrado: ${builderPath}. Verifique a instalação do OnlyOffice Document Builder.`;
      } else if (error.signal === 'SIGTERM') {
        errorMessage += `Timeout na conversão (>${timeoutMs}ms). Documento muito complexo ou sistema lento.`;
      } else if (error.code === 'EACCES') {
        errorMessage += `Permissão negada para executar: ${builderPath}. Verifique as permissões do arquivo.`;
      } else if (error.stderr) {
        errorMessage += `OnlyOffice Builder error: ${error.stderr}`;
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

  /**
   * Assina um PDF usando certificado digital via script PHP FPDI/TCPDF
   */
  private static async signPdfWithCertificate(
    pdfPath: string,
    certificate: any,
    storage: IStorage,
    userId: string
  ): Promise<void> {
    console.log('🔐 Iniciando assinatura digital do PDF...');
    console.log(`PDF: ${pdfPath}`);
    console.log(`Certificado: ${certificate.name} (${certificate.type})`);

    // FPDI WORKAROUND: Sempre converter PDF para versão compatível PRIMEIRO
    console.log('🔄 Convertendo PDF para versão FPDI-compatível (preventivo)...');
    
    // Usar diretório temporário que será criado abaixo
    const tempDirPath = path.join(__dirname, '..', 'temp');
    if (!fs.existsSync(tempDirPath)) {
      fs.mkdirSync(tempDirPath, { recursive: true });
    }
    
    const compatiblePdf = path.join(tempDirPath, `fpdi_compatible_${Date.now()}.pdf`);
    
    try {
      const gsArgs = [
        '-sDEVICE=pdfwrite',
        '-dCompatibilityLevel=1.4',
        '-dNOPAUSE',
        '-dQUIET',
        '-dBATCH',
        `-sOutputFile=${compatiblePdf}`,
        pdfPath
      ];
      
      console.log(`📝 Ghostscript: gs ${gsArgs.join(' ')}`);
      const gsResult = await execFileAsync('gs', gsArgs, { timeout: 30000 });
      console.log(`✅ Ghostscript stdout: ${gsResult.stdout}`);
      if (gsResult.stderr) {
        console.log(`⚠️ Ghostscript stderr: ${gsResult.stderr}`);
      }
      
      if (!fs.existsSync(compatiblePdf)) {
        throw new Error('Ghostscript falhou em converter PDF');
      }
      
      console.log(`✅ PDF convertido para FPDI-compatível: ${compatiblePdf}`);
      console.log(`📄 Verificando arquivo convertido: ${fs.existsSync(compatiblePdf) ? 'EXISTS' : 'NOT FOUND'}`);
      
      // Usar caminho ABSOLUTO do PDF convertido para resolver problema de path relativo
      pdfPath = path.resolve(compatiblePdf);
      console.log(`📂 Usando caminho absoluto para assinatura: ${pdfPath}`);
      
    } catch (gsError) {
      console.warn('⚠️ Ghostscript falhou, usando PDF original (pode falhar na assinatura):', gsError);
      // Continuar com PDF original se Ghostscript falhar
    }

    // SECURITY: Verificar paths de forma segura
    try {
      // Validar path do PDF (agora pode ser o convertido)
      if (!fs.existsSync(pdfPath)) {
        throw new Error(`PDF não encontrado para assinatura: ${pdfPath}`);
      }

      // Validar path do certificado
      SecurityUtils.validateCertificatePath(certificate.storageRef);
      if (!SecurityUtils.safeFileExists(certificate.storageRef, 'uploads')) {
        throw new Error(`Arquivo de certificado não encontrado: ${certificate.storageRef}`);
      }
    } catch (securityError: any) {
      throw new Error(`SECURITY: Path validation failed - ${securityError.message}`);
    }

    // Verificar se há senha criptografada para o certificado
    if (!certificate.encryptedPassword) {
      throw new Error(`Certificado "${certificate.name}" não possui senha configurada para assinatura automática`);
    }

    // Criar arquivos temporários para assinatura
    const tempDir = path.join(__dirname, '..', 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const timestamp = Date.now();
    const tempSignedPath = path.join(tempDir, `signed_${timestamp}.pdf`);

    try {
      // Descriptografar a senha do certificado usando nova função de criptografia
      console.log(`🔐 Descriptografando senha do certificado...`);
      const certificatePassword = decryptPassword(certificate.encryptedPassword);
      console.log(`✅ Senha descriptografada com sucesso`);
      
      // Preparar comando PHP para assinatura
      const phpScriptPath = path.join(__dirname, '..', 'php-signer', 'pdf-signer.php');
      
      if (!fs.existsSync(phpScriptPath)) {
        throw new Error(`Script PHP de assinatura não encontrado: ${phpScriptPath}`);
      }

      console.log('📝 Executando script PHP de assinatura...');
      console.log(`Script: ${phpScriptPath}`);
      console.log(`Input: ${pdfPath}`);
      console.log(`Output: ${tempSignedPath}`);
      console.log(`Certificate: ${certificate.storageRef}`);

      // SEGURANÇA: Executar script PHP sem senha em argumentos CLI
      // IMPORTANTE: Usar caminhos ABSOLUTOS para evitar problemas de path relativo
      const absoluteCertPath = path.resolve(certificate.storageRef);
      console.log(`📁 Certificado absoluto: ${absoluteCertPath}`);
      console.log(`📄 Certificado existe: ${fs.existsSync(absoluteCertPath) ? 'SIM' : 'NÃO'}`);
      
      let phpArgs = [
        phpScriptPath,
        '--input', pdfPath,
        '--output', tempSignedPath,
        '--cert', absoluteCertPath
      ];

      console.log(`🔧 Comando PHP (senha via STDIN): php ${phpArgs.join(' ')}`);

      // SECURITY: Executar PHP e enviar senha via STDIN para segurança
      const phpProcess = spawn('php', phpArgs, {
        cwd: path.dirname(phpScriptPath),
        stdio: ['pipe', 'pipe', 'pipe'],
        shell: false, // Segurança: não usar shell para evitar command injection
        timeout: 60000 // 60 segundos timeout no spawn level também
      });

      // Enviar senha via STDIN imediatamente e fechar pipe
      phpProcess.stdin.write(certificatePassword + '\n');
      phpProcess.stdin.end();

      console.log('📡 Senha enviada via STDIN, aguardando resposta do PHP...');

      // Capturar output
      let stdout = '';
      let stderr = '';
      
      phpProcess.stdout.on('data', (data: Buffer) => {
        stdout += data.toString();
      });
      
      phpProcess.stderr.on('data', (data: Buffer) => {
        stderr += data.toString();
      });

      // Aguardar conclusão com timeout
      const processResult = await new Promise<{code: number | null, signal: string | null}>((resolve, reject) => {
        const timeout = setTimeout(() => {
          phpProcess.kill();
          reject(new Error('TIMEOUT: PHP process took longer than 60 seconds'));
        }, 60000);

        phpProcess.on('close', (code: number | null, signal: string | null) => {
          clearTimeout(timeout);
          resolve({ code, signal });
        });

        phpProcess.on('error', (error: Error) => {
          clearTimeout(timeout);
          reject(error);
        });
      });

      console.log(`📊 PHP stdout (${stdout.length} chars):`, JSON.stringify(stdout));
      console.log(`📊 PHP stderr (${stderr.length} chars):`, JSON.stringify(stderr));
      
      if (processResult.code !== 0) {
        const errorDetails = {
          code: processResult.code,
          signal: processResult.signal,
          stdout: stdout.trim(),
          stderr: stderr.trim()
        };
        console.log('❌ ERRO DETALHADO na assinatura PHP:', JSON.stringify(errorDetails, null, 2));
        throw new Error(`PHP process failed with code ${processResult.code}: ${stderr.trim() || stdout.trim()}`);
      }

      if (stdout) {
        console.log('📤 PHP stdout:', stdout.trim());
      }

      if (stderr) {
        console.log('📤 PHP stderr:', stderr.trim());
      }

      // Verificar se o PDF assinado foi criado
      if (!fs.existsSync(tempSignedPath)) {
        throw new Error(`PDF assinado não foi gerado: ${tempSignedPath}`);
      }

      const signedFileSize = fs.statSync(tempSignedPath).size;
      console.log(`✅ PDF assinado criado: ${signedFileSize} bytes`);

      // Substituir o PDF original pelo PDF assinado
      fs.copyFileSync(tempSignedPath, pdfPath);
      console.log(`✅ PDF original substituído pelo PDF assinado: ${pdfPath}`);

      // Verificar o tamanho final
      const finalFileSize = fs.statSync(pdfPath).size;
      console.log(`📊 Tamanho final do PDF assinado: ${finalFileSize} bytes`);

    } catch (signError: any) {
      console.error('❌ Erro na assinatura PHP:', {
        code: signError.code,
        signal: signError.signal,
        stdout: signError.stdout,
        stderr: signError.stderr,
        message: signError.message
      });

      // Mensagens de erro específicas
      let errorMessage = 'Falha na assinatura digital: ';
      
      if (signError.code === 'ENOENT') {
        errorMessage += 'PHP não encontrado no sistema. Instale o PHP para usar assinatura digital.';
      } else if (signError.signal === 'SIGTERM') {
        errorMessage += 'Timeout na assinatura (>60s). Certificado muito complexo ou sistema lento.';
      } else if (signError.stderr && signError.stderr.includes('password')) {
        errorMessage += 'Senha do certificado incorreta ou certificado inválido.';
      } else if (signError.stderr && signError.stderr.includes('FPDI')) {
        errorMessage += 'Erro na biblioteca FPDI/TCPDF. Verifique a instalação das dependências PHP.';
      } else if (signError.stderr) {
        errorMessage += `PHP error: ${signError.stderr}`;
      } else {
        errorMessage += signError.message;
      }

      throw new Error(errorMessage);

    } finally {
      // Limpar arquivo temporário
      this.cleanupTempFiles([tempSignedPath]);
    }

    console.log('✅ Assinatura digital concluída com sucesso');
  }
}