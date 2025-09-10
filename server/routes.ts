import type { Express } from "express";
import { createServer, type Server } from "http";
import express from "express";
import bcrypt from "bcryptjs";
import { storage } from "./storage";
import { 
  insertUserSchema,
  insertTemplateSchema,
  insertCertificateSchema,
  insertBatchSchema,
  insertDocumentSchema,
  insertSignatureSchema,
  insertActivityLogSchema
} from "@shared/schema";
import type { User } from "@shared/schema";

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
      
      // Create user
      const user = await storage.createUser({
        ...userData,
        password: hashedPassword
      });
      
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

  app.post("/api/templates", requireAuth, async (req, res) => {
    try {
      const user = (req as any).user;
      
      const templateData = insertTemplateSchema.parse(req.body);
      const template = await storage.createTemplate(templateData, user.id);
      
      // Log activity
      await storage.createActivityLog({
        type: "template",
        action: "template_uploaded",
        refId: template.id,
        status: "success",
        message: `Template "${template.name}" uploaded successfully`,
        details: `${template.variables.length} variables detected`,
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
      
      const templateData = insertTemplateSchema.partial().parse(req.body);
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

  app.post("/api/certificates", requireAuth, async (req, res) => {
    try {
      const user = (req as any).user;
      
      const certificateData = insertCertificateSchema.parse(req.body);
      const certificate = await storage.createCertificate(certificateData, user.id);
      
      // Log activity
      await storage.createActivityLog({
        type: "certificate",
        action: "certificate_uploaded",
        refId: certificate.id,
        status: "success",
        message: `Certificate "${certificate.name}" added successfully`,
        details: `Certificate ${certificate.type} valid until ${certificate.validTo || 'unknown'}`
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
      
      // Create documents
      const createdDocuments = [];
      for (const docData of documentsToGenerate) {
        const document = await storage.createDocument(docData, user.id);
        createdDocuments.push(document);
        
        // Log activity
        await storage.createActivityLog({
          type: "document",
          action: batch ? "batch_generated" : "document_generated",
          refId: document.id,
          status: "success",
          message: batch 
            ? `Document generation started for batch "${batch.label}"`
            : `Document "${document.filename}" generated successfully`,
          details: batch ? `Batch generation with ${documentsToGenerate.length} documents` : "Single document generation",
          documentName: document.filename,
          template: template.name
        }, user.id);
        
        // Create signature for automatic processing
        await storage.createSignature({
          documentId: document.id,
          provider: "FPDI/TCPDF",
          status: "processing"
        }, user.id);
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

  // Signatures routes
  app.get("/api/signatures", requireAuth, async (req, res) => {
    try {
      const user = (req as any).user;
      
      const signatures = await storage.getSignatures(user.id);
      res.json(signatures);
    } catch (error) {
      console.error("Get signatures error:", error);
      res.status(500).json({ error: "Failed to get signatures" });
    }
  });

  app.post("/api/signatures/:id/retry", requireAuth, async (req, res) => {
    try {
      const user = (req as any).user;
      
      const signature = await storage.updateSignature(req.params.id, {
        status: "processing",
        errorMessage: null
      }, user.id);
      
      if (!signature) {
        return res.status(404).json({ error: "Signature not found" });
      }
      
      res.json(signature);
    } catch (error) {
      console.error("Retry signature error:", error);
      res.status(500).json({ error: "Failed to retry signature" });
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

  const httpServer = createServer(app);
  return httpServer;
}