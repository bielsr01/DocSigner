import fs from 'fs';
import path from 'path';
import forge from 'node-forge';

export class CertificateReader {
  /**
   * Get certificate information from a P12/PFX file
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