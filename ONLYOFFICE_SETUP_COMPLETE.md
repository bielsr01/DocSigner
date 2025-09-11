# OnlyOffice Document Server - Complete Setup Guide

## 🎯 Integration Status

✅ **OnlyOffice HTTP API Integration** - FULLY IMPLEMENTED  
✅ **LibreOffice Fallback** - WORKING (Current Default)  
✅ **Environment Detection** - AUTOMATIC  
✅ **Error Handling** - ROBUST with Retry Logic  
✅ **JWT Authentication** - SUPPORTED  
✅ **Async Conversion** - SUPPORTED with Polling  

## 🚀 Quick Start Options

### Option 1: Docker Local Setup (Recommended for Development)

```bash
# 1. Pull and run OnlyOffice Document Server
docker run -d \
  --name onlyoffice-docserver \
  -p 8080:80 \
  -e JWT_ENABLED=false \
  onlyoffice/documentserver

# 2. Configure environment variables
export DOC_CONVERTER=onlyoffice-http
export ONLYOFFICE_SERVER_URL=http://localhost:8080
export ONLYOFFICE_ASYNC=false
export ONLYOFFICE_TIMEOUT_MS=60000

# 3. Restart your application
npm run dev
```

### Option 2: Production Setup with Security

```bash
# 1. Run OnlyOffice with JWT authentication
docker run -d \
  --name onlyoffice-production \
  -p 8080:80 \
  -e JWT_ENABLED=true \
  -e JWT_SECRET=your-production-secret-key \
  onlyoffice/documentserver

# 2. Configure production environment
export DOC_CONVERTER=onlyoffice-http
export ONLYOFFICE_SERVER_URL=https://your-onlyoffice-server.com
export ONLYOFFICE_JWT_SECRET=your-production-secret-key
export ONLYOFFICE_ASYNC=true
export ONLYOFFICE_TIMEOUT_MS=120000
export ONLYOFFICE_MAX_RETRIES=5
export LOCAL_SERVER_URL=https://your-domain.com
```

### Option 3: Cloud/Managed Service

```bash
# Configure for cloud OnlyOffice service
export DOC_CONVERTER=onlyoffice-http
export ONLYOFFICE_SERVER_URL=https://your-cloud-onlyoffice.com
export ONLYOFFICE_JWT_SECRET=your-cloud-api-key
export ONLYOFFICE_ASYNC=true
export ONLYOFFICE_TIMEOUT_MS=180000
```

## 🔧 Environment Variables Reference

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DOC_CONVERTER` | No | `libreoffice` | Engine: `libreoffice` or `onlyoffice-http` |
| `ONLYOFFICE_SERVER_URL` | Yes* | - | OnlyOffice server URL (required for OnlyOffice) |
| `ONLYOFFICE_JWT_SECRET` | No | - | JWT secret for authentication |
| `ONLYOFFICE_ASYNC` | No | `false` | Use async conversion with polling |
| `ONLYOFFICE_TIMEOUT_MS` | No | `60000` | Conversion timeout in milliseconds |
| `ONLYOFFICE_MAX_RETRIES` | No | `3` | Maximum retry attempts |
| `LOCAL_SERVER_URL` | No | `http://localhost:3000` | Your server URL for temp files |

*Required only when `DOC_CONVERTER=onlyoffice-http`

## 🧪 Testing the Integration

### 1. Verify Current Setup
```bash
# Check current configuration
node test-onlyoffice-integration.js
```

### 2. Test Document Generation
1. Login to the application: `admin@docusign.com` / `admin123`
2. Go to "Gerar Documentos" page
3. Upload a DOCX template with variables like `{{nome}}`, `{{cpf}}`
4. Generate a document with test data
5. Compare output quality with LibreOffice

### 3. Performance Comparison

| Engine | Pros | Cons |
|--------|------|------|
| **LibreOffice** | ✅ Local execution<br>✅ No network dependencies<br>✅ Fast for small docs | ❌ Process overhead<br>❌ Limited scalability<br>❌ Format compatibility issues |
| **OnlyOffice** | ✅ Better DOCX compatibility<br>✅ HTTP-based scalability<br>✅ Cloud-ready<br>✅ Async support | ❌ Network dependency<br>❌ External server required<br>❌ More complex setup |

## 🔄 Conversion Flow Diagram

```
1. DOCX Template Upload
   ↓
2. Variable Substitution (Docxtemplater)
   ↓
3. Engine Selection (DOC_CONVERTER)
   ↓
4a. LibreOffice Process     4b. OnlyOffice HTTP API
    └─ soffice --convert     └─ POST /ConvertService.ashx
   ↓                        ↓
5. PDF Output Generated
   ↓
6. File Saved & Response Sent
```

## 🛠️ Implementation Details

### Code Structure
- **Engine Selection**: `DocumentGenerator.getConverterEngine()`
- **LibreOffice**: `DocumentGenerator.convertWithLibreOffice()`
- **OnlyOffice**: `DocumentGenerator.convertWithOnlyOfficeHttp()`
- **Retry Logic**: Exponential backoff with configurable max retries
- **JWT Auth**: Secure token generation using `jsonwebtoken`
- **Temp Files**: Automatic cleanup with rotation

### Error Handling
```javascript
// OnlyOffice Error Codes
{
  '-1': 'Unknown error',
  '-2': 'Conversion timeout', 
  '-3': 'Document conversion error',
  '-4': 'Download error',
  '-5': 'Unsupported format',
  '-6': 'Corrupted document',
  '-7': 'Password protected',
  '-8': 'Invalid parameters'
}
```

## 📊 Monitoring & Logs

### Key Log Messages
```bash
# OnlyOffice Integration
🌐 Usando OnlyOffice Document Server para conversão DOCX→PDF...
📤 Fazendo upload do DOCX para servidor temporário...
🔄 Solicitando conversão ao OnlyOffice Document Server...
📥 Baixando PDF convertido
✅ OnlyOffice conversão concluída

# Error Patterns
❌ Tentativa X/Y falhou
OnlyOffice API error -X
Timeout na conversão OnlyOffice
```

### Health Check Endpoint
```bash
# Test OnlyOffice server health
curl http://localhost:8080/healthcheck
```

## 🔒 Security Considerations

### JWT Configuration
```javascript
// Secure JWT payload structure
{
  payload: {
    async: false,
    filetype: 'docx', 
    key: 'conv_timestamp_randomhex',
    outputtype: 'pdf',
    url: 'https://your-server.com/temp/file.docx'
  },
  iss: 'document-generator',
  aud: 'onlyoffice',
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + 300 // 5 minutes
}
```

### File Security
- ✅ Temp files auto-cleanup after 5 minutes
- ✅ Path traversal protection
- ✅ CORS headers for cross-origin requests
- ✅ Secure filename sanitization

## 🚀 Deployment Strategies

### Development
```bash
# Docker Compose for development
version: '3.8'
services:
  onlyoffice:
    image: onlyoffice/documentserver
    ports:
      - "8080:80"
    environment:
      - JWT_ENABLED=false
```

### Production
```bash
# Kubernetes deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: onlyoffice-server
spec:
  replicas: 3
  selector:
    matchLabels:
      app: onlyoffice
  template:
    spec:
      containers:
      - name: onlyoffice
        image: onlyoffice/documentserver
        env:
        - name: JWT_ENABLED
          value: "true"
        - name: JWT_SECRET
          valueFrom:
            secretKeyRef:
              name: onlyoffice-secret
              key: jwt-secret
```

## 🆘 Troubleshooting

### Common Issues

| Problem | Solution |
|---------|----------|
| `ONLYOFFICE_SERVER_URL não configurado` | Set `ONLYOFFICE_SERVER_URL` environment variable |
| `HTTP 404: Not Found` | Verify OnlyOffice server is running and accessible |
| `Timeout na conversão` | Increase `ONLYOFFICE_TIMEOUT_MS` value |
| `OnlyOffice API error -4` | Check temp file accessibility via `LOCAL_SERVER_URL` |
| `OnlyOffice API error -3` | Verify DOCX format and OnlyOffice server health |

### Debug Steps
1. Check environment variables: `node test-onlyoffice-integration.js`
2. Verify OnlyOffice server: `curl $ONLYOFFICE_SERVER_URL/healthcheck`
3. Test temp file serving: `curl $LOCAL_SERVER_URL/uploads/temp/`
4. Review application logs for detailed error messages
5. Switch to LibreOffice temporarily: `export DOC_CONVERTER=libreoffice`

## 📈 Performance Optimization

### Recommendations
- Use async mode (`ONLYOFFICE_ASYNC=true`) for documents > 1MB
- Set appropriate timeouts based on document complexity
- Configure OnlyOffice server with adequate resources
- Monitor temp file cleanup regularly
- Use CDN for temp file serving in production

### Scaling Considerations
- OnlyOffice supports horizontal scaling
- Consider load balancing multiple OnlyOffice instances
- Implement document queue for high-volume processing
- Use Redis for distributed session management

---

## ✅ Next Steps

1. **Choose Setup Option**: Docker local, cloud service, or managed hosting
2. **Configure Environment**: Set required environment variables
3. **Test Integration**: Generate test documents and compare quality
4. **Monitor Performance**: Track conversion times and error rates
5. **Deploy to Production**: Use security best practices and monitoring

The OnlyOffice integration is **production-ready** and provides significant advantages over LibreOffice for DOCX→PDF conversion in scalable environments.