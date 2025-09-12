import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, Upload, FileSignature, Download, TrendingUp, Clock, CheckCircle, AlertTriangle, Plus, RefreshCw } from "lucide-react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";

// Real data from API

export default function DashboardPage() {
  const [, setLocation] = useLocation();

  // Real data queries
  const { data: activity = [], isLoading: isLoadingActivity, refetch: refetchActivity } = useQuery({ 
    queryKey: ['/api/activity'], 
    select: (data: any[]) => data || []
  });
  
  const { data: templates = [], isLoading: isLoadingTemplates, refetch: refetchTemplates } = useQuery({ 
    queryKey: ['/api/templates'], 
    select: (data: any[]) => data || []
  });
  
  const { data: certificates = [], isLoading: isLoadingCertificates, refetch: refetchCertificates } = useQuery({ 
    queryKey: ['/api/certificates'], 
    select: (data: any[]) => data || []
  });
  
  const { data: documents = [], isLoading: isLoadingDocuments, refetch: refetchDocuments } = useQuery({ 
    queryKey: ['/api/documents'], 
    select: (data: any[]) => data || []
  });
  
  const isLoading = isLoadingActivity || isLoadingTemplates || isLoadingCertificates || isLoadingDocuments;
  
  // Calculate stats from real data
  const totalDocuments = documents.length;
  const templatesCount = templates.length;
  const certificatesCount = certificates.length;
  const pendingSignatures = documents.filter((doc: any) => doc.status === 'generated' || doc.status === 'processing').length;
  
  // Filter to show only document-related events (same as history page)
  const relevantActions = [
    'document_generated',
    'batch_generated', 
    'pdf_uploaded_signed',
    'document_signed',
    'document_error',
    'signing_error'
  ];
  
  const filteredActivity = activity.filter((item: any) => 
    relevantActions.includes(item.action)
  );
  
  // Get recent activity (first 3 items)
  const recentActivity = filteredActivity.slice(0, 3);
  
  const handleRefreshStats = async () => {
    console.log('Refreshing dashboard stats...');
    await Promise.all([
      refetchActivity(),
      refetchTemplates(), 
      refetchCertificates(),
      refetchDocuments()
    ]);
  };

  const getActivityIcon = (action: string) => {
    switch (action) {
      case 'document_generated':
        return <FileText className="w-4 h-4 text-blue-500" />;
      case 'batch_generated':
        return <RefreshCw className="w-4 h-4 text-purple-500" />;
      case 'pdf_uploaded_signed':
        return <Upload className="w-4 h-4 text-green-500" />;
      case 'document_signed':
        return <FileSignature className="w-4 h-4 text-green-500" />;
      case 'document_error':
      case 'signing_error':
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    // Simplify status to success/error only (same as history page)
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
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    
    if (diffHours < 1) {
      return 'Agora há pouco';
    } else if (diffHours < 24) {
      return `${diffHours}h atrás`;
    } else {
      return date.toLocaleDateString('pt-BR');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard</h1>
              <p className="text-gray-600 text-base">Visão geral do seu sistema de documentos</p>
            </div>
            
            <Button 
              onClick={handleRefreshStats}
              disabled={isLoading}
              data-testid="button-refresh-dashboard"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card className="bg-white shadow-lg hover:shadow-xl transition-all duration-300 hover:translate-y-1 border border-gray-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Total de Documentos</CardTitle>
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                  <FileText className="h-6 w-6 text-blue-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-gray-900 mb-1">{totalDocuments.toLocaleString('pt-BR')}</div>
                <p className="text-xs text-gray-500">
                  {documents.length > 0 ? `${documents.length} documentos` : 'Nenhum documento'}
                </p>
              </CardContent>
            </Card>
            
            <Card className="bg-white shadow-lg hover:shadow-xl transition-all duration-300 hover:translate-y-1 border border-gray-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Modelos Ativos</CardTitle>
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                  <Upload className="h-6 w-6 text-green-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-gray-900 mb-1">{templatesCount}</div>
                <p className="text-xs text-gray-500">
                  Prontos para uso
                </p>
              </CardContent>
            </Card>
            
            <Card className="bg-white shadow-lg hover:shadow-xl transition-all duration-300 hover:translate-y-1 border border-gray-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Certificados</CardTitle>
                <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                  <FileSignature className="h-6 w-6 text-purple-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-gray-900 mb-1">{certificatesCount}</div>
                <p className="text-xs text-gray-500">
                  Para assinatura digital
                </p>
              </CardContent>
            </Card>
            
            <Card className="bg-white shadow-lg hover:shadow-xl transition-all duration-300 hover:translate-y-1 border border-gray-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Este Mês</CardTitle>
                <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-orange-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-gray-900 mb-1">{pendingSignatures}</div>
                <p className="text-xs text-gray-500">
                  Aguardando assinatura
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Quick Actions */}
            <Card className="bg-white shadow-lg hover:shadow-xl transition-all duration-300 hover:translate-y-1 border border-gray-200">
              <CardHeader>
                <CardTitle className="text-gray-900 text-lg">Ações Rápidas</CardTitle>
                <CardDescription className="text-gray-600">Acesse rapidamente as principais funcionalidades</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button 
                  className="w-full justify-start bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100 transition-all duration-300 group" 
                  variant="outline"
                  onClick={() => setLocation('/modelos')}
                  data-testid="button-quick-upload-template"
                >
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mr-3 group-hover:bg-blue-200 transition-colors duration-300">
                    <Upload className="w-4 h-4 text-blue-600" />
                  </div>
                  Enviar Novo Modelo
                </Button>
                
                <Button 
                  className="w-full justify-start bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100 transition-all duration-300 group" 
                  variant="outline"
                  onClick={() => setLocation('/gerar')}
                  data-testid="button-quick-generate-document"
                >
                  <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center mr-3 group-hover:bg-green-200 transition-colors duration-300">
                    <Plus className="w-4 h-4 text-green-600" />
                  </div>
                  Gerar Documentos
                </Button>
                
                <Button 
                  className="w-full justify-start bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100 transition-all duration-300 group" 
                  variant="outline"
                  onClick={() => setLocation('/certificados')}
                  data-testid="button-quick-manage-certificates"
                >
                  <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center mr-3 group-hover:bg-purple-200 transition-colors duration-300">
                    <FileSignature className="w-4 h-4 text-purple-600" />
                  </div>
                  Gerenciar Certificados
                </Button>
                
                <Button 
                  className="w-full justify-start bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100 transition-all duration-300 group" 
                  variant="outline"
                  onClick={() => setLocation('/download')}
                  data-testid="button-quick-download"
                >
                  <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center mr-3 group-hover:bg-orange-200 transition-colors duration-300">
                    <Download className="w-4 h-4 text-orange-600" />
                  </div>
                  Downloads
                </Button>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card className="bg-white shadow-lg hover:shadow-xl transition-all duration-300 hover:translate-y-1 border border-gray-200">
              <CardHeader>
                <CardTitle className="text-gray-900 text-lg">Atividade Recente</CardTitle>
                <CardDescription className="text-gray-600">Últimas ações realizadas no sistema</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {recentActivity.map((activity) => (
                    <div key={activity.id} className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors duration-300">
                      <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center mt-0.5">
                        {getActivityIcon(activity.action)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {activity.action === 'batch_generated' 
                              ? 'Lote de Documentos' 
                              : (activity.documentName || activity.template || 'Documento')}
                          </p>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className="text-xs text-gray-500 whitespace-nowrap">
                              {formatDateTime(activity.createdAt)}
                            </span>
                            {getStatusBadge(activity.status)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  {recentActivity.length === 0 && (
                    <div className="text-center py-8 text-gray-400">
                      <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p className="text-sm">
                        Nenhuma atividade recente
                      </p>
                    </div>
                  )}
                  
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full mt-4 bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100 transition-all duration-300"
                    onClick={() => setLocation('/historico')}
                    data-testid="button-view-full-history"
                  >
                    Ver Histórico Completo
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}