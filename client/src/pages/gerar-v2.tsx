import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Plus, Trash2, Archive, Loader2 } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";

interface Template {
  id: string;
  name: string;
  variables: string[];
  originalFilename?: string;
  mimeType?: string;
  createdAt: string;
  storageRef: string;
}

// Certificate interface removed - ZIP-only generation

interface SelectedModel {
  id: string;
  templateId: string;
  templateName: string;
  variables: Record<string, string>;
  documentName: string;
}

export default function GerarV2Page() {
  const [selectedModels, setSelectedModels] = useState<SelectedModel[]>([]);
  const [batchName, setBatchName] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  // Fetch templates from API
  const { data: templates = [], isLoading: templatesLoading } = useQuery({
    queryKey: ['/api/templates'],
    enabled: true
  }) as { data: Template[]; isLoading: boolean };

  // Certificate functionality removed - documents are generated as ZIP only

  const addNewModel = () => {
    const newModel: SelectedModel = {
      id: Date.now().toString(),
      templateId: '',
      templateName: '',
      variables: {},
      documentName: ''
    };
    setSelectedModels([...selectedModels, newModel]);
  };

  const removeModel = (modelId: string) => {
    setSelectedModels(selectedModels.filter(model => model.id !== modelId));
  };

  const updateModelTemplate = (modelId: string, templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (!template) return;

    const initialVariables: Record<string, string> = {};
    template.variables.forEach(variable => {
      initialVariables[variable] = '';
    });

    setSelectedModels(selectedModels.map(model => 
      model.id === modelId 
        ? { 
            ...model, 
            templateId, 
            templateName: template.name,
            variables: initialVariables,
            documentName: template.name
          }
        : model
    ));
  };

  const updateModelVariable = (modelId: string, variableName: string, value: string) => {
    setSelectedModels(selectedModels.map(model => 
      model.id === modelId 
        ? { 
            ...model, 
            variables: { ...model.variables, [variableName]: value }
          }
        : model
    ));
  };

  const updateModelDocumentName = (modelId: string, documentName: string) => {
    setSelectedModels(selectedModels.map(model => 
      model.id === modelId 
        ? { ...model, documentName }
        : model
    ));
  };

  const [generatedBatchId, setGeneratedBatchId] = useState<string | null>(null);
  const [showDownloadButton, setShowDownloadButton] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const generateDocuments = async () => {
    if (selectedModels.length === 0) {
      toast({
        title: "Erro",
        description: "Adicione pelo menos um modelo para gerar documentos",
        variant: "destructive"
      });
      return;
    }

    if (!batchName.trim()) {
      toast({
        title: "Erro",
        description: "Digite um nome para o lote",
        variant: "destructive"
      });
      return;
    }

    // Validate all models have template selected
    const incompleteModels = selectedModels.filter(model => !model.templateId);
    if (incompleteModels.length > 0) {
      toast({
        title: "Erro",
        description: "Selecione um modelo para todos os documentos",
        variant: "destructive"
      });
      return;
    }

    // Validate all variables are filled
    for (const model of selectedModels) {
      const template = templates.find(t => t.id === model.templateId);
      if (!template) continue;
      
      const missingVariables = template.variables.filter(variable => !model.variables[variable]?.trim());
      if (missingVariables.length > 0) {
        toast({
          title: "Erro",
          description: `Preencha todas as variáveis do modelo "${model.templateName}": ${missingVariables.join(', ')}`,
          variant: "destructive"
        });
        return;
      }
    }

    setIsGenerating(true);
    setShowDownloadButton(false);
    setGeneratedBatchId(null);

    try {
      const response = await fetch('/api/generate-multi-model', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          batchName,
          models: selectedModels,
          certificateId: null,
          outputFormat: 'zip'
        }),
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Generation result:', result);
        
        if (result.batchId) {
          setGeneratedBatchId(result.batchId);
          setShowDownloadButton(true);
          
          toast({
            title: "Sucesso",
            description: `${selectedModels.length} documentos gerados com sucesso! Use o botão abaixo para baixar o ZIP.`,
          });
        } else {
          toast({
            title: "Aviso",
            description: "Documentos gerados, mas não foi possível criar o lote para download",
            variant: "destructive"
          });
        }

      } else {
        const errorText = await response.text();
        toast({
          title: "Erro na geração",
          description: errorText,
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Generation error:', error);
      toast({
        title: "Erro",
        description: "Erro de conexão. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadZipFile = async () => {
    if (!generatedBatchId) {
      toast({
        title: "Erro",
        description: "ID do lote não encontrado",
        variant: "destructive"
      });
      return;
    }

    setIsDownloading(true);

    try {
      const downloadResponse = await fetch(`/api/batches/${generatedBatchId}/download`, {
        credentials: 'include'
      });
      
      if (downloadResponse.ok) {
        const blob = await downloadResponse.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `${batchName}.zip`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        toast({
          title: "Sucesso",
          description: "ZIP baixado com sucesso!",
        });
        
        // Reset form after successful download
        setSelectedModels([]);
        setBatchName('');
        setShowDownloadButton(false);
        setGeneratedBatchId(null);
      } else {
        const errorText = await downloadResponse.text();
        toast({
          title: "Erro no download",
          description: errorText,
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Download error:', error);
      toast({
        title: "Erro",
        description: "Erro de conexão no download. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setIsDownloading(false);
    }
  };

  // Start with one empty model
  useEffect(() => {
    if (selectedModels.length === 0) {
      addNewModel();
    }
  }, []);

  return (
    <div className="container mx-auto p-6 space-y-6" data-testid="gerar-v2-page">
      <div className="flex items-center gap-3">
        <FileText className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-page-title">Gerar Documentos</h1>
          <p className="text-muted-foreground">Gere documentos de múltiplos modelos e baixe automaticamente em ZIP</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Configuração do Lote
          </CardTitle>
          <CardDescription>
            Configure o nome do lote e selecione os modelos que deseja gerar
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Batch Name */}
          <div className="grid w-full items-center gap-2">
            <Label htmlFor="batch-name">Nome do Lote</Label>
            <Input
              id="batch-name"
              placeholder="Ex: Documentos NR12 - Janeiro 2025"
              value={batchName}
              onChange={(e) => setBatchName(e.target.value)}
              data-testid="input-batch-name"
            />
          </div>

          <Separator />

          {/* Selected Models */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Modelos Selecionados ({selectedModels.length})</h3>
              <Button 
                onClick={addNewModel} 
                variant="outline" 
                size="sm" 
                className="flex items-center gap-2"
                data-testid="button-add-model"
              >
                <Plus className="h-4 w-4" />
                Adicionar Modelo
              </Button>
            </div>

            {selectedModels.map((model, index) => {
              const template = templates.find(t => t.id === model.templateId);
              
              return (
                <Card key={model.id} className="border-l-4 border-l-primary">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">
                        Documento {index + 1}
                        {model.templateName && (
                          <Badge variant="secondary" className="ml-2">
                            {model.templateName}
                          </Badge>
                        )}
                      </CardTitle>
                      {selectedModels.length > 1 && (
                        <Button
                          onClick={() => removeModel(model.id)}
                          variant="ghost"
                          size="sm"
                          className="text-destructive"
                          data-testid={`button-remove-model-${index}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Template Selection */}
                    <div className="grid w-full items-center gap-2">
                      <Label>Modelo</Label>
                      <Select
                        value={model.templateId}
                        onValueChange={(value) => updateModelTemplate(model.id, value)}
                        data-testid={`select-template-${index}`}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione um modelo" />
                        </SelectTrigger>
                        <SelectContent>
                          {templates.map((template) => (
                            <SelectItem key={template.id} value={template.id}>
                              {template.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Document Name */}
                    {model.templateId && (
                      <div className="grid w-full items-center gap-2">
                        <Label>Nome do Documento</Label>
                        <Input
                          placeholder="Nome do documento final"
                          value={model.documentName}
                          onChange={(e) => updateModelDocumentName(model.id, e.target.value)}
                          data-testid={`input-document-name-${index}`}
                        />
                      </div>
                    )}

                    {/* Variables */}
                    {template && template.variables.length > 0 && (
                      <div className="space-y-3">
                        <Label className="text-sm font-medium">Variáveis do Modelo</Label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {template.variables.map((variable) => (
                            <div key={variable} className="grid w-full items-center gap-1">
                              <Label htmlFor={`${model.id}-${variable}`} className="text-xs text-muted-foreground">
                                {variable}
                              </Label>
                              <Input
                                id={`${model.id}-${variable}`}
                                placeholder={`Digite ${variable}`}
                                value={model.variables[variable] || ''}
                                onChange={(e) => updateModelVariable(model.id, variable, e.target.value)}
                                data-testid={`input-variable-${variable}-${index}`}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>


          {/* Generation Button */}
          <div className="flex justify-center pt-4 space-x-4">
            <Button
              onClick={generateDocuments}
              disabled={isGenerating || selectedModels.length === 0}
              size="lg"
              className="flex items-center gap-2 px-8"
              data-testid="button-generate-documents"
            >
              {isGenerating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Archive className="h-4 w-4" />
              )}
              {isGenerating ? 'Gerando Documentos...' : 'Gerar Documentos'}
            </Button>

            {/* Download Button - appears after generation */}
            {showDownloadButton && generatedBatchId && (
              <Button
                onClick={downloadZipFile}
                disabled={isDownloading}
                variant="default"
                size="lg"
                className="flex items-center gap-2 px-8 bg-green-600 hover:bg-green-700"
                data-testid="button-download-zip"
              >
                {isDownloading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Archive className="h-4 w-4" />
                )}
                {isDownloading ? 'Baixando ZIP...' : 'Baixar ZIP'}
              </Button>
            )}
          </div>

          {selectedModels.length > 0 && (
            <div className="bg-muted/50 rounded-lg p-4">
              <p className="text-sm text-muted-foreground">
                <strong>{selectedModels.length}</strong> documento(s) serão gerados em ZIP
                {batchName && (
                  <span> • Lote: <strong>{batchName}</strong></span>
                )}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}