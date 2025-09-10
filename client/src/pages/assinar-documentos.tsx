import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileSignature, Upload, Download, CheckCircle, Clock, AlertTriangle, Shield, Eye } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// TODO: Replace with real data
const mockPendingDocuments = [
  {
    id: '1',
    name: 'Contrato_Empresa_ABC.pdf',
    template: 'Contrato de Prestação',
    createdAt: '2024-01-15T14:30:00',
    size: '567 KB',
    status: 'pending_signature',
    priority: 'high'
  },
  {
    id: '2',
    name: 'Declaracao_Pedro_Costa.pdf',
    template: 'Declaração de Participação',
    createdAt: '2024-01-15T13:15:00',
    size: '198 KB',
    status: 'pending_signature',
    priority: 'medium'
  },
  {
    id: '3',
    name: 'Certificado_Ana_Lima.pdf',
    template: 'Certificado de Conclusão',
    createdAt: '2024-01-15T12:00:00',
    size: '251 KB',
    status: 'signing',
    priority: 'low'
  }
];

const mockCertificates = [
  {
    id: '1',
    name: 'Certificado Empresa LTDA',
    type: 'A3',
    validTo: '2025-01-01',
    status: 'valid'
  },
  {
    id: '2',
    name: 'Certificado Teste',
    type: 'A1',
    validTo: '2024-06-01',
    status: 'expired'
  }
];

export default function AssinarDocumentosPage() {
  const [documents, setDocuments] = useState(mockPendingDocuments);
  const [selectedCertificate, setSelectedCertificate] = useState('');
  const [signingDocuments, setSigningDocuments] = useState<string[]>([]);
  const [signatureProgress, setSignatureProgress] = useState<Record<string, number>>({});
  const [activeTab, setActiveTab] = useState('pending');

  const validCertificates = mockCertificates.filter(cert => cert.status === 'valid');
  const pendingDocuments = documents.filter(doc => doc.status === 'pending_signature');
  const processingDocuments = documents.filter(doc => doc.status === 'signing');

  const handleSignDocument = async (documentId: string) => {
    if (!selectedCertificate) {
      alert('Por favor, selecione um certificado para assinatura');
      return;
    }

    console.log('Signing document:', documentId, 'with certificate:', selectedCertificate);
    
    setSigningDocuments(prev => [...prev, documentId]);
    setSignatureProgress(prev => ({ ...prev, [documentId]: 0 }));
    
    // Simulate signing progress
    const interval = setInterval(() => {
      setSignatureProgress(prev => {
        const currentProgress = prev[documentId] || 0;
        const newProgress = currentProgress + 25;
        
        if (newProgress >= 100) {
          clearInterval(interval);
          setSigningDocuments(current => current.filter(id => id !== documentId));
          setDocuments(current => 
            current.map(doc => 
              doc.id === documentId 
                ? { ...doc, status: 'signed' as const }
                : doc
            )
          );
          return { ...prev, [documentId]: 100 };
        }
        
        return { ...prev, [documentId]: newProgress };
      });
    }, 800);
    
    // TODO: Implement actual signing with FPDI/TCPDF
  };

  const handleBatchSign = async () => {
    if (!selectedCertificate) {
      alert('Por favor, selecione um certificado para assinatura');
      return;
    }
    
    console.log('Batch signing documents with certificate:', selectedCertificate);
    
    for (const doc of pendingDocuments) {
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate delay
      handleSignDocument(doc.id);
    }
  };

  const handlePreviewDocument = (documentId: string) => {
    console.log('Previewing document:', documentId);
    // TODO: Implement document preview
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'high':
        return <Badge variant="destructive">Alta</Badge>;
      case 'medium':
        return <Badge variant="secondary">Média</Badge>;
      case 'low':
        return <Badge variant="outline">Baixa</Badge>;
      default:
        return <Badge variant="outline">{priority}</Badge>;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending_signature':
        return <Clock className="w-4 h-4 text-orange-500" />;
      case 'signing':
        return <FileSignature className="w-4 h-4 text-blue-500 animate-pulse" />;
      case 'signed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      default:
        return <AlertTriangle className="w-4 h-4 text-gray-500" />;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR');
  };

  return (
    <div className="p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Assinar Documentos</h1>
          <p className="text-muted-foreground">Assine digitalmente os documentos gerados</p>
        </div>

        <div className="space-y-6">
          {/* Certificate Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Selecionar Certificado
              </CardTitle>
              <CardDescription>
                Escolha o certificado digital que será usado para assinatura
              </CardDescription>
            </CardHeader>
            <CardContent>
              {validCertificates.length > 0 ? (
                <div className="space-y-4">
                  <Select value={selectedCertificate} onValueChange={setSelectedCertificate}>
                    <SelectTrigger data-testid="select-certificate">
                      <SelectValue placeholder="Selecione um certificado..." />
                    </SelectTrigger>
                    <SelectContent>
                      {validCertificates.map((cert) => (
                        <SelectItem key={cert.id} value={cert.id}>
                          <div className="flex items-center gap-2">
                            <Shield className="w-4 h-4" />
                            <span>{cert.name}</span>
                            <Badge variant="outline">{cert.type}</Badge>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  {selectedCertificate && (
                    <div className="p-3 bg-muted rounded-md">
                      <p className="text-sm">
                        <strong>Certificado selecionado:</strong> {validCertificates.find(c => c.id === selectedCertificate)?.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Válido até: {validCertificates.find(c => c.id === selectedCertificate)?.validTo}
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Nenhum certificado válido encontrado. Por favor, adicione um certificado digital na aba Certificados.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* Documents to Sign */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="pending" data-testid="tab-pending-signatures">
                Pendentes ({pendingDocuments.length})
              </TabsTrigger>
              <TabsTrigger value="processing" data-testid="tab-processing-signatures">
                Processando ({processingDocuments.length})
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="pending" className="space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle>Documentos Pendentes</CardTitle>
                      <CardDescription>
                        Documentos aguardando assinatura digital
                      </CardDescription>
                    </div>
                    
                    {pendingDocuments.length > 0 && selectedCertificate && (
                      <Button 
                        onClick={handleBatchSign}
                        data-testid="button-batch-sign"
                      >
                        <FileSignature className="w-4 h-4 mr-2" />
                        Assinar Todos ({pendingDocuments.length})
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {pendingDocuments.length > 0 ? (
                    <div className="border rounded-md">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Documento</TableHead>
                            <TableHead>Template</TableHead>
                            <TableHead>Criado em</TableHead>
                            <TableHead>Tamanho</TableHead>
                            <TableHead>Prioridade</TableHead>
                            <TableHead>Ações</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {pendingDocuments.map((document) => (
                            <TableRow key={document.id}>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  {getStatusIcon(document.status)}
                                  <span className="font-medium">{document.name}</span>
                                </div>
                              </TableCell>
                              <TableCell>{document.template}</TableCell>
                              <TableCell>{formatDate(document.createdAt)}</TableCell>
                              <TableCell>{document.size}</TableCell>
                              <TableCell>{getPriorityBadge(document.priority)}</TableCell>
                              <TableCell>
                                <div className="flex gap-2">
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => handlePreviewDocument(document.id)}
                                    data-testid={`button-preview-${document.id}`}
                                  >
                                    <Eye className="w-4 h-4" />
                                  </Button>
                                  <Button 
                                    size="sm"
                                    onClick={() => handleSignDocument(document.id)}
                                    disabled={!selectedCertificate || signingDocuments.includes(document.id)}
                                    data-testid={`button-sign-${document.id}`}
                                  >
                                    <FileSignature className="w-4 h-4 mr-2" />
                                    Assinar
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">Todos os documentos foram assinados</h3>
                      <p className="text-muted-foreground">
                        Não há documentos pendentes de assinatura no momento
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="processing" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Documentos em Processamento</CardTitle>
                  <CardDescription>
                    Documentos sendo assinados digitalmente
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {signingDocuments.length > 0 || processingDocuments.length > 0 ? (
                    <div className="space-y-4">
                      {signingDocuments.map((docId) => {
                        const document = documents.find(d => d.id === docId);
                        if (!document) return null;
                        
                        return (
                          <div key={docId} className="p-4 border rounded-lg">
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-3">
                                <FileSignature className="w-5 h-5 text-blue-500 animate-pulse" />
                                <div>
                                  <p className="font-medium">{document.name}</p>
                                  <p className="text-sm text-muted-foreground">Assinando documento...</p>
                                </div>
                              </div>
                              <span className="text-sm font-medium">
                                {signatureProgress[docId] || 0}%
                              </span>
                            </div>
                            <Progress value={signatureProgress[docId] || 0} className="w-full" />
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <Clock className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">Nenhum documento em processamento</h3>
                      <p className="text-muted-foreground">
                        Os documentos em processo de assinatura aparecerão aqui
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}