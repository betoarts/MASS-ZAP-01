"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { getAllCampaignLogs, CampaignLog } from "@/lib/log-storage";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";

const Logs = () => {
  const navigate = useNavigate();
  const [logs, setLogs] = React.useState<CampaignLog[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);

  const fetchLogs = async () => {
    setIsLoading(true);
    const fetchedLogs = await getAllCampaignLogs();
    setLogs(fetchedLogs);
    setIsLoading(false);
  };

  React.useEffect(() => {
    fetchLogs();
  }, []);

  const getEventTypeBadge = (eventType: string) => {
    switch (eventType) {
      // Campanhas
      case 'campaign_received':
        return <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-100">Solicitação Recebida</Badge>;
      case 'campaign_started':
        return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">Campanha Iniciada</Badge>;
      case 'campaign_status_update':
        return <Badge variant="secondary">Status Atualizado</Badge>;
      case 'campaign_completed':
        return <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100">Campanha Concluída</Badge>;
      case 'campaign_completed_after_stop':
        return <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100">Concluída após Parada</Badge>;
      case 'campaign_paused':
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Campanha Pausada</Badge>;
      case 'campaign_stopped':
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Campanha Parada</Badge>;
      case 'campaign_aborted':
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Processo Abortado</Badge>;
      case 'campaign_failed':
        return <Badge variant="destructive">Falha na Campanha</Badge>;

      // Mensagens
      case 'message_sent':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Mensagem Enviada</Badge>;
      case 'message_failed':
        return <Badge variant="destructive">Falha no Envio</Badge>;
      case 'message_error':
        return <Badge variant="destructive">Erro de Mensagem</Badge>;

      // Agendador
      case 'scheduler_started':
        return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">Agendador Iniciou</Badge>;
      case 'scheduler_invoked':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Agendador Invocou Envio</Badge>;
      case 'scheduler_error':
        return <Badge variant="destructive">Erro do Agendador</Badge>;

      // Webhook/CRM
      case 'webhook_received':
        return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">Webhook Recebido</Badge>;
      case 'webhook_filtered':
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Webhook Filtrado</Badge>;
      case 'webhook_error':
        return <Badge variant="destructive">Erro de Webhook</Badge>;
      case 'webhook_auth_error':
        return <Badge variant="destructive">Erro de Autenticação do Webhook</Badge>;
      case 'contact_added':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Contato Adicionado</Badge>;
      case 'contact_updated':
        return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">Contato Atualizado</Badge>;

      // Propostas (CRM)
      case 'proposal_sent':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Proposta Enviada</Badge>;
      case 'proposal_failed':
        return <Badge variant="destructive">Falha na Proposta</Badge>;
      case 'proposal_error':
        return <Badge variant="destructive">Erro ao Enviar Proposta</Badge>;
      case 'proposal_failed_global':
        return <Badge variant="destructive">Falha Global da Proposta</Badge>;

      // Erros genéricos
      case 'error':
        return <Badge variant="destructive">Erro</Badge>;

      default:
        return <Badge variant="secondary">{eventType}</Badge>;
    }
  };

  const handleViewCampaign = (campaignId: string) => {
    navigate(`/campaigns/${campaignId}/logs`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Logs do Sistema</h1>
        <Button onClick={fetchLogs} disabled={isLoading}>
          <RefreshCw className={isLoading ? "mr-2 h-4 w-4 animate-spin" : "mr-2 h-4 w-4"} />
          {isLoading ? "Atualizando..." : "Atualizar Logs"}
        </Button>
      </div>
      <div className="rounded-md border bg-background p-4 max-h-[70vh] overflow-y-auto">
        {isLoading ? (
          <p className="text-muted-foreground text-center">Carregando logs...</p>
        ) : logs.length === 0 ? (
          <p className="text-muted-foreground text-center">Nenhum log disponível.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[180px]">Data/Hora</TableHead>
                <TableHead className="w-[170px]">Tipo</TableHead>
                <TableHead>Mensagem</TableHead>
                <TableHead className="w-[100px] text-right">Detalhes</TableHead>
                <TableHead className="w-[100px] text-right">Campanha</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="font-mono text-xs">
                    {format(new Date(log.created_at), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })}
                  </TableCell>
                  <TableCell>{getEventTypeBadge(log.event_type)}</TableCell>
                  <TableCell>{log.message}</TableCell>
                  <TableCell className="text-right">
                    {log.metadata ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-auto px-2 py-1 text-xs">Ver</Button>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs p-2">
                          <pre className="text-xs whitespace-pre-wrap break-all">
                            {JSON.stringify(log.metadata, null, 2)}
                          </pre>
                        </TooltipContent>
                      </Tooltip>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {log.campaign_id ? (
                      <Button
                        variant="link"
                        size="sm"
                        onClick={() => handleViewCampaign(log.campaign_id!)}
                      >
                        Ver Campanha
                      </Button>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
};

export default Logs;