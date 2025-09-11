<?php
require_once __DIR__ . '/vendor/autoload.php';

// Configurar TCPDF para não dar erro de fonte
$pdf = new TCPDF();
$pdf->setPrintHeader(false);
$pdf->setPrintFooter(false);

// Página simples
$pdf->AddPage();
$pdf->SetFont('helvetica', 'B', 16); // Helvetica está sempre disponível
$pdf->Cell(0, 10, 'Teste de Assinatura Digital', 0, 1, 'C');

// Carregar certificado
$pfxPath = '/home/runner/workspace/uploads/certificates/file-1757613999256-864477295.pfx';
$password = '12345678';

$pfxContent = file_get_contents($pfxPath);
if (openssl_pkcs12_read($pfxContent, $certs, $password)) {
    echo "✅ Certificado carregado\n";
    
    // CONFIGURAÇÃO CRÍTICA: Verificar se TCPDF suporta assinatura digital
    try {
        // Método 1: Tentar assinatura básica
        $pdf->setSignature(
            $certs['cert'], 
            $certs['pkey'], 
            $password, 
            '', // Sem certificados extras por enquanto
            2,  // PKCS#7 
            '' // Sem info adicional
        );
        echo "✅ setSignature executado sem erro\n";
        
        // Salvar para teste
        $pdf->Output('/tmp/minimal_signature_test.pdf', 'F');
        
        // Verificar estrutura
        $content = file_get_contents('/tmp/minimal_signature_test.pdf');
        
        if (strpos($content, '/ByteRange') !== false) {
            echo "✅ /ByteRange presente\n";
            
            // Extrair dados da assinatura
            if (preg_match('/\/Contents\s*<([^>]+)>/', $content, $matches)) {
                $signatureData = $matches[1];
                echo "✅ /Contents presente: " . strlen($signatureData) . " chars\n";
                
                // Verificar se não são apenas zeros
                if (trim($signatureData, '0') === '') {
                    echo "❌ PROBLEMA: Assinatura contém apenas ZEROS!\n";
                    echo "   TCPDF não está gerando assinatura real!\n";
                } else {
                    echo "✅ Assinatura contém dados reais\n";
                    echo "   Primeiros 50 chars: " . substr($signatureData, 0, 50) . "...\n";
                }
            } else {
                echo "❌ /Contents não encontrado\n";
            }
        } else {
            echo "❌ /ByteRange não encontrado\n";
        }
        
    } catch (Exception $e) {
        echo "❌ ERRO: " . $e->getMessage() . "\n";
    }
} else {
    echo "❌ Falha ao carregar certificado\n";
}
