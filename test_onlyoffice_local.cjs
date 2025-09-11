#!/usr/bin/env node

/**
 * Teste simples para verificar OnlyOffice Document Builder Local
 */
const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');
const { promisify } = require('util');

const execFileAsync = promisify(execFile);

async function testOnlyOfficeLocal() {
  console.log('🧪 Testando OnlyOffice Document Builder Local...');

  // Path para o binário OnlyOffice
  const builderPath = path.join(__dirname, 'onlyoffice-builder', 'opt', 'onlyoffice', 'documentbuilder', 'docbuilder');
  
  console.log(`📋 Testando binário: ${builderPath}`);
  
  // Verificar se existe
  if (!fs.existsSync(builderPath)) {
    console.log('❌ Binário OnlyOffice não encontrado');
    return false;
  }
  
  // Criar script de teste simples
  const testScript = `
// Teste simples OnlyOffice Document Builder
builder.CreateFile("docx");

// Obter documento ativo
var oDocument = Api.GetDocument();

// Adicionar texto de teste
var oParagraph = oDocument.GetElement(0);
oParagraph.AddText("Teste OnlyOffice Document Builder Local");

// Salvar como PDF
builder.SaveFile("pdf", "${path.join(__dirname, 'temp', 'test_output.pdf')}");
builder.CloseFile();
  `.trim();

  // Criar diretório temp se não existir
  const tempDir = path.join(__dirname, 'temp');
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  // Salvar script
  const scriptPath = path.join(tempDir, 'test_script.docbuilder');
  fs.writeFileSync(scriptPath, testScript, 'utf8');
  
  console.log(`📄 Script criado: ${scriptPath}`);
  console.log(`📄 Conteúdo:\n${testScript}`);

  try {
    // Executar OnlyOffice Document Builder
    console.log('🚀 Executando OnlyOffice Document Builder...');
    
    const { stdout, stderr } = await execFileAsync(builderPath, [scriptPath], {
      timeout: 30000,
      cwd: path.dirname(builderPath)
    });

    if (stdout) {
      console.log('📤 stdout:', stdout);
    }
    
    if (stderr) {
      console.log('📤 stderr:', stderr);
    }

    // Verificar se PDF foi gerado
    const outputPath = path.join(tempDir, 'test_output.pdf');
    if (fs.existsSync(outputPath)) {
      const stats = fs.statSync(outputPath);
      console.log(`✅ PDF gerado com sucesso: ${stats.size} bytes`);
      return true;
    } else {
      console.log('❌ PDF não foi gerado');
      return false;
    }

  } catch (error) {
    console.error('❌ Erro na execução:', error.message);
    return false;
  } finally {
    // Cleanup
    try {
      fs.unlinkSync(scriptPath);
    } catch (e) {
      // ignore
    }
  }
}

// Executar teste
testOnlyOfficeLocal()
  .then(success => {
    console.log(success ? '✅ Teste concluído com sucesso' : '❌ Teste falhou');
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('❌ Erro no teste:', error);
    process.exit(1);
  });