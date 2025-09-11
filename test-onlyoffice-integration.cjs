#!/usr/bin/env node

/**
 * TEST SCRIPT: OnlyOffice Document Server Integration
 * 
 * This script demonstrates the OnlyOffice integration capabilities
 * and provides comprehensive testing instructions.
 */

const fs = require('fs');
const path = require('path');

// Configuration detection
function detectConfiguration() {
    const config = {
        converter: process.env.DOC_CONVERTER || 'libreoffice',
        onlyofficeUrl: process.env.ONLYOFFICE_SERVER_URL,
        jwtSecret: process.env.ONLYOFFICE_JWT_SECRET,
        timeout: process.env.ONLYOFFICE_TIMEOUT_MS || '60000',
        async: process.env.ONLYOFFICE_ASYNC === 'true',
        maxRetries: process.env.ONLYOFFICE_MAX_RETRIES || '3',
        localServerUrl: process.env.LOCAL_SERVER_URL || 'http://localhost:3000'
    };
    
    return config;
}

// Test OnlyOffice configuration
function testOnlyOfficeConfiguration() {
    console.log('🧪 ONLYOFFICE DOCUMENT SERVER - INTEGRATION TEST\n');
    
    const config = detectConfiguration();
    
    console.log('📋 CURRENT CONFIGURATION:');
    console.log(`   Converter Engine: ${config.converter}`);
    console.log(`   OnlyOffice URL: ${config.onlyofficeUrl || 'NOT SET'}`);
    console.log(`   JWT Secret: ${config.jwtSecret ? 'CONFIGURED' : 'DISABLED'}`);
    console.log(`   Timeout: ${config.timeout}ms`);
    console.log(`   Async Mode: ${config.async}`);
    console.log(`   Max Retries: ${config.maxRetries}`);
    console.log(`   Local Server: ${config.localServerUrl}\n`);
    
    // Configuration validation
    if (config.converter === 'onlyoffice-http') {
        console.log('✅ OnlyOffice HTTP converter selected');
        
        if (!config.onlyofficeUrl) {
            console.log('❌ ERROR: ONLYOFFICE_SERVER_URL not configured');
            console.log('   Please set: export ONLYOFFICE_SERVER_URL=http://your-server:port\n');
            return false;
        }
        
        console.log('✅ OnlyOffice server URL configured');
        console.log(`✅ JWT Authentication: ${config.jwtSecret ? 'ENABLED' : 'DISABLED'}`);
        console.log(`✅ Conversion Mode: ${config.async ? 'ASYNC with polling' : 'SYNCHRONOUS'}\n`);
        
        return true;
    } else {
        console.log('📋 LibreOffice converter selected (default)\n');
        return false;
    }
}

// Test template availability
function testTemplateAvailability() {
    console.log('📁 TEMPLATE AVAILABILITY TEST:');
    
    const templateDir = 'uploads/templates';
    
    if (!fs.existsSync(templateDir)) {
        console.log('❌ Templates directory not found');
        return [];
    }
    
    const templates = fs.readdirSync(templateDir)
        .filter(file => file.endsWith('.docx'))
        .map(file => ({
            name: file,
            path: path.join(templateDir, file),
            size: fs.statSync(path.join(templateDir, file)).size
        }));
    
    if (templates.length === 0) {
        console.log('❌ No DOCX templates found');
        return [];
    }
    
    console.log(`✅ Found ${templates.length} DOCX template(s):`);
    templates.forEach(template => {
        console.log(`   • ${template.name} (${Math.round(template.size / 1024)}KB)`);
    });
    
    console.log('');
    return templates;
}

// Generate setup instructions
function generateSetupInstructions() {
    console.log('🔧 SETUP INSTRUCTIONS FOR LOCAL DEVELOPMENT:\n');
    
    console.log('OPTION 1 - Docker Setup (Recommended):');
    console.log('```bash');
    console.log('# Pull and run OnlyOffice Document Server');
    console.log('docker run -d \\');
    console.log('  --name onlyoffice-docserver \\');
    console.log('  -p 8080:80 \\');
    console.log('  -e JWT_ENABLED=false \\');
    console.log('  onlyoffice/documentserver');
    console.log('');
    console.log('# Configure environment variables');
    console.log('export DOC_CONVERTER=onlyoffice-http');
    console.log('export ONLYOFFICE_SERVER_URL=http://localhost:8080');
    console.log('export ONLYOFFICE_ASYNC=false');
    console.log('export ONLYOFFICE_TIMEOUT_MS=60000');
    console.log('```\n');
    
    console.log('OPTION 2 - Docker with JWT Security:');
    console.log('```bash');
    console.log('# Run with JWT authentication');
    console.log('docker run -d \\');
    console.log('  --name onlyoffice-docserver-secure \\');
    console.log('  -p 8080:80 \\');
    console.log('  -e JWT_ENABLED=true \\');
    console.log('  -e JWT_SECRET=your-secret-key \\');
    console.log('  onlyoffice/documentserver');
    console.log('');
    console.log('# Configure with JWT');
    console.log('export DOC_CONVERTER=onlyoffice-http');
    console.log('export ONLYOFFICE_SERVER_URL=http://localhost:8080');
    console.log('export ONLYOFFICE_JWT_SECRET=your-secret-key');
    console.log('export ONLYOFFICE_ASYNC=true  # Recommended for large docs');
    console.log('```\n');
    
    console.log('OPTION 3 - Production Setup:');
    console.log('```bash');
    console.log('# For production environments');
    console.log('export DOC_CONVERTER=onlyoffice-http');
    console.log('export ONLYOFFICE_SERVER_URL=https://your-onlyoffice-server.com');
    console.log('export ONLYOFFICE_JWT_SECRET=your-production-secret');
    console.log('export ONLYOFFICE_ASYNC=true');
    console.log('export ONLYOFFICE_TIMEOUT_MS=120000');
    console.log('export ONLYOFFICE_MAX_RETRIES=5');
    console.log('export LOCAL_SERVER_URL=https://your-domain.com');
    console.log('```\n');
}

// Main test execution
function runIntegrationTest() {
    console.log('🚀 Starting OnlyOffice Integration Test...\n');
    
    const isOnlyOfficeConfigured = testOnlyOfficeConfiguration();
    const templates = testTemplateAvailability();
    
    console.log('📊 TEST SUMMARY:');
    console.log(`   Configuration: ${isOnlyOfficeConfigured ? '✅ OnlyOffice Ready' : '📋 LibreOffice Active'}`);
    console.log(`   Templates: ${templates.length > 0 ? '✅ Available' : '❌ Missing'}`);
    console.log(`   Integration: ${isOnlyOfficeConfigured && templates.length > 0 ? '✅ Ready for Testing' : '⚠️ Setup Required'}\n`);
    
    if (!isOnlyOfficeConfigured) {
        generateSetupInstructions();
    }
    
    console.log('🔄 TESTING WORKFLOW:');
    console.log('1. Configure OnlyOffice server (see instructions above)');
    console.log('2. Upload DOCX template via web interface');
    console.log('3. Generate document with variables');
    console.log('4. Compare OnlyOffice vs LibreOffice output');
    console.log('5. Monitor conversion performance and quality\n');
    
    console.log('📈 BENEFITS OF ONLYOFFICE INTEGRATION:');
    console.log('✅ Better DOCX compatibility and formatting preservation');
    console.log('✅ HTTP-based conversion (no local process dependencies)');
    console.log('✅ Scalable architecture for cloud deployments');
    console.log('✅ Asynchronous conversion support for large documents');
    console.log('✅ Built-in retry logic and error handling');
    console.log('✅ JWT authentication for security');
    console.log('✅ Comprehensive logging and monitoring\n');
}

// Execute the test
if (require.main === module) {
    runIntegrationTest();
}

module.exports = {
    detectConfiguration,
    testOnlyOfficeConfiguration,
    testTemplateAvailability,
    generateSetupInstructions,
    runIntegrationTest
};