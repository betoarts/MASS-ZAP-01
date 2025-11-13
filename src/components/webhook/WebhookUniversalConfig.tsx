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

interface WebhookUniversalConfigProps {
  onTest?: (config: any) => void;
}

export const WebhookUniversalConfig: React.FC<WebhookUniversalConfigProps> = ({ onTest }) => {
  const { user } = useSession();
  const [contactLists, setContactLists] = React.useState<ContactList[]>([]);
  const [selectedList, setSelectedList] = React.useState<string>("");
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
    }
  }, [user]);

  React.useEffect(() => {
    if (selectedList && user) {
      const baseUrl = "https://aexlptrufyeyrhkvndzi.supabase.co/functions/v1/webhook-universal-v2";
      const url = `${baseUrl}?source=${user.id}&list_id=${selectedList}&api_key=WEBHOOK_API_KEY`;
      setWebhookUrl(url);
    }
  }, [selectedList, user]);

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
    if (!selectedList || !user) {
      toast.error("Selecione uma lista de contatos");
      return;
    }

    setTesting(true);
    
    try {
      const testPayload = JSON.parse(testData);
      
      const response = await fetch(webhookUrl.replace('WEBHOOK_API_KEY', 'test-key'), {
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

  const fieldExamples = [
    { icon: Phone, label: "Telefone", examples: ["phone", "mobile", "telefone", "celular", "whatsapp"] },
    { icon: User, label: "Nome", examples: ["name", "nome", "fullname", "firstName", "lastName"] },
    { icon: Mail, label: "Email", examples: ["email", "mail", "emailaddress", "email_address"] },
    { icon: Building, label: "Empresa", examples: ["company", "empresa", "organization", "account"] }
  ];

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
            <Label htmlFor="list-select">Lista de Contatos</Label>
            <Select value={selectedList} onValueChange={setSelectedList}>
              <SelectTrigger id="list-select">
                <SelectValue placeholder="Selecione uma lista" />
              </SelectTrigger>
              <SelectContent>
                {contactLists.map((list) => (
                  <SelectItem key={list.id} value={list.id}>
                    {list.name} ({list.contacts.length} contatos)
                  </SelectItem>
                ))}
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

          <Button onClick={handleTest} disabled={testing} className="w-full">
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
            {fieldExamples.map((field, index) => (
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
            <h4 className="font-medium">1. Copie a URL</h4>
            <p className="text-sm text-muted-foreground">
              Clique no botão de copiar ao lado da URL do webhook
            </p>
          </div>
          
          <div className="space-y-2">
            <h4 className="font-medium">2. Cole no seu CRM</h4>
            <p className="text-sm text-muted-foreground">
              Adicione a URL nas configurações de webhook do seu CRM (HubSpot, Salesforce, Pipedrive, etc.)
            </p>
          </div>
          
          <div className="space-y-2">
            <h4 className="font-medium">3. Envie qualquer JSON</h4>
            <p className="text-sm text-muted-foreground">
              O sistema detectará automaticamente telefone, nome, email e empresa
            </p>
          </div>
          
          <div className="space-y-2">
            <h4 className="font-medium">4. Pronto!</h4>
            <p className="text-sm text-muted-foreground">
              Os contatos serão adicionados automaticamente à lista selecionada
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-blue-50 dark:bg-blue-900/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-5 w-5 text-blue-600" />
              </TooltipTrigger>
              <TooltipContent>
                Dica: Você pode usar qualquer estrutura JSON!
              </TooltipContent>
            </Tooltip>
            Exemplos de Estruturas Aceitas
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-medium text-blue-700 dark:text-blue-300 mb-2">HubSpot:</h4>
            <pre className="text-xs bg-white dark:bg-gray-800 p-3 rounded overflow-x-auto">
{`{
  "properties": {
    "mobilephone": "+55 11 98765-4321",
    "firstname": "João",
    "lastname": "Silva",
    "email": "joao@hubspot.com"
  }
}`}
            </pre>
          </div>
          
          <div>
            <h4 className="font-medium text-blue-700 dark:text-blue-300 mb-2">Salesforce:</h4>
            <pre className="text-xs bg-white dark:bg-gray-800 p-3 rounded overflow-x-auto">
{`{
  "MobilePhone": "5511987654321",
  "Name": "João da Silva",
  "Email": "joao@salesforce.com",
  "Account": {"Name": "Tech Corp"}
}`}
            </pre>
          </div>
          
          <div>
            <h4 className="font-medium text-blue-700 dark:text-blue-300 mb-2">RD Station:</h4>
            <pre className="text-xs bg-white dark:bg-gray-800 p-3 rounded overflow-x-auto">
{`{
  "phone_number": "+55 11 98765-4321",
  "name": "João Silva",
  "email": "joao@rdstation.com",
  "company_name": "Tech Corp"
}`}
            </pre>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};