import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download as DownloadIcon, FileText, Archive, Search, Filter, RefreshCw } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Document } from "@shared/schema";

export default function DownloadPage() {
  const [selectedDocuments, setSelectedDocuments] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [batchFilter, setBatchFilter] = useState('all');

  // Fetch documents from API
  const { data: documents = [], isLoading, refetch } = useQuery({
    queryKey: ['/api/documents'],
    enabled: true
  }) as { data: Document[]; isLoading: boolean; refetch: () => void };

  // Only show signed documents for download (and optionally ready documents)
  const downloadableDocuments = documents.filter(doc => 
    doc.status === 'signed' || doc.status === 'ready'
  );

  const filteredDocuments = downloadableDocuments.filter(doc => {
    const matchesSearch = doc.filename.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || doc.status === statusFilter;
    const matchesBatch = batchFilter === 'all' || 
                        (batchFilter === 'individual' && !doc.batchId) ||
                        (batchFilter === 'batch' && doc.batchId) ||
                        doc.batchId === batchFilter;
    
    return matchesSearch && matchesStatus && matchesBatch;
  });

  // Group documents by batch
  const batchGroups = downloadableDocuments.reduce((groups, doc) => {
    if (doc.batchId) {
      if (!groups[doc.batchId]) {
        groups[doc.batchId] = [];
      }
      groups[doc.batchId].push(doc);
    }
    return groups;
  }, {} as Record<string, Document[]>);

  const uniqueBatches = Array.from(new Set(
    downloadableDocuments.filter(doc => doc.batchId).map(doc => doc.batchId!)
  ));

  const handleDocumentSelect = (documentId: string, isSelected: boolean) => {
    if (isSelected) {
      setSelectedDocuments(prev => [...prev, documentId]);
    } else {
      setSelectedDocuments(prev => prev.filter(id => id !== documentId));
    }
  };

  const handleSelectAll = (isSelected: boolean) => {
    if (isSelected) {
      setSelectedDocuments(filteredDocuments.map(doc => doc.id));
    } else {
      setSelectedDocuments([]);
    }
  };

  const handleDownloadSingle = (documentId: string) => {
    const doc = documents.find(d => d.id === documentId);
    console.log('Downloading single document:', doc?.filename);
    
    // Create download link
    const downloadUrl = `/api/documents/${documentId}/download`;
    const link = window.document.createElement('a');
    link.href = downloadUrl;
    link.download = doc?.filename || 'document.pdf';
    window.document.body.appendChild(link);
    link.click();
    window.document.body.removeChild(link);
  };

  const handleDownloadSelected = () => {
    console.log('Downloading selected documents:', selectedDocuments);
    
    // Download each selected document individually
    selectedDocuments.forEach(documentId => {
      setTimeout(() => handleDownloadSingle(documentId), 100); // Small delay between downloads
    });
  };

  const handleDownloadBatch = (batchId: string) => {
    const batchDocs = batchGroups[batchId];
    console.log('Downloading batch:', batchId, batchDocs.length, 'documents');
    
    // Download all documents in the batch
    batchDocs.forEach((doc, index) => {
      setTimeout(() => handleDownloadSingle(doc.id), index * 200); // Staggered downloads
    });
  };

  const handleRefresh = () => {
    refetch();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'signed':
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Assinado</Badge>;
      case 'ready':
        return <Badge variant="outline" className="text-orange-600">Pronto</Badge>;
      case 'processing':
        return <Badge variant="secondary">Processando</Badge>;
      case 'failed':
        return <Badge variant="destructive">Erro</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatDate = (dateString: string | Date) => {
    return new Date(dateString).toLocaleString('pt-BR');
  };

  const getFileSize = (filename: string) => {
    // This is a placeholder - in a real app you'd get the actual file size
    return 'N/A';
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center py-12">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Carregando documentos...</p>
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
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Downloads</h1>
              <p className="text-gray-600 text-base">Baixe seus documentos gerados individualmente ou em lotes</p>
            </div>
            
            <Button onClick={handleRefresh} variant="outline" data-testid="button-refresh-downloads">
              <RefreshCw className="w-4 h-4 mr-2" />
              Atualizar
            </Button>
          </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="w-5 h-5" />
              Filtros
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Buscar</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Nome do arquivo..."
                    className="pl-10"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    data-testid="input-search-documents"
                  />
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium mb-2 block">Status</label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger data-testid="select-status-filter">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="signed">Assinados</SelectItem>
                    <SelectItem value="ready">Prontos</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="text-sm font-medium mb-2 block">Lote</label>
                <Select value={batchFilter} onValueChange={setBatchFilter}>
                  <SelectTrigger data-testid="select-batch-filter">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="individual">Individuais</SelectItem>
                    <SelectItem value="batch">Em Lote</SelectItem>
                    {uniqueBatches.map(batchId => (
                      <SelectItem key={batchId} value={batchId}>{batchId}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Batch Downloads */}
        {Object.keys(batchGroups).length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Archive className="w-5 h-5" />
                Downloads em Lote
              </CardTitle>
              <CardDescription>
                Baixe todos os documentos de um lote
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3">
                {Object.entries(batchGroups).map(([batchId, batchDocs]) => (
                  <div key={batchId} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <span className="font-medium">{batchId}</span>
                      <span className="text-sm text-muted-foreground ml-2">
                        ({batchDocs.length} documentos)
                      </span>
                    </div>
                    <Button 
                      variant="outline"
                      onClick={() => handleDownloadBatch(batchId)}
                      data-testid={`button-download-batch-${batchId}`}
                    >
                      <Archive className="w-4 h-4 mr-2" />
                      Baixar Todos
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Documents Table */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Documentos ({filteredDocuments.length})</CardTitle>
                <CardDescription>Lista de documentos disponíveis para download</CardDescription>
              </div>
              
              {selectedDocuments.length > 0 && (
                <Button 
                  onClick={handleDownloadSelected}
                  data-testid="button-download-selected"
                >
                  <Archive className="w-4 h-4 mr-2" />
                  Baixar Selecionados ({selectedDocuments.length})
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={selectedDocuments.length === filteredDocuments.length && filteredDocuments.length > 0}
                        onCheckedChange={handleSelectAll}
                        data-testid="checkbox-select-all"
                      />
                    </TableHead>
                    <TableHead>Documento</TableHead>
                    <TableHead>Data de Criação</TableHead>
                    <TableHead>Lote</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDocuments.map((document) => (
                    <TableRow key={document.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedDocuments.includes(document.id)}
                          onCheckedChange={(checked) => handleDocumentSelect(document.id, checked as boolean)}
                          data-testid={`checkbox-document-${document.id}`}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-muted-foreground" />
                          <span className="font-medium">{document.filename}</span>
                        </div>
                      </TableCell>
                      <TableCell>{formatDate(document.createdAt)}</TableCell>
                      <TableCell>
                        {document.batchId ? (
                          <Badge variant="outline">{document.batchId}</Badge>
                        ) : (
                          <span className="text-sm text-muted-foreground">Individual</span>
                        )}
                      </TableCell>
                      <TableCell>{getStatusBadge(document.status)}</TableCell>
                      <TableCell>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleDownloadSingle(document.id)}
                          disabled={document.status !== 'signed' && document.status !== 'ready'}
                          data-testid={`button-download-${document.id}`}
                        >
                          <DownloadIcon className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              
              {filteredDocuments.length === 0 && (
                <div className="text-center py-12">
                  <FileText className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Nenhum documento disponível</h3>
                  <p className="text-muted-foreground">
                    {downloadableDocuments.length === 0 
                      ? 'Gere e assine alguns documentos primeiro'
                      : 'Tente ajustar os filtros'}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
    </div>
  );
}