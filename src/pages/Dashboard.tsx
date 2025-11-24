"use client";

import * as React from "react";

import { MadeWithDyad } from "@/components/made-with-dyad";
import { DashboardStatCard } from "@/components/dashboard/DashboardStatCard";
import { AccountStatusCard } from "@/components/dashboard/AccountStatusCard";
import { getInstances } from "@/lib/storage";
import { getContactLists } from "@/lib/contact-storage";
import { getCampaigns } from "@/lib/campaign-storage";
import { getAllCampaignLogs, getUserMessageSentCount, getUserQuota, getUserQuotaGrants } from "@/lib/log-storage";
import { getCustomers } from "@/lib/crm-storage";
import { Settings, Users, Send, Briefcase, MessageCircle } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import PageHeader from "@/components/layout/PageHeader";
import { useSession } from "@/components/auth/SessionContextProvider";

const Dashboard = () => {
  const navigate = useNavigate();
  const { user } = useSession();
  const queryClient = useQueryClient();

  const { data: instances, isLoading: isLoadingInstances } = useQuery({
    queryKey: ["instances", user?.id],
    queryFn: () => user ? getInstances(user.id) : [],
    enabled: !!user,
  });

  const { data: contactLists, isLoading: isLoadingContactLists } = useQuery({
    queryKey: ["contactLists"],
    queryFn: getContactLists,
  });

  const { data: campaigns, isLoading: isLoadingCampaigns } = useQuery({
    queryKey: ["campaigns"],
    queryFn: getCampaigns,
  });

  const { data: customers, isLoading: isLoadingCustomers } = useQuery({
    queryKey: ["customers"],
    queryFn: getCustomers,
  });

  const { data: recentLogs, isLoading: isLoadingLogs } = useQuery({
    queryKey: ["recentLogs"],
    queryFn: async () => {
      const logs = await getAllCampaignLogs();
      return logs.slice(0, 5);
    },
  });

  const { data: messageSentCount, isLoading: isLoadingMessageCount } = useQuery({
    queryKey: ["messageSentCount", user?.id],
    queryFn: () => user ? getUserMessageSentCount(user.id) : 0,
    enabled: !!user,
  });

  const { data: quota, isLoading: isLoadingQuota } = useQuery({
    queryKey: ["userQuota", user?.id],
    queryFn: () => user ? getUserQuota(user.id) : { granted: 0, used: 0, remaining: 0 },
    enabled: !!user,
    refetchInterval: 10000,
    refetchOnWindowFocus: true,
  });

  const { data: quotaGrants, isLoading: isLoadingQuotaGrants } = useQuery({
    queryKey: ["userQuotaGrants", user?.id],
    queryFn: () => user ? getUserQuotaGrants(user.id) : [],
    enabled: !!user,
    refetchInterval: 10000,
    refetchOnWindowFocus: true,
  });

  React.useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel("quota_realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "campaign_logs" }, (payload: { new: Record<string, unknown> }) => {
        const log = payload.new;
        const event = log?.event_type as string;
        const meta = (log?.metadata as any) || {};
        const isOurGrant = event === "quota_granted" && meta?.target_user_id === user.id;
        if (log?.user_id !== user.id && !isOurGrant) return;
        if (["quota_granted", "message_sent", "proposal_sent"].includes(event)) {
          queryClient.invalidateQueries({ queryKey: ["userQuota", user.id] });
          queryClient.invalidateQueries({ queryKey: ["messageSentCount", user.id] });
        }
      });
    channel.subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user?.id, queryClient]);

  const isLoading =
    isLoadingInstances ||
    isLoadingContactLists ||
    isLoadingCampaigns ||
    isLoadingCustomers ||
    isLoadingLogs ||
    isLoadingMessageCount ||
    isLoadingQuota ||
    isLoadingQuotaGrants;

  const getEventTypeBadge = (eventType: string) => {
    switch (eventType) {
      case "campaign_started":
        return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">Campanha Iniciada</Badge>;
      case "message_sent":
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Mensagem Enviada</Badge>;
      case "campaign_completed":
        return <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100">Campanha Concluída</Badge>;
      case "campaign_failed":
        return <Badge variant="destructive">Falha na Campanha</Badge>;
      case "message_failed":
        return <Badge variant="destructive">Falha no Envio</Badge>;
      case "message_error":
        return <Badge variant="destructive">Erro de Mensagem</Badge>;
      case "campaign_paused":
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Campanha Pausada</Badge>;
      case "campaign_status_update":
        return <Badge variant="secondary">Status Atualizado</Badge>;
      case "campaign_received":
        return <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-100">Solicitação Recebida</Badge>;
      case "campaign_stopped":
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Campanha Parada</Badge>;
      case "campaign_completed_after_stop":
        return <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100">Concluída após Parada</Badge>;
      case "scheduler_started":
        return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">Agendador Iniciou</Badge>;
      case "scheduler_invoked":
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Agendador Invocou Envio</Badge>;
      case "scheduler_error":
        return <Badge variant="destructive">Erro do Agendador</Badge>;
      case "webhook_received":
        return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">Webhook Recebido</Badge>;
      case "webhook_filtered":
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Webhook Filtrado</Badge>;
      case "webhook_error":
        return <Badge variant="destructive">Erro de Webhook</Badge>;
      case "webhook_auth_error":
        return <Badge variant="destructive">Erro de Autenticação do Webhook</Badge>;
      case "contact_added":
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Contato Adicionado</Badge>;
      case "contact_updated":
        return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">Contato Atualizado</Badge>;
      case "proposal_sent":
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Proposta Enviada</Badge>;
      case "proposal_failed":
        return <Badge variant="destructive">Falha na Proposta</Badge>;
      case "proposal_error":
        return <Badge variant="destructive">Erro ao Enviar Proposta</Badge>;
      case "proposal_failed_global":
        return <Badge variant="destructive">Falha Global da Proposta</Badge>;
      case "error":
        return <Badge variant="destructive">Erro</Badge>;
      default:
        return <Badge variant="secondary">{eventType}</Badge>;
    }
  };

  const handleViewCampaign = (campaignId: string) => {
    navigate(`/campaigns/${campaignId}/logs`);
  };

  return (
    <div className="flex flex-col min-h-[calc(100vh-64px)] space-y-6">
      <PageHeader title="Painel" subtitle="Resumo geral das suas atividades e campanhas" />
      
      <AccountStatusCard />

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
      ) : (
        <div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <DashboardStatCard
            title="Total de Instâncias"
            value={instances?.length ?? 0}
            icon={Settings}
            description="Instâncias de WhatsApp configuradas"
          />
          <DashboardStatCard
            title="Listas de Contatos"
            value={contactLists?.length ?? 0}
            icon={Users}
            description="Listas de contatos criadas"
          />
          <DashboardStatCard
            title="Campanhas Criadas"
            value={campaigns?.length ?? 0}
            icon={Send}
            description="Campanhas ativas e rascunhos"
          />
          <DashboardStatCard
            title="Total de Clientes"
            value={customers?.length ?? 0}
            icon={Briefcase}
            description="Clientes cadastrados no CRM"
          />
          <DashboardStatCard
            title="Mensagens Enviadas"
            value={messageSentCount ?? 0}
            icon={MessageCircle}
            description="Total enviado pelas campanhas"
          />
          <DashboardStatCard
            title="Mensagens Disponíveis"
            value={quota?.remaining ?? 0}
            icon={MessageCircle}
            description="Saldo atual de envios"
          />
        </div>
        

        <div className="space-y-3">
          <h2 className="text-xl font-semibold">Pacotes de Mensagens</h2>
          <div className="rounded-md border bg-background p-4">
            {quotaGrants && quotaGrants.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Quantidade</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {quotaGrants.map((g, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-mono text-xs">
                        {format(new Date(g.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                      </TableCell>
                      <TableCell>{g.amount}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-sm text-muted-foreground">Nenhum pacote liberado ainda.</div>
            )}
          </div>
        </div>
        </div>
      )}

      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Atividade Recente</h2>
        <div className="rounded-md border bg-background p-4">
          {isLoadingLogs ? (
            <div className="space-y-2">
              <Skeleton className="h-8" />
              <Skeleton className="h-8" />
              <Skeleton className="h-8" />
            </div>
          ) : recentLogs?.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              Nenhuma atividade recente.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[180px]">Data/Hora</TableHead>
                  <TableHead className="w-[150px]">Tipo</TableHead>
                  <TableHead>Mensagem</TableHead>
                  <TableHead className="text-right">Campanha</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentLogs?.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="font-mono text-xs">
                      {format(new Date(log.created_at), "dd/MM/yyyy HH:mm:ss", {
                        locale: ptBR,
                      })}
                    </TableCell>
                    <TableCell>{getEventTypeBadge(log.event_type)}</TableCell>
                    <TableCell>{log.message}</TableCell>
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
      <MadeWithDyad />
    </div>
  );
};

export default Dashboard;
