import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download as DownloadIcon, FileText, Archive, Search, Filter, Calendar, User } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DatePickerRange } from "@/components/ui/date-range-picker";

// TODO: Replace with real data
const mockDocuments = [
  {
    id: '1',
    name: 'Certificado_Joao_Silva.pdf',
    template: 'Certificado de Conclusão',
    createdAt: '2024-01-15T10:30:00',
    size: '245 KB',
    status: 'signed',
    batchId: 'batch_001'
  },
  {
    id: '2',
    name: 'Certificado_Maria_Santos.pdf',
    template: 'Certificado de Conclusão',
    createdAt: '2024-01-15T10:31:00',
    size: '248 KB',
    status: 'signed',
    batchId: 'batch_001'
  },
  {
    id: '3',
    name: 'Contrato_Empresa_ABC.pdf',
    template: 'Contrato de Prestação',
    createdAt: '2024-01-14T15:45:00',
    size: '567 KB',
    status: 'signed',
    batchId: null
  },
  {
    id: '4',
    name: 'Declaracao_Pedro_Costa.pdf',
    template: 'Declaração de Participação',
    createdAt: '2024-01-13T09:15:00',
    size: '198 KB',
    status: 'processing',
    batchId: null
  },
  {
    id: '5',
    name: 'Certificado_Ana_Lima.pdf',
    template: 'Certificado de Conclusão',
    createdAt: '2024-01-15T10:32:00',
    size: '251 KB',
    status: 'signed',
    batchId: 'batch_001'
  }
];

export default function DownloadPage() {
  const [documents, setDocuments] = useState(mockDocuments);
  const [selectedDocuments, setSelectedDocuments] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [templateFilter, setTemplateFilter] = useState('all');
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         doc.template.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || doc.status === statusFilter;
    const matchesTemplate = templateFilter === 'all' || doc.template === templateFilter;
    
    let matchesDate = true;
    if (dateRange.from && dateRange.to) {
      const docDate = new Date(doc.createdAt);
      matchesDate = docDate >= dateRange.from && docDate <= dateRange.to;
    }
    
    return matchesSearch && matchesStatus && matchesTemplate && matchesDate;
  });

  const uniqueTemplates = Array.from(new Set(documents.map(doc => doc.template)));
  const batchGroups = documents.reduce((groups, doc) => {
    if (doc.batchId) {
      if (!groups[doc.batchId]) {
        groups[doc.batchId] = [];
      }
      groups[doc.batchId].push(doc);
    }
    return groups;
  }, {} as Record<string, typeof documents>);

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
    const document = documents.find(doc => doc.id === documentId);
    console.log('Downloading single document:', document?.name);
    // TODO: Implement actual download
  };

  const handleDownloadSelected = () => {
    console.log('Downloading selected documents:', selectedDocuments);
    // TODO: Implement ZIP download for selected documents
  };

  const handleDownloadBatch = (batchId: string) => {
    const batchDocs = batchGroups[batchId];
    console.log('Downloading batch:', batchId, batchDocs.length, 'documents');
    // TODO: Implement ZIP download for batch
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'signed':
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Assinado</Badge>;
      case 'processing':
        return <Badge variant="secondary">Processando</Badge>;
      case 'error':
        return <Badge variant="destructive">Erro</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR');
  };

  return (
    <div className="p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Downloads</h1>
          <p className="text-muted-foreground">Baixe seus documentos gerados individualmente ou em lotes</p>
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
                    <SelectItem value="processing">Processando</SelectItem>
                    <SelectItem value="error">Com Erro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="text-sm font-medium mb-2 block">Template</label>
                <Select value={templateFilter} onValueChange={setTemplateFilter}>
                  <SelectTrigger data-testid="select-template-filter">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {uniqueTemplates.map(template => (
                      <SelectItem key={template} value={template}>{template}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="text-sm font-medium mb-2 block">Período</label>
                <DatePickerRange
                  value={dateRange}
                  onChange={setDateRange}
                  placeholder="Selecionar período"
                />
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
                Baixe todos os documentos de um lote como arquivo ZIP
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
                      Baixar ZIP
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
                <CardDescription>Lista de todos os documentos gerados</CardDescription>
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
                    <TableHead>Template</TableHead>
                    <TableHead>Data/Hora</TableHead>
                    <TableHead>Tamanho</TableHead>
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
                          <span className="font-medium">{document.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>{document.template}</TableCell>
                      <TableCell>{formatDate(document.createdAt)}</TableCell>
                      <TableCell>{document.size}</TableCell>
                      <TableCell>{getStatusBadge(document.status)}</TableCell>
                      <TableCell>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleDownloadSingle(document.id)}
                          disabled={document.status !== 'signed'}
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
                  <h3 className="text-lg font-semibold mb-2">Nenhum documento encontrado</h3>
                  <p className="text-muted-foreground">
                    {searchTerm || statusFilter !== 'all' || templateFilter !== 'all' 
                      ? 'Tente ajustar os filtros' 
                      : 'Gere alguns documentos primeiro'}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}