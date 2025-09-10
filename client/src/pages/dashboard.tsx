import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, Upload, FileSignature, Download, TrendingUp, Clock, CheckCircle, AlertTriangle, Plus, RefreshCw } from "lucide-react";
import { useLocation } from "wouter";

// TODO: Replace with real data from API
const mockStats = {
  totalDocuments: 1247,
  documentsThisMonth: 156,
  templatesCount: 8,
  certificatesCount: 3,
  pendingSignatures: 12,
  recentActivity: [
    {
      id: '1',
      type: 'document_generated',
      description: 'Lote de 25 certificados gerado',
      timestamp: '2024-01-15T14:30:00',
      status: 'success'
    },
    {
      id: '2', 
      type: 'template_uploaded',
      description: 'Novo modelo "Contrato Prestação" adicionado',
      timestamp: '2024-01-15T13:15:00',
      status: 'success'
    },
    {
      id: '3',
      type: 'document_signed',
      description: '8 documentos assinados automaticamente',
      timestamp: '2024-01-15T12:45:00',
      status: 'success'
    },
    {
      id: '4',
      type: 'document_error',
      description: 'Erro na geração - variável não preenchida',
      timestamp: '2024-01-15T11:20:00',
      status: 'error'
    }
  ]
};

export default function DashboardPage() {
  const [, setLocation] = useLocation();
  const [isLoading, setIsLoading] = useState(false);

  const handleRefreshStats = () => {
    setIsLoading(true);
    console.log('Refreshing dashboard stats...');
    // TODO: Implement actual stats refresh
    setTimeout(() => setIsLoading(false), 1000);
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'document_generated':
        return <FileText className="w-4 h-4 text-blue-500" />;
      case 'document_signed':
        return <FileSignature className="w-4 h-4 text-green-500" />;
      case 'template_uploaded':
        return <Upload className="w-4 h-4 text-orange-500" />;
      case 'document_error':
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Sucesso</Badge>;
      case 'error':
        return <Badge variant="destructive">Erro</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
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
              <div className="text-2xl font-bold">{mockStats.totalDocuments.toLocaleString('pt-BR')}</div>
              <p className="text-xs text-muted-foreground">
                +{mockStats.documentsThisMonth} este mês
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Modelos Ativos</CardTitle>
              <Upload className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{mockStats.templatesCount}</div>
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
              <div className="text-2xl font-bold">{mockStats.certificatesCount}</div>
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
              <div className="text-2xl font-bold">{mockStats.documentsThisMonth}</div>
              <p className="text-xs text-muted-foreground">
                Documentos gerados
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
                {mockStats.recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-start gap-3">
                    <div className="mt-0.5">
                      {getActivityIcon(activity.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{activity.description}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-muted-foreground">
                          {formatDateTime(activity.timestamp)}
                        </span>
                        {getStatusBadge(activity.status)}
                      </div>
                    </div>
                  </div>
                ))}
                
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