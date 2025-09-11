import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileSignature, CheckCircle, Clock, AlertTriangle, RefreshCw, Activity } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Document, Certificate, Signature } from "@shared/schema";

export default function AssinarDocumentosPage() {
  const [selectedCertificate, setSelectedCertificate] = useState('');
  const [certificatePassword, setCertificatePassword] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch documents from API
  const { data: documents = [], isLoading: documentsLoading, refetch: refetchDocuments } = useQuery({
    queryKey: ['/api/documents'],
    enabled: true
  }) as { data: Document[]; isLoading: boolean; refetch: () => void };

  // Fetch certificates from API
  const { data: certificates = [], isLoading: certificatesLoading } = useQuery({
    queryKey: ['/api/certificates'],
    enabled: true
  }) as { data: Certificate[]; isLoading: boolean };

  // Fetch signatures from API
  const { data: signatures = [], isLoading: signaturesLoading, refetch: refetchSignatures } = useQuery({
    queryKey: ['/api/signatures'],
    enabled: true
  }) as { data: Signature[]; isLoading: boolean; refetch: () => void };

  // Sign document mutation
  const signDocumentMutation = useMutation({
    mutationFn: async (params: { documentId: string; certificateId: string; certificatePassword: string }) => {
      return apiRequest('POST', `/api/documents/${params.documentId}/sign`, {
        certificateId: params.certificateId,
        certificatePassword: params.certificatePassword
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/documents'] });
      queryClient.invalidateQueries({ queryKey: ['/api/signatures'] });
      refetchDocuments();
      refetchSignatures();
    }
  });

  const validCertificates = certificates.filter((cert: Certificate) => {
    if (!cert.validTo) return false;
    const validToDate = new Date(cert.validTo);
    const now = new Date();
    return validToDate > now;
  });
  
  const readyDocuments = documents.filter((doc: Document) => doc.status === 'ready');
  const signedDocuments = documents.filter((doc: Document) => doc.status === 'signed');
  const processingDocuments = documents.filter((doc: Document) => doc.status === 'processing');
  const failedDocuments = documents.filter((doc: Document) => doc.status === 'failed');

  const handleRefreshStatus = () => {
    setIsRefreshing(true);
    refetchDocuments();
    refetchSignatures();
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  const handleSignDocument = (documentId: string) => {
    if (selectedCertificate && certificatePassword) {
      signDocumentMutation.mutate({
        documentId,
        certificateId: selectedCertificate,
        certificatePassword
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'processing':
        return <Activity className="w-4 h-4 text-blue-500 animate-pulse" />;
      case 'ready':
        return <FileSignature className="w-4 h-4 text-orange-500" />;
      case 'signed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failed':
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'processing':
        return <Badge variant="outline" className="text-blue-600">Processando</Badge>;
      case 'ready':
        return <Badge variant="outline" className="text-orange-600">Pronto</Badge>;
      case 'signed':
        return <Badge variant="outline" className="text-green-600">Assinado</Badge>;
      case 'failed':
        return <Badge variant="outline" className="text-red-600">Erro</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatDate = (date: string | Date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleString('pt-BR');
  };

  const getDocumentSignature = (documentId: string) => {
    return signatures.find(sig => sig.documentId === documentId);
  };

  const isSigningEnabled = selectedCertificate && certificatePassword;

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Assinar Documentos</h1>
            <p className="text-muted-foreground">
              Gerencie assinaturas digitais dos seus documentos
            </p>
          </div>
          <Button onClick={handleRefreshStatus} disabled={isRefreshing} data-testid="button-refresh">
            <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Certificate Selection */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Configurações de Assinatura</CardTitle>
          <CardDescription>Selecione o certificado e senha para assinatura</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="certificate">Certificado Digital</Label>
              <Select value={selectedCertificate} onValueChange={setSelectedCertificate}>
                <SelectTrigger data-testid="select-certificate">
                  <SelectValue placeholder="Selecione um certificado..." />
                </SelectTrigger>
                <SelectContent>
                  {validCertificates.map((cert) => (
                    <SelectItem key={cert.id} value={cert.id}>
                      <div className="flex flex-col">
                        <span>{cert.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {cert.type} - Válido até: {cert.validTo ? new Date(cert.validTo).toLocaleDateString('pt-BR') : 'N/A'}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="password">Senha do Certificado</Label>
              <Input
                id="password"
                type="password"
                placeholder="Digite a senha do certificado"
                value={certificatePassword}
                onChange={(e) => setCertificatePassword(e.target.value)}
                data-testid="input-certificate-password"
              />
            </div>
          </div>
          {!isSigningEnabled && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Selecione um certificado e digite a senha para habilitar a assinatura.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Documents Tabs */}
      <Tabs defaultValue="ready" className="space-y-4">
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="ready" data-testid="tab-ready">
              Prontos ({readyDocuments.length})
            </TabsTrigger>
            <TabsTrigger value="signed" data-testid="tab-signed">
              Assinados ({signedDocuments.length})
            </TabsTrigger>
            <TabsTrigger value="processing" data-testid="tab-processing">
              Processando ({processingDocuments.length})
            </TabsTrigger>
            <TabsTrigger value="failed" data-testid="tab-failed">
              Falharam ({failedDocuments.length})
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Ready Documents */}
        <TabsContent value="ready" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Documentos Prontos para Assinatura</CardTitle>
              <CardDescription>Documentos gerados aguardando assinatura digital</CardDescription>
            </CardHeader>
            <CardContent>
              {readyDocuments.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Status</TableHead>
                      <TableHead>Documento</TableHead>
                      <TableHead>Criado em</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {readyDocuments.map((document) => (
                      <TableRow key={document.id}>
                        <TableCell>{getStatusIcon(document.status)}</TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium">{document.filename}</span>
                            <span className="text-xs text-muted-foreground">ID: {document.id}</span>
                          </div>
                        </TableCell>
                        <TableCell>{formatDate(document.createdAt)}</TableCell>
                        <TableCell>
                          <Button
                            onClick={() => handleSignDocument(document.id)}
                            disabled={!isSigningEnabled || signDocumentMutation.isPending}
                            size="sm"
                            data-testid={`button-sign-${document.id}`}
                          >
                            <FileSignature className="w-4 h-4 mr-2" />
                            Assinar
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-6 text-muted-foreground">
                  Nenhum documento pronto para assinatura
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Signed Documents */}
        <TabsContent value="signed" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Documentos Assinados</CardTitle>
              <CardDescription>Documentos com assinatura digital concluída</CardDescription>
            </CardHeader>
            <CardContent>
              {signedDocuments.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Status</TableHead>
                      <TableHead>Documento</TableHead>
                      <TableHead>Criado em</TableHead>
                      <TableHead>Assinado em</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {signedDocuments.map((document) => {
                      const signature = getDocumentSignature(document.id);
                      return (
                        <TableRow key={document.id}>
                          <TableCell>{getStatusIcon(document.status)}</TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-medium">{document.filename}</span>
                              {getStatusBadge(document.status)}
                            </div>
                          </TableCell>
                          <TableCell>{formatDate(document.createdAt)}</TableCell>
                          <TableCell>
                            {signature?.signedAt ? formatDate(signature.signedAt) : 'N/A'}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-6 text-muted-foreground">
                  Nenhum documento assinado
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Processing Documents */}
        <TabsContent value="processing" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Documentos em Processamento</CardTitle>
              <CardDescription>Documentos sendo processados</CardDescription>
            </CardHeader>
            <CardContent>
              {processingDocuments.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Status</TableHead>
                      <TableHead>Documento</TableHead>
                      <TableHead>Criado em</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {processingDocuments.map((document) => (
                      <TableRow key={document.id}>
                        <TableCell>{getStatusIcon(document.status)}</TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium">{document.filename}</span>
                            {getStatusBadge(document.status)}
                          </div>
                        </TableCell>
                        <TableCell>{formatDate(document.createdAt)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-6 text-muted-foreground">
                  Nenhum documento em processamento
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Failed Documents */}
        <TabsContent value="failed" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Documentos com Erro</CardTitle>
              <CardDescription>Documentos que falharam no processamento</CardDescription>
            </CardHeader>
            <CardContent>
              {failedDocuments.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Status</TableHead>
                      <TableHead>Documento</TableHead>
                      <TableHead>Criado em</TableHead>
                      <TableHead>Erro</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {failedDocuments.map((document) => {
                      const signature = getDocumentSignature(document.id);
                      return (
                        <TableRow key={document.id}>
                          <TableCell>{getStatusIcon(document.status)}</TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-medium">{document.filename}</span>
                              {getStatusBadge(document.status)}
                            </div>
                          </TableCell>
                          <TableCell>{formatDate(document.createdAt)}</TableCell>
                          <TableCell>
                            <span className="text-sm text-red-600">
                              {signature?.errorMessage || 'Erro desconhecido'}
                            </span>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-6 text-muted-foreground">
                  Nenhum documento com erro
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {(documentsLoading || certificatesLoading || signaturesLoading) && (
        <div className="text-center py-4">
          <Activity className="w-6 h-6 animate-spin mx-auto mb-2" />
          <p className="text-muted-foreground">Carregando dados...</p>
        </div>
      )}
    </div>
  );
}