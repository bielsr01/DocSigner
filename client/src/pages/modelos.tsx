
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, Upload, Download, Edit, Trash2, Search, Plus, Eye } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

import type { Template } from "@shared/schema";

export default function ModelosPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [uploadData, setUploadData] = useState({ name: '', description: '', file: null as File | null });
  const { toast } = useToast();

  // Fetch templates from API
  const { data: templates = [], isLoading, error } = useQuery({
    queryKey: ['/api/templates'],
    enabled: true
  }) as { data: Template[]; isLoading: boolean; error: any };

  // Upload template mutation
  const uploadTemplateMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await fetch('/api/templates', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });
      if (!response.ok) {
        throw new Error('Upload failed');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/templates'] });
      setUploadData({ name: '', description: '', file: null });
      setIsUploadDialogOpen(false);
      toast({
        title: "Template enviado",
        description: "Template foi enviado e processado com sucesso.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro no upload",
        description: "Falha ao enviar template",
        variant: "destructive",
      });
    }
  });

  // Delete template mutation
  const deleteTemplateMutation = useMutation({
    mutationFn: (templateId: string) => fetch(`/api/templates/${templateId}`, { 
      method: 'DELETE', 
      credentials: 'include' 
    }).then(res => res.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/templates'] });
      toast({
        title: "Template removido",
        description: "Template foi removido com sucesso.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: "Falha ao remover template",
        variant: "destructive",
      });
    }
  });

  const filteredTemplates = templates.filter((template: Template) => 
    template.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadData({ ...uploadData, file });
      console.log('File selected:', file.name);
    }
  };

  const handleUploadSubmit = () => {
    if (!uploadData.file || !uploadData.name) return;
    
    const formData = new FormData();
    formData.append('file', uploadData.file);
    formData.append('name', uploadData.name);
    if (uploadData.description) {
      formData.append('description', uploadData.description);
    }
    
    uploadTemplateMutation.mutate(formData);
  };

  const handleTemplateAction = (action: string, templateId: string) => {
    switch (action) {
      case 'delete':
        if (confirm('Tem certeza que deseja excluir este template?')) {
          deleteTemplateMutation.mutate(templateId);
        }
        break;
      case 'download':
        // Download template
        window.open(`/api/templates/${templateId}/download`, '_blank');
        break;
      case 'edit':
        // TODO: Implementar edição de template
        toast({
          title: "Em desenvolvimento",
          description: "Funcionalidade de edição será implementada em breve",
        });
        break;
      default:
        console.log(`${action} template:`, templateId);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-4">
        <div className="max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Modelos de Documento</h1>
          <p className="text-gray-600 text-base">Gerencie seus templates com variáveis dinâmicas</p>
        </div>
        
        <div className="flex gap-2">
          <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-upload-template" className="bg-blue-600 hover:bg-blue-700 text-white">
                <div className="w-4 h-4 mr-2 flex items-center justify-center">
                  <Plus className="w-4 h-4" />
                </div>
                Novo Modelo
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px] bg-white">
              <DialogHeader>
                <DialogTitle className="text-gray-900">Enviar Novo Modelo</DialogTitle>
                <DialogDescription className="text-gray-600">
                  Faça upload de um documento Word (.docx) com variáveis no formato {'{{'} VARIAVEL {'}}'}  
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-6 mt-6">
                <div>
                  <Label htmlFor="template-name" className="text-gray-700">Nome do modelo</Label>
                  <Input
                    id="template-name"
                    placeholder="Ex: Certificado de Conclusão"
                    value={uploadData.name}
                    onChange={(e) => setUploadData({ ...uploadData, name: e.target.value })}
                    data-testid="input-template-name"
                    className="bg-white border-gray-200"
                  />
                </div>
                
                <div>
                  <Label htmlFor="template-description" className="text-gray-700">Descrição</Label>
                  <Textarea
                    id="template-description"
                    placeholder="Breve descrição do modelo..."
                    value={uploadData.description}
                    onChange={(e) => setUploadData({ ...uploadData, description: e.target.value })}
                    data-testid="input-template-description"
                    className="bg-white border-gray-200"
                  />
                </div>
                
                <div>
                  <Label htmlFor="template-file" className="text-gray-700">Arquivo (.pdf, .docx)</Label>
                  <Input
                    id="template-file"
                    type="file"
                    accept=".pdf,.docx"
                    onChange={handleFileUpload}
                    data-testid="input-template-file"
                    className="bg-white border-gray-200"
                  />
                </div>
                
                <Button 
                  onClick={handleUploadSubmit} 
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                  disabled={!uploadData.file || !uploadData.name}
                  data-testid="button-submit-template"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Enviar Modelo
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

          {/* Search Bar */}
          <div className="relative mb-8">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Pesquisar modelos..."
              className="pl-10 max-w-md bg-white border-gray-200"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              data-testid="input-search-templates"
            />
          </div>

          {/* Templates Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredTemplates.map((template) => (
              <Card key={template.id} className="bg-white shadow-lg hover:shadow-xl transition-all duration-300 hover:translate-y-1 border border-gray-200 group">
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center group-hover:bg-blue-200 transition-colors duration-300">
                    <FileText className="h-6 w-6 text-blue-600" />
                  </div>
                  <Badge className="bg-blue-100 text-blue-800">{template.originalFilename || 'Template'}</Badge>
                </div>
                <CardTitle className="text-gray-900 text-lg line-clamp-2">{template.name}</CardTitle>
                <CardDescription className="text-gray-600 line-clamp-2">Template com {template.variables.length} variáveis</CardDescription>
              </CardHeader>
            
            <CardContent className="pt-0">
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-3">Variáveis encontradas:</p>
                  <div className="flex flex-wrap gap-2 min-h-[2rem]">
                    {template.variables.length > 0 ? (
                      template.variables.map((variable, index) => (
                        <Badge key={index} className="bg-gray-100 text-gray-700 text-xs font-mono">
                          {variable}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-xs text-gray-500">Nenhuma variável encontrada</span>
                    )}
                  </div>
                </div>
                
                <div className="text-xs text-gray-500 pt-2 border-t border-gray-200">
                  Criado em {new Date(template.createdAt).toLocaleDateString('pt-BR')}
                </div>
                
                <div className="flex gap-2 pt-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handleTemplateAction('edit', template.id)}
                    data-testid={`button-edit-${template.id}`}
                    className="bg-gray-50 border-gray-200 hover:bg-gray-100"
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handleTemplateAction('download', template.id)}
                    data-testid={`button-download-${template.id}`}
                    className="bg-gray-50 border-gray-200 hover:bg-gray-100"
                  >
                    <Download className="w-4 h-4" />
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handleTemplateAction('delete', template.id)}
                    data-testid={`button-delete-${template.id}`}
                    className="bg-gray-50 border-gray-200 hover:bg-red-50 hover:border-red-200 hover:text-red-600"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
              </Card>
            ))}
          </div>
          
          {filteredTemplates.length === 0 && (
            <div className="text-center py-16">
              <div className="max-w-md mx-auto">
                <div className="w-16 h-16 bg-gray-100 rounded-xl flex items-center justify-center mx-auto mb-6">
                  <FileText className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">Nenhum modelo encontrado</h3>
                <p className="text-gray-600 mb-6">
                  {searchTerm ? 'Tente uma pesquisa diferente' : 'Comece enviando seu primeiro modelo'}
                </p>
                {!searchTerm && (
                  <Button onClick={() => setIsUploadDialogOpen(true)} size="lg" className="bg-blue-600 hover:bg-blue-700 text-white">
                    <Plus className="w-4 h-4 mr-2" />
                    Enviar Primeiro Modelo
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
