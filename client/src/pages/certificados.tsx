import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Shield, Upload, Eye, Trash2, AlertTriangle, CheckCircle, Lock, Key, RefreshCw } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import type { Certificate } from "@shared/schema";

export default function CertificadosPage() {
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [uploadData, setUploadData] = useState({ 
    file: null as File | null, 
    password: '', 
    confirmPassword: '' 
  });
  const [activeTab, setActiveTab] = useState('list');
  const { toast } = useToast();

  // Fetch certificates from API
  const { data: certificates = [], isLoading, refetch } = useQuery({
    queryKey: ['/api/certificates'],
    enabled: true
  }) as { data: Certificate[]; isLoading: boolean; refetch: () => void };

  // Upload certificate mutation
  const uploadCertificateMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await fetch('/api/certificates', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Upload failed');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/certificates'] });
      setUploadData({ file: null, password: '', confirmPassword: '' });
      setIsUploadDialogOpen(false);
      toast({
        title: "Certificado enviado",
        description: "Certificado foi enviado e validado com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro no upload",
        description: error.message || "Falha ao enviar certificado",
        variant: "destructive",
      });
    }
  });

  // Delete certificate mutation
  const deleteCertificateMutation = useMutation({
    mutationFn: (certificateId: string) => fetch(`/api/certificates/${certificateId}`, { 
      method: 'DELETE', 
      credentials: 'include' 
    }).then(res => res.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/certificates'] });
      toast({
        title: "Certificado removido",
        description: "Certificado foi removido com sucesso.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: "Falha ao remover certificado",
        variant: "destructive",
      });
    }
  });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.name.endsWith('.pfx') || file.name.endsWith('.p12')) {
        setUploadData({ ...uploadData, file });
        console.log('Certificate file selected:', file.name);
      } else {
        toast({
          title: "Formato inválido",
          description: "Por favor, selecione um arquivo .pfx ou .p12",
          variant: "destructive",
        });
      }
    }
  };

  const handleUploadSubmit = () => {
    if (!uploadData.file || !uploadData.password) {
      toast({
        title: "Dados incompletos",
        description: "Por favor, selecione um arquivo e digite a senha",
        variant: "destructive",
      });
      return;
    }
    
    if (uploadData.password !== uploadData.confirmPassword) {
      toast({
        title: "Senhas não coincidem",
        description: "Verifique se as senhas são idênticas",
        variant: "destructive",
      });
      return;
    }
    
    console.log('Uploading certificate:', uploadData.file.name);
    
    const formData = new FormData();
    formData.append('file', uploadData.file);
    formData.append('name', uploadData.file.name.replace(/\.(pfx|p12)$/i, ''));
    formData.append('password', uploadData.password);
    
    uploadCertificateMutation.mutate(formData);
  };

  const handleCertificateAction = (action: string, certId: string) => {
    console.log(`${action} certificate:`, certId);
    
    if (action === 'delete') {
      if (confirm('Tem certeza que deseja excluir este certificado?')) {
        deleteCertificateMutation.mutate(certId);
      }
    }
    // TODO: Implement other certificate actions (view details)
  };

  const getStatusBadge = (certificate: Certificate) => {
    if (!certificate.validTo) {
      return <Badge variant="outline">Validando</Badge>;
    }
    
    const now = new Date();
    const validTo = new Date(certificate.validTo);
    
    if (validTo > now) {
      return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Válido</Badge>;
    } else {
      return <Badge variant="destructive">Expirado</Badge>;
    }
  };

  const formatDate = (dateString: string | Date | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="p-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center py-12">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4" />
              <p className="text-gray-600">Carregando certificados...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Certificados Digitais</h1>
              <p className="text-gray-600 text-base">Gerencie seus certificados para assinatura digital</p>
            </div>
          
          <div className="flex gap-2">
              <Button onClick={() => refetch()} variant="outline" data-testid="button-refresh-certificates" className="bg-gray-50 border-gray-200 hover:bg-gray-100">
                <RefreshCw className="w-4 h-4 mr-2" />
                Atualizar
              </Button>
              
              <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
                <DialogTrigger asChild>
                  <Button data-testid="button-upload-certificate" className="bg-blue-600 hover:bg-blue-700 text-white">
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
                    disabled={!uploadData.file || !uploadData.password || !uploadData.confirmPassword || uploadCertificateMutation.isPending}
                    data-testid="button-submit-certificate"
                  >
                    <Shield className="w-4 h-4 mr-2" />
                    {uploadCertificateMutation.isPending ? 'Enviando...' : 'Enviar Certificado'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="bg-gray-100">
              <TabsTrigger value="list" data-testid="tab-certificates-list" className="data-[state=active]:bg-white">
                Meus Certificados ({certificates.length})
              </TabsTrigger>
              <TabsTrigger value="info" data-testid="tab-certificates-info" className="data-[state=active]:bg-white">Informações</TabsTrigger>
            </TabsList>
          
          <TabsContent value="list" className="space-y-4">
            {/* Certificates List */}
            <div className="grid gap-4">
                {certificates.map((certificate) => (
                  <Card key={certificate.id} className="bg-white shadow-lg hover:shadow-xl transition-all duration-300 hover:translate-y-1 border border-gray-200">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-4">
                          <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                            <Shield className="w-6 h-6 text-blue-600" />
                          </div>
                        
                          <div className="space-y-1">
                            <h3 className="font-semibold text-gray-900">{certificate.name}</h3>
                            <div className="flex items-center gap-4 text-sm text-gray-600">
                              <span>Tipo: {certificate.type}</span>
                              {certificate.serial && <span>Série: {certificate.serial}</span>}
                            </div>
                            <div className="flex items-center gap-4 text-sm">
                              <span className="text-gray-700">
                                Válido de {formatDate(certificate.validFrom)} até {formatDate(certificate.validTo)}
                              </span>
                              {getStatusBadge(certificate)}
                            </div>
                            <div className="text-xs text-gray-500">
                              Criado em {formatDate(certificate.createdAt)}
                            </div>
                          </div>
                      </div>
                      
                      <div className="flex gap-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => handleCertificateAction('view', certificate.id)}
                            data-testid={`button-view-${certificate.id}`}
                            className="bg-gray-50 border-gray-200 hover:bg-gray-100"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => handleCertificateAction('delete', certificate.id)}
                            disabled={deleteCertificateMutation.isPending}
                            data-testid={`button-delete-${certificate.id}`}
                            className="bg-red-50 border-red-200 text-red-600 hover:bg-red-100"
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
                    <div className="w-16 h-16 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                      <Shield className="w-8 h-8 text-blue-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Nenhum certificado encontrado</h3>
                    <p className="text-gray-600 mb-4">
                      Envie seu primeiro certificado digital para começar a assinar documentos
                    </p>
                    <Button onClick={() => setIsUploadDialogOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white">
                      <Upload className="w-4 h-4 mr-2" />
                      Enviar Certificado
                    </Button>
                  </div>
                )}
            </div>
          </TabsContent>
          
          <TabsContent value="info" className="space-y-4">
            <div className="grid gap-4">
                <Card className="bg-white shadow-lg hover:shadow-xl transition-all duration-300 hover:translate-y-1 border border-gray-200">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-gray-900 text-lg">
                      <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                        <Key className="w-4 h-4 text-green-600" />
                      </div>
                      Sobre Certificados Digitais
                    </CardTitle>
                  </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                      <h4 className="font-semibold text-gray-900 mb-2">Tipos de Certificado</h4>
                      <ul className="space-y-2 text-sm text-gray-600">
                        <li><strong>A1:</strong> Armazenado no computador, válido por 1 ano</li>
                        <li><strong>A3:</strong> Armazenado em token/cartão, válido por até 3 anos</li>
                      </ul>
                    </div>
                    
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-2">Formatos Suportados</h4>
                      <ul className="space-y-1 text-sm text-gray-600">
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
              
                <Card className="bg-white shadow-lg hover:shadow-xl transition-all duration-300 hover:translate-y-1 border border-gray-200">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-gray-900 text-lg">
                      <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                        <AlertTriangle className="w-4 h-4 text-orange-600" />
                      </div>
                      Segurança
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm text-gray-600">
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
    </div>
  );
}