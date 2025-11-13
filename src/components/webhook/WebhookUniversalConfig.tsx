"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Copy,
  Check,
  Globe,
  Zap,
  Settings,
  Info,
  RefreshCw,
  Send,
  Phone,
  User,
  Mail,
  Building
} from "lucide-react";
import { toast } from "sonner";
import { ContactList, getContactLists } from "@/lib/contact-storage";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSession } from "@/components/auth/SessionContextProvider";
import { getWebhookSources, WebhookSource } from "@/lib/webhook-storage";

interface WebhookUniversalConfigProps {
  onTest?: (config: any) => void;
}

export const WebhookUniversalConfig: React.FC<WebhookUniversalConfigProps> = ({ onTest }) => {
  const { user } = useSession();
  const [contactLists, setContactLists] = React.useState<ContactList[]>([]);
  const [webhookSources, setWebhookSources] = React.useState<WebhookSource[]>([]);
  const [selectedList, setSelectedList] = React.useState<string>("");
  const [selectedSource, setSelectedSource] = React.useState<string>("");
  const [webhookUrl, setWebhookUrl] = React.useState("");
  const [copied, setCopied] = React.useState(false);
  const [testing, setTesting] = React.useState(false);
  const [testData, setTestData] = React.useState(`{
  "nome": "João Silva",
  "telefone": "5511987654321",
  "email": "joao@empresa.com",
  "empresa": "Tech Corp"
}`);

  React.useEffect(() => {
    if (user) {
      getContactLists().then(lists => {
        setContactLists(lists);
        if (lists.length > 0 && !selectedList) {
          setSelectedList(lists[0].id);
        }
      });
      getWebhookSources(user.id).then(sources => {
        setWebhookSources(sources);
        if (sources.length > 0 && !selectedSource) {
          setSelectedSource(sources[0].id);
        }
      });
    }
  }, [user, selectedList, selectedSource]);

  // Se a fonte selecionada tiver uma lista alvo configurada, preencher automaticamente
  React.useEffect(() => {
    const src = webhookSources.find(s => s.id === selectedSource);
    if (src?.target_list_id) {
      setSelectedList(src.target_list_id);
    }
  }, [selectedSource, webhookSources]);

  React.useEffect(() => {
    if (selectedList && user && selectedSource) {
      const selectedWebhookSource = webhookSources.find(source => source.id === selectedSource);
      const baseUrl = "https://aexlptrufyeyrhkvndzi.supabase.co/functions/v1/webhook-universal-v2";
      if (selectedWebhookSource) {
        const key = (selectedWebhookSource.api_key ?? "").trim();
        const qp = new URLSearchParams({
          source: user.id,
          source_id: selectedSource,
          list_id: selectedList,
        });
        if (key.length > 0) {
          qp.set("api_key", key);
        }
        const url = `${baseUrl}?${qp.toString()}`;
        setWebhookUrl(url);
      } else {
        setWebhookUrl("");
      }
    } else {
      setWebhookUrl("");
    }
  }, [selectedList, user, selectedSource, webhookSources]);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(webhookUrl);
      setCopied(true);
      toast.success("URL do webhook copiada!");
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error("Erro ao copiar URL");
    }
  };

  const handleTest = async () => {
    if (!selectedList || !user || !selectedSource) {
      toast.error("Selecione uma lista de contatos e uma fonte de webhook.");
      return;
    }

    setTesting(true);

    try {
      const testPayload = JSON.parse(testData);
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testPayload)
      });

      const result = await response.json();

      if (response.ok) {
        toast.success("Teste realizado com sucesso!");
        console.log('Resultado do teste:', result);
      } else {
        toast.error(`Erro no teste: ${result.error}`);
      }
    } catch (error: any) {
      toast.error(`Erro: ${error.message}`);
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Webhook Universal
          </CardTitle>
          <CardDescription>
            Configure um webhook que aceita QUALQUER estrutura de dados de qualquer CRM
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="source-select">Fonte de Webhook</Label>
            <Select value={selectedSource} onValueChange={setSelectedSource}>
              <SelectTrigger id="source-select">
                <SelectValue placeholder="Selecione uma fonte de webhook" />
              </SelectTrigger>
              <SelectContent>
                {webhookSources.length === 0 ? (
                  <SelectItem value="no-source" disabled>Nenhuma fonte configurada</SelectItem>
                ) : (
                  webhookSources.map((source) => (
                    <SelectItem key={source.id} value={source.id}>
                      {source.name} ({source.source_type})
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              A fonte pode ter uma lista alvo associada; se houver, a URL já virá preenchida com ela.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="list-select">Lista de Contatos</Label>
            <Select value={selectedList} onValueChange={setSelectedList}>
              <SelectTrigger id="list-select">
                <SelectValue placeholder="Selecione uma lista" />
              </SelectTrigger>
              <SelectContent>
                {contactLists.length === 0 ? (
                  <SelectItem value="no-list" disabled>Nenhuma lista disponível</SelectItem>
                ) : (
                  contactLists.map((list) => (
                    <SelectItem key={list.id} value={list.id}>
                      {list.name} ({list.contacts.length} contatos)
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>URL do Webhook</Label>
            <div className="flex gap-2">
              <Input
                value={webhookUrl}
                readOnly
                className="font-mono text-sm"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={copyToClipboard}
                className={copied ? "bg-green-100" : ""}
                disabled={!webhookUrl}
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Copie esta URL e cole no seu CRM externo
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Teste de Detecção Inteligente
          </CardTitle>
          <CardDescription>
            Teste como o sistema detecta automaticamente os campos
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Dados de Teste (JSON)</Label>
            <Textarea
              value={testData}
              onChange={(e) => setTestData(e.target.value)}
              className="font-mono text-sm"
              rows={8}
            />
            <p className="text-sm text-muted-foreground">
              Use qualquer estrutura JSON - o sistema detectará automaticamente
            </p>
          </div>

          <Button onClick={handleTest} disabled={testing || !webhookUrl} className="w-full">
            {testing ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Testando...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Testar Detecção
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Campos Detectados Automaticamente
          </CardTitle>
          <CardDescription>
            O sistema detecta mais de 50 variações de campos automaticamente
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            {[
              { icon: Phone, label: "Telefone", examples: ["phone", "mobile", "telefone", "celular", "whatsapp"] },
              { icon: User, label: "Nome", examples: ["name", "nome", "fullname", "firstName", "lastName"] },
              { icon: Mail, label: "Email", examples: ["email", "mail", "emailaddress", "email_address"] },
              { icon: Building, label: "Empresa", examples: ["company", "empresa", "organization", "account"] }
            ].map((field, index) => (
              <div key={index} className="space-y-2">
                <div className="flex items-center gap-2">
                  <field.icon className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{field.label}</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {field.examples.map((example, idx) => (
                    <Badge key={idx} variant="secondary" className="text-xs">
                      {example}
                    </Badge>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5" />
            Como Usar
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <h4 className="font-medium">1. Crie uma Fonte de Webhook</h4>
            <p className="text-sm text-muted-foreground">
              Defina um nome, tipo, lista de destino e (opcional) chave de API.
            </p>
          </div>
          <div className="space-y-2">
            <h4 className="font-medium">2. Selecione a Fonte e a Lista</h4>
            <p className="text-sm text-muted-foreground">
              A lista pode ser preenchida automaticamente a partir da fonte selecionada.
            </p>
          </div>
          <div className="space-y-2">
            <h4 className="font-medium">3. Copie a URL</h4>
            <p className="text-sm text-muted-foreground">
              A URL inclui source (seu userId), source_id (id da fonte) e list_id (id da lista).
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};