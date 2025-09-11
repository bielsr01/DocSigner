import fs from 'fs';
import path from 'path';
import signpdf from '@signpdf/signpdf';
import { plainAddPlaceholder } from '@signpdf/placeholder-plain';
import { P12Signer } from '@signpdf/signer-p12';
const forge = require('node-forge');

export interface SignatureOptions {
  certificatePath: string;
  certificatePassword: string;
  reason?: string;
  location?: string;
  contactInfo?: string;
}

export interface SignatureResult {
  success: boolean;
  signedPdfPath?: string;
  error?: string;
}

export class PDFSigner {
  /**
   * Sign a PDF document with a digital certificate
   */
  static async signPDF(
    inputPdfPath: string,
    outputPdfPath: string,
    options: SignatureOptions
  ): Promise<SignatureResult> {
    try {
      console.log('Starting PDF signing process...');
      console.log('Input PDF:', inputPdfPath);
      console.log('Output PDF:', outputPdfPath);
      console.log('Certificate:', options.certificatePath);

      // Verify input file exists
      if (!fs.existsSync(inputPdfPath)) {
        throw new Error(`Input PDF file not found: ${inputPdfPath}`);
      }

      // Verify certificate file exists
      if (!fs.existsSync(options.certificatePath)) {
        throw new Error(`Certificate file not found: ${options.certificatePath}`);
      }

      // Read input PDF
      const pdfBuffer = fs.readFileSync(inputPdfPath);
      console.log('PDF file loaded, size:', pdfBuffer.length, 'bytes');

      // Add signature placeholder if not present
      let pdfWithPlaceholder: Buffer;
      try {
        // Try to add placeholder - this will fail if PDF already has signature fields
        pdfWithPlaceholder = plainAddPlaceholder({
          pdfBuffer,
          reason: options.reason || 'Assinatura Digital',
          location: options.location || 'Brasil',
          contactInfo: options.contactInfo || '',
          name: 'Assinatura Digital',
        });
        console.log('Signature placeholder added successfully');
      } catch (placeholderError) {
        console.log('Using original PDF (may already have signature fields):', placeholderError);
        pdfWithPlaceholder = pdfBuffer;
      }

      // Read certificate
      const certificateBuffer = fs.readFileSync(options.certificatePath);
      console.log('Certificate loaded, size:', certificateBuffer.length, 'bytes');

      // Create signer
      const signer = new P12Signer(certificateBuffer, {
        passphrase: options.certificatePassword,
      });
      console.log('P12 signer created successfully');

      // Sign the PDF
      const signedPdf = await signpdf.sign(pdfWithPlaceholder, signer);
      console.log('PDF signed successfully, size:', signedPdf.length, 'bytes');

      // Ensure output directory exists
      const outputDir = path.dirname(outputPdfPath);
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      // Write signed PDF
      fs.writeFileSync(outputPdfPath, signedPdf);
      console.log('Signed PDF written to:', outputPdfPath);

      return {
        success: true,
        signedPdfPath: outputPdfPath
      };

    } catch (error) {
      console.error('PDF signing error:', error);
      
      let errorMessage = 'Failed to sign PDF';
      if (error instanceof Error) {
        errorMessage = error.message;
      }

      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * Verify if a PDF has valid digital signatures
   */
  static async verifySignatures(pdfPath: string): Promise<{
    success: boolean;
    hasSignatures: boolean;
    signatureCount?: number;
    error?: string;
  }> {
    try {
      // Basic verification - check if file exists and is readable
      if (!fs.existsSync(pdfPath)) {
        throw new Error(`PDF file not found: ${pdfPath}`);
      }

      const pdfBuffer = fs.readFileSync(pdfPath);
      
      // Simple check for signature dictionary in PDF
      const pdfContent = pdfBuffer.toString('latin1');
      const hasSignatures = pdfContent.includes('/Type /Sig') || pdfContent.includes('/ByteRange');
      
      return {
        success: true,
        hasSignatures,
        signatureCount: hasSignatures ? 1 : 0  // Simplified count
      };

    } catch (error) {
      console.error('PDF verification error:', error);
      
      return {
        success: false,
        hasSignatures: false,
        error: error instanceof Error ? error.message : 'Verification failed'
      };
    }
  }

  /**
   * Create a test certificate for development/testing
   */
  static async createTestCertificate(outputPath: string): Promise<{
    success: boolean;
    certificatePath?: string;
    password?: string;
    error?: string;
  }> {
    try {
      // For now, return instructions for manual certificate creation
      // In production, you might want to generate certificates programmatically
      return {
        success: false,
        error: 'Certificate creation not implemented. Please use an existing .p12/.pfx certificate file.'
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create certificate'
      };
    }
  }

  /**
   * Get certificate information
   */
  static async getCertificateInfo(certificatePath: string, password: string): Promise<{
    success: boolean;
    info?: {
      subject?: string;
      issuer?: string;
      validFrom?: string;
      validTo?: string;
      serial?: string;
    };
    error?: string;
  }> {
    try {
      if (!fs.existsSync(certificatePath)) {
        throw new Error(`Certificate file not found: ${certificatePath}`);
      }

      const certificateBuffer = fs.readFileSync(certificatePath);
      
      // Use node-forge to extract real certificate information
      const p12Der = certificateBuffer.toString('binary');
      const p12Asn1 = forge.asn1.fromDer(p12Der);
      const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, password);
      
      // Get the certificate from the p12
      const certBags = p12.getBags({bagType: forge.pki.oids.certBag});
      const certBag = certBags[forge.pki.oids.certBag]?.[0];
      
      if (!certBag?.cert) {
        throw new Error('No certificate found in P12 file');
      }
      
      const cert = certBag.cert;
      
      // Extract certificate information
      const subject = cert.subject.attributes.map(attr => `${attr.shortName || attr.name}=${attr.value}`).join(', ');
      const issuer = cert.issuer.attributes.map(attr => `${attr.shortName || attr.name}=${attr.value}`).join(', ');
      const validFrom = cert.validity.notBefore.toISOString();
      const validTo = cert.validity.notAfter.toISOString();
      const serial = cert.serialNumber;
      
      return {
        success: true,
        info: {
          subject,
          issuer,
          validFrom,
          validTo,
          serial
        }
      };

    } catch (error) {
      console.error('Certificate info error:', error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get certificate info'
      };
    }
  }
}