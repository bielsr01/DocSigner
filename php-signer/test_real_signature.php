<?php
require_once __DIR__ . '/vendor/autoload.php';

// Criar PDF simples e tentar assinatura real
$pdf = new \setasign\Fpdi\Tcpdf\Fpdi();
$pdf->SetAutoPageBreak(false);
$pdf->AddPage();

// Carregar certificado
$pfxPath = '/home/runner/workspace/uploads/certificates/file-1757613999256-864477295.pfx';
$password = '12345678';
$pfxContent = file_get_contents($pfxPath);

if (openssl_pkcs12_read($pfxContent, $certs, $password)) {
    $certificate = $certs['cert'];
    $privateKey = $certs['pkey'];
    
    echo "Certificado carregado com sucesso\n";
    
    // TESTE CRÍTICO: Verificar se setSignature realmente funciona
    try {
        $pdf->setSignature($certificate, $privateKey, $password, '', 2, 'Test');
        echo "setSignature executado SEM erro\n";
        
        // Definir aparência 
        $pdf->setSignatureAppearance(10, 10, 50, 20);
        echo "setSignatureAppearance executado SEM erro\n";
        
        // Salvar teste
        $pdf->Output('/tmp/signature_test.pdf', 'F');
        
        if (file_exists('/tmp/signature_test.pdf')) {
            $size = filesize('/tmp/signature_test.pdf');
            echo "PDF teste criado: $size bytes\n";
            
            // Verificar conteúdo
            $content = file_get_contents('/tmp/signature_test.pdf');
            if (strpos($content, '/ByteRange') !== false) {
                echo "✅ SUCESSO: PDF tem estrutura de assinatura!\n";
            } else {
                echo "❌ FALHA: PDF não tem estrutura de assinatura\n";
            }
        }
        
    } catch (Exception $e) {
        echo "ERRO na assinatura: " . $e->getMessage() . "\n";
    }
} else {
    echo "Falha ao carregar certificado\n";
}
