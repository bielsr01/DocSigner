import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Ensure upload directories exist
const uploadDirs = ['uploads/templates', 'uploads/certificates', 'uploads/documents'];
uploadDirs.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Configure multer storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Determine upload directory based on endpoint
    let uploadDir = 'uploads/documents'; // default
    
    if (req.url.includes('/templates')) {
      uploadDir = 'uploads/templates';
    } else if (req.url.includes('/certificates')) {
      uploadDir = 'uploads/certificates';
    }
    
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Generate unique filename with timestamp and original extension
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const fileExtension = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + fileExtension);
  }
});

// File filter for security
const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Define allowed file types for different endpoints
  const allowedTypes: { [key: string]: string[] } = {
    templates: ['.pdf', '.docx', '.doc'],
    certificates: ['.p12', '.pfx', '.pem', '.cer', '.crt'],
    documents: ['.pdf']
  };
  
  let category = 'documents'; // default
  if (req.url.includes('/templates')) {
    category = 'templates';
  } else if (req.url.includes('/certificates')) {
    category = 'certificates';
  }
  
  const fileExtension = path.extname(file.originalname).toLowerCase();
  const isAllowed = allowedTypes[category].includes(fileExtension);
  
  if (isAllowed) {
    cb(null, true);
  } else {
    cb(new Error(`File type ${fileExtension} not allowed for ${category}`));
  }
};

// Create multer instance with configuration
export const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit per file
    files: 10, // Allow up to 10 files for batch upload
    fieldSize: 1024 * 1024 * 2 // 2MB field size limit
  }
});

// Alternative upload handler for problematic routes
export const uploadFiles = multer({
  dest: 'uploads/documents',
  limits: {
    fileSize: 10 * 1024 * 1024,
    files: 10
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'));
    }
  }
});

// Helper function to get file path for storage reference
export const getStorageRef = (file: Express.Multer.File): string => {
  return file.path; // This will be the full path to the uploaded file
};

// Helper function to generate secure download URLs
export const getSecureDownloadUrl = (entityType: 'templates' | 'certificates' | 'documents', entityId: string): string => {
  return `/api/${entityType}/${entityId}/download`;
};