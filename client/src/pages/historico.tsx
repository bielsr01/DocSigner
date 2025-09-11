import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { History, FileText, Search, Filter, Eye, Clock, RefreshCw, Upload, AlertTriangle } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { ActivityLog } from "@shared/schema";

export default function HistoricoPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Fetch activity logs from API
  const { data: history = [], isLoading, refetch } = useQuery({
    queryKey: ['/api/activity'],
    enabled: true
  }) as { data: ActivityLog[]; isLoading: boolean; refetch: () => void };

  // Filter to show only document-related events (generation, batch, uploads)
  const relevantActions = [
    'document_generated',
    'batch_generated', 
    'pdf_uploaded_signed',
    'document_signed',
    'document_error',
    'signing_error'
  ];
  
  const filteredHistory = history.filter(item => {
    // Only show relevant document events
    if (!relevantActions.includes(item.action)) {
      return false;
    }
    
    const matchesSearch = 
      item.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.documentName && item.documentName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (item.template && item.template.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesAction = actionFilter === 'all' || item.action === actionFilter;
    const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
    
    return matchesSearch && matchesAction && matchesStatus;
  });

  const getActionIcon = (action: string, type: string) => {
    switch (action) {
      case 'document_generated':
        return <FileText className="w-4 h-4 text-blue-500" />;
      case 'batch_generated':
        return <RefreshCw className="w-4 h-4 text-purple-500" />;
      case 'pdf_uploaded_signed':
        return <Upload className="w-4 h-4 text-green-500" />;
      case 'document_signed':
        return <FileText className="w-4 h-4 text-green-500" />;
      case 'document_error':
      case 'signing_error':
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
      default:
        return <History className="w-4 h-4 text-gray-500" />;
    }
  };

  const getActionLabel = (action: string) => {
    switch (action) {
      case 'document_generated': return 'Documento Individual Gerado';
      case 'batch_generated': return 'Lote de Documentos Gerado';
      case 'pdf_uploaded_signed': return 'PDF Enviado e Assinado';
      case 'document_signed': return 'Documento Assinado';
      case 'document_error': return 'Erro no Processamento';
      case 'signing_error': return 'Erro na Assinatura';
      default: return action.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
  };


  const getStatusBadge = (status: string) => {
    // Simplify status to success/error only
    const normalizedStatus = status === 'success' ? 'success' : 'error';
    
    switch (normalizedStatus) {
      case 'success':
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Sucesso</Badge>;
      case 'error':
        return <Badge variant="destructive">Erro</Badge>;
      default:
        return <Badge variant="destructive">Erro</Badge>; // Default to error if status is unclear
    }
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR');
  };

  const handleRefresh = () => {
    console.log('Refreshing history...');
    refetch();
  };

  const handleViewDetails = (historyId: string) => {
    console.log('Viewing details for history item:', historyId);
    // TODO: Implement details modal
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center py-12">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Carregando histórico...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold mb-2">Histórico</h1>
            <p className="text-muted-foreground">Acompanhe a geração e assinatura de documentos</p>
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Buscar</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Buscar documentos..."
                    className="pl-10"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    data-testid="input-search-history"
                  />
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium mb-2 block">Tipo de Operação</label>
                <Select value={actionFilter} onValueChange={setActionFilter}>
                  <SelectTrigger data-testid="select-action-filter">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    <SelectItem value="document_generated">Documento Individual</SelectItem>
                    <SelectItem value="batch_generated">Geração em Lote</SelectItem>
                    <SelectItem value="pdf_uploaded_signed">PDF Enviado</SelectItem>
                    <SelectItem value="document_error">Erros</SelectItem>
                    <SelectItem value="signing_error">Erros de Assinatura</SelectItem>
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
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* History Table */}
        <Card>
          <CardHeader>
            <CardTitle>Histórico de Documentos ({filteredHistory.length})</CardTitle>
            <CardDescription>Histórico de geração individual, lote e upload de documentos</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Operação</TableHead>
                    <TableHead>Documento</TableHead>
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
                            {getActionIcon(item.action, item.type)}
                          </div>
                          <div>
                            <p className="font-medium">{getActionLabel(item.action)}</p>
                            <p className="text-sm text-muted-foreground">{item.message}</p>
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
                          {!item.documentName && !item.template && (
                            <span className="text-sm text-muted-foreground">N/A</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm">{formatDateTime(item.createdAt)}</span>
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
                      : 'O histórico aparecerá aqui conforme você gerar documentos'}
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