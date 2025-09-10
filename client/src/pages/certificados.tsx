import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Shield, Upload, Eye, Trash2, AlertTriangle, CheckCircle, Lock, Key } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// TODO: Replace with real data
const mockCertificates = [
  {
    id: '1',
    name: 'Certificado Empresa LTDA',
    issuer: 'ICP-Brasil',
    validFrom: '2024-01-01',
    validTo: '2025-01-01',
    status: 'valid',
    type: 'A3',
    serialNumber: '1A2B3C4D5E'
  },
  {
    id: '2',
    name: 'Certificado Teste',
    issuer: 'AC Teste',
    validFrom: '2023-06-01',
    validTo: '2024-06-01',
    status: 'expired',
    type: 'A1',
    serialNumber: '9Z8Y7X6W5V'
  }
];

export default function CertificadosPage() {
  const [certificates, setCertificates] = useState(mockCertificates);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [uploadData, setUploadData] = useState({ 
    file: null as File | null, 
    password: '', 
    confirmPassword: '' 
  });
  const [activeTab, setActiveTab] = useState('list');

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.name.endsWith('.pfx') || file.name.endsWith('.p12')) {
        setUploadData({ ...uploadData, file });
        console.log('Certificate file selected:', file.name);
      } else {
        alert('Por favor, selecione um arquivo .pfx ou .p12');
      }
    }
  };

  const handleUploadSubmit = () => {
    if (!uploadData.file || !uploadData.password) {
      alert('Por favor, selecione um arquivo e digite a senha');
      return;
    }
    
    if (uploadData.password !== uploadData.confirmPassword) {
      alert('As senhas não coincidem');
      return;
    }
    
    console.log('Uploading certificate:', uploadData.file.name);
    // TODO: Implement actual certificate upload and validation
    
    const newCert = {
      id: Date.now().toString(),
      name: uploadData.file.name.replace(/\.(pfx|p12)$/, ''),
      issuer: 'Validando...',
      validFrom: new Date().toISOString().split('T')[0],
      validTo: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      status: 'valid' as const,
      type: 'A3',
      serialNumber: 'NOVO123456'
    };
    
    setCertificates([newCert, ...certificates]);
    setUploadData({ file: null, password: '', confirmPassword: '' });
    setIsUploadDialogOpen(false);
  };

  const handleCertificateAction = (action: string, certId: string) => {
    console.log(`${action} certificate:`, certId);
    
    if (action === 'delete') {
      setCertificates(prev => prev.filter(cert => cert.id !== certId));
    }
    // TODO: Implement other certificate actions
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'valid':
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Válido</Badge>;
      case 'expired':
        return <Badge variant="destructive">Expirado</Badge>;
      case 'revoked':
        return <Badge variant="secondary">Revogado</Badge>;
      default:
        return <Badge variant="outline">Desconhecido</Badge>;
    }
  };

  return (
    <div className="p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold">Certificados Digitais</h1>
            <p className="text-muted-foreground">Gerencie seus certificados para assinatura digital</p>
          </div>
          
          <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-upload-certificate">
                <Upload className="w-4 h-4 mr-2" />
                Novo Certificado
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Enviar Certificado Digital</DialogTitle>
                <DialogDescription>
                  Faça upload do seu certificado digital (.pfx ou .p12) para poder assinar documentos
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                <Alert>
                  <Lock className="h-4 w-4" />
                  <AlertDescription>
                    Seus certificados são armazenados de forma segura e criptografada
                  </AlertDescription>
                </Alert>
                
                <div>
                  <Label htmlFor="cert-file">Arquivo do Certificado (.pfx, .p12)</Label>
                  <Input
                    id="cert-file"
                    type="file"
                    accept=".pfx,.p12"
                    onChange={handleFileUpload}
                    data-testid="input-certificate-file"
                  />
                </div>
                
                <div>
                  <Label htmlFor="cert-password">Senha do Certificado</Label>
                  <Input
                    id="cert-password"
                    type="password"
                    placeholder="Digite a senha..."
                    value={uploadData.password}
                    onChange={(e) => setUploadData({ ...uploadData, password: e.target.value })}
                    data-testid="input-certificate-password"
                  />
                </div>
                
                <div>
                  <Label htmlFor="cert-confirm-password">Confirmar Senha</Label>
                  <Input
                    id="cert-confirm-password"
                    type="password"
                    placeholder="Confirme a senha..."
                    value={uploadData.confirmPassword}
                    onChange={(e) => setUploadData({ ...uploadData, confirmPassword: e.target.value })}
                    data-testid="input-certificate-confirm-password"
                  />
                </div>
                
                <Button 
                  onClick={handleUploadSubmit} 
                  className="w-full"
                  disabled={!uploadData.file || !uploadData.password || !uploadData.confirmPassword}
                  data-testid="button-submit-certificate"
                >
                  <Shield className="w-4 h-4 mr-2" />
                  Enviar Certificado
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="list" data-testid="tab-certificates-list">Meus Certificados</TabsTrigger>
            <TabsTrigger value="info" data-testid="tab-certificates-info">Informações</TabsTrigger>
          </TabsList>
          
          <TabsContent value="list" className="space-y-4">
            {/* Certificates List */}
            <div className="grid gap-4">
              {certificates.map((certificate) => (
                <Card key={certificate.id}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4">
                        <div className="p-2 bg-primary/10 rounded-lg">
                          <Shield className="w-6 h-6 text-primary" />
                        </div>
                        
                        <div className="space-y-1">
                          <h3 className="font-semibold">{certificate.name}</h3>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span>Emissor: {certificate.issuer}</span>
                            <span>Tipo: {certificate.type}</span>
                            <span>Série: {certificate.serialNumber}</span>
                          </div>
                          <div className="flex items-center gap-4 text-sm">
                            <span>Válido de {certificate.validFrom} até {certificate.validTo}</span>
                            {getStatusBadge(certificate.status)}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => handleCertificateAction('view', certificate.id)}
                          data-testid={`button-view-${certificate.id}`}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => handleCertificateAction('delete', certificate.id)}
                          data-testid={`button-delete-${certificate.id}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              
              {certificates.length === 0 && (
                <div className="text-center py-12">
                  <Shield className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Nenhum certificado encontrado</h3>
                  <p className="text-muted-foreground mb-4">
                    Envie seu primeiro certificado digital para começar a assinar documentos
                  </p>
                  <Button onClick={() => setIsUploadDialogOpen(true)}>
                    <Upload className="w-4 h-4 mr-2" />
                    Enviar Certificado
                  </Button>
                </div>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="info" className="space-y-4">
            <div className="grid gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Key className="w-5 h-5" />
                    Sobre Certificados Digitais
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">Tipos de Certificado</h4>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                      <li><strong>A1:</strong> Armazenado no computador, válido por 1 ano</li>
                      <li><strong>A3:</strong> Armazenado em token/cartão, válido por até 3 anos</li>
                    </ul>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold mb-2">Formatos Suportados</h4>
                    <ul className="space-y-1 text-sm text-muted-foreground">
                      <li>• .pfx (PKCS#12)</li>
                      <li>• .p12 (PKCS#12)</li>
                    </ul>
                  </div>
                  
                  <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>
                      Todos os certificados são validados e armazenados com criptografia de ponta
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5" />
                    Segurança
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-muted-foreground">
                  <p>• Senhas não são armazenadas, apenas o hash de verificação</p>
                  <p>• Certificados são criptografados com AES-256</p>
                  <p>• Acesso restrito apenas ao proprietário</p>
                  <p>• Logs de auditoria para todas as operações</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}