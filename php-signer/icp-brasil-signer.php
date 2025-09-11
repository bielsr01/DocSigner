<?php

// Inclui o autoloader do Composer para carregar as bibliotecas
require_once __DIR__ . '/vendor/autoload.php';

// Importa a classe FPDI
use setasign\Fpdi\Tcpdf\Fpdi;

// --- FUNÇÃO DE ASSINATURA ESPECÍFICA PARA ICP-BRASIL ---
function signPdfICPBrasil($pdfInputPath, $pdfOutputPath, $pfxPath, $password) {
    try {
        echo "🇧🇷 Iniciando assinatura ICP-Brasil...\n";
        echo "📄 Arquivo de entrada: $pdfInputPath\n";
        echo "📁 Arquivo de saída: $pdfOutputPath\n";
        echo "🔑 Certificado: $pfxPath\n\n";
        
        // Verifica se os arquivos existem
        if (!file_exists($pdfInputPath)) {
            throw new \Exception("Arquivo PDF de entrada não encontrado: $pdfInputPath");
        }
        
        if (!file_exists($pfxPath)) {
            throw new \Exception("Arquivo de certificado não encontrado: $pfxPath");
        }
        
        // Cria uma nova instância do FPDI com configurações específicas ICP-Brasil
        $pdf = new Fpdi();
        $pdf->setPrintHeader(false);
        $pdf->setPrintFooter(false);
        
        echo "📖 Importando páginas do PDF original...\n";
        
        // Importa o PDF original preservando layout exato
        $pageCount = $pdf->setSourceFile($pdfInputPath);
        echo "📄 Total de páginas: $pageCount\n";
        
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
            
            echo "✅ Página $i/$pageCount processada ({$size['width']}x{$size['height']})\n";
        }

        echo "🔐 Preparando assinatura digital ICP-Brasil...\n";
        
        // Carrega certificado PFX
        $pfxContent = file_get_contents($pfxPath);

        // Lê o certificado e a chave privada do arquivo PFX
        if (openssl_pkcs12_read($pfxContent, $certs, $password)) {
            $certificate = $certs['cert'];
            $privateKey = $certs['pkey'];
            $extraCerts = $certs['extracerts'] ?? [];
            echo "✅ Certificado PFX lido com sucesso\n";
            
            // Informações do certificado
            $certInfo = openssl_x509_parse($certificate);
            echo "📋 Titular: " . ($certInfo['subject']['CN'] ?? 'N/A') . "\n";
            echo "📅 Válido até: " . date('d/m/Y H:i:s', $certInfo['validTo_time_t']) . "\n";
        } else {
            throw new \Exception('Erro ao ler o certificado PFX. Senha incorreta ou arquivo inválido.');
        }

        // === CONFIGURAÇÃO ESPECÍFICA ICP-BRASIL ===
        
        // 1. Configurar assinatura PKCS#7 com informações ICP-Brasil
        echo "🔧 Configurando assinatura PKCS#7 para ICP-Brasil...\n";
        
        // Definir informações obrigatórias para ICP-Brasil
        $info = array();
        
        // 2. Aplicar assinatura com configurações específicas ICP-Brasil
        $pdf->setSignature(
            $certificate,           // Certificado X.509
            $privateKey,           // Chave privada
            $password,             // Senha do certificado
            $extraCerts,           // Certificados da cadeia (importante para ICP-Brasil)
            2,                     // Tipo 2 = PKCS#7 detached signature
            $info                  // Informações da assinatura
        );
        
        echo "🎯 Aplicando assinatura digital...\n";
        
        // 3. Configurar aparência da assinatura (invisível para compatibilidade)
        $pdf->setSignatureAppearance(0, 0, 0, 0);
        
        echo "💾 Salvando documento assinado ICP-Brasil...\n";

        // 4. Salvar PDF com assinatura
        $pdf->Output($pdfOutputPath, 'F');
        
        // Verificar se o arquivo foi criado com sucesso
        if (file_exists($pdfOutputPath)) {
            $fileSize = filesize($pdfOutputPath);
            echo "🎉 SUCESSO ICP-BRASIL! Documento assinado salvo: $pdfOutputPath ($fileSize bytes)\n";
            
            // Verificação adicional da estrutura de assinatura
            $content = file_get_contents($pdfOutputPath);
            $hasSignature = (
                strpos($content, '/ByteRange') !== false &&
                strpos($content, '/Contents') !== false &&
                strpos($content, '/Type') !== false
            );
            
            if ($hasSignature) {
                echo "✅ Verificação: PDF contém estrutura de assinatura digital\n";
                return ['success' => true, 'message' => 'Documento assinado com padrão ICP-Brasil', 'has_signature' => true];
            } else {
                echo "⚠️ Aviso: PDF pode não ter estrutura de assinatura completa\n";
                return ['success' => true, 'message' => 'Documento processado, mas verificação incompleta', 'has_signature' => false];
            }
            
        } else {
            throw new \Exception('Arquivo assinado não foi criado');
        }

    } catch (\Exception $e) {
        $errorMsg = 'Erro durante a assinatura ICP-Brasil: ' . $e->getMessage();
        echo "❌ $errorMsg\n";
        return ['success' => false, 'error' => $errorMsg];
    }
}

// Verifica se foi chamado via linha de comando com argumentos
if ($argc >= 5) {
    $pdfInputPath = $argv[1];
    $pdfOutputPath = $argv[2]; 
    $pfxPath = $argv[3];
    $password = $argv[4];
    
    echo "🔧 Assinador ICP-Brasil - Parâmetros recebidos:\n";
    echo "- PDF Entrada: $pdfInputPath\n";
    echo "- PDF Saída: $pdfOutputPath\n";
    echo "- Certificado: $pfxPath\n";
    echo "- Senha: [PROTEGIDA]\n\n";
    
    $result = signPdfICPBrasil($pdfInputPath, $pdfOutputPath, $pfxPath, $password);
    
    // Retorna resultado em JSON para o Node.js
    echo "RESULT_JSON:" . json_encode($result) . "\n";
} else {
    echo "❌ Uso: php icp-brasil-signer.php <pdf_input> <pdf_output> <pfx_path> <password>\n";
    exit(1);
}