# OnlyOffice Document Server HTTP API Integration

## Overview

This system now supports **OnlyOffice Document Server** as an alternative to LibreOffice for DOCX→PDF conversion via HTTP API. The implementation provides:

- ✅ **Synchronous and Asynchronous conversion** with polling
- ✅ **JWT Authentication** support (optional)
- ✅ **Robust error handling** with retry logic
- ✅ **Timeout management** and network resilience
- ✅ **Automatic cleanup** of temporary files
- ✅ **CORS support** for cross-origin requests

## Environment Variables

Configure these environment variables to enable OnlyOffice conversion:

### Required
```bash
# Switch to OnlyOffice engine
DOC_CONVERTER=onlyoffice-http

# OnlyOffice Document Server URL
ONLYOFFICE_SERVER_URL=https://your-onlyoffice-server.com
```

### Optional
```bash
# JWT Secret for authentication (if OnlyOffice has JWT enabled)
ONLYOFFICE_JWT_SECRET=your-secret-key

# Conversion timeout in milliseconds (default: 60000)
ONLYOFFICE_TIMEOUT_MS=120000

# Use async conversion with polling (default: false)
ONLYOFFICE_ASYNC=true

# Maximum retry attempts (default: 3)
ONLYOFFICE_MAX_RETRIES=5

# Local server URL for temp file serving (default: http://localhost:3000)
LOCAL_SERVER_URL=https://your-domain.com
```

## OnlyOffice Document Server Setup

### Option 1: Docker (Recommended)
```bash
# Run OnlyOffice Document Server
docker run -d \
  --name onlyoffice-docserver \
  -p 80:80 \
  -e JWT_ENABLED=false \
  onlyoffice/documentserver

# With JWT enabled (recommended for production)
docker run -d \
  --name onlyoffice-docserver \
  -p 80:80 \
  -e JWT_ENABLED=true \
  -e JWT_SECRET=your-secret-key \
  onlyoffice/documentserver
```

### Option 2: Cloud Service
Use OnlyOffice Cloud or a managed service provider.

## Usage Examples

### Basic Configuration (No Authentication)
```bash
export DOC_CONVERTER=onlyoffice-http
export ONLYOFFICE_SERVER_URL=http://localhost
npm run dev
```

### Production Configuration (With JWT)
```bash
export DOC_CONVERTER=onlyoffice-http
export ONLYOFFICE_SERVER_URL=https://onlyoffice.company.com
export ONLYOFFICE_JWT_SECRET=your-production-secret
export ONLYOFFICE_TIMEOUT_MS=120000
export ONLYOFFICE_ASYNC=true
export LOCAL_SERVER_URL=https://your-domain.com
npm start
```

## API Endpoints

The implementation automatically creates these endpoints:

### Temporary File Serving
```
GET /uploads/temp/{filename}
```
- Serves DOCX files for OnlyOffice to download
- Includes proper CORS headers
- Files expire after 5 minutes

### Cleanup Endpoint (Admin Only)
```
DELETE /api/temp/cleanup
```
- Removes temporary files older than 1 hour
- Requires admin authentication
- Returns cleanup statistics

## Conversion Flow

1. **Upload**: DOCX file is saved to `/uploads/temp/` with public URL
2. **Request**: HTTP POST to OnlyOffice `/ConvertService.ashx` endpoint
3. **Polling**: If async mode, polls conversion status every 2 seconds
4. **Download**: Retrieves converted PDF from OnlyOffice
5. **Cleanup**: Removes temporary files automatically

## Error Handling

### Common Errors and Solutions

| Error | Cause | Solution |
|-------|-------|----------|
| `ONLYOFFICE_SERVER_URL não configurado` | Missing server URL | Set `ONLYOFFICE_SERVER_URL` |
| `HTTP 404: Not Found` | Wrong server URL | Verify OnlyOffice server is running |
| `Timeout na conversão` | Server overloaded | Increase `ONLYOFFICE_TIMEOUT_MS` |
| `OnlyOffice API error -4` | Can't download source | Check `LOCAL_SERVER_URL` accessibility |
| `OnlyOffice API error -3` | Conversion failed | Check document format and OnlyOffice logs |

### Error Codes

| Code | Description | Action |
|------|-------------|--------|
| -1 | Unknown error | Check OnlyOffice server logs |
| -2 | Conversion timeout | Increase timeout or check server |
| -3 | Document conversion error | Verify DOCX format |
| -4 | Download error | Ensure temp files are accessible |
| -5 | Unsupported format | Use supported formats only |
| -6 | Corrupted document | Check source document |
| -7 | Password protected | Remove password protection |

## Performance Tuning

### Synchronous vs Asynchronous

- **Synchronous (`ONLYOFFICE_ASYNC=false`)**: 
  - Faster for small documents
  - Simpler error handling
  - Limited by HTTP timeout

- **Asynchronous (`ONLYOFFICE_ASYNC=true`)**:
  - Better for large documents
  - Supports longer conversions
  - Requires polling implementation

### Optimization Tips

1. **Use async mode for documents > 1MB**
2. **Set appropriate timeouts based on document size**
3. **Monitor temp file cleanup**
4. **Configure OnlyOffice server resources appropriately**

## Security Considerations

1. **Enable JWT authentication in production**
2. **Use HTTPS for OnlyOffice server**
3. **Restrict temp file access with proper CORS**
4. **Regular cleanup of temporary files**
5. **Monitor server access logs**

## Fallback to LibreOffice

If OnlyOffice is unavailable, switch back to LibreOffice:

```bash
export DOC_CONVERTER=libreoffice
```

The system will automatically use LibreOffice without code changes.

## Monitoring and Logs

Monitor these log messages:

- `🌐 Usando OnlyOffice Document Server para conversão DOCX→PDF...`
- `📤 Fazendo upload do DOCX para servidor temporário...`
- `🔄 Solicitando conversão ao OnlyOffice Document Server...`
- `📥 Baixando PDF convertido`
- `✅ OnlyOffice conversão concluída`

Error logs:
- `❌ Tentativa X/Y falhou`
- `OnlyOffice API error -X`
- `Timeout na conversão OnlyOffice`

## Support

For issues:
1. Check OnlyOffice server status
2. Verify environment variables
3. Review application logs
4. Test with LibreOffice fallback
5. Check network connectivity to OnlyOffice server