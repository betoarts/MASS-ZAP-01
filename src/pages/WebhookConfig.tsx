"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PlusCircle, Webhook, Globe, Settings } from "lucide-react";
import { WebhookUniversalConfig } from "@/components/webhook/WebhookUniversalConfig";
import { WebhookSourcesTable } from "@/components/webhook/WebhookSourcesTable";
import { useSession } from "@/components/auth/SessionContextProvider";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { WebhookSourceForm } from "@/components/webhook/WebhookSourceForm";
import { WebhookSource, getWebhookSources, createWebhookSource, updateWebhookSource, deleteWebhookSource } from "@/lib/webhook-storage";

const WebhookConfig = () => {
  const { user } = useSession();
  const [sources, setSources] = React.useState<WebhookSource[]>([]);
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [editingSource, setEditingSource] = React.useState<WebhookSource | null>(null);

  React.useEffect(() => {
    if (user) {
      fetchSources();
    }
  }, [user]);

  const fetchSources = async () => {
    if (!user) return;
    const fetchedSources = await getWebhookSources(user.id);
    setSources(fetchedSources);
  };

  const handleSaveSource = async (sourceData: Omit<WebhookSource, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    if (!user) {
      toast.error("Você precisa estar logado para salvar fontes de webhook.");
      return;
    }

    let success = false;
    if (editingSource) {
      const updated = await updateWebhookSource(user.id, { ...sourceData, id: editingSource.id });
      if (updated) {
        toast.success("Fonte de webhook atualizada com sucesso!");
        success = true;
      } else {
        toast.error("Falha ao atualizar fonte de webhook.");
      }
    } else {
      const created = await createWebhookSource(user.id, sourceData);
      if (created) {
        toast.success("Fonte de webhook criada com sucesso!");
        success = true;
      } else {
        toast.error("Falha ao criar fonte de webhook.");
      }
    }

    if (success) {
      fetchSources();
      setIsFormOpen(false);
      setEditingSource(null);
    }
  };

  const handleEditSource = (source: WebhookSource) => {
    setEditingSource(source);
    setIsFormOpen(true);
  };

  const handleDeleteSource = async (id: string) => {
    const success = await deleteWebhookSource(id);
    if (success) {
      toast.success("Fonte de webhook excluída com sucesso!");
      fetchSources();
    } else {
      toast.error("Falha ao excluir fonte de webhook.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Configuração de Webhooks</h1>
          <p className="text-muted-foreground">
            Configure webhooks universais para integrar com qualquer CRM externo
          </p>
        </div>
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { setEditingSource(null); setIsFormOpen(true); }}>
              <PlusCircle className="mr-2 h-4 w-4" /> Adicionar Fonte
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>{editingSource ? "Editar Fonte de Webhook" : "Criar Nova Fonte de Webhook"}</DialogTitle>
            </DialogHeader>
            <WebhookSourceForm initialData={editingSource} onSave={handleSaveSource} />
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Webhook Universal
            </CardTitle>
          </CardHeader>
          <CardContent>
            <WebhookUniversalConfig />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Webhook className="h-5 w-5" />
              Fontes de Webhook
            </CardTitle>
          </CardHeader>
          <CardContent>
            <WebhookSourcesTable
              sources={sources}
              onEdit={handleEditSource}
              onDelete={handleDeleteSource}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Estatísticas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Total de Fontes</span>
                <span className="font-medium">{sources.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Webhooks Processados</span>
                <span className="font-medium">1,250</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Taxa de Sucesso</span>
                <span className="font-medium text-green-600">98.5%</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-blue-600" />
            Como Integrar com Qualquer CRM
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <h4 className="font-medium">1. Copie a URL</h4>
              <p className="text-sm text-muted-foreground">
                Use o webhook universal na aba acima
              </p>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-medium">2. Cole no CRM</h4>
              <p className="text-sm text-muted-foreground">
                Adicione a URL nas configurações de webhook do seu CRM
              </p>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-medium">3. Pronto!</h4>
              <p className="text-sm text-muted-foreground">
                O sistema detecta automaticamente os campos
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="font-medium">Exemplos de URLs para CRMs populares:</h4>
            <div className="space-y-2 text-sm">
              <div className="p-3 bg-white dark:bg-gray-800 rounded border">
                <strong>HubSpot:</strong> Settings → Integrations → Webhooks
              </div>
              <div className="p-3 bg-white dark:bg-gray-800 rounded border">
                <strong>Salesforce:</strong> Setup → Apex Classes → Webhooks
              </div>
              <div className="p-3 bg-white dark:bg-gray-800 rounded border">
                <strong>Pipedrive:</strong> Settings → Webhooks
              </div>
              <div className="p-3 bg-white dark:bg-gray-800 rounded border">
                <strong>RD Station:</strong> Settings → Webhooks
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default WebhookConfig;