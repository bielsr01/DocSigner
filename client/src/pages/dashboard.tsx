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
    <div className="p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
            <p className="text-muted-foreground">Visão geral do seu sistema de documentos</p>
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Documentos</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalDocuments.toLocaleString('pt-BR')}</div>
              <p className="text-xs text-muted-foreground">
                {documents.length > 0 ? `${documents.length} documentos` : 'Nenhum documento'}
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Modelos Ativos</CardTitle>
              <Upload className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{templatesCount}</div>
              <p className="text-xs text-muted-foreground">
                Prontos para uso
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Certificados</CardTitle>
              <FileSignature className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{certificatesCount}</div>
              <p className="text-xs text-muted-foreground">
                Para assinatura digital
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Este Mês</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pendingSignatures}</div>
              <p className="text-xs text-muted-foreground">
                Aguardando assinatura
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Ações Rápidas</CardTitle>
              <CardDescription>Acesse rapidamente as principais funcionalidades</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button 
                className="w-full justify-start" 
                variant="outline"
                onClick={() => setLocation('/modelos')}
                data-testid="button-quick-upload-template"
              >
                <Upload className="w-4 h-4 mr-2" />
                Enviar Novo Modelo
              </Button>
              
              <Button 
                className="w-full justify-start" 
                variant="outline"
                onClick={() => setLocation('/gerar')}
                data-testid="button-quick-generate-document"
              >
                <Plus className="w-4 h-4 mr-2" />
                Gerar Documentos
              </Button>
              
              <Button 
                className="w-full justify-start" 
                variant="outline"
                onClick={() => setLocation('/certificados')}
                data-testid="button-quick-manage-certificates"
              >
                <FileSignature className="w-4 h-4 mr-2" />
                Gerenciar Certificados
              </Button>
              
              <Button 
                className="w-full justify-start" 
                variant="outline"
                onClick={() => setLocation('/download')}
                data-testid="button-quick-download"
              >
                <Download className="w-4 h-4 mr-2" />
                Downloads
              </Button>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle>Atividade Recente</CardTitle>
              <CardDescription>Últimas ações realizadas no sistema</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-start gap-3">
                    <div className="mt-0.5">
                      {getActivityIcon(activity.action)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">
                        {activity.documentName || activity.template || 'Documento'}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-muted-foreground">
                          {formatDateTime(activity.createdAt)}
                        </span>
                        {getStatusBadge(activity.status)}
                      </div>
                    </div>
                  </div>
                ))}
                {recentActivity.length === 0 && (
                  <div className="text-center py-4">
                    <p className="text-sm text-muted-foreground">
                      Nenhuma atividade recente
                    </p>
                  </div>
                )}
                
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full mt-4"
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
  );
}