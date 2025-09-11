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

            // --- Adiciona a assinatura digital ICP-Brasil ---
            $pfxContent = file_get_contents($this->pfxPath);

            // Lê o certificado e a chave privada do arquivo PFX
            if (openssl_pkcs12_read($pfxContent, $certs, $this->password)) {
                $certificate = $certs['cert'];
                $privateKey = $certs['pkey'];
                $extraCerts = $certs['extracerts'] ?? [];
            } else {
                throw new \Exception('Erro ao ler o certificado PFX. Senha incorreta ou arquivo inválido.');
            }

            // Configuração da assinatura digital seguindo padrões ICP-Brasil
            // Tipo de assinatura: 2 = PKCS#7 detached (padrão ICP-Brasil)
            $pdf->setSignature($certificate, $privateKey, $this->password, $extraCerts, 2, array());
            
            // Informações obrigatórias para ICP-Brasil
            $info = array(
                'Name' => 'Assinatura Digital ICP-Brasil',
                'Location' => 'Brasil',
                'Reason' => 'Documento assinado digitalmente conforme MP 2.200-2/2001',
                'ContactInfo' => 'Certificado Digital ICP-Brasil'
            );
            $pdf->setSignatureAppearance(0, 0, 0, 0, $info);
            
            // Configurações adicionais para compatibilidade com validadores ICP-Brasil
            // Usando métodos nativos do TCPDF para garantir compatibilidade
            if (method_exists($pdf, 'setSignatureType')) {
                $pdf->setSignatureType(2); // PKCS#7 detached
            }
            if (method_exists($pdf, 'setSignatureHashAlgorithm')) {
                $pdf->setSignatureHashAlgorithm('sha256'); // SHA-256 obrigatório
            }

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
    // Processa argumentos da linha de comando (SEM senha por segurança)
    $options = getopt('i:o:c:', ['input:', 'output:', 'cert:']);
    
    $inputPdf = $options['i'] ?? $options['input'] ?? null;
    $outputPdf = $options['o'] ?? $options['output'] ?? null;
    $certPath = $options['c'] ?? $options['cert'] ?? null;
    
    if (!$inputPdf || !$outputPdf || !$certPath) {
        echo "Uso: php pdf-signer.php -i <input.pdf> -o <output.pdf> -c <certificate.pfx>\n";
        echo "Ou:  php pdf-signer.php --input=<input.pdf> --output=<output.pdf> --cert=<certificate.pfx>\n";
        echo "IMPORTANTE: A senha do certificado deve ser fornecida via STDIN por motivos de segurança.\n";
        exit(1);
    }
    
    // SEGURANÇA CRÍTICA: Lê senha via STDIN para evitar exposição em logs de processo
    // Detectar se está em modo interativo (TTY) ou automatizado (pipe/spawn)
    $isInteractive = function_exists('posix_isatty') ? posix_isatty(STDIN) : false;
    
    if ($isInteractive) {
        echo "🔐 Digite a senha do certificado: ";
    }
    
    $handle = fopen("php://stdin", "r");
    if ($handle === false) {
        echo "❌ ERRO: Não foi possível ler senha do STDIN\n";
        exit(1);
    }
    
    $password = trim(fgets($handle));
    fclose($handle);
    
    // Validar se senha foi fornecida
    if (empty($password)) {
        echo "❌ ERRO: Senha do certificado é obrigatória\n";
        exit(1);
    }
    
    try {
        $signer = new PdfSigner($certPath, $password);
        $result = $signer->signPdf($inputPdf, $outputPdf);
        
        // Limpar senha da memória por segurança
        $password = null;
        unset($password);
        
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