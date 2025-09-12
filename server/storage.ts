import { 
  type User, 
  type InsertUser,
  type UpsertUser,
  type Template,
  type InsertTemplate,
  type Certificate,
  type InsertCertificate,
  type Batch,
  type InsertBatch,
  type Document,
  type InsertDocument,
  type Signature,
  type InsertSignature,
  type ActivityLog,
  type InsertActivityLog,
  users,
  templates,
  certificates,
  batches,
  documents,
  signatures,
  activityLog
} from "@shared/schema";
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { eq, and, desc } from "drizzle-orm";

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql);

export interface IStorage {
  // User methods
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  // (IMPORTANT) these user operations are mandatory for Replit Auth.
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Template methods
  getTemplates(userId: string): Promise<Template[]>;
  getTemplate(id: string, userId: string): Promise<Template | undefined>;
  createTemplate(template: InsertTemplate, userId: string): Promise<Template>;
  updateTemplate(id: string, template: Partial<InsertTemplate>, userId: string): Promise<Template | undefined>;
  deleteTemplate(id: string, userId: string): Promise<boolean>;
  
  // Certificate methods
  getCertificates(userId: string): Promise<Certificate[]>;
  getCertificate(id: string, userId: string): Promise<Certificate | undefined>;
  getFirstActiveCertificate(userId: string): Promise<Certificate | undefined>;
  createCertificate(certificate: InsertCertificate, userId: string): Promise<Certificate>;
  updateCertificate(id: string, certificate: Partial<InsertCertificate>, userId: string): Promise<Certificate | undefined>;
  deleteCertificate(id: string, userId: string): Promise<boolean>;
  
  // Batch methods
  getBatches(userId: string): Promise<Batch[]>;
  getBatch(id: string, userId: string): Promise<Batch | undefined>;
  createBatch(batch: InsertBatch, userId: string): Promise<Batch>;
  updateBatch(id: string, batch: Partial<InsertBatch>, userId: string): Promise<Batch | undefined>;
  
  // Document methods
  getDocuments(userId: string): Promise<Document[]>;
  getDocument(id: string, userId: string): Promise<Document | undefined>;
  createDocument(document: InsertDocument, userId: string): Promise<Document>;
  updateDocument(id: string, document: Partial<InsertDocument>, userId: string): Promise<Document | undefined>;
  getDocumentsByBatch(batchId: string, userId: string): Promise<Document[]>;
  
  // Signature methods
  getSignatures(userId: string): Promise<Signature[]>;
  getSignature(id: string, userId: string): Promise<Signature | undefined>;
  createSignature(signature: InsertSignature, userId: string): Promise<Signature>;
  updateSignature(id: string, signature: Partial<InsertSignature>, userId: string): Promise<Signature | undefined>;
  getSignaturesByDocument(documentId: string, userId: string): Promise<Signature[]>;
  
  // Activity log methods
  getActivityLog(userId: string, limit?: number): Promise<ActivityLog[]>;
  createActivityLog(activity: InsertActivityLog, userId: string): Promise<ActivityLog>;
}

export class DatabaseStorage implements IStorage {
  // User methods
  async getUser(id: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.username, username)).limit(1);
    return result[0];
  }

  async createUser(user: InsertUser & { passwordHash: string }): Promise<User> {
    const result = await db.insert(users).values({
      username: user.username,
      passwordHash: user.passwordHash,
      email: user.email,
      name: user.name,
      role: user.role || "user",
    }).returning();
    return result[0];
  }

  // (IMPORTANT) upsertUser method is mandatory for Replit Auth.
  async upsertUser(userData: UpsertUser): Promise<User> {
    const result = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return result[0];
  }

  // Template methods
  async getTemplates(userId: string): Promise<Template[]> {
    return await db.select().from(templates).where(eq(templates.userId, userId)).orderBy(desc(templates.createdAt));
  }

  async getTemplate(id: string, userId: string): Promise<Template | undefined> {
    const result = await db.select().from(templates).where(and(eq(templates.id, id), eq(templates.userId, userId))).limit(1);
    return result[0];
  }

  async createTemplate(template: InsertTemplate, userId: string): Promise<Template> {
    const result = await db.insert(templates).values({
      ...template,
      userId,
    }).returning();
    return result[0];
  }

  async updateTemplate(id: string, template: Partial<InsertTemplate>, userId: string): Promise<Template | undefined> {
    const result = await db.update(templates)
      .set(template)
      .where(and(eq(templates.id, id), eq(templates.userId, userId)))
      .returning();
    return result[0];
  }

  async deleteTemplate(id: string, userId: string): Promise<boolean> {
    const result = await db.delete(templates).where(and(eq(templates.id, id), eq(templates.userId, userId))).returning({ id: templates.id });
    return result.length > 0;
  }

  // Certificate methods
  async getCertificates(userId: string): Promise<Certificate[]> {
    return await db.select().from(certificates).where(eq(certificates.userId, userId)).orderBy(desc(certificates.createdAt));
  }

  async getCertificate(id: string, userId: string): Promise<Certificate | undefined> {
    const result = await db.select().from(certificates).where(and(eq(certificates.id, id), eq(certificates.userId, userId))).limit(1);
    return result[0];
  }

  async getFirstActiveCertificate(userId: string): Promise<Certificate | undefined> {
    // Buscar todos os certificados do usuário que têm dados de validade
    const allCertificates = await db.select().from(certificates)
      .where(eq(certificates.userId, userId))
      .orderBy(desc(certificates.createdAt));
    
    // Filtrar certificados válidos baseado em validFrom/validTo
    const now = new Date();
    const validCertificates = allCertificates.filter(cert => {
      // Verificar se campos de validade estão preenchidos
      if (!cert.validFrom || !cert.validTo) {
        console.log(`⚠️ Certificado "${cert.name}" não possui dados de validade completos`);
        return false;
      }
      
      try {
        // Parsear datas de validade
        const validFrom = new Date(cert.validFrom);
        const validTo = new Date(cert.validTo);
        
        // Verificar se as datas são válidas
        if (isNaN(validFrom.getTime()) || isNaN(validTo.getTime())) {
          console.log(`⚠️ Certificado "${cert.name}" possui datas de validade inválidas`);
          return false;
        }
        
        // Verificar se certificado está dentro do período de validade
        const isValid = now >= validFrom && now <= validTo;
        
        if (!isValid) {
          if (now < validFrom) {
            console.log(`⚠️ Certificado "${cert.name}" ainda não é válido (válido a partir de ${validFrom.toISOString()})`);
          } else {
            console.log(`⚠️ Certificado "${cert.name}" expirado (válido até ${validTo.toISOString()})`);
          }
        } else {
          console.log(`✅ Certificado "${cert.name}" válido (expires ${validTo.toISOString()})`);
        }
        
        return isValid;
        
      } catch (dateError) {
        console.error(`❌ Erro ao parsear datas de validade do certificado "${cert.name}":`, dateError);
        return false;
      }
    });
    
    if (validCertificates.length === 0) {
      console.log('⚠️ Nenhum certificado válido encontrado para o usuário');
      return undefined;
    }
    
    // Ordenar por data de expiração (certificados que expiram primeiro têm prioridade)
    validCertificates.sort((a, b) => {
      const aValidTo = new Date(a.validTo!);
      const bValidTo = new Date(b.validTo!);
      return aValidTo.getTime() - bValidTo.getTime();
    });
    
    const selectedCert = validCertificates[0];
    console.log(`✅ Certificado selecionado: "${selectedCert.name}" (expires ${selectedCert.validTo})`);
    
    return selectedCert;
  }

  async createCertificate(certificate: InsertCertificate, userId: string): Promise<Certificate> {
    const result = await db.insert(certificates).values({
      ...certificate,
      userId,
    }).returning();
    return result[0];
  }

  async updateCertificate(id: string, certificate: Partial<InsertCertificate>, userId: string): Promise<Certificate | undefined> {
    const result = await db.update(certificates)
      .set(certificate)
      .where(and(eq(certificates.id, id), eq(certificates.userId, userId)))
      .returning();
    return result[0];
  }

  async deleteCertificate(id: string, userId: string): Promise<boolean> {
    const result = await db.delete(certificates).where(and(eq(certificates.id, id), eq(certificates.userId, userId))).returning({ id: certificates.id });
    return result.length > 0;
  }

  // Batch methods
  async getBatches(userId: string): Promise<Batch[]> {
    return await db.select().from(batches).where(eq(batches.userId, userId)).orderBy(desc(batches.createdAt));
  }

  async getBatch(id: string, userId: string): Promise<Batch | undefined> {
    const result = await db.select().from(batches).where(and(eq(batches.id, id), eq(batches.userId, userId))).limit(1);
    return result[0];
  }

  async createBatch(batch: InsertBatch, userId: string): Promise<Batch> {
    const result = await db.insert(batches).values({
      ...batch,
      userId,
    }).returning();
    return result[0];
  }

  async updateBatch(id: string, batch: Partial<InsertBatch>, userId: string): Promise<Batch | undefined> {
    const result = await db.update(batches)
      .set(batch)
      .where(and(eq(batches.id, id), eq(batches.userId, userId)))
      .returning();
    return result[0];
  }

  // Document methods
  async getDocuments(userId: string): Promise<Document[]> {
    return await db.select().from(documents).where(eq(documents.userId, userId)).orderBy(desc(documents.createdAt));
  }

  async getDocument(id: string, userId: string): Promise<Document | undefined> {
    const result = await db.select().from(documents).where(and(eq(documents.id, id), eq(documents.userId, userId))).limit(1);
    return result[0];
  }

  async createDocument(document: InsertDocument, userId: string): Promise<Document> {
    const result = await db.insert(documents).values({
      ...document,
      userId,
    }).returning();
    return result[0];
  }

  async updateDocument(id: string, document: Partial<InsertDocument>, userId: string): Promise<Document | undefined> {
    const result = await db.update(documents)
      .set(document)
      .where(and(eq(documents.id, id), eq(documents.userId, userId)))
      .returning();
    return result[0];
  }

  async getDocumentsByBatch(batchId: string, userId: string): Promise<Document[]> {
    return await db.select().from(documents)
      .where(and(eq(documents.batchId, batchId), eq(documents.userId, userId)))
      .orderBy(desc(documents.createdAt));
  }

  // Signature methods
  async getSignatures(userId: string): Promise<Signature[]> {
    return await db.select().from(signatures).where(eq(signatures.userId, userId)).orderBy(desc(signatures.createdAt));
  }

  async getSignature(id: string, userId: string): Promise<Signature | undefined> {
    const result = await db.select().from(signatures).where(and(eq(signatures.id, id), eq(signatures.userId, userId))).limit(1);
    return result[0];
  }

  async createSignature(signature: InsertSignature, userId: string): Promise<Signature> {
    const result = await db.insert(signatures).values({
      ...signature,
      userId,
    }).returning();
    return result[0];
  }

  async updateSignature(id: string, signature: Partial<InsertSignature>, userId: string): Promise<Signature | undefined> {
    const result = await db.update(signatures)
      .set(signature)
      .where(and(eq(signatures.id, id), eq(signatures.userId, userId)))
      .returning();
    return result[0];
  }

  async getSignaturesByDocument(documentId: string, userId: string): Promise<Signature[]> {
    return await db.select().from(signatures)
      .where(and(eq(signatures.documentId, documentId), eq(signatures.userId, userId)))
      .orderBy(desc(signatures.createdAt));
  }

  // Activity log methods
  async getActivityLog(userId: string, limit: number = 100): Promise<ActivityLog[]> {
    return await db.select().from(activityLog)
      .where(eq(activityLog.userId, userId))
      .orderBy(desc(activityLog.createdAt))
      .limit(limit);
  }

  async createActivityLog(activity: InsertActivityLog, userId: string): Promise<ActivityLog> {
    const result = await db.insert(activityLog).values({
      ...activity,
      userId,
    }).returning();
    return result[0];
  }
}

export const storage = new DatabaseStorage();