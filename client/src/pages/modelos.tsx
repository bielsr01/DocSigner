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
    <div className="p-6 max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold">Modelos de Documento</h1>
            <p className="text-muted-foreground">Gerencie seus templates com variáveis dinâmicas</p>
          </div>
          
          <div className="flex gap-2">
            <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
              <DialogTrigger asChild>
                <Button data-testid="button-upload-template">
                  <Plus className="w-4 h-4 mr-2" />
                  Novo Modelo
                </Button>
              </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Enviar Novo Modelo</DialogTitle>
                <DialogDescription>
                  Faça upload de um documento Word (.docx) com variáveis no formato {'{{'} VARIAVEL {'}}'}  
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="template-name">Nome do modelo</Label>
                  <Input
                    id="template-name"
                    placeholder="Ex: Certificado de Conclusão"
                    value={uploadData.name}
                    onChange={(e) => setUploadData({ ...uploadData, name: e.target.value })}
                    data-testid="input-template-name"
                  />
                </div>
                
                <div>
                  <Label htmlFor="template-description">Descrição</Label>
                  <Textarea
                    id="template-description"
                    placeholder="Breve descrição do modelo..."
                    value={uploadData.description}
                    onChange={(e) => setUploadData({ ...uploadData, description: e.target.value })}
                    data-testid="input-template-description"
                  />
                </div>
                
                <div>
                  <Label htmlFor="template-file">Arquivo (.docx)</Label>
                  <Input
                    id="template-file"
                    type="file"
                    accept=".docx"
                    onChange={handleFileUpload}
                    data-testid="input-template-file"
                  />
                </div>
                
                <Button 
                  onClick={handleUploadSubmit} 
                  className="w-full"
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

        {/* Search Bar */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Pesquisar modelos..."
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            data-testid="input-search-templates"
          />
        </div>

        {/* Templates Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTemplates.map((template) => (
            <Card key={template.id} className="hover-elevate">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <FileText className="w-8 h-8 text-primary" />
                  <Badge variant="secondary">{template.fileSize}</Badge>
                </div>
                <CardTitle className="text-lg">{template.name}</CardTitle>
                <CardDescription>{template.description}</CardDescription>
              </CardHeader>
              
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium mb-2">Variáveis encontradas:</p>
                    <div className="flex flex-wrap gap-1">
                      {template.variables.map((variable, index) => (
                        <Badge key={index} variant="outline" className="text-xs font-mono">
                          {variable}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  
                  <div className="text-xs text-muted-foreground">
                    Criado em {new Date(template.createdAt).toLocaleDateString('pt-BR')}
                  </div>
                  
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleTemplateAction('edit', template.id)}
                      data-testid={`button-edit-${template.id}`}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleTemplateAction('download', template.id)}
                      data-testid={`button-download-${template.id}`}
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleTemplateAction('delete', template.id)}
                      data-testid={`button-delete-${template.id}`}
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
          <div className="text-center py-12">
            <FileText className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhum modelo encontrado</h3>
            <p className="text-muted-foreground mb-4">
              {searchTerm ? 'Tente uma pesquisa diferente' : 'Comece enviando seu primeiro modelo'}
            </p>
            {!searchTerm && (
              <Button onClick={() => setIsUploadDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Enviar Primeiro Modelo
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}