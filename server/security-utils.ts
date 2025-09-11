import * as path from 'path';
import * as fs from 'fs';

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