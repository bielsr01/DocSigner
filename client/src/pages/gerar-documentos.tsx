import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Upload, Download, Copy, FileSpreadsheet, Type, Loader2, Plus, Trash2, Edit, RefreshCw, FileSignature, AlertTriangle } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";

interface Template {
  id: string;
  name: string;
  variables: string[];
  originalFilename?: string;
  mimeType?: string;
  createdAt: string;
  storageRef: string;
}

interface Certificate {
  id: string;
  name: string;
  type: string;
  validTo: string;
  validFrom: string;
  serial?: string;
  originalFilename?: string;
  createdAt: string;
}

export default function GerarDocumentosPage() {
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [inputMethod, setInputMethod] = useState('manual');
  const [manualData, setManualData] = useState<Record<string, string>>({});
  const [manualBatchData, setManualBatchData] = useState<Record<string, string>[]>([]);
  const [csvData, setCsvData] = useState('');
  const [excelData, setExcelData] = useState('');
  const [batchData, setBatchData] = useState<Record<string, string>[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { toast } = useToast();

  // Fetch templates from API
  const { data: templates = [], isLoading: templatesLoading } = useQuery({
    queryKey: ['/api/templates'],
    enabled: true
  }) as { data: Template[]; isLoading: boolean };

  // Fetch certificates from API
  const { data: certificates = [], isLoading: certificatesLoading } = useQuery({
    queryKey: ['/api/certificates'],
    enabled: true
  }) as { data: Certificate[]; isLoading: boolean };
  
  // Configuration states
  const [batchName, setBatchName] = useState('');
  const [documentNameType, setDocumentNameType] = useState<'custom' | 'variable'>('custom');
  const [documentName, setDocumentName] = useState('');
  const [selectedCertificate, setSelectedCertificate] = useState('');
  
  // Document history states
  const [generatedDocuments, setGeneratedDocuments] = useState<Array<{
    id: string;
    batchName: string;
    documentName: string;
    templateName: string;
    certificateName: string;
    documentsCount: number;
    status: 'generating' | 'generated' | 'signing' | 'signed' | 'error';
    createdAt: Date;
    completedAt?: Date;
    downloadUrl?: string;
    error?: string;
  }>>([]);

  const selectedTemplateData = templates.find(t => t.id === selectedTemplate);
  const validCertificates = certificates.filter(cert => {
    // Include certificates without expiry date or those still valid
    if (!cert.validTo) return true; // Include certificates without expiry date
    const validToDate = new Date(cert.validTo);
    const now = new Date();
    return validToDate > now;
  });

  // Auto-select certificate if only one is available
  useEffect(() => {
    if (validCertificates.length === 1 && !selectedCertificate) {
      setSelectedCertificate(validCertificates[0].id);
    }
  }, [validCertificates, selectedCertificate]);

  // Clear data when template changes
  const handleTemplateChange = (templateId: string) => {
    setSelectedTemplate(templateId);
    setManualData({});
    setManualBatchData([]);
    setBatchData([]);
    setCsvData('');
    setExcelData('');
  };

  const handleManualDataChange = (variable: string, value: string) => {
    setManualData(prev => ({ ...prev, [variable]: value }));
  };

  const handleAddManualRecord = () => {
    if (!selectedTemplateData) return;
    
    // Check if all required fields are filled
    const isComplete = selectedTemplateData.variables.every(variable => 
      manualData[variable] && manualData[variable].trim() !== ''
    );
    
    if (!isComplete) {
      alert('Por favor, preencha todos os campos antes de adicionar');
      return;
    }
    
    setManualBatchData(prev => [...prev, { ...manualData }]);
    setManualData({});
  };

  const handleRemoveManualRecord = (index: number) => {
    setManualBatchData(prev => prev.filter((_, i) => i !== index));
  };

  const handleEditManualRecord = (index: number) => {
    const record = manualBatchData[index];
    setManualData(record);
    handleRemoveManualRecord(index);
  };

  const handleCsvDataPaste = () => {
    if (!csvData.trim() || !selectedTemplateData) return;
    
    console.log('Processing CSV data:', csvData);
    
    // Simple CSV parsing - first row is headers, subsequent rows are data
    const lines = csvData.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim());
    
    const processedData = lines.slice(1).map(line => {
      const values = line.split(',').map(v => v.trim());
      const row: Record<string, string> = {};
      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });
      return row;
    });
    
    setBatchData(processedData);
  };

  const handleExcelDataPaste = () => {
    if (!excelData.trim() || !selectedTemplateData) return;
    
    console.log('Processing Excel data:', excelData);
    
    // Process tab-separated values (TSV) which is what Excel produces when copying
    const lines = excelData.trim().split('\n');
    const headers = lines[0].split('\t').map(h => h.trim());
    
    const processedData = lines.slice(1).map(line => {
      const values = line.split('\t').map(v => v.trim());
      const row: Record<string, string> = {};
      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });
      return row;
    });
    
    setBatchData(processedData);
  };

  const handleGenerate = async () => {
    if (!selectedTemplateData || !selectedCertificate) {
      alert('Por favor, selecione um modelo e um certificado antes de gerar os documentos.');
      return;
    }
    
    setIsGenerating(true);
    setGenerationProgress(0);
    
    console.log('Starting document generation...');
    
    // Determine data source and count
    let dataToProcess;
    if (inputMethod === 'manual') {
      if (manualBatchData.length > 0) {
        dataToProcess = manualBatchData;
      } else {
        dataToProcess = [manualData];
      }
    } else {
      dataToProcess = batchData;
    }
    
    console.log('Data to process:', dataToProcess);
    
    // Generate document ID and get certificate name
    const documentId = `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const selectedCert = validCertificates.find(c => c.id === selectedCertificate);
    const finalBatchName = batchName || `Lote_${new Date().toLocaleDateString('pt-BR').replace(/\//g, '_')}`;
    const finalDocumentName = documentName || 'Documento';
    
    // Create document entry
    const newDocument = {
      id: documentId,
      batchName: finalBatchName,
      documentName: finalDocumentName,
      templateName: selectedTemplateData.name,
      certificateName: selectedCert?.name || 'Certificado não encontrado',
      documentsCount: dataToProcess.length,
      status: 'generating' as const,
      createdAt: new Date(),
    };
    
    // Add to history
    setGeneratedDocuments(prev => [newDocument, ...prev]);
    
    // REAL API CALL - Generate documents via backend
    try {
      console.log('Making real API call to generate documents...');
      
      const response = await fetch('/api/documents/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          templateId: selectedTemplate,
          data: dataToProcess.length === 1 ? dataToProcess[0] : null,
          batchData: dataToProcess.length > 1 ? dataToProcess : null
        })
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Generation failed: ${error}`);
      }

      const result = await response.json();
      console.log('Documents generated successfully:', result);
      
      // Update documents with real backend response
      const backendDocuments = Array.isArray(result.documents) ? result.documents : [result.document];
      
      setGeneratedDocuments(prevDocs => 
        prevDocs.map(doc => 
          doc.id === documentId 
            ? { 
                ...doc, 
                status: 'generated' as const,
                backendId: backendDocuments[0]?.id || documentId, // Use real backend ID
                downloadUrl: `/api/documents/${backendDocuments[0]?.id || documentId}/download`,
                completedAt: new Date()
              }
            : doc
        )
      );

      setIsGenerating(false);
      setGenerationProgress(100);
      
      toast({
        title: "Documentos gerados com sucesso!",
        description: `${dataToProcess.length} documento(s) gerado(s) e pronto(s) para download.`
      });

    } catch (error) {
      console.error('Document generation failed:', error);
      
      // Mark document as failed
      setGeneratedDocuments(prevDocs => 
        prevDocs.map(doc => 
          doc.id === documentId 
            ? { ...doc, status: 'error' as const }
            : doc
        )
      );

      setIsGenerating(false);
      setGenerationProgress(0);
      
      toast({
        title: "Erro na geração",
        description: error instanceof Error ? error.message : "Falha ao gerar documentos. Tente novamente.",
        variant: "destructive"
      });
    }
  };

  const handleRefreshStatus = async () => {
    setIsRefreshing(true);
    
    console.log('Refreshing document generation status...');
    
    // TODO: Implement actual status refresh API call
    // This would check the status of ongoing document generations
    
    // Simulate API call delay
    setTimeout(() => {
      setIsRefreshing(false);
      console.log('Status refreshed');
    }, 1000);
  };

  return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Gerar Documentos</h1>
          <p className="text-muted-foreground">Crie documentos personalizados a partir dos seus modelos</p>
        </div>

        <div className="space-y-6">
          {/* Configuration */}
          <Card>
            <CardHeader>
              <CardTitle>1. Configurações</CardTitle>
              <CardDescription>Configure as opções de geração e assinatura</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="batch-name">Nome do Lote</Label>
                  <Input
                    id="batch-name"
                    placeholder="Ex: Certificados_Turma_2024"
                    value={batchName}
                    onChange={(e) => setBatchName(e.target.value)}
                    data-testid="input-batch-name"
                  />
                </div>
                
                <div>
                  <Label htmlFor="certificate">Certificado para Assinatura</Label>
                  <Select value={selectedCertificate} onValueChange={setSelectedCertificate}>
                    <SelectTrigger data-testid="select-certificate">
                      <SelectValue placeholder="Selecione um certificado..." />
                    </SelectTrigger>
                    <SelectContent>
                      {validCertificates.map((cert) => (
                        <SelectItem key={cert.id} value={cert.id}>
                          <div className="flex items-center gap-2">
                            <FileSignature className="w-4 h-4" />
                            <div className="flex flex-col">
                              <span>{cert.name}</span>
                              <span className="text-xs text-muted-foreground">
                                Válido até: {cert.validTo ? new Date(cert.validTo).toLocaleDateString('pt-BR') : 'Não definido'}
                              </span>
                            </div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {validCertificates.length === 1 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Certificado selecionado automaticamente
                    </p>
                  )}
                </div>
              </div>
              
              <div>
                <Label htmlFor="document-name">Nome do Documento Final</Label>
                <div className="flex gap-2 mt-1">
                  <Select value={documentNameType} onValueChange={(value) => setDocumentNameType(value as 'custom' | 'variable')}>
                    <SelectTrigger className="w-32" data-testid="select-document-name-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="custom">Fixo</SelectItem>
                      <SelectItem value="variable">Variável</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    id="document-name"
                    placeholder={documentNameType === 'custom' ? 'Ex: Certificado' : 'Ex: {{NOME}}_certificado'}
                    value={documentName}
                    onChange={(e) => setDocumentName(e.target.value)}
                    className="flex-1"
                    data-testid="input-document-name"
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {documentNameType === 'custom' 
                    ? 'Nome fixo para todos os documentos' 
                    : 'Use {{VARIAVEL}} para incluir dados do documento'
                  }
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Template Selection */}
          <Card>
            <CardHeader>
              <CardTitle>2. Selecionar Modelo</CardTitle>
              <CardDescription>Escolha o modelo de documento que deseja utilizar</CardDescription>
            </CardHeader>
            <CardContent>
              <Select value={selectedTemplate} onValueChange={handleTemplateChange}>
                <SelectTrigger data-testid="select-template">
                  <SelectValue placeholder="Selecione um modelo..." />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((template: Template) => (
                    <SelectItem key={template.id} value={template.id}>
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        {template.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              {selectedTemplateData && (
                <div className="mt-4 p-3 bg-muted rounded-md">
                  <p className="font-medium mb-2">Variáveis detectadas:</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedTemplateData.variables.map((variable) => (
                      <Badge key={variable} variant="outline" className="font-mono">
                        {`{{${variable}}}`}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Data Input Method */}
          {selectedTemplateData && (
            <Card>
              <CardHeader>
                <CardTitle>3. Método de Entrada de Dados</CardTitle>
                <CardDescription>Escolha como fornecer os dados para as variáveis</CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs value={inputMethod} onValueChange={setInputMethod}>
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="manual" data-testid="tab-manual">
                      <Type className="w-4 h-4 mr-2" />
                      Manual
                    </TabsTrigger>
                    <TabsTrigger value="csv" data-testid="tab-csv">
                      <Copy className="w-4 h-4 mr-2" />
                      CSV/Colar
                    </TabsTrigger>
                    <TabsTrigger value="excel" data-testid="tab-excel">
                      <FileSpreadsheet className="w-4 h-4 mr-2" />
                      Excel
                    </TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="manual" className="space-y-4">
                    <div className="space-y-6">
                      {/* Current Entry Form */}
                      <div className="border rounded-lg p-4 bg-muted/50">
                        <h4 className="font-medium mb-3">Entrada {manualBatchData.length + 1}</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {selectedTemplateData.variables.map((variable) => (
                            <div key={variable}>
                              <Label htmlFor={`var-${variable}`}>{variable}</Label>
                              <Input
                                id={`var-${variable}`}
                                placeholder={`Digite ${variable.toLowerCase()}...`}
                                value={manualData[variable] || ''}
                                onChange={(e) => handleManualDataChange(variable, e.target.value)}
                                data-testid={`input-${variable.toLowerCase()}`}
                              />
                            </div>
                          ))}
                        </div>
                        <div className="flex gap-2 mt-4">
                          <Button 
                            onClick={handleAddManualRecord}
                            data-testid="button-add-manual-record"
                          >
                            <Plus className="w-4 h-4 mr-2" />
                            Adicionar Registro
                          </Button>
                          {manualBatchData.length > 0 && (
                            <Button 
                              variant="outline" 
                              onClick={() => setManualData({})}
                              data-testid="button-clear-manual-form"
                            >
                              Limpar Campos
                            </Button>
                          )}
                        </div>
                      </div>
                      
                      {/* Records Preview */}
                      {manualBatchData.length > 0 && (
                        <div>
                          <h4 className="font-medium mb-3">Registros Adicionados ({manualBatchData.length})</h4>
                          <div className="border rounded-md">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead className="w-12">#</TableHead>
                                  {selectedTemplateData.variables.map((variable) => (
                                    <TableHead key={variable}>{variable}</TableHead>
                                  ))}
                                  <TableHead className="w-24">Ações</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {manualBatchData.map((record, index) => (
                                  <TableRow key={index}>
                                    <TableCell className="font-mono text-sm">
                                      {index + 1}
                                    </TableCell>
                                    {selectedTemplateData.variables.map((variable) => (
                                      <TableCell key={variable}>
                                        {record[variable] || '-'}
                                      </TableCell>
                                    ))}
                                    <TableCell>
                                      <div className="flex gap-1">
                                        <Button 
                                          variant="outline" 
                                          size="sm"
                                          onClick={() => handleEditManualRecord(index)}
                                          data-testid={`button-edit-record-${index}`}
                                        >
                                          <Edit className="w-3 h-3" />
                                        </Button>
                                        <Button 
                                          variant="outline" 
                                          size="sm"
                                          onClick={() => handleRemoveManualRecord(index)}
                                          data-testid={`button-remove-record-${index}`}
                                        >
                                          <Trash2 className="w-3 h-3" />
                                        </Button>
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        </div>
                      )}
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="csv" className="space-y-4">
                    <div>
                      <Label htmlFor="csv-data">Dados CSV</Label>
                      <Textarea
                        id="csv-data"
                        placeholder={`Cole os dados no formato CSV:\n${selectedTemplateData.variables.join(', ')}\nJoão Silva, Curso React, 15/01/2024, Prof. Maria\nAna Costa, Curso Node.js, 16/01/2024, Prof. João`}
                        rows={6}
                        value={csvData}
                        onChange={(e) => setCsvData(e.target.value)}
                        data-testid="textarea-csv-data"
                      />
                    </div>
                    <Button onClick={handleCsvDataPaste} data-testid="button-process-csv">
                      <Copy className="w-4 h-4 mr-2" />
                      Processar Dados CSV
                    </Button>
                  </TabsContent>
                  
                  <TabsContent value="excel" className="space-y-4">
                    <div>
                      <Label htmlFor="excel-data">Dados do Excel</Label>
                      <Textarea
                        id="excel-data"
                        placeholder={`Cole os dados copiados diretamente do Excel:\n${selectedTemplateData.variables.join('\t')}\nJoão Silva\tCurso React\t15/01/2024\tProf. Maria\nAna Costa\tCurso Node.js\t16/01/2024\tProf. João`}
                        rows={6}
                        value={excelData}
                        onChange={(e) => setExcelData(e.target.value)}
                        data-testid="textarea-excel-data"
                      />
                      <p className="text-xs text-muted-foreground mt-2">
                        Dica: Selecione e copie (Ctrl+C) as linhas e colunas diretamente do Excel, depois cole aqui
                      </p>
                    </div>
                    <Button onClick={handleExcelDataPaste} data-testid="button-process-excel">
                      <FileSpreadsheet className="w-4 h-4 mr-2" />
                      Processar Dados do Excel
                    </Button>
                  </TabsContent>
                </Tabs>
                
                {/* Batch Data Preview */}
                {batchData.length > 0 && (
                  <div className="mt-6">
                    <h4 className="font-medium mb-3">Prévia dos dados ({batchData.length} registros)</h4>
                    <div className="border rounded-md">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            {selectedTemplateData.variables.map((variable) => (
                              <TableHead key={variable}>{variable}</TableHead>
                            ))}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {batchData.slice(0, 5).map((row, index) => (
                            <TableRow key={index}>
                              {selectedTemplateData.variables.map((variable) => (
                                <TableCell key={variable}>{row[variable] || '-'}</TableCell>
                              ))}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                      {batchData.length > 5 && (
                        <div className="p-3 text-center text-sm text-muted-foreground border-t">
                          E mais {batchData.length - 5} registros...
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Generate Button */}
          {selectedTemplateData && (inputMethod === 'manual' ? (manualBatchData.length > 0 || (Object.keys(manualData).length > 0 && selectedTemplateData.variables.every(v => manualData[v]?.trim()))) : batchData.length > 0) && (
            <Card>
              <CardHeader>
                <CardTitle>4. Gerar Documentos</CardTitle>
                <CardDescription>
                  {inputMethod === 'manual' 
                    ? (manualBatchData.length > 0 
                        ? `Gerar ${manualBatchData.length} documentos em lote`
                        : 'Gerar um documento com os dados fornecidos'
                      )
                    : `Gerar ${batchData.length} documentos em lote`
                  }
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isGenerating && (
                  <div className="space-y-3 mb-4">
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="text-sm">Gerando documentos...</span>
                    </div>
                    <Progress value={generationProgress} className="w-full" />
                  </div>
                )}
                
                <div className="flex gap-3">
                  <Button 
                    onClick={handleGenerate}
                    disabled={isGenerating}
                    size="lg"
                    data-testid="button-generate-documents"
                  >
                    {isGenerating ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Download className="w-4 h-4 mr-2" />
                    )}
                    {isGenerating ? 'Gerando...' : 'Gerar Documentos'}
                  </Button>
                  
                  <Button 
                    variant="outline"
                    onClick={handleRefreshStatus}
                    disabled={isRefreshing}
                    size="lg"
                    data-testid="button-refresh-status"
                  >
                    {isRefreshing ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <RefreshCw className="w-4 h-4 mr-2" />
                    )}
                    {isRefreshing ? 'Atualizando...' : 'Atualizar Status'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Generated Documents History */}
          {generatedDocuments.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Histórico de Documentos</CardTitle>
                    <CardDescription>
                      Acompanhe o status dos documentos gerados ({generatedDocuments.length} total)
                    </CardDescription>
                  </div>
                  <Button 
                    variant="outline"
                    onClick={handleRefreshStatus}
                    disabled={isRefreshing}
                    data-testid="button-refresh-history"
                  >
                    <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                    Atualizar
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {generatedDocuments.map((doc) => (
                    <div key={doc.id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h4 className="font-medium">{doc.batchName}</h4>
                          <p className="text-sm text-muted-foreground">
                            {doc.documentsCount === 1 ? '1 documento' : `${doc.documentsCount} documentos`} • {doc.templateName}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Criado em: {doc.createdAt.toLocaleString('pt-BR')}
                            {doc.completedAt && ` • Concluído em: ${doc.completedAt.toLocaleString('pt-BR')}`}
                          </p>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          {doc.status === 'generating' && (
                            <Badge variant="outline" className="bg-blue-50 text-blue-700">
                              <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                              Gerando
                            </Badge>
                          )}
                          {doc.status === 'generated' && (
                            <Badge variant="outline" className="bg-orange-50 text-orange-700">
                              <FileText className="w-3 h-3 mr-1" />
                              Gerado
                            </Badge>
                          )}
                          {doc.status === 'signing' && (
                            <Badge variant="outline" className="bg-purple-50 text-purple-700">
                              <FileSignature className="w-3 h-3 mr-1 animate-pulse" />
                              Assinando
                            </Badge>
                          )}
                          {doc.status === 'signed' && (
                            <Badge variant="outline" className="bg-green-50 text-green-700">
                              <FileSignature className="w-3 h-3 mr-1" />
                              Assinado
                            </Badge>
                          )}
                          {doc.status === 'error' && (
                            <Badge variant="destructive">
                              <AlertTriangle className="w-3 h-3 mr-1" />
                              Erro
                            </Badge>
                          )}
                          
                          {doc.status === 'signed' && doc.downloadUrl && (
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => window.open(doc.downloadUrl, '_blank')}
                              data-testid={`button-download-${doc.id}`}
                            >
                              <Download className="w-3 h-3 mr-1" />
                              Download
                            </Button>
                          )}
                        </div>
                      </div>
                      
                      <div className="text-sm">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <span className="text-muted-foreground">Documento:</span>
                            <span className="ml-2">{doc.documentName}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Certificado:</span>
                            <span className="ml-2">{doc.certificateName}</span>
                          </div>
                        </div>
                        
                        {doc.error && (
                          <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-red-700 text-xs">
                            <strong>Erro:</strong> {doc.error}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}