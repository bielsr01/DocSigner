import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { History, FileText, Search, Filter, Eye, Clock, RefreshCw } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DatePickerRange } from "@/components/ui/date-range-picker";

// TODO: Replace with real data
const mockHistory = [
  {
    id: '1',
    action: 'document_generated',
    description: 'Documento "Certificado_Joao_Silva.pdf" gerado com sucesso',
    documentName: 'Certificado_Joao_Silva.pdf',
    template: 'Certificado de Conclusão',
    user: 'João Silva',
    timestamp: '2024-01-15T10:30:00',
    status: 'success',
    details: 'Geração individual manual'
  },
  {
    id: '2',
    action: 'document_signed',
    description: 'Documento "Certificado_Joao_Silva.pdf" assinado digitalmente',
    documentName: 'Certificado_Joao_Silva.pdf',
    template: 'Certificado de Conclusão',
    user: 'João Silva',
    timestamp: '2024-01-15T10:32:00',
    status: 'success',
    details: 'Assinatura com certificado A3'
  },
  {
    id: '3',
    action: 'batch_generated',
    description: 'Lote de 25 documentos gerado (batch_001)',
    documentName: 'batch_001',
    template: 'Certificado de Conclusão',
    user: 'Maria Santos',
    timestamp: '2024-01-15T09:15:00',
    status: 'success',
    details: 'Geração em lote via CSV'
  },
  {
    id: '4',
    action: 'template_uploaded',
    description: 'Novo modelo "Contrato de Prestação" enviado',
    documentName: 'Contrato_Prestacao.docx',
    template: 'Contrato de Prestação',
    user: 'Admin',
    timestamp: '2024-01-14T16:20:00',
    status: 'success',
    details: '5 variáveis detectadas'
  },
  {
    id: '5',
    action: 'certificate_uploaded',
    description: 'Certificado digital "Empresa LTDA" adicionado',
    documentName: null,
    template: null,
    user: 'João Silva',
    timestamp: '2024-01-14T14:30:00',
    status: 'success',
    details: 'Certificado A3 válido até 2025'
  },
  {
    id: '6',
    action: 'document_error',
    description: 'Erro na geração do documento "Declaracao_Pedro.pdf"',
    documentName: 'Declaracao_Pedro.pdf',
    template: 'Declaração de Participação',
    user: 'Ana Costa',
    timestamp: '2024-01-13T11:45:00',
    status: 'error',
    details: 'Variável {{DATA_EVENTO}} não preenchida'
  }
];

export default function HistoricoPage() {
  const [history] = useState(mockHistory);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});

  const filteredHistory = history.filter(item => {
    const matchesSearch = 
      item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.documentName && item.documentName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (item.template && item.template.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesAction = actionFilter === 'all' || item.action === actionFilter;
    const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
    let matchesDate = true;
    if (dateRange.from && dateRange.to) {
      const itemDate = new Date(item.timestamp);
      matchesDate = itemDate >= dateRange.from && itemDate <= dateRange.to;
    }
    
    return matchesSearch && matchesAction && matchesStatus && matchesDate;
  });

  
  const getActionIcon = (action: string) => {
    switch (action) {
      case 'document_generated':
        return <FileText className="w-4 h-4 text-blue-500" />;
      case 'document_signed':
        return <FileText className="w-4 h-4 text-green-500" />;
      case 'batch_generated':
        return <RefreshCw className="w-4 h-4 text-purple-500" />;
      case 'template_uploaded':
        return <FileText className="w-4 h-4 text-orange-500" />;
      case 'certificate_uploaded':
        return <FileText className="w-4 h-4 text-indigo-500" />;
      case 'document_error':
        return <FileText className="w-4 h-4 text-red-500" />;
      default:
        return <History className="w-4 h-4 text-gray-500" />;
    }
  };

  const getActionLabel = (action: string) => {
    switch (action) {
      case 'document_generated': return 'Documento Gerado';
      case 'document_signed': return 'Documento Assinado';
      case 'batch_generated': return 'Lote Gerado';
      case 'template_uploaded': return 'Modelo Enviado';
      case 'certificate_uploaded': return 'Certificado Adicionado';
      case 'document_error': return 'Erro no Documento';
      default: return action;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Sucesso</Badge>;
      case 'error':
        return <Badge variant="destructive">Erro</Badge>;
      case 'warning':
        return <Badge variant="secondary">Aviso</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR');
  };

  const handleRefresh = () => {
    console.log('Refreshing history...');
    // TODO: Implement actual refresh from server
  };

  const handleViewDetails = (historyId: string) => {
    console.log('Viewing details for history item:', historyId);
    // TODO: Implement details modal
  };

  return (
    <div className="p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold mb-2">Histórico</h1>
            <p className="text-muted-foreground">Acompanhe todas as atividades do sistema</p>
          </div>
          
          <Button onClick={handleRefresh} data-testid="button-refresh-history">
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Buscar</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Buscar atividades..."
                    className="pl-10"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    data-testid="input-search-history"
                  />
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium mb-2 block">Ação</label>
                <Select value={actionFilter} onValueChange={setActionFilter}>
                  <SelectTrigger data-testid="select-action-filter">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    <SelectItem value="document_generated">Documento Gerado</SelectItem>
                    <SelectItem value="document_signed">Documento Assinado</SelectItem>
                    <SelectItem value="batch_generated">Lote Gerado</SelectItem>
                    <SelectItem value="template_uploaded">Modelo Enviado</SelectItem>
                    <SelectItem value="certificate_uploaded">Certificado Adicionado</SelectItem>
                    <SelectItem value="document_error">Erro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="text-sm font-medium mb-2 block">Status</label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger data-testid="select-status-filter">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="success">Sucesso</SelectItem>
                    <SelectItem value="error">Erro</SelectItem>
                    <SelectItem value="warning">Aviso</SelectItem>
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

        {/* History Table */}
        <Card>
          <CardHeader>
            <CardTitle>Atividades ({filteredHistory.length})</CardTitle>
            <CardDescription>Histórico completo de atividades do sistema</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Atividade</TableHead>
                    <TableHead>Documento/Template</TableHead>
                    <TableHead>Data/Hora</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredHistory.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5">
                            {getActionIcon(item.action)}
                          </div>
                          <div>
                            <p className="font-medium">{getActionLabel(item.action)}</p>
                            <p className="text-sm text-muted-foreground">{item.description}</p>
                            {item.details && (
                              <p className="text-xs text-muted-foreground mt-1">{item.details}</p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          {item.documentName && (
                            <p className="font-mono text-sm">{item.documentName}</p>
                          )}
                          {item.template && (
                            <p className="text-sm text-muted-foreground">{item.template}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm">{formatDateTime(item.timestamp)}</span>
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(item.status)}</TableCell>
                      <TableCell>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleViewDetails(item.id)}
                          data-testid={`button-view-details-${item.id}`}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              
              {filteredHistory.length === 0 && (
                <div className="text-center py-12">
                  <History className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Nenhuma atividade encontrada</h3>
                  <p className="text-muted-foreground">
                    {searchTerm || actionFilter !== 'all' || statusFilter !== 'all'
                      ? 'Tente ajustar os filtros' 
                      : 'O histórico aparecerá aqui conforme você usar o sistema'}
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