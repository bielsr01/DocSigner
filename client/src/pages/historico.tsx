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
      <div className="min-h-screen bg-gray-50">
        <div className="p-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center py-12">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4" />
              <p className="text-gray-600">Carregando histórico...</p>
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
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Histórico</h1>
              <p className="text-gray-600 text-base">Acompanhe a geração e assinatura de documentos</p>
            </div>
          
            <Button onClick={handleRefresh} data-testid="button-refresh-history" className="bg-blue-600 hover:bg-blue-700 text-white">
              <RefreshCw className="w-4 h-4 mr-2" />
              Atualizar
            </Button>
        </div>

          {/* Filters */}
          <Card className="mb-6 bg-white shadow-lg hover:shadow-xl transition-all duration-300 hover:translate-y-1 border border-gray-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-gray-900 text-lg">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Filter className="w-4 h-4 text-blue-600" />
                </div>
                Filtros
              </CardTitle>
            </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Buscar</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      placeholder="Buscar documentos..."
                      className="pl-10 bg-white border-gray-200"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      data-testid="input-search-history"
                    />
                </div>
              </div>
              
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Tipo de Operação</label>
                  <Select value={actionFilter} onValueChange={setActionFilter}>
                    <SelectTrigger data-testid="select-action-filter" className="bg-white border-gray-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white">
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
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Status</label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger data-testid="select-status-filter" className="bg-white border-gray-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white">
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
          <Card className="bg-white shadow-lg hover:shadow-xl transition-all duration-300 hover:translate-y-1 border border-gray-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-gray-900 text-lg">
                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                  <History className="w-4 h-4 text-green-600" />
                </div>
                Histórico de Documentos ({filteredHistory.length})
              </CardTitle>
              <CardDescription className="text-gray-600">Histórico de geração individual, lote e upload de documentos</CardDescription>
            </CardHeader>
          <CardContent>
              <div className="bg-white border border-gray-200 rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead className="text-gray-600">Operação</TableHead>
                      <TableHead className="text-gray-600">Documento</TableHead>
                      <TableHead className="text-gray-600">Data/Hora</TableHead>
                      <TableHead className="text-gray-600">Status</TableHead>
                      <TableHead className="text-gray-600">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                <TableBody>
                    {filteredHistory.map((item) => (
                      <TableRow key={item.id} className="hover:bg-gray-50">
                        <TableCell>
                          <div className="flex items-start gap-3">
                            <div className="mt-0.5">
                              {getActionIcon(item.action, item.type)}
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{getActionLabel(item.action)}</p>
                              <p className="text-sm text-gray-600">{item.message}</p>
                              {item.details && (
                                <p className="text-xs text-gray-500 mt-1">{item.details}</p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            {item.documentName && (
                              <p className="font-mono text-sm text-gray-900">{item.documentName}</p>
                            )}
                            {item.template && (
                              <p className="text-sm text-gray-600">{item.template}</p>
                            )}
                            {!item.documentName && !item.template && (
                              <span className="text-sm text-gray-500">N/A</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-gray-400" />
                            <span className="text-sm text-gray-600">{formatDateTime(item.createdAt)}</span>
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(item.status)}</TableCell>
                        <TableCell>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleViewDetails(item.id)}
                            data-testid={`button-view-details-${item.id}`}
                            className="bg-gray-50 border-gray-200 hover:bg-gray-100"
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
                    <div className="w-16 h-16 bg-green-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                      <History className="w-8 h-8 text-green-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Nenhuma atividade encontrada</h3>
                    <p className="text-gray-600">
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
    </div>
  );
}