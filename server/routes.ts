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

// Middleware to get current user (placeholder for now)
// In a real app, this would extract from session/JWT
const getCurrentUser = (req: express.Request): User | null => {
  // Mock user for development - replace with real session handling
  return {
    id: "mock-user-id",
    username: "mock-user",
    passwordHash: "hashed",
    email: "mock@example.com",
    name: "Mock User",
    role: "user",
    createdAt: new Date()
  };
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
      
      // Remove password from response
      const { passwordHash, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ error: "Login failed" });
    }
  });

  // Templates routes
  app.get("/api/templates", async (req, res) => {
    try {
      const user = getCurrentUser(req);
      if (!user) return res.status(401).json({ error: "Unauthorized" });
      
      const templates = await storage.getTemplates(user.id);
      res.json(templates);
    } catch (error) {
      console.error("Get templates error:", error);
      res.status(500).json({ error: "Failed to get templates" });
    }
  });

  app.post("/api/templates", async (req, res) => {
    try {
      const user = getCurrentUser(req);
      if (!user) return res.status(401).json({ error: "Unauthorized" });
      
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

  app.get("/api/templates/:id", async (req, res) => {
    try {
      const user = getCurrentUser(req);
      if (!user) return res.status(401).json({ error: "Unauthorized" });
      
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

  app.put("/api/templates/:id", async (req, res) => {
    try {
      const user = getCurrentUser(req);
      if (!user) return res.status(401).json({ error: "Unauthorized" });
      
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

  app.delete("/api/templates/:id", async (req, res) => {
    try {
      const user = getCurrentUser(req);
      if (!user) return res.status(401).json({ error: "Unauthorized" });
      
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
  app.get("/api/certificates", async (req, res) => {
    try {
      const user = getCurrentUser(req);
      if (!user) return res.status(401).json({ error: "Unauthorized" });
      
      const certificates = await storage.getCertificates(user.id);
      res.json(certificates);
    } catch (error) {
      console.error("Get certificates error:", error);
      res.status(500).json({ error: "Failed to get certificates" });
    }
  });

  app.post("/api/certificates", async (req, res) => {
    try {
      const user = getCurrentUser(req);
      if (!user) return res.status(401).json({ error: "Unauthorized" });
      
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

  app.delete("/api/certificates/:id", async (req, res) => {
    try {
      const user = getCurrentUser(req);
      if (!user) return res.status(401).json({ error: "Unauthorized" });
      
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
  app.get("/api/documents", async (req, res) => {
    try {
      const user = getCurrentUser(req);
      if (!user) return res.status(401).json({ error: "Unauthorized" });
      
      const documents = await storage.getDocuments(user.id);
      res.json(documents);
    } catch (error) {
      console.error("Get documents error:", error);
      res.status(500).json({ error: "Failed to get documents" });
    }
  });

  app.post("/api/documents/generate", async (req, res) => {
    try {
      const user = getCurrentUser(req);
      if (!user) return res.status(401).json({ error: "Unauthorized" });
      
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
  app.get("/api/signatures", async (req, res) => {
    try {
      const user = getCurrentUser(req);
      if (!user) return res.status(401).json({ error: "Unauthorized" });
      
      const signatures = await storage.getSignatures(user.id);
      res.json(signatures);
    } catch (error) {
      console.error("Get signatures error:", error);
      res.status(500).json({ error: "Failed to get signatures" });
    }
  });

  app.post("/api/signatures/:id/retry", async (req, res) => {
    try {
      const user = getCurrentUser(req);
      if (!user) return res.status(401).json({ error: "Unauthorized" });
      
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
  app.get("/api/activity", async (req, res) => {
    try {
      const user = getCurrentUser(req);
      if (!user) return res.status(401).json({ error: "Unauthorized" });
      
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