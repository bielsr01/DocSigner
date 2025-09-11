import type { Express } from "express";
import { createServer, type Server } from "http";
import express from "express";
import bcrypt from "bcryptjs";
import { storage } from "./storage";
import { upload, getStorageRef } from "./upload";
import { DocumentGenerator } from "./document-generator";
import fs from 'fs';
import path from 'path';
import archiver from 'archiver';
import { 
  insertUserSchema,
  insertTemplateSchema,
  insertCertificateSchema,
  insertBatchSchema,
  insertDocumentSchema,
  insertActivityLogSchema
} from "@shared/schema";
import type { User } from "@shared/schema";
import { CertificateReader } from "./pdf-signer";
import { SecurityUtils } from "./security-utils";

// Extend Express Request to include session user
declare module 'express-session' {
  interface SessionData {
    userId?: string;
  }
}

// Middleware to get current user from session
const getCurrentUser = async (req: express.Request): Promise<User | null> => {
  if (!req.session.userId) {
    return null;
  }
  
  try {
    return await storage.getUser(req.session.userId) || null;
  } catch (error) {
    console.error('Error getting user from session:', error);
    return null;
  }
};

// Authentication middleware
const requireAuth = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const user = await getCurrentUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  // Attach user to request for convenience
  (req as any).user = user;
  next();
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Authentication routes
  app.post("/api/auth/register", async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      
      // Check if user already exists
      const existingUser = await storage.getUserByUsername(userData.username);
      if (existingUser) {
        return res.status(400).json({ error: "Username already exists" });
      }
      
      // Hash password
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      
      // Create user with hashed password
      const user = await storage.createUser({
        username: userData.username,
        email: userData.email,
        name: userData.name,
        role: userData.role,
        passwordHash: hashedPassword
      } as any);
      
      // Create session for new user
      req.session.userId = user.id;
      
      // Remove password from response
      const { passwordHash, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Registration error:", error);
      res.status(400).json({ error: "Invalid user data" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ error: "Username and password required" });
      }
      
      // Find user
      const user = await storage.getUserByUsername(username);
      if (!user) {
        return res.status(401).json({ error: "Invalid credentials" });
      }
      
      // Check password
      const isValidPassword = await bcrypt.compare(password, user.passwordHash);
      if (!isValidPassword) {
        return res.status(401).json({ error: "Invalid credentials" });
      }
      
      // Create session
      req.session.userId = user.id;
      
      // Remove password from response
      const { passwordHash, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ error: "Login failed" });
    }
  });

  app.post("/api/auth/logout", async (req, res) => {
    try {
      req.session.destroy((err) => {
        if (err) {
          console.error('Session destroy error:', err);
          return res.status(500).json({ error: 'Logout failed' });
        }
        res.clearCookie('connect.sid'); // Clear the session cookie
        res.json({ message: 'Logged out successfully' });
      });
    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json({ error: 'Logout failed' });
    }
  });

  app.get("/api/auth/me", async (req, res) => {
    try {
      const user = await getCurrentUser(req);
      if (!user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }
      const { passwordHash, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error('Get user error:', error);
      res.status(500).json({ error: 'Failed to get user' });
    }
  });

  // Templates routes
  app.get("/api/templates", requireAuth, async (req, res) => {
    try {
      const user = (req as any).user;
      
      const templates = await storage.getTemplates(user.id);
      res.json(templates);
    } catch (error) {
      console.error("Get templates error:", error);
      res.status(500).json({ error: "Failed to get templates" });
    }
  });

  app.post("/api/templates", requireAuth, upload.single('file'), async (req, res) => {
    try {
      const user = (req as any).user;
      
      if (!req.file) {
        return res.status(400).json({ error: 'Template file is required' });
      }
      
      // Extract variables from template automatically (PDF and DOCX)
      let extractedVariables: string[] = [];
      try {
        const extension = path.extname(req.file.originalname).toLowerCase();
        if (req.file.mimetype === 'application/pdf' || 
            req.file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
            extension === '.docx' || extension === '.pdf') {
          console.log(`Extracting variables from ${extension} file: ${req.file.originalname}`);
          // Usar variáveis fixas para template NR12
          const templateVariables = ['nome', 'cpf', 'data_conclusao', 'data_assinatura'];
          extractedVariables = templateVariables;
          console.log(`Found ${extractedVariables.length} variables:`, extractedVariables);
        }
      } catch (error) {
        console.error('Error extracting template variables:', error);
        // Continue without variables if extraction fails
      }
      
      // Parse template data from request body
      const templateData = {
        name: req.body.name || path.parse(req.file.originalname).name,
        variables: extractedVariables,
        storageRef: getStorageRef(req.file),
        originalFilename: req.file.originalname,
        mimeType: req.file.mimetype
      };
      
      const validatedData = insertTemplateSchema.parse(templateData);
      const template = await storage.createTemplate(validatedData, user.id);
      
      // Log activity
      await storage.createActivityLog({
        type: "template",
        action: "template_uploaded",
        refId: template.id,
        status: "success",
        message: `Template "${template.name}" uploaded successfully`,
        details: `${template.variables.length} variables detected: ${template.variables.join(', ')}`,
        template: template.name
      }, user.id);
      
      res.json(template);
    } catch (error) {
      console.error("Create template error:", error);
      res.status(400).json({ error: "Invalid template data" });
    }
  });

  app.get("/api/templates/:id", requireAuth, async (req, res) => {
    try {
      const user = (req as any).user;
      
      const template = await storage.getTemplate(req.params.id, user.id);
      if (!template) {
        return res.status(404).json({ error: "Template not found" });
      }
      
      res.json(template);
    } catch (error) {
      console.error("Get template error:", error);
      res.status(500).json({ error: "Failed to get template" });
    }
  });

  app.put("/api/templates/:id", requireAuth, async (req, res) => {
    try {
      const user = (req as any).user;
      
      // Only allow updating safe fields, exclude server-managed fields
      const allowedFields = { name: req.body.name, variables: req.body.variables };
      const templateData = insertTemplateSchema.pick({ name: true, variables: true }).partial().parse(allowedFields);
      const template = await storage.updateTemplate(req.params.id, templateData, user.id);
      
      if (!template) {
        return res.status(404).json({ error: "Template not found" });
      }
      
      res.json(template);
    } catch (error) {
      console.error("Update template error:", error);
      res.status(400).json({ error: "Invalid template data" });
    }
  });

  app.delete("/api/templates/:id", requireAuth, async (req, res) => {
    try {
      const user = (req as any).user;
      
      const deleted = await storage.deleteTemplate(req.params.id, user.id);
      if (!deleted) {
        return res.status(404).json({ error: "Template not found" });
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error("Delete template error:", error);
      res.status(500).json({ error: "Failed to delete template" });
    }
  });

  // Secure file download for templates
  app.get("/api/templates/:id/download", requireAuth, async (req, res) => {
    try {
      const user = (req as any).user;
      const template = await storage.getTemplate(req.params.id, user.id);
      
      if (!template) {
        return res.status(404).json({ error: 'Template not found' });
      }
      
      // SECURITY: Validar path com SecurityUtils para prevenir path traversal
      let filePath: string;
      try {
        filePath = SecurityUtils.validateTemplatePath(template.storageRef);
        
        // Verificar se arquivo existe de forma segura
        if (!SecurityUtils.safeFileExists(template.storageRef, 'uploads')) {
          return res.status(404).json({ error: 'File not found on disk' });
        }
      } catch (securityError: any) {
        console.error('SECURITY: Path validation failed for template download:', securityError.message);
        return res.status(403).json({ error: 'Access denied - invalid file path' });
      }
      
      // Sanitize filename for security
      const safeFilename = (template.originalFilename || 'template').replace(/[^a-zA-Z0-9._-]/g, '_');
      
      // Set appropriate headers with security measures
      res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}"`);  
      res.setHeader('Content-Type', template.mimeType || 'application/octet-stream');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      
      // SECURITY: Stream the file usando SecurityUtils
      const fileStream = SecurityUtils.safeCreateReadStream(template.storageRef, 'uploads');
      fileStream.pipe(res);
    } catch (error) {
      console.error('Template download error:', error);
      res.status(500).json({ error: 'Failed to download template' });
    }
  });

  // Certificates routes
  app.get("/api/certificates", requireAuth, async (req, res) => {
    try {
      const user = (req as any).user;
      
      const certificates = await storage.getCertificates(user.id);
      res.json(certificates);
    } catch (error) {
      console.error("Get certificates error:", error);
      res.status(500).json({ error: "Failed to get certificates" });
    }
  });

  app.post("/api/certificates", requireAuth, upload.single('file'), async (req, res) => {
    try {
      const user = (req as any).user;
      
      if (!req.file) {
        return res.status(400).json({ error: 'Certificate file is required' });
      }
      
      // Validate file type
      const extension = path.extname(req.file.originalname).toLowerCase();
      if (!['.p12', '.pfx'].includes(extension)) {
        return res.status(400).json({ error: 'Only .p12 and .pfx certificate files are supported' });
      }
      
      // Parse certificate data from request body
      const certificateData = {
        name: req.body.name || path.parse(req.file.originalname).name,
        storageRef: getStorageRef(req.file),
        originalFilename: req.file.originalname,
        mimeType: req.file.mimetype,
        type: req.body.type || "A3"
      };
      
      // Try to read certificate info if password provided
      if (req.body.password) {
        try {
          const certInfo = await CertificateReader.getCertificateInfo(
            certificateData.storageRef,
            req.body.password
          );
          
          if (certInfo.success && certInfo.info) {
            (certificateData as any).serial = certInfo.info.serial;
            (certificateData as any).validFrom = certInfo.info.validFrom;
            (certificateData as any).validTo = certInfo.info.validTo;
          }
        } catch (certError) {
          console.log('Warning: Could not read certificate info:', certError);
          // Continue without certificate info - user can still upload
        }
      }
      
      const validatedData = insertCertificateSchema.parse(certificateData);
      const certificate = await storage.createCertificate(validatedData, user.id);
      
      // Log activity
      await storage.createActivityLog({
        type: "certificate",
        action: "certificate_uploaded",
        refId: certificate.id,
        status: "success",
        message: `Certificate "${certificate.name}" uploaded successfully`,
        details: certificate.serial ? `Serial: ${certificate.serial}` : 'Certificate uploaded'
      }, user.id);
      
      res.json(certificate);
    } catch (error) {
      console.error("Create certificate error:", error);
      res.status(400).json({ error: "Invalid certificate data" });
    }
  });

  app.delete("/api/certificates/:id", requireAuth, async (req, res) => {
    try {
      const user = (req as any).user;
      
      const deleted = await storage.deleteCertificate(req.params.id, user.id);
      if (!deleted) {
        return res.status(404).json({ error: "Certificate not found" });
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error("Delete certificate error:", error);
      res.status(500).json({ error: "Failed to delete certificate" });
    }
  });

  // Secure file download for certificates
  app.get("/api/certificates/:id/download", requireAuth, async (req, res) => {
    try {
      const user = (req as any).user;
      const certificate = await storage.getCertificate(req.params.id, user.id);
      
      if (!certificate) {
        return res.status(404).json({ error: 'Certificate not found' });
      }
      
      // Validate and secure the file path
      const uploadsRoot = path.resolve(process.cwd(), 'uploads');
      const requestedPath = path.resolve(process.cwd(), certificate.storageRef);
      
      // Ensure the path is within uploads directory (prevent path traversal)
      const relativePath = path.relative(uploadsRoot, requestedPath);
      if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
        console.error('Path traversal attempt detected:', certificate.storageRef);
        return res.status(403).json({ error: 'Access denied' });
      }
      
      // Check if file exists
      if (!fs.existsSync(requestedPath)) {
        return res.status(404).json({ error: 'File not found on disk' });
      }
      
      const filePath = requestedPath;
      
      // Sanitize filename for security
      const safeFilename = (certificate.originalFilename || 'certificate').replace(/[^a-zA-Z0-9._-]/g, '_');
      
      // Set appropriate headers with security measures
      res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}"`);  
      res.setHeader('Content-Type', certificate.mimeType || 'application/octet-stream');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      
      // Stream the file
      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);
    } catch (error) {
      console.error('Certificate download error:', error);
      res.status(500).json({ error: 'Failed to download certificate' });
    }
  });





  // Documents routes
  app.get("/api/documents", requireAuth, async (req, res) => {
    try {
      const user = (req as any).user;
      
      const documents = await storage.getDocuments(user.id);
      res.json(documents);
    } catch (error) {
      console.error("Get documents error:", error);
      res.status(500).json({ error: "Failed to get documents" });
    }
  });

  app.post("/api/documents/generate", requireAuth, async (req, res) => {
    try {
      const user = (req as any).user;
      
      const { templateId, data, batchData } = req.body;
      
      if (!templateId) {
        return res.status(400).json({ error: "Template ID required" });
      }
      
      // Get template
      const template = await storage.getTemplate(templateId, user.id);
      if (!template) {
        return res.status(404).json({ error: "Template not found" });
      }
      
      let batch: any = null;
      let documentsToGenerate: any[] = [];
      
      if (batchData && Array.isArray(batchData) && batchData.length > 0) {
        // Create batch
        batch = await storage.createBatch({
          label: `Batch_${template.name}_${new Date().toISOString().split('T')[0]}`,
          templateId,
          totalDocuments: batchData.length.toString(),
          completedDocuments: "0"
        }, user.id);
        
        // Create documents for batch
        documentsToGenerate = batchData.map((data, index) => ({
          templateId,
          batchId: batch.id,
          filename: `${template.name}_${index + 1}.pdf`,
          variables: JSON.stringify(data),
          status: "processing"
        }));
      } else if (data) {
        // Single document
        documentsToGenerate = [{
          templateId,
          filename: `${template.name}_${new Date().getTime()}.pdf`,
          variables: JSON.stringify(data),
          status: "processing"
        }];
      } else {
        return res.status(400).json({ error: "Data or batchData required" });
      }
      
      // Create documents and generate PDFs
      const createdDocuments = [];
      let successCount = 0;
      let failCount = 0;
      
      for (const docData of documentsToGenerate) {
        const document = await storage.createDocument(docData, user.id);
        let documentStatus = "failed";
        let errorMessage = "";
        
        try {
          // Generate the actual PDF file
          const outputDir = 'uploads/documents';
          const outputPath = path.join(outputDir, document.filename);
          
          // Ensure output directory exists
          if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
          }
          
          console.log(`Starting PDF generation for document: ${document.filename}`);
          console.log(`Template: ${template.storageRef}, Output: ${outputPath}`);
          
          // Parse variables data
          const variablesData = JSON.parse(docData.variables);
          console.log(`Variables for ${document.filename}:`, variablesData);
          
          // USAR NOVO GERADOR NATIVO NODE.JS COM ASSINATURA AUTOMÁTICA
          console.log('🚀🔐 Usando NOVO DocumentGenerator com assinatura automática');
          try {
            const result = await DocumentGenerator.generateAndSignDocument(
              template.storageRef,
              variablesData,
              outputPath,
              user.id,
              document.id,
              storage
            );
            
            // Usar o valor de retorno para determinar status correto
            documentStatus = result.signed ? "signed" : "ready";
            console.log(`✅ NOVO DocumentGenerator: Documento ${result.signed ? 'assinado' : 'gerado'} com sucesso!`);
          } catch (generatorError: any) {
            console.log('⚠️ NOVO DocumentGenerator com assinatura falhou:', generatorError?.message);
            documentStatus = "failed";
            errorMessage = generatorError?.message || 'Erro na geração/assinatura';
          }

          console.log(`📄 Documento ${document.filename}: Status = ${documentStatus}`);
          
          // Verify the file was actually created (only if not failed)
          if (documentStatus !== "failed" && !fs.existsSync(outputPath)) {
            throw new Error('PDF file was not created successfully');
          }
          
          // Update document with storage reference (status already set by generateAndSignDocument)
          if (documentStatus !== "failed") {
            await storage.updateDocument(document.id, {
              storageRef: outputPath
            }, user.id);
          }
          
          successCount++;
          console.log(`✅ PDF generation process completed for: ${document.filename}`)
          
          
        } catch (pdfError) {
          console.error(`❌ PDF generation failed for document ${document.id} (${document.filename}):`, pdfError);
          errorMessage = pdfError instanceof Error ? pdfError.message : 'Unknown error occurred during PDF generation';
          failCount++;
          
          // Mark document as failed with detailed error information
          await storage.updateDocument(document.id, {
            status: "failed"
          }, user.id);
        }
        
        createdDocuments.push({
          ...document,
          status: documentStatus,
          errorMessage: errorMessage || undefined
        });
        
        // Log activity with accurate status
        await storage.createActivityLog({
          type: "document",
          action: batch ? "batch_generated" : "document_generated",
          refId: document.id,
          status: documentStatus === "ready" ? "success" : "error",
          message: documentStatus === "ready"
            ? (batch 
                ? `Document generated successfully for batch "${batch.label}"`
                : `Document "${document.filename}" generated successfully`)
            : `Document generation failed: ${errorMessage}`,
          details: documentStatus === "ready"
            ? (batch ? `Batch generation with ${documentsToGenerate.length} documents` : "Single document generation")
            : `Error details: ${errorMessage}`,
          documentName: document.filename,
          template: template.name
        }, user.id);
      }
      
      // Update batch completion status if applicable
      if (batch) {
        await storage.updateBatch(batch.id, {
          completedDocuments: successCount.toString(),
          status: failCount > 0 ? "partial" : "completed"
        }, user.id);
        
        console.log(`Batch processing complete: ${successCount} successful, ${failCount} failed`);
      }
      
      res.json({
        batch,
        documents: createdDocuments
      });
    } catch (error) {
      console.error("Generate documents error:", error);
      res.status(500).json({ error: "Failed to generate documents" });
    }
  });



  // Document download route - serves signed PDFs when available
  app.get("/api/documents/:id/download", requireAuth, async (req, res) => {
    try {
      const user = (req as any).user;
      
      const document = await storage.getDocument(req.params.id, user.id);
      if (!document) {
        return res.status(404).json({ error: "Document not found" });
      }
      
      if (!document.storageRef) {
        return res.status(400).json({ error: "Document file not found" });
      }
      
      console.log(`📥 Download request for document ${document.id} - Status: ${document.status}, Filename: ${document.filename}`);
      
      // SECURITY: Validate and secure the file path using SecurityUtils
      let filePath: string;
      let isSignedDocument = false;
      
      try {
        filePath = SecurityUtils.validateDocumentPath(document.storageRef);
        
        // Verificar se arquivo existe de forma segura
        if (!SecurityUtils.safeFileExists(document.storageRef, 'uploads')) {
          return res.status(404).json({ error: 'File not found on disk' });
        }
        
        // Determinar se estamos servindo versão assinada ou não assinada
        isSignedDocument = document.status === 'signed';
        
      } catch (securityError: any) {
        console.error('SECURITY: Path validation failed for document download:', securityError.message);
        return res.status(403).json({ error: 'Access denied - invalid file path' });
      }
      
      // Sanitize filename for security with signed indicator
      let safeFilename = (document.filename || 'document.pdf').replace(/[^a-zA-Z0-9._-]/g, '_');
      
      // Add signed indicator to filename if document is signed
      if (isSignedDocument && !safeFilename.includes('_signed')) {
        const ext = path.extname(safeFilename);
        const baseName = path.basename(safeFilename, ext);
        safeFilename = `${baseName}_signed${ext}`;
      }
      
      console.log(`📄 Serving ${isSignedDocument ? 'SIGNED' : 'NON-SIGNED'} document: ${safeFilename}`);
      
      // Set appropriate headers with security measures
      res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}"`);  
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      
      // Stream the file usando SecurityUtils
      const fileStream = SecurityUtils.safeCreateReadStream(document.storageRef, 'uploads');
      fileStream.pipe(res);
      
      // Log successful download
      await storage.createActivityLog({
        type: 'document',
        action: 'document_downloaded',
        refId: document.id,
        status: 'success',
        message: `${isSignedDocument ? 'Signed' : 'Non-signed'} document downloaded: ${document.filename}`,
        details: `Status: ${document.status} | File: ${safeFilename}`,
        documentName: document.filename
      }, user.id);
      
    } catch (error) {
      console.error('Document download error:', error);
      res.status(500).json({ error: 'Failed to download document' });
    }
  });

  // Batch ZIP download route - includes both ready and signed documents
  app.get("/api/batches/:id/download", requireAuth, async (req, res) => {
    try {
      const user = (req as any).user;
      
      // Get batch info
      const batch = await storage.getBatch(req.params.id, user.id);
      if (!batch) {
        return res.status(404).json({ error: "Batch not found" });
      }
      
      // Get all documents in this batch with status 'ready' OR 'signed'
      const allDocuments = await storage.getDocuments(user.id);
      const documents = allDocuments.filter((doc: any) => doc.batchId === req.params.id);
      if (!documents || documents.length === 0) {
        return res.status(404).json({ error: "No documents found in this batch" });
      }
      
      // Include both ready and signed documents with valid storage references
      const downloadableDocuments = documents.filter((doc: any) => 
        (doc.status === 'ready' || doc.status === 'signed') && doc.storageRef
      );
      
      if (downloadableDocuments.length === 0) {
        return res.status(400).json({ error: "No downloadable documents found in this batch" });
      }
      
      // Count documents by status for logging
      const signedCount = downloadableDocuments.filter(doc => doc.status === 'signed').length;
      const readyCount = downloadableDocuments.filter(doc => doc.status === 'ready').length;
      
      console.log(`📦 Creating ZIP for batch ${batch.id} with ${downloadableDocuments.length} documents (${signedCount} signed, ${readyCount} ready)`);
      
      // Sanitize batch label for filename
      const safeBatchLabel = (batch.label || 'Batch').replace(/[^a-zA-Z0-9._-]/g, '_');
      const zipFilename = `${safeBatchLabel}.zip`;
      
      // Set response headers for ZIP download
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename="${zipFilename}"`);
      res.setHeader('X-Content-Type-Options', 'nosniff');
      
      // Create archiver instance
      const archive = archiver('zip', {
        zlib: { level: 9 } // Maximum compression
      });
      
      // Handle archiver errors
      archive.on('error', (err) => {
        console.error('Archive error:', err);
        if (!res.headersSent) {
          res.status(500).json({ error: 'Failed to create ZIP file' });
        }
      });
      
      // Pipe archive data to the response
      archive.pipe(res);
      
      let filesAdded = 0;
      let signedFilesAdded = 0;
      let readyFilesAdded = 0;
      
      // Add each document to the ZIP
      for (const document of downloadableDocuments) {
        try {
          // SECURITY: Validate and secure the file path using SecurityUtils
          if (!document.storageRef) {
            console.error('Document has no storageRef:', document.id);
            continue;
          }
          
          let validatedPath: string;
          try {
            validatedPath = SecurityUtils.validateDocumentPath(document.storageRef);
            
            // Verificar se arquivo existe de forma segura
            if (!SecurityUtils.safeFileExists(document.storageRef, 'uploads')) {
              console.error('Document file not found on disk:', document.storageRef);
              continue; // Skip this file but continue with others
            }
          } catch (securityError: any) {
            console.error('SECURITY: Path validation failed for document in ZIP:', securityError.message);
            continue; // Skip this file but continue with others
          }
          
          const isSignedDocument = document.status === 'signed';
          
          // Sanitize filename for ZIP entry with signed indicator
          let safeFilename = (document.filename || `document_${document.id}.pdf`).replace(/[^a-zA-Z0-9._-]/g, '_');
          
          // Add signed indicator to filename if document is signed
          if (isSignedDocument && !safeFilename.includes('_signed')) {
            const ext = path.extname(safeFilename);
            const baseName = path.basename(safeFilename, ext);
            safeFilename = `${baseName}_signed${ext}`;
          }
          
          // Add file to archive using SecurityUtils
          const fileStream = SecurityUtils.safeCreateReadStream(document.storageRef, 'uploads');
          archive.append(fileStream, { name: safeFilename });
          
          filesAdded++;
          if (isSignedDocument) {
            signedFilesAdded++;
          } else {
            readyFilesAdded++;
          }
          
          console.log(`📄 Added ${isSignedDocument ? 'SIGNED' : 'READY'} file to ZIP: ${safeFilename}`);
          
        } catch (fileError) {
          console.error(`Error processing document ${document.id}:`, fileError);
          // Continue with other files
        }
      }
      
      if (filesAdded === 0) {
        console.error('No files were added to the ZIP');
        if (!res.headersSent) {
          return res.status(500).json({ error: 'No files could be added to ZIP' });
        }
      }
      
      console.log(`✅ ZIP creation completed: ${filesAdded} files added to ${zipFilename} (${signedFilesAdded} signed, ${readyFilesAdded} ready)`);
      
      // Log successful batch download
      await storage.createActivityLog({
        type: 'document',
        action: 'batch_downloaded',
        refId: batch.id,
        status: 'success',
        message: `Batch ZIP downloaded: ${batch.label} (${filesAdded} documents)`,
        details: `Total: ${filesAdded} files | Signed: ${signedFilesAdded} | Ready: ${readyFilesAdded} | ZIP: ${zipFilename}`
      }, user.id);
      
      // Finalize the archive (this will trigger the 'end' event)
      await archive.finalize();
      
    } catch (error) {
      console.error('Batch download error:', error);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Failed to download batch' });
      }
    }
  });



  // Activity log routes
  app.get("/api/activity", requireAuth, async (req, res) => {
    try {
      const user = (req as any).user;
      
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;
      const activities = await storage.getActivityLog(user.id, limit);
      res.json(activities);
    } catch (error) {
      console.error("Get activity error:", error);
      res.status(500).json({ error: "Failed to get activity log" });
    }
  });

  // Temporary file serving for OnlyOffice Document Server access
  // This route serves DOCX files temporarily so OnlyOffice can download them for conversion
  app.use('/uploads/temp', express.static(path.join(process.cwd(), 'uploads', 'temp'), {
    maxAge: '5m', // Files expire after 5 minutes
    setHeaders: (res, filePath) => {
      // Allow CORS for OnlyOffice server access
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
      
      // Set proper MIME type for DOCX files
      if (filePath.endsWith('.docx')) {
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      }
      
      console.log(`📁 Serving temp file for OnlyOffice: ${path.basename(filePath)}`);
    }
  }));

  // Cleanup route for temporary files (optional, for maintenance)
  app.delete("/api/temp/cleanup", requireAuth, async (req, res) => {
    try {
      const user = (req as any).user;
      
      // Only admins can cleanup temp files
      if (user.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
      }

      const tempDir = path.join(process.cwd(), 'uploads', 'temp');
      
      if (!fs.existsSync(tempDir)) {
        return res.json({ message: 'Temp directory does not exist', filesDeleted: 0 });
      }

      const files = fs.readdirSync(tempDir);
      let deletedCount = 0;
      
      for (const file of files) {
        const filePath = path.join(tempDir, file);
        const stats = fs.statSync(filePath);
        
        // Delete files older than 1 hour
        const oneHourAgo = Date.now() - (60 * 60 * 1000);
        if (stats.mtime.getTime() < oneHourAgo) {
          fs.unlinkSync(filePath);
          deletedCount++;
          console.log(`🗑️ Cleaned up old temp file: ${file}`);
        }
      }
      
      res.json({ 
        message: `Cleanup completed`, 
        filesDeleted: deletedCount,
        remainingFiles: files.length - deletedCount
      });
      
    } catch (error) {
      console.error("Temp cleanup error:", error);
      res.status(500).json({ error: "Failed to cleanup temp files" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}