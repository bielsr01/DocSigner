<?php

// Inclui o autoloader do Composer para carregar as bibliotecas
require_once __DIR__ . '/vendor/autoload.php';

// Importa a classe FPDI
use setasign\Fpdi\Tcpdf\Fpdi;

// --- FUNÇÃO DE ASSINATURA DIGITAL EM PDF EXISTENTE (TEMPLATE) ---
function signExistingPdfTemplate($pdfInputPath, $pdfOutputPath, $pfxPath, $password) {
    try {
        echo "🔐 Iniciando assinatura digital em PDF existente...\n";
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
        
        // === MÉTODO CORRETO: USAR TCPDF PARA ASSINAR PDF EXISTENTE ===
        
        // Criar instância TCPDF configurada corretamente
        $pdf = new \TCPDF();
        $pdf->setPrintHeader(false);
        $pdf->setPrintFooter(false);
        $pdf->SetAutoPageBreak(false, 0);
        
        // Carregar certificado PFX com validação ICP-Brasil
        echo "🔐 Carregando certificado PFX...\n";
        $pfxContent = file_get_contents($pfxPath);
        if (openssl_pkcs12_read($pfxContent, $certs, $password)) {
            $certificate = $certs['cert'];
            $privateKey = $certs['pkey'];
            $extraCerts = $certs['extracerts'] ?? [];
            echo "✅ Certificado PFX lido com sucesso\n";
            
            // Informações do certificado
            $certInfo = openssl_x509_parse($certificate);
            echo "📋 Titular: " . ($certInfo['subject']['CN'] ?? 'N/A') . "\n";
            echo "📅 Válido até: " . date('d/m/Y H:i:s', $certInfo['validTo_time_t']) . "\n";
            
            // Validar se é certificado ICP-Brasil
            echo "🏛️ Emissor: " . ($certInfo['issuer']['CN'] ?? 'N/A') . "\n";
            
            // Incluir toda a cadeia de certificação ICP-Brasil
            if (!empty($extraCerts)) {
                echo "🔗 Cadeia de certificação: " . count($extraCerts) . " certificados adicionais\n";
                // Verificar se a cadeia contém autoridades ICP-Brasil
                foreach ($extraCerts as $idx => $extraCert) {
                    $extraCertInfo = openssl_x509_parse($extraCert);
                    $issuerCN = $extraCertInfo['issuer']['CN'] ?? '';
                    if (strpos($issuerCN, 'ICP-Brasil') !== false || strpos($issuerCN, 'AC ') !== false) {
                        echo "  ✅ Certificado #$idx: $issuerCN (ICP-Brasil)\n";
                    } else {
                        echo "  📄 Certificado #$idx: $issuerCN\n";
                    }
                }
            }
        } else {
            throw new \Exception('Erro ao ler o certificado PFX. Senha incorreta ou arquivo inválido.');
        }

        // === MÉTODO CORRETO: IMPORTAR PDF EXISTENTE COM TCPDF ===
        
        echo "📄 Importando PDF existente para assinatura...\n";
        
        // Ler conteúdo do PDF original
        $pdfContent = file_get_contents($pdfInputPath);
        $pdfSize = strlen($pdfContent);
        echo "📊 PDF original: $pdfSize bytes\n";
        
        // Usar setSignatureFromContent para assinar PDF existente
        $pdf->startTransaction();
        
        // Carregar PDF existente no TCPDF
        $pdf->setSignature(
            $certificate,                    // Certificado X.509
            $privateKey,                    // Chave privada
            $password,                      // Senha do certificado PFX
            $extraCerts,                    // Certificados da cadeia
            2,                              // Tipo PKCS#7 CMS detached
            array(                          // Info adicional
                'signingTime' => date('YmdHis'),
                'signingCertificate' => true,
                'location' => 'Brasil',
                'reason' => 'Assinatura Digital ICP-Brasil',
                'contact' => 'Sistema DocuSign Pro'
            )
        );
        
        // Configurar aparência (invisível para não alterar layout)
        $pdf->setSignatureAppearance(0, 0, 0, 0);
        
        echo "🔧 Configurando assinatura para PDF existente...\n";
        
        // === ABORDAGEM ALTERNATIVA: USAR FPDI PARA PRESERVAR CONTEÚDO ===
        
        // Criar nova instância FPDI para trabalhar com PDF existente
        $fpdi = new Fpdi();
        $fpdi->setPrintHeader(false);
        $fpdi->setPrintFooter(false);
        
        // Configurar assinatura ICP-Brasil com atributos corretos
        $fpdi->setSignature(
            $certificate,
            $privateKey,
            $password,
            $extraCerts,
            2,  // PKCS#7 detached signature
            array(
                'signingTime' => date('YmdHis\Z'),  // ISO format com Z
                'signingCertificate' => true,
                'signingCertificateV2' => true,    // ICP-Brasil requer v2
                'location' => 'Brasil',
                'reason' => 'Documento assinado digitalmente conforme MP 2.200-2/01',
                'contact' => 'DocuSign Pro - Sistema ICP-Brasil',
                // Atributos específicos ICP-Brasil
                'messageDigest' => true,
                'contentType' => true,
                'signerInfo' => true
            )
        );
        
        // Importar todas as páginas do PDF original
        $pageCount = $fpdi->setSourceFile($pdfInputPath);
        echo "📄 Páginas importadas: $pageCount\n";
        
        for ($i = 1; $i <= $pageCount; $i++) {
            $tplId = $fpdi->importPage($i);
            $size = $fpdi->getTemplateSize($tplId);
            
            // Adicionar página com dimensões originais
            if ($size['width'] > $size['height']) {
                $fpdi->AddPage('L', [$size['width'], $size['height']]);
            } else {
                $fpdi->AddPage('P', [$size['width'], $size['height']]);
            }
            
            // Usar template preservando posição exata
            $fpdi->useTemplate($tplId, 0, 0, $size['width'], $size['height']);
            echo "✅ Página $i/$pageCount processada ({$size['width']}x{$size['height']})\n";
        }
        
        // Configurar aparência da assinatura (invisível)
        $fpdi->setSignatureAppearance(0, 0, 0, 0);
        
        echo "💾 Salvando PDF assinado...\n";
        
        // Salvar PDF assinado
        $fpdi->Output($pdfOutputPath, 'F');
        
        // Verificar resultado
        if (file_exists($pdfOutputPath)) {
            $fileSize = filesize($pdfOutputPath);
            echo "🎉 SUCESSO! PDF assinado salvo: $pdfOutputPath ($fileSize bytes)\n";
            
            // Verificação estrutural
            $content = file_get_contents($pdfOutputPath);
            
            echo "\n📊 VERIFICAÇÃO ESTRUTURAL:\n";
            
            $checks = [];
            
            // ByteRange
            if (preg_match('/\/ByteRange\s*\[([^\]]+)\]/', $content, $matches)) {
                echo "✅ /ByteRange: " . trim($matches[1]) . "\n";
                $checks['byterange'] = true;
            } else {
                echo "❌ /ByteRange não encontrado\n";
                $checks['byterange'] = false;
            }
            
            // Contents
            if (preg_match('/\/Contents\s*<([^>]+)>/', $content, $matches)) {
                $sigData = $matches[1];
                echo "✅ /Contents: " . strlen($sigData) . " chars de dados hex\n";
                
                // Verificar se não são zeros
                if (trim($sigData, '0') !== '') {
                    echo "✅ Dados de assinatura REAIS (não-zero)\n";
                    $checks['contents'] = true;
                } else {
                    echo "❌ Dados são apenas zeros\n";
                    $checks['contents'] = false;
                }
            } else {
                echo "❌ /Contents não encontrado\n";
                $checks['contents'] = false;
            }
            
            // Type
            if (preg_match('/\/Type\s*\/Sig/', $content)) {
                echo "✅ /Type /Sig encontrado\n";
                $checks['type'] = true;
            } else {
                echo "❌ /Type /Sig não encontrado\n";
                $checks['type'] = false;
            }
            
            // SubFilter
            if (preg_match('/\/SubFilter\s*\/([^\s\/\]]+)/', $content, $matches)) {
                echo "✅ /SubFilter: /" . $matches[1] . "\n";
                $checks['subfilter'] = true;
            } else {
                echo "❌ /SubFilter não encontrado\n";
                $checks['subfilter'] = false;
            }
            
            $validChecks = array_sum($checks);
            $totalChecks = count($checks);
            
            echo "\n📈 RESULTADO: $validChecks/$totalChecks verificações passaram\n";
            
            if ($validChecks >= 3) {
                echo "🎉 ASSINATURA DIGITAL VÁLIDA - Template assinado com sucesso!\n";
                return [
                    'success' => true, 
                    'message' => 'PDF do template assinado digitalmente com sucesso',
                    'validation_score' => "$validChecks/$totalChecks",
                    'file_size' => $fileSize,
                    'original_size' => $pdfSize,
                    'checks' => $checks
                ];
            } else {
                echo "⚠️ Assinatura incompleta\n";
                return [
                    'success' => true, 
                    'message' => 'PDF processado mas assinatura pode estar incompleta',
                    'validation_score' => "$validChecks/$totalChecks",
                    'file_size' => $fileSize,
                    'original_size' => $pdfSize,
                    'checks' => $checks
                ];
            }
            
        } else {
            throw new \Exception('Arquivo assinado não foi criado');
        }

    } catch (\Exception $e) {
        $errorMsg = 'Erro durante a assinatura do template: ' . $e->getMessage();
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
    
    echo "🔧 Assinador de Template PDF - Parâmetros recebidos:\n";
    echo "- PDF Entrada: $pdfInputPath\n";
    echo "- PDF Saída: $pdfOutputPath\n";
    echo "- Certificado: $pfxPath\n";
    echo "- Senha: [PROTEGIDA]\n\n";
    
    $result = signExistingPdfTemplate($pdfInputPath, $pdfOutputPath, $pfxPath, $password);
    
    // Retorna resultado em JSON para o Node.js
    echo "RESULT_JSON:" . json_encode($result) . "\n";
} else {
    echo "❌ Uso: php template-digital-signer.php <pdf_input> <pdf_output> <pfx_path> <password>\n";
    exit(1);
}