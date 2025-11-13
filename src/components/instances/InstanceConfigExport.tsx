"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Download, Upload, FileText } from "lucide-react";
import { Instance } from "@/lib/storage";
import { toast } from "sonner";

interface InstanceConfigExportProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  instance: Instance;
  mode: 'export' | 'import';
  onImport?: (config: Omit<Instance, 'id' | 'user_id'>) => void;
}

export const InstanceConfigExport: React.FC<InstanceConfigExportProps> = ({
  isOpen,
  onOpenChange,
  instance,
  mode,
  onImport,
}) => {
  const [configText, setConfigText] = React.useState("");
  const [fileName, setFileName] = React.useState("");

  React.useEffect(() => {
    if (mode === 'export' && instance) {
      const config = {
        name: instance.name,
        url: instance.url,
        instanceName: instance.instanceName,
        apiKey: instance.apiKey,
      };
      setConfigText(JSON.stringify(config, null, 2));
      setFileName(`${instance.name}-config.txt`);
    } else {
      setConfigText("");
      setFileName("");
    }
  }, [mode, instance, isOpen]);

  const handleDownload = () => {
    const blob = new Blob([configText], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName || 'instance-config.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    
    toast.success("Configurações exportadas com sucesso!");
    onOpenChange(false);
  };

  const handleImport = () => {
    try {
      const config = JSON.parse(configText);
      
      if (!config.name || !config.url || !config.instanceName || !config.apiKey) {
        throw new Error("Configuração inválida: campos obrigatórios faltando");
      }

      if (onImport) {
        onImport(config);
        toast.success("Configurações importadas com sucesso!");
        onOpenChange(false);
      }
    } catch (error) {
      toast.error("Erro ao importar configurações: formato inválido");
      console.error("Import error:", error);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        setConfigText(content);
        
        // Validar se é um JSON válido
        JSON.parse(content);
      } catch (error) {
        toast.error("Arquivo inválido: deve conter JSON válido");
        setConfigText("");
      }
    };
    reader.readAsText(file);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>
            {mode === 'export' ? 'Exportar Configurações' : 'Importar Configurações'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'export' 
              ? 'As configurações da instância serão exportadas em formato JSON.' 
              : 'Cole as configurações JSON ou carregue um arquivo de configuração.'
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {mode === 'import' && (
            <div className="flex items-center gap-2">
              <Input
                type="file"
                accept=".txt,.json"
                onChange={handleFileUpload}
                className="hidden"
                id="config-file-input"
              />
              <label htmlFor="config-file-input">
                <Button asChild variant="outline">
                  <span className="cursor-pointer">
                    <Upload className="mr-2 h-4 w-4" />
                    Carregar Arquivo
                  </span>
                </Button>
              </label>
              <span className="text-sm text-muted-foreground">
                ou cole o conteúdo abaixo
              </span>
            </div>
          )}

          <Textarea
            value={configText}
            onChange={(e) => setConfigText(e.target.value)}
            placeholder={mode === 'export' ? '' : 'Cole as configurações JSON aqui...'}
            className="min-h-[200px] font-mono text-sm"
            readOnly={mode === 'export'}
          />

          {mode === 'export' && (
            <div className="text-sm text-muted-foreground">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="h-4 w-4" />
                <span>Arquivo será salvo como: {fileName}</span>
              </div>
              <p>Conteúdo do arquivo:</p>
              <pre className="bg-muted p-2 rounded text-xs overflow-x-auto">
                {configText}
              </pre>
            </div>
          )}
        </div>

        <DialogFooter>
          {mode === 'export' ? (
            <Button onClick={handleDownload}>
              <Download className="mr-2 h-4 w-4" />
              Baixar Configurações
            </Button>
          ) : (
            <Button onClick={handleImport} disabled={!configText.trim()}>
              <Upload className="mr-2 h-4 w-4" />
              Importar Configurações
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};