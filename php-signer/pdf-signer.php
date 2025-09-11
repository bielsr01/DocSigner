<?php

// Inclui o autoloader do Composer para carregar as bibliotecas
require_once __DIR__ . '/vendor/autoload.php';

// Importa a classe FPDI
use setasign\Fpdi\Tcpdf\Fpdi;

/**
 * Classe para assinatura digital de PDFs usando FPDI/TCPDF
 */
class PdfSigner {
    
    private $pfxPath;
    private $password;
    
    public function __construct($pfxPath, $password) {
        $this->pfxPath = $pfxPath;
        $this->password = $password;
        
        // Valida se o arquivo PFX existe
        if (!file_exists($this->pfxPath)) {
            throw new \Exception("Arquivo de certificado PFX não encontrado: {$this->pfxPath}");
        }
    }
    
    /**
     * Assina um PDF digitalmente
     */
    public function signPdf($pdfInputPath, $pdfOutputPath) {
        try {
            // Valida se o PDF de entrada existe
            if (!file_exists($pdfInputPath)) {
                throw new \Exception("Arquivo PDF de entrada não encontrado: {$pdfInputPath}");
            }
            
            // Cria uma nova instância do FPDI
            $pdf = new Fpdi();
            $pdf->setPrintHeader(false);
            $pdf->setPrintFooter(false);
            
            // Importa o PDF original
            $pageCount = $pdf->setSourceFile($pdfInputPath);
            for ($i = 1; $i <= $pageCount; $i++) {
                $tplId = $pdf->importPage($i);
                $size = $pdf->getTemplateSize($tplId);
                
                // Adiciona uma nova página com as dimensões exatas da página original
                if ($size['width'] > $size['height']) {
                    $pdf->AddPage('L', [$size['width'], $size['height']]);
                } else {
                    $pdf->AddPage('P', [$size['width'], $size['height']]);
                }
                
                // Usa o template e o posiciona para cobrir toda a página
                $pdf->useTemplate($tplId, 0, 0, $size['width'], $size['height']);
            }

            // --- Adiciona a assinatura digital ---
            $pfxContent = file_get_contents($this->pfxPath);

            // Lê o certificado e a chave privada do arquivo PFX
            if (openssl_pkcs12_read($pfxContent, $certs, $this->password)) {
                $certificate = $certs['cert'];
                $privateKey = $certs['pkey'];
            } else {
                throw new \Exception('Erro ao ler o certificado PFX. Senha incorreta ou arquivo inválido.');
            }

            $pdf->setSignature($certificate, $privateKey, $this->password, '', 2, 'Assinatura Digital');
            
            // Define a posição da assinatura (canto inferior direito)
            $pdf->setSignatureAppearance(50, 50, 100, 20);

            // Salva o PDF assinado
            $pdf->Output($pdfOutputPath, 'F');
            
            return [
                'success' => true,
                'message' => "Documento assinado com sucesso: {$pdfOutputPath}",
                'signed_file' => $pdfOutputPath
            ];

        } catch (\Exception $e) {
            return [
                'success' => false,
                'message' => 'Erro durante a assinatura: ' . $e->getMessage(),
                'error' => $e->getMessage()
            ];
        }
    }
}

// --- INTERFACE CLI ---
if (php_sapi_name() === 'cli') {
    // Processa argumentos da linha de comando
    $options = getopt('i:o:c:p:', ['input:', 'output:', 'cert:', 'password:']);
    
    $inputPdf = $options['i'] ?? $options['input'] ?? null;
    $outputPdf = $options['o'] ?? $options['output'] ?? null;
    $certPath = $options['c'] ?? $options['cert'] ?? null;
    $password = $options['p'] ?? $options['password'] ?? null;
    
    if (!$inputPdf || !$outputPdf || !$certPath || !$password) {
        echo "Uso: php pdf-signer.php -i <input.pdf> -o <output.pdf> -c <certificate.pfx> -p <password>\n";
        echo "Ou:  php pdf-signer.php --input=<input.pdf> --output=<output.pdf> --cert=<certificate.pfx> --password=<password>\n";
        exit(1);
    }
    
    try {
        $signer = new PdfSigner($certPath, $password);
        $result = $signer->signPdf($inputPdf, $outputPdf);
        
        if ($result['success']) {
            echo "✅ SUCESSO: {$result['message']}\n";
            exit(0);
        } else {
            echo "❌ ERRO: {$result['message']}\n";
            exit(1);
        }
    } catch (\Exception $e) {
        echo "❌ ERRO FATAL: {$e->getMessage()}\n";
        exit(1);
    }
}