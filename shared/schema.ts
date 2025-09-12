import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, index, unique, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table for Replit Auth
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// Users table - foundation for multi-user system
// Updated to support Replit Auth while maintaining backward compatibility
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`), // Keep existing ID type
  username: text("username").unique(), // Made optional for Replit Auth
  passwordHash: text("password_hash"), // Made optional for Replit Auth
  email: text("email").unique(), // Required for Replit Auth
  firstName: text("first_name"), // Replit Auth field
  lastName: text("last_name"), // Replit Auth field  
  profileImageUrl: text("profile_image_url"), // Replit Auth field
  name: text("name"), // Legacy field for backward compatibility
  role: text("role").notNull().default("user"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow(), // Required for Replit Auth
});

// Templates table - user-isolated document templates
export const templates = pgTable("templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  storageRef: text("storage_ref").notNull(), // Path to template file
  variables: text("variables").array().notNull().default(sql`'{}'::text[]`),
  originalFilename: text("original_filename"),
  mimeType: text("mime_type"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index("templates_user_id_idx").on(table.userId),
  userNameUnique: unique("templates_user_name_unique").on(table.userId, table.name),
}));

// Certificates table - user-isolated digital certificates
export const certificates = pgTable("certificates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  storageRef: text("storage_ref").notNull(), // Path to encrypted certificate file
  passwordHash: text("password_hash"), // Hash irreversível (deprecated)
  encryptedPassword: text("encrypted_password"), // Senha criptografada (reversível para assinatura)
  serial: text("serial"),
  type: text("type").notNull().default("A3"), // A1, A3, etc.
  validFrom: text("valid_from"),
  validTo: text("valid_to"),
  originalFilename: text("original_filename"),
  mimeType: text("mime_type"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index("certificates_user_id_idx").on(table.userId),
}));

// Batches table - for batch document generation
export const batches = pgTable("batches", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  label: text("label").notNull(),
  templateId: varchar("template_id").references(() => templates.id, { onDelete: "set null" }),
  status: text("status").notNull().default("processing"), // processing, completed, failed
  totalDocuments: text("total_documents").notNull().default("0"),
  completedDocuments: text("completed_documents").notNull().default("0"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index("batches_user_id_idx").on(table.userId),
  templateIdIdx: index("batches_template_id_idx").on(table.templateId),
}));

// Documents table - generated documents and uploaded documents
export const documents = pgTable("documents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  templateId: varchar("template_id").references(() => templates.id, { onDelete: "set null" }),
  batchId: varchar("batch_id").references(() => batches.id, { onDelete: "set null" }),
  filename: text("filename").notNull(),
  status: text("status").notNull().default("processing"), // processing, ready, signed, failed
  storageRef: text("storage_ref"), // Path to generated document
  variables: text("variables"), // JSON string of variables used
  source: text("source").notNull().default("template"), // template, upload - distinguishes generated vs uploaded docs
  originalFilename: text("original_filename"), // For uploaded files
  mimeType: text("mime_type"), // For uploaded files
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index("documents_user_id_idx").on(table.userId),
  templateIdIdx: index("documents_template_id_idx").on(table.templateId),
  batchIdIdx: index("documents_batch_id_idx").on(table.batchId),
  userCreatedAtIdx: index("documents_user_created_at_idx").on(table.userId, table.createdAt),
}));

// Signatures table - signature history
export const signatures = pgTable("signatures", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  documentId: varchar("document_id").notNull().references(() => documents.id, { onDelete: "cascade" }),
  certificateId: varchar("certificate_id").references(() => certificates.id, { onDelete: "set null" }),
  provider: text("provider").notNull().default("FPDI/TCPDF"), // Signature provider
  status: text("status").notNull().default("processing"), // processing, completed, failed
  signedAt: timestamp("signed_at"),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index("signatures_user_id_idx").on(table.userId),
  documentIdIdx: index("signatures_document_id_idx").on(table.documentId),
  certificateIdIdx: index("signatures_certificate_id_idx").on(table.certificateId),
}));

// Activity log table - for history tracking
export const activityLog = pgTable("activity_log", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: text("type").notNull(), // template, document, signature, system
  action: text("action").notNull(), // document_generated, document_signed, template_uploaded, etc.
  refId: text("ref_id"), // ID of the related entity
  status: text("status").notNull(), // success, error, warning
  message: text("message").notNull(),
  details: text("details"),
  documentName: text("document_name"),
  template: text("template"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index("activity_log_user_id_idx").on(table.userId),
  userCreatedAtIdx: index("activity_log_user_created_at_idx").on(table.userId, table.createdAt),
  typeIdx: index("activity_log_type_idx").on(table.type),
}));

// Insert schemas with validation
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  email: true,
  name: true,
  role: true,
}).extend({
  password: z.string().min(6, "Password must be at least 6 characters"),
});

// Replit Auth user upsert schema
export const upsertUserSchema = createInsertSchema(users).pick({
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  profileImageUrl: true,
});

export const insertTemplateSchema = createInsertSchema(templates).omit({
  id: true,
  userId: true,
  createdAt: true,
});

export const insertCertificateSchema = createInsertSchema(certificates).omit({
  id: true,
  userId: true,
  createdAt: true,
});

export const insertBatchSchema = createInsertSchema(batches).omit({
  id: true,
  userId: true,
  createdAt: true,
});

export const insertDocumentSchema = createInsertSchema(documents).omit({
  id: true,
  userId: true,
  createdAt: true,
});

export const insertSignatureSchema = createInsertSchema(signatures).omit({
  id: true,
  userId: true,
  createdAt: true,
});

export const insertActivityLogSchema = createInsertSchema(activityLog).omit({
  id: true,
  userId: true,
  createdAt: true,
});

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type UpsertUser = z.infer<typeof upsertUserSchema>; // For Replit Auth
export type User = typeof users.$inferSelect;

export type InsertTemplate = z.infer<typeof insertTemplateSchema>;
export type Template = typeof templates.$inferSelect;

export type InsertCertificate = z.infer<typeof insertCertificateSchema>;
export type Certificate = typeof certificates.$inferSelect;

export type InsertBatch = z.infer<typeof insertBatchSchema>;
export type Batch = typeof batches.$inferSelect;

export type InsertDocument = z.infer<typeof insertDocumentSchema>;
export type Document = typeof documents.$inferSelect;

export type InsertSignature = z.infer<typeof insertSignatureSchema>;
export type Signature = typeof signatures.$inferSelect;

export type InsertActivityLog = z.infer<typeof insertActivityLogSchema>;
export type ActivityLog = typeof activityLog.$inferSelect;