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
  
  // Get recent activity (first 4 items)
  const recentActivity = filteredActivity.slice(0, 4);
  
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
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-blue-500 to-teal-400 relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 to-transparent"></div>
      <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full -translate-y-48 translate-x-48"></div>
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/5 rounded-full translate-y-32 -translate-x-32"></div>
      <div className="absolute top-1/2 left-1/3 w-32 h-32 bg-white/3 rounded-full"></div>
      
      <div className="relative z-10 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-4xl font-bold text-white mb-3 drop-shadow-lg">Dashboard</h1>
              <p className="text-blue-100 text-lg">Visão geral do seu sistema de documentos</p>
            </div>
            
            <Button 
              onClick={handleRefreshStats}
              disabled={isLoading}
              className="bg-white/20 backdrop-blur-sm border-white/30 text-white hover:bg-white/30 transition-all duration-300 shadow-lg"
              data-testid="button-refresh-dashboard"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card className="bg-white/20 backdrop-blur-md border-white/30 shadow-xl hover:shadow-2xl transition-all duration-300 hover:translate-y-1 hover:scale-105 group">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-white">Total de Documentos</CardTitle>
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center group-hover:bg-white/30 transition-colors duration-300">
                  <FileText className="h-6 w-6 text-white" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-white mb-1">{totalDocuments.toLocaleString('pt-BR')}</div>
                <p className="text-xs text-blue-100">
                  {documents.length > 0 ? `${documents.length} documentos` : 'Nenhum documento'}
                </p>
              </CardContent>
            </Card>
            
            <Card className="bg-white/20 backdrop-blur-md border-white/30 shadow-xl hover:shadow-2xl transition-all duration-300 hover:translate-y-1 hover:scale-105 group">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-white">Modelos Ativos</CardTitle>
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center group-hover:bg-white/30 transition-colors duration-300">
                  <Upload className="h-6 w-6 text-white" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-white mb-1">{templatesCount}</div>
                <p className="text-xs text-blue-100">
                  Prontos para uso
                </p>
              </CardContent>
            </Card>
            
            <Card className="bg-white/20 backdrop-blur-md border-white/30 shadow-xl hover:shadow-2xl transition-all duration-300 hover:translate-y-1 hover:scale-105 group">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-white">Certificados</CardTitle>
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center group-hover:bg-white/30 transition-colors duration-300">
                  <FileSignature className="h-6 w-6 text-white" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-white mb-1">{certificatesCount}</div>
                <p className="text-xs text-blue-100">
                  Para assinatura digital
                </p>
              </CardContent>
            </Card>
            
            <Card className="bg-white/20 backdrop-blur-md border-white/30 shadow-xl hover:shadow-2xl transition-all duration-300 hover:translate-y-1 hover:scale-105 group">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-white">Este Mês</CardTitle>
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center group-hover:bg-white/30 transition-colors duration-300">
                  <TrendingUp className="h-6 w-6 text-white" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-white mb-1">{pendingSignatures}</div>
                <p className="text-xs text-blue-100">
                  Aguardando assinatura
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Quick Actions */}
            <Card className="bg-white/20 backdrop-blur-md border-white/30 shadow-xl hover:shadow-2xl transition-all duration-300 hover:translate-y-1">
              <CardHeader>
                <CardTitle className="text-white text-lg">Ações Rápidas</CardTitle>
                <CardDescription className="text-blue-100">Acesse rapidamente as principais funcionalidades</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button 
                  className="w-full justify-start bg-white/20 border-white/30 text-white hover:bg-white/30 transition-all duration-300 group" 
                  variant="outline"
                  onClick={() => setLocation('/modelos')}
                  data-testid="button-quick-upload-template"
                >
                  <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center mr-3 group-hover:bg-white/30 transition-colors duration-300">
                    <Upload className="w-4 h-4" />
                  </div>
                  Enviar Novo Modelo
                </Button>
                
                <Button 
                  className="w-full justify-start bg-white/20 border-white/30 text-white hover:bg-white/30 transition-all duration-300 group" 
                  variant="outline"
                  onClick={() => setLocation('/gerar')}
                  data-testid="button-quick-generate-document"
                >
                  <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center mr-3 group-hover:bg-white/30 transition-colors duration-300">
                    <Plus className="w-4 h-4" />
                  </div>
                  Gerar Documentos
                </Button>
                
                <Button 
                  className="w-full justify-start bg-white/20 border-white/30 text-white hover:bg-white/30 transition-all duration-300 group" 
                  variant="outline"
                  onClick={() => setLocation('/certificados')}
                  data-testid="button-quick-manage-certificates"
                >
                  <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center mr-3 group-hover:bg-white/30 transition-colors duration-300">
                    <FileSignature className="w-4 h-4" />
                  </div>
                  Gerenciar Certificados
                </Button>
                
                <Button 
                  className="w-full justify-start bg-white/20 border-white/30 text-white hover:bg-white/30 transition-all duration-300 group" 
                  variant="outline"
                  onClick={() => setLocation('/download')}
                  data-testid="button-quick-download"
                >
                  <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center mr-3 group-hover:bg-white/30 transition-colors duration-300">
                    <Download className="w-4 h-4" />
                  </div>
                  Downloads
                </Button>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card className="bg-white/20 backdrop-blur-md border-white/30 shadow-xl hover:shadow-2xl transition-all duration-300 hover:translate-y-1">
              <CardHeader>
                <CardTitle className="text-white text-lg">Atividade Recente</CardTitle>
                <CardDescription className="text-blue-100">Últimas ações realizadas no sistema</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentActivity.map((activity) => (
                    <div key={activity.id} className="flex items-start gap-3 p-3 rounded-lg bg-white/10 hover:bg-white/20 transition-colors duration-300">
                      <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center mt-0.5">
                        {getActivityIcon(activity.action)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white">
                          {activity.documentName || activity.template || 'Documento'}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-blue-100">
                            {formatDateTime(activity.createdAt)}
                          </span>
                          <Badge className={activity.status === 'success' ? 'bg-green-500/20 text-green-100 border-green-500/30' : 'bg-red-500/20 text-red-100 border-red-500/30'}>
                            {activity.status === 'success' ? 'Sucesso' : 'Erro'}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                  {recentActivity.length === 0 && (
                    <div className="text-center py-8 text-blue-100">
                      <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p className="text-sm">
                        Nenhuma atividade recente
                      </p>
                    </div>
                  )}
                  
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full mt-4 bg-white/20 border-white/30 text-white hover:bg-white/30 transition-all duration-300"
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