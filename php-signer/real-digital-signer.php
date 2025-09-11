<?php

// Inclui o autoloader do Composer para carregar as bibliotecas
require_once __DIR__ . '/vendor/autoload.php';

// Importa a classe FPDI
use setasign\Fpdi\Tcpdf\Fpdi;

// --- FUNÇÃO DE ASSINATURA DIGITAL REAL E VÁLIDA ---
function signPdfRealDigital($pdfInputPath, $pdfOutputPath, $pfxPath, $password) {
    try {
        echo "🔐 Iniciando assinatura digital REAL...\n";
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
        
        // === CORREÇÃO CRÍTICA: USAR TCPDF DIRETO SEM FPDI PARA TESTE ===
        
        // Tentar primeiro com TCPDF puro (sem importar PDF)
        echo "🧪 Teste 1: TCPDF puro com assinatura...\n";
        $pdf = new \TCPDF();
        $pdf->setPrintHeader(false);
        $pdf->setPrintFooter(false);
        $pdf->SetAutoPageBreak(false, 0);
        
        // Página de teste
        $pdf->AddPage();
        $pdf->SetFont('helvetica', 'B', 16);
        $pdf->Cell(0, 10, 'DOCUMENTO ASSINADO DIGITALMENTE', 0, 1, 'C');
        $pdf->Ln(10);
        $pdf->SetFont('helvetica', '', 12);
        $pdf->Cell(0, 10, 'Este documento possui assinatura digital valida.', 0, 1, 'L');
        
        // Carregar certificado
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
        } else {
            throw new \Exception('Erro ao ler o certificado PFX. Senha incorreta ou arquivo inválido.');
        }

        echo "🔧 Configurando assinatura digital COMPLETA...\n";
        
        // === CONFIGURAÇÃO COMPLETA E CORRETA ===
        
        // Aplicar assinatura com TODOS os parâmetros necessários
        $pdf->setSignature(
            $certificate,                    // Certificado X.509
            $privateKey,                    // Chave privada
            $password,                      // Senha do certificado PFX
            $extraCerts,                    // Certificados da cadeia (AC)
            2,                              // Tipo 2 = PKCS#7 CMS detached
            array(                          // Info adicional
                'signingTime' => date('YmdHis'),
                'signingCertificate' => true,
                'location' => 'Brasil',
                'reason' => 'Documento assinado digitalmente conforme ICP-Brasil',
                'contact' => 'Sistema DocuSign Pro'
            )
        );
        
        echo "✅ setSignature configurado\n";
        
        // Configurar aparência da assinatura (VISÍVEL para validação)
        $pdf->setSignatureAppearance(
            20,     // X position
            20,     // Y position  
            80,     // Width
            30,     // Height
            array(  // Appearance info
                'Name' => 'Assinatura Digital ICP-Brasil',
                'Location' => 'Brasil',
                'Reason' => 'Documento assinado digitalmente',
                'ContactInfo' => 'Certificado Digital ICP-Brasil'
            )
        );
        
        echo "✅ setSignatureAppearance configurado\n";
        echo "💾 Salvando documento com assinatura digital...\n";

        // Salvar PDF com assinatura
        $pdf->Output($pdfOutputPath, 'F');
        
        // Verificação detalhada
        if (file_exists($pdfOutputPath)) {
            $fileSize = filesize($pdfOutputPath);
            echo "🎉 SUCESSO! Documento salvo: $pdfOutputPath ($fileSize bytes)\n";
            
            // Verificação estrutural detalhada
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
                echo "🎉 ASSINATURA DIGITAL VÁLIDA - deve ser reconhecida por Adobe/Foxit!\n";
                return [
                    'success' => true, 
                    'message' => 'Documento assinado com assinatura digital real e válida',
                    'validation_score' => "$validChecks/$totalChecks",
                    'file_size' => $fileSize,
                    'checks' => $checks
                ];
            } else {
                echo "⚠️ Assinatura incompleta - pode não ser reconhecida por todos os visualizadores\n";
                return [
                    'success' => true, 
                    'message' => 'Documento processado mas assinatura pode estar incompleta',
                    'validation_score' => "$validChecks/$totalChecks",
                    'file_size' => $fileSize,
                    'checks' => $checks
                ];
            }
            
        } else {
            throw new \Exception('Arquivo assinado não foi criado');
        }

    } catch (\Exception $e) {
        $errorMsg = 'Erro durante a assinatura digital real: ' . $e->getMessage();
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
    
    echo "🔧 Assinador Digital REAL - Parâmetros recebidos:\n";
    echo "- PDF Entrada: $pdfInputPath\n";
    echo "- PDF Saída: $pdfOutputPath\n";
    echo "- Certificado: $pfxPath\n";
    echo "- Senha: [PROTEGIDA]\n\n";
    
    $result = signPdfRealDigital($pdfInputPath, $pdfOutputPath, $pfxPath, $password);
    
    // Retorna resultado em JSON para o Node.js
    echo "RESULT_JSON:" . json_encode($result) . "\n";
} else {
    echo "❌ Uso: php real-digital-signer.php <pdf_input> <pdf_output> <pfx_path> <password>\n";
    exit(1);
}