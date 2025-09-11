import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileSignature, CheckCircle, Clock, AlertTriangle, RefreshCw, Activity, Upload, Download } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import type { Document, Certificate, Signature } from "@shared/schema";

export default function AssinarDocumentosPage() {
  const [selectedCertificate, setSelectedCertificate] = useState('');
  const [certificatePassword, setCertificatePassword] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const { toast } = useToast();

  // Fetch only uploaded documents (not generated from templates) for this tab
  const { data: documents = [], isLoading: documentsLoading, refetch: refetchDocuments } = useQuery({
    queryKey: ['/api/documents/uploaded'],
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
    // Include certificates without expiry date or those still valid
    if (!cert.validTo) return true; // Include certificates without expiry date
    const validToDate = new Date(cert.validTo);
    const now = new Date();
    return validToDate > now;
  });
  
  // Auto-preselect certificate if only one exists
  useEffect(() => {
    if (validCertificates.length === 1 && !selectedCertificate) {
      setSelectedCertificate(validCertificates[0].id);
    }
  }, [validCertificates, selectedCertificate]);
  
  // Only show signed and failed documents for upload workflow
  const signedDocuments = documents.filter((doc: Document) => doc.status === 'signed');
  const failedDocuments = documents.filter((doc: Document) => doc.status === 'failed');

  const handleRefreshStatus = () => {
    setIsRefreshing(true);
    refetchDocuments();
    refetchSignatures();
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  // Upload and sign PDFs mutation
  const uploadAndSignMutation = useMutation({
    mutationFn: async (files: File[]) => {
      console.log('🔍 Frontend uploading files:', files);
      const formData = new FormData();
      files.forEach((file, index) => {
        console.log(`📄 Adding file ${index}:`, file.name, file.type, file.size);
        formData.append('files', file); // Remove backticks, use plain 'files'
      });
      formData.append('certificateId', selectedCertificate);
      
      // Debug FormData
      console.log('📤 FormData contents:');
      const formDataEntries = Array.from(formData.entries());
      formDataEntries.forEach(([key, value]) => {
        console.log(`  ${key}:`, value instanceof File ? `File: ${value.name}` : value);
      });
      
      console.log('📤 Sending to main upload endpoint...');
      return apiRequest('POST', '/api/documents/upload-and-sign', formData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/documents/uploaded'] });
      refetchDocuments();
      setSelectedFiles([]);
      toast({
        title: "Sucesso!",
        description: "Documentos enviados e assinados com sucesso.",
        variant: "default"
      });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: "Falha ao enviar e assinar documentos.",
        variant: "destructive"
      });
    }
  });
  
  const handleUploadAndSign = () => {
    if (selectedFiles.length > 0 && selectedCertificate) {
      uploadAndSignMutation.mutate(selectedFiles);
    }
  };
  
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    const pdfFiles = files.filter(file => file.type === 'application/pdf');
    
    if (pdfFiles.length !== files.length) {
      toast({
        title: "Aviso",
        description: "Apenas arquivos PDF são permitidos.",
        variant: "destructive"
      });
    }
    
    setSelectedFiles(pdfFiles);
  };
  
  const downloadDocument = async (documentId: string, filename: string) => {
    try {
      const response = await fetch(`/api/documents/${documentId}/download`, {
        credentials: 'include'
      });
      
      if (!response.ok) throw new Error('Download failed');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      toast({
        title: "Erro",
        description: "Falha ao fazer download do documento.",
        variant: "destructive"
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

  const isSigningEnabled = selectedCertificate;

  return (
    <div className="p-6 max-w-6xl mx-auto">
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

      {/* Upload and Sign Section */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Enviar e Assinar Documentos PDF</CardTitle>
          <CardDescription>Faça upload de arquivos PDF para assinatura digital automática</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="certificate">Certificado Digital</Label>
              <Select value={selectedCertificate} onValueChange={setSelectedCertificate}>
                <SelectTrigger data-testid="select-certificate" className="flex items-center justify-center text-center">
                  <SelectValue placeholder={validCertificates.length === 1 ? "Certificado selecionado automaticamente" : "Selecione um certificado..."} />
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
              <Label htmlFor="pdf-upload">Documentos PDF</Label>
              <Input
                id="pdf-upload"
                type="file"
                accept=".pdf"
                multiple
                onChange={handleFileChange}
                data-testid="input-pdf-upload"
              />
            </div>
          </div>
          
          {selectedFiles.length > 0 && (
            <div>
              <p className="text-sm text-muted-foreground mb-2">Arquivos selecionados:</p>
              <ul className="text-sm space-y-1">
                {selectedFiles.map((file, index) => (
                  <li key={index} className="flex items-center space-x-2">
                    <FileSignature className="w-4 h-4" />
                    <span>{file.name}</span>
                    <span className="text-muted-foreground">({(file.size / 1024 / 1024).toFixed(2)} MB)</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          <div className="flex gap-2">
            <Button
              onClick={handleUploadAndSign}
              disabled={selectedFiles.length === 0 || !selectedCertificate || uploadAndSignMutation.isPending}
              data-testid="button-upload-sign"
            >
              {uploadAndSignMutation.isPending ? (
                <Activity className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Upload className="w-4 h-4 mr-2" />
              )}
              {uploadAndSignMutation.isPending ? 'Processando...' : 'Enviar e Assinar'}
            </Button>
            {selectedFiles.length > 0 && (
              <Button
                variant="outline"
                onClick={() => setSelectedFiles([])}
                data-testid="button-clear-files"
              >
                Limpar
              </Button>
            )}
          </div>
          
          {!selectedCertificate && validCertificates.length > 1 && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Selecione um certificado para habilitar o envio e assinatura.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Documents Tabs - Only signed and failed */}
      <Tabs defaultValue="signed" className="space-y-4">
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="signed" data-testid="tab-signed">
              Assinados ({signedDocuments.length})
            </TabsTrigger>
            <TabsTrigger value="failed" data-testid="tab-failed">
              Com Falha ({failedDocuments.length})
            </TabsTrigger>
          </TabsList>
        </div>


        {/* Signed Documents */}
        <TabsContent value="signed" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Documentos Assinados</CardTitle>
              <CardDescription>Documentos PDF enviados e assinados com sucesso</CardDescription>
            </CardHeader>
            <CardContent>
              {signedDocuments.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Status</TableHead>
                      <TableHead>Documento</TableHead>
                      <TableHead>Enviado em</TableHead>
                      <TableHead>Ações</TableHead>
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
                            <Button
                              onClick={() => downloadDocument(document.id, document.filename)}
                              size="sm"
                              variant="outline"
                              data-testid={`button-download-${document.id}`}
                            >
                              <Download className="w-4 h-4 mr-2" />
                              Download
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-6 text-muted-foreground">
                  Nenhum documento assinado ainda. Envie arquivos PDF acima para começar.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>


        {/* Failed Documents */}
        <TabsContent value="failed" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Documentos com Falha</CardTitle>
              <CardDescription>Documentos que falharam no processamento ou assinatura</CardDescription>
            </CardHeader>
            <CardContent>
              {failedDocuments.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Status</TableHead>
                      <TableHead>Documento</TableHead>
                      <TableHead>Enviado em</TableHead>
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
                              {signature?.errorMessage || 'Erro na assinatura digital'}
                            </span>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-6 text-muted-foreground">
                  Nenhum documento com falha
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