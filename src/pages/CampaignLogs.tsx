"use client";

import * as React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { RefreshCw, ArrowLeft } from "lucide-react";
import { getCampaignLogsByCampaignId, CampaignLog } from "@/lib/log-storage";
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
import { getCampaignById, Campaign } from "@/lib/campaign-storage";
import { toast } from "sonner";

const CampaignLogs = () => {
  const { campaignId } = useParams<{ campaignId: string }>();
  const navigate = useNavigate();
  const [campaign, setCampaign] = React.useState<Campaign | null>(null);
  const [logs, setLogs] = React.useState<CampaignLog[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);

  const fetchCampaignAndLogs = React.useCallback(async () => {
    if (!campaignId) {
      toast.error("ID da campanha não fornecido.");
      navigate("/logs");
      return;
    }

    setIsLoading(true);
    const fetchedCampaign = await getCampaignById(campaignId);
    if (fetchedCampaign) {
      setCampaign(fetchedCampaign);
      const fetchedLogs = await getCampaignLogsByCampaignId(campaignId);
      setLogs(fetchedLogs);
    } else {
      toast.error("Campanha não encontrada.");
      navigate("/logs");
    }
    setIsLoading(false);
  }, [campaignId, navigate]);

  React.useEffect(() => {
    fetchCampaignAndLogs();
  }, [fetchCampaignAndLogs]);

  const getEventTypeBadge = (eventType: string) => {
    switch (eventType) {
      case 'campaign_received':
        return <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-100">Solicitação Recebida</Badge>;
      case 'campaign_started':
        return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">Iniciada</Badge>;
      case 'message_sent':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Mensagem Enviada</Badge>;
      case 'campaign_completed':
        return <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100">Concluída</Badge>;
      case 'campaign_failed':
        return <Badge variant="destructive">Falha na Campanha</Badge>;
      case 'message_failed':
        return <Badge variant="destructive">Falha no Envio</Badge>;
      case 'message_error':
        return <Badge variant="destructive">Erro de Mensagem</Badge>;
      case 'campaign_paused':
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Pausada</Badge>;
      case 'campaign_status_update':
        return <Badge variant="secondary">Status Atualizado</Badge>;
      case 'campaign_stopped':
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Parada</Badge>;
      case 'campaign_completed_after_stop':
        return <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100">Concluída após Parada</Badge>;
      case 'campaign_aborted':
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Processo Abortado</Badge>;
      case 'scheduler_started':
        return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">Agendador Iniciou</Badge>;
      case 'scheduler_invoked':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Agendador Invocou Envio</Badge>;
      case 'scheduler_error':
        return <Badge variant="destructive">Erro do Agendador</Badge>;
      case 'error':
        return <Badge variant="destructive">Erro</Badge>;
      default:
        return <Badge variant="secondary">{eventType}</Badge>;
    }
  };

  if (!campaign && isLoading) {
    return <div className="min-h-screen flex items-center justify-center">Carregando logs da campanha...</div>;
  }

  if (!campaign) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/campaigns")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-3xl font-bold">Logs da Campanha: {campaign.name}</h1>
        </div>
        <Button onClick={fetchCampaignAndLogs} disabled={isLoading}>
          <RefreshCw className={isLoading ? "mr-2 h-4 w-4 animate-spin" : "mr-2 h-4 w-4"} />
          {isLoading ? "Atualizando..." : "Atualizar Logs"}
        </Button>
      </div>
      <div className="rounded-md border bg-background p-4 max-h-[70vh] overflow-y-auto">
        {isLoading ? (
          <p className="text-muted-foreground text-center">Carregando logs...</p>
        ) : logs.length === 0 ? (
          <p className="text-muted-foreground text-center">Nenhum log disponível para esta campanha.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[180px]">Data/Hora</TableHead>
                <TableHead className="w-[150px]">Tipo</TableHead>
                <TableHead>Mensagem</TableHead>
                <TableHead className="w-[100px] text-right">Detalhes</TableHead>
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
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
};

export default CampaignLogs;