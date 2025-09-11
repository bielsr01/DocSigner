import * as path from 'path';
import * as fs from 'fs';
import * as crypto from 'crypto';

/**
 * Utilitário para validação segura de paths e prevenção de path traversal
 */
export class SecurityUtils {
  
  // Diretórios base permitidos
  private static readonly ALLOWED_BASE_DIRS = [
    path.resolve('uploads'),
    path.resolve('temp'),
    path.resolve('templates'),
    path.resolve('php-signer'),
    path.resolve('server'),
    path.resolve('client/dist'),
    path.resolve('onlyoffice-builder')
  ];

  /**
   * Valida e normaliza um caminho de arquivo, prevenindo path traversal
   * @param inputPath - Caminho a ser validado
   * @param allowedBaseDir - Diretório base permitido (opcional)
   * @returns Caminho normalizado e seguro
   * @throws Error se o caminho for inseguro
   */
  static validateAndNormalizePath(inputPath: string, allowedBaseDir?: string): string {
    if (!inputPath || typeof inputPath !== 'string') {
      throw new Error('SECURITY: Path inválido fornecido');
    }

    // Normalizar o caminho para resolver sequências como ../ e ./
    const normalizedPath = path.resolve(inputPath);
    
    // Verificar se o caminho está dentro de um diretório base permitido
    let isPathAllowed = false;
    let validBaseDir = '';

    if (allowedBaseDir) {
      // Se um diretório base específico foi fornecido, usar apenas ele
      const allowedBase = path.resolve(allowedBaseDir);
      if (normalizedPath.startsWith(allowedBase + path.sep) || normalizedPath === allowedBase) {
        isPathAllowed = true;
        validBaseDir = allowedBase;
      }
    } else {
      // Verificar contra todos os diretórios base permitidos
      for (const baseDir of this.ALLOWED_BASE_DIRS) {
        if (normalizedPath.startsWith(baseDir + path.sep) || normalizedPath === baseDir) {
          isPathAllowed = true;
          validBaseDir = baseDir;
          break;
        }
      }
    }

    if (!isPathAllowed) {
      console.error(`❌ SECURITY: Tentativa de path traversal detectada!`);
      console.error(`   Input path: ${inputPath}`);
      console.error(`   Normalized path: ${normalizedPath}`);
      console.error(`   Allowed base dirs: ${allowedBaseDir || this.ALLOWED_BASE_DIRS.join(', ')}`);
      throw new Error(`SECURITY: Acesso negado - path fora dos diretórios permitidos`);
    }

    console.log(`✅ SECURITY: Path validado com sucesso: ${normalizedPath} (base: ${validBaseDir})`);
    return normalizedPath;
  }

  /**
   * Valida path de arquivo para leitura/escrita
   * @param filePath - Caminho do arquivo
   * @param allowedBaseDir - Diretório base permitido (opcional)
   * @returns Caminho validado
   */
  static validateFilePath(filePath: string, allowedBaseDir?: string): string {
    return this.validateAndNormalizePath(filePath, allowedBaseDir);
  }

  /**
   * Valida path de template
   * @param templatePath - Caminho do template
   * @returns Caminho validado
   */
  static validateTemplatePath(templatePath: string): string {
    return this.validateAndNormalizePath(templatePath, 'uploads');
  }

  /**
   * Valida path de certificado
   * @param certificatePath - Caminho do certificado
   * @returns Caminho validado
   */
  static validateCertificatePath(certificatePath: string): string {
    return this.validateAndNormalizePath(certificatePath, 'uploads');
  }

  /**
   * Valida path de documento
   * @param documentPath - Caminho do documento
   * @returns Caminho validado
   */
  static validateDocumentPath(documentPath: string): string {
    return this.validateAndNormalizePath(documentPath, 'uploads');
  }

  /**
   * Valida path temporário
   * @param tempPath - Caminho temporário
   * @returns Caminho validado
   */
  static validateTempPath(tempPath: string): string {
    return this.validateAndNormalizePath(tempPath, 'temp');
  }

  /**
   * Verifica se um arquivo existe de forma segura
   * @param filePath - Caminho do arquivo
   * @param allowedBaseDir - Diretório base permitido (opcional)
   * @returns true se o arquivo existir, false caso contrário
   */
  static safeFileExists(filePath: string, allowedBaseDir?: string): boolean {
    try {
      const validatedPath = this.validateAndNormalizePath(filePath, allowedBaseDir);
      return fs.existsSync(validatedPath);
    } catch (error) {
      console.error('SECURITY: Erro na validação de path para verificação de existência:', error);
      return false;
    }
  }

  /**
   * Lê um arquivo de forma segura
   * @param filePath - Caminho do arquivo
   * @param allowedBaseDir - Diretório base permitido (opcional)
   * @returns Buffer do arquivo
   */
  static safeReadFile(filePath: string, allowedBaseDir?: string): Buffer {
    const validatedPath = this.validateAndNormalizePath(filePath, allowedBaseDir);
    return fs.readFileSync(validatedPath);
  }

  /**
   * Cria um stream de leitura de forma segura
   * @param filePath - Caminho do arquivo
   * @param allowedBaseDir - Diretório base permitido (opcional)
   * @returns ReadStream do arquivo
   */
  static safeCreateReadStream(filePath: string, allowedBaseDir?: string): fs.ReadStream {
    const validatedPath = this.validateAndNormalizePath(filePath, allowedBaseDir);
    return fs.createReadStream(validatedPath);
  }
}

// 🔒 CORREÇÃO CRÍTICA DE SEGURANÇA: Criptografia AES-256-GCM segura
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96 bits recomendados para GCM
const TAG_LENGTH = 16; // 128 bits auth tag

/**
 * Obtém chave de criptografia de 32 bytes (obrigatória)
 */
function getEncryptionKey(): Buffer {
  const keyEnv = process.env.CERTIFICATE_ENCRYPTION_KEY;
  if (!keyEnv) {
    throw new Error('CRITICAL: CERTIFICATE_ENCRYPTION_KEY environment variable is required');
  }
  
  try {
    // Tentar interpretar como base64 primeiro
    const key = Buffer.from(keyEnv, 'base64');
    if (key.length === 32) {
      return key;
    }
  } catch (e) {
    // Se não for base64 válido, usar hash SHA-256
  }
  
  // Usar SHA-256 da string para garantir 32 bytes
  const key = crypto.createHash('sha256').update(keyEnv, 'utf8').digest();
  return key;
}

/**
 * Criptografa uma senha usando AES-256-GCM (seguro com proteção de integridade)
 */
export function encryptPassword(password: string): string {
  try {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    
    let encrypted = cipher.update(password, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    // Formato: base64(iv):base64(authTag):encrypted_hex
    return Buffer.from(iv).toString('base64') + ':' + 
           Buffer.from(authTag).toString('base64') + ':' + 
           encrypted;
  } catch (error) {
    console.error('❌ Erro ao criptografar senha:', error);
    throw new Error('Falha na criptografia da senha do certificado');
  }
}

/**
 * Descriptografa uma senha usando AES-256-GCM (verificação de integridade)
 */
export function decryptPassword(encryptedPassword: string): string {
  try {
    const parts = encryptedPassword.split(':');
    if (parts.length !== 3) {
      throw new Error('Formato de senha criptografada inválido (esperado iv:tag:ciphertext)');
    }
    
    const key = getEncryptionKey();
    const iv = Buffer.from(parts[0], 'base64');
    const authTag = Buffer.from(parts[1], 'base64');
    const encryptedText = parts[2];
    
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('❌ Erro ao descriptografar senha:', error);
    throw new Error('Falha ao descriptografar senha do certificado - senha pode ter sido corrompida');
  }
}

/**
 * Valida se a chave de criptografia está configurada corretamente
 */
export function validateEncryptionSetup(): void {
  try {
    getEncryptionKey();
    console.log('✅ Chave de criptografia configurada corretamente');
  } catch (error) {
    console.error('❌ CRITICAL: Configuração de criptografia inválida');
    throw error;
  }
}