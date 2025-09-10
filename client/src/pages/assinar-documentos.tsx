import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileSignature, CheckCircle, Clock, AlertTriangle, Shield, RefreshCw, Activity } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// TODO: Replace with real data - documents with automatic signature status
const mockSignatureHistory = [
  {
    id: '1',
    name: 'Lote_Certificados_001.zip',
    documentsCount: 25,
    template: 'Certificado de Conclusão',
    createdAt: '2024-01-15T14:30:00',
    signedAt: '2024-01-15T14:32:15',
    status: 'signed',
    certificate: 'Certificado Empresa LTDA (A3)',
    processingTime: '2min 15s'
  },
  {
    id: '2',
    name: 'Contrato_Empresa_ABC.pdf',
    documentsCount: 1,
    template: 'Contrato de Prestação',
    createdAt: '2024-01-15T13:15:00',
    signedAt: '2024-01-15T13:15:45',
    status: 'signed',
    certificate: 'Certificado Empresa LTDA (A3)',
    processingTime: '45s'
  },
  {
    id: '3',
    name: 'Lote_Declaracoes_002.zip',
    documentsCount: 8,
    template: 'Declaração de Participação',
    createdAt: '2024-01-15T12:00:00',
    signedAt: null,
    status: 'signing',
    certificate: 'Certificado Empresa LTDA (A3)',
    processingTime: null
  },
  {
    id: '4',
    name: 'Contrato_Teste.pdf',
    documentsCount: 1,
    template: 'Contrato de Prestação',
    createdAt: '2024-01-15T11:30:00',
    signedAt: null,
    status: 'error',
    certificate: 'Certificado Empresa LTDA (A3)',
    processingTime: null,
    error: 'Certificado expirado'
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
  const [signatureHistory, setSignatureHistory] = useState(mockSignatureHistory);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('processing');
  const [autoSignEnabled, setAutoSignEnabled] = useState(true);

  const validCertificates = mockCertificates.filter(cert => cert.status === 'valid');
  const processingDocuments = signatureHistory.filter(doc => doc.status === 'signing');
  const completedDocuments = signatureHistory.filter(doc => doc.status === 'signed');
  const errorDocuments = signatureHistory.filter(doc => doc.status === 'error');

  const handleRefreshStatus = () => {
    setIsRefreshing(true);
    console.log('Refreshing signature status...');
    // TODO: Implement actual status refresh from server
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  const handleToggleAutoSign = () => {
    setAutoSignEnabled(!autoSignEnabled);
    console.log('Auto-sign', !autoSignEnabled ? 'enabled' : 'disabled');
    // TODO: Send auto-sign preference to server
  };

  const handleRetrySignature = (documentId: string) => {
    console.log('Retrying signature for document:', documentId);
    // TODO: Implement retry signature functionality
    setSignatureHistory(prev => 
      prev.map(doc => 
        doc.id === documentId 
          ? { ...doc, status: 'signing' as const }
          : doc
      )
    );
  };

  const getDocumentCountBadge = (count: number) => {
    if (count === 1) {
      return <Badge variant="outline">Individual</Badge>;
    } else {
      return <Badge variant="secondary">Lote ({count})</Badge>;
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

          {/* Signature Monitoring */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="processing" data-testid="tab-processing-signatures">
                Processando ({processingDocuments.length})
              </TabsTrigger>
              <TabsTrigger value="completed" data-testid="tab-completed-signatures">
                Concluídas ({completedDocuments.length})
              </TabsTrigger>
              <TabsTrigger value="errors" data-testid="tab-error-signatures">
                Erros ({errorDocuments.length})
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="processing" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Documentos em Processamento</CardTitle>
                  <CardDescription>
                    Documentos sendo assinados automaticamente
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {processingDocuments.length > 0 ? (
                    <div className="border rounded-md">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Documento</TableHead>
                            <TableHead>Template</TableHead>
                            <TableHead>Tipo</TableHead>
                            <TableHead>Certificado</TableHead>
                            <TableHead>Iniciado em</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {processingDocuments.map((document) => (
                            <TableRow key={document.id}>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  {getStatusIcon(document.status)}
                                  <span className="font-medium">{document.name}</span>
                                </div>
                              </TableCell>
                              <TableCell>{document.template}</TableCell>
                              <TableCell>{getDocumentCountBadge(document.documentsCount)}</TableCell>
                              <TableCell className="text-sm">{document.certificate}</TableCell>
                              <TableCell>{formatDate(document.createdAt)}</TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <Clock className="w-4 h-4 text-blue-500 animate-pulse" />
                                  <span className="text-sm">Assinando...</span>
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
                      <h3 className="text-lg font-semibold mb-2">Nenhuma assinatura em processamento</h3>
                      <p className="text-muted-foreground">
                        Documentos são assinados automaticamente após a geração
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="completed" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Assinaturas Concluídas</CardTitle>
                  <CardDescription>
                    Documentos assinados automaticamente com sucesso
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {completedDocuments.length > 0 ? (
                    <div className="border rounded-md">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Documento</TableHead>
                            <TableHead>Template</TableHead>
                            <TableHead>Tipo</TableHead>
                            <TableHead>Certificado</TableHead>
                            <TableHead>Assinado em</TableHead>
                            <TableHead>Tempo</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {completedDocuments.map((document) => (
                            <TableRow key={document.id}>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  {getStatusIcon(document.status)}
                                  <span className="font-medium">{document.name}</span>
                                </div>
                              </TableCell>
                              <TableCell>{document.template}</TableCell>
                              <TableCell>{getDocumentCountBadge(document.documentsCount)}</TableCell>
                              <TableCell className="text-sm">{document.certificate}</TableCell>
                              <TableCell>{formatDate(document.signedAt!)}</TableCell>
                              <TableCell>
                                <Badge variant="outline" className="text-green-600">
                                  {document.processingTime}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <FileSignature className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">Nenhuma assinatura concluída</h3>
                      <p className="text-muted-foreground">
                        Documentos assinados aparecerão aqui
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="errors" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Erros de Assinatura</CardTitle>
                  <CardDescription>
                    Documentos que falharam na assinatura automática
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {errorDocuments.length > 0 ? (
                    <div className="border rounded-md">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Documento</TableHead>
                            <TableHead>Template</TableHead>
                            <TableHead>Tipo</TableHead>
                            <TableHead>Erro</TableHead>
                            <TableHead>Tentativa em</TableHead>
                            <TableHead>Ações</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {errorDocuments.map((document) => (
                            <TableRow key={document.id}>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  {getStatusIcon(document.status)}
                                  <span className="font-medium">{document.name}</span>
                                </div>
                              </TableCell>
                              <TableCell>{document.template}</TableCell>
                              <TableCell>{getDocumentCountBadge(document.documentsCount)}</TableCell>
                              <TableCell>
                                <span className="text-sm text-red-600">{document.error}</span>
                              </TableCell>
                              <TableCell>{formatDate(document.createdAt)}</TableCell>
                              <TableCell>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => handleRetrySignature(document.id)}
                                  data-testid={`button-retry-${document.id}`}
                                >
                                  <RefreshCw className="w-4 h-4 mr-2" />
                                  Tentar Novamente
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">Nenhum erro de assinatura</h3>
                      <p className="text-muted-foreground">
                        Todas as assinaturas foram processadas com sucesso
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