"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Search, Bell } from "lucide-react";
import { useSession } from "@/components/auth/SessionContextProvider";
import { useNavigate, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { getProfile } from "@/lib/profile-storage";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const HeaderBar: React.FC = () => {
  const { user } = useSession();
  const navigate = useNavigate();
  const location = useLocation();

  const [firstName, setFirstName] = React.useState<string>("");
  const [avatarUrl, setAvatarUrl] = React.useState<string | null>(null);
  const [notifOpen, setNotifOpen] = React.useState(false);
  const [notifications, setNotifications] = React.useState<Array<{ id: string; type: string; message: string; created_at: string; campaign_id?: string; execution_id?: string; flow_id?: string }>>([]);
  const [unread, setUnread] = React.useState(0);

  const formatNotifType = (t: string) => {
    const titles: Record<string, string> = {
      webhook_received: "Webhook recebido",
      webhook_error: "Erro de webhook",
      webhook_auth_error: "Erro de autenticação do webhook",
      message_sent: "Mensagem enviada",
      message_failed: "Falha no envio",
      message_error: "Erro de mensagem",
      campaign_created: "Campanha criada",
      campaign_scheduled: "Campanha agendada",
      campaign_started: "Campanha iniciada",
      campaign_completed: "Campanha concluída",
      campaign_failed: "Falha na campanha",
      campaign_status_update: "Status da campanha atualizado",
      scheduler_started: "Agendador iniciou",
      scheduler_invoked: "Agendador invocou envio",
      scheduler_error: "Erro do agendador",
      job_send_message: "Bloco concluído: Enviar Texto",
      job_send_media: "Bloco concluído: Enviar Mídia",
    };
    return titles[t] ?? t;
  };

  const deriveFirstNameFromEmail = (email?: string | null) => {
    if (!email) return "";
    const namePart = email.split("@")[0];
    const cleaned = namePart.replace(/[._-]+/g, " ").trim();
    const first = cleaned.split(" ")[0] || "";
    return first ? first.charAt(0).toUpperCase() + first.slice(1) : "";
  };

  React.useEffect(() => {
    let isMounted = true;
    const loadHeaderData = async () => {
      if (!user) {
        if (isMounted) {
          setFirstName("");
          setAvatarUrl(null);
        }
        return;
      }
      const profile = await getProfile(user.id);
      const meta = (user.user_metadata as Record<string, unknown>) || {};
      const metaFirst = (meta?.first_name as string | undefined)?.trim();
      const resolvedFirst =
        profile?.first_name?.trim() ||
        (metaFirst ? metaFirst : "") ||
        deriveFirstNameFromEmail(user.email);

      const resolvedAvatar =
        (profile?.avatar_url?.trim?.() || "") ||
        ((meta?.avatar_url as string | undefined)?.trim?.() || "") ||
        null;

      if (isMounted) {
        setFirstName(resolvedFirst);
        setAvatarUrl(resolvedAvatar);
      }
    };
    loadHeaderData();
    return () => {
      isMounted = false;
    };
  }, [user]);

  React.useEffect(() => {
    const channel = supabase
      .channel("app_realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "campaign_logs" }, (payload: { new: Record<string, unknown> }) => {
        const log = payload.new;
        if (user?.id && log?.user_id && log.user_id !== user.id) return;
        const allowed = [
          "webhook_received",
          "webhook_error",
          "webhook_auth_error",
          "message_sent",
          "message_failed",
          "message_error",
          "campaign_created",
          "campaign_scheduled",
          "campaign_started",
          "campaign_completed",
          "campaign_failed",
          "campaign_status_update",
          "scheduler_started",
          "scheduler_invoked",
          "scheduler_error",
        ];
        if (!allowed.includes(log.event_type as string)) return;
        const item = { id: log.id as string, type: log.event_type as string, message: log.message as string, created_at: log.created_at as string, campaign_id: (log.campaign_id as string) ?? undefined };
        setNotifications((prev) => [item, ...prev].slice(0, 50));
        setUnread((u) => u + 1);
        const titles: Record<string, string> = {
          campaign_created: "Campanha criada",
          campaign_scheduled: "Campanha agendada",
          webhook_received: "Webhook recebido",
          webhook_error: "Erro de webhook",
          webhook_auth_error: "Erro de autenticação do webhook",
          message_sent: "Mensagem enviada",
          message_failed: "Falha no envio",
          message_error: "Erro de mensagem",
          campaign_started: "Campanha iniciada",
          campaign_completed: "Campanha concluída",
          campaign_failed: "Falha na campanha",
          campaign_status_update: "Status da campanha atualizado",
          scheduler_started: "Agendador iniciou",
          scheduler_invoked: "Agendador invocou envio",
          scheduler_error: "Erro do agendador",
        };
        const title = titles[log.event_type as string] || "Novo evento";
        const isError = /error|failed/i.test(log.event_type as string);
        (isError ? toast.error : toast.success)(title, { description: log.message as string });
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "jobs" }, async (payload: { old: Record<string, unknown>; new: Record<string, unknown> }) => {
        const oldStatus = payload.old?.status as string | undefined;
        const job = payload.new;
        if (user?.id && job?.user_id && job.user_id !== user.id) return;
        if (!job || job.status !== "completed" || oldStatus === "completed") return;
        const title = job.node_type === "send_message" ? "Bloco concluído: Enviar Texto" : job.node_type === "send_media" ? "Bloco concluído: Enviar Mídia" : `Bloco concluído: ${job.node_type}`;
        const itemBase = { id: job.id as string, type: `job_${job.node_type}`, message: title, created_at: job.processed_at as string, execution_id: job.execution_id as string };
        let flowId: string | undefined = undefined;
        if (itemBase.execution_id) {
          const { data } = await supabase.from("executions").select("flow_id").eq("id", itemBase.execution_id).single();
          flowId = data?.flow_id as string | undefined;
        }
        setNotifications((prev) => [{ ...itemBase, flow_id: flowId }, ...prev].slice(0, 50));
        toast.success(title);
        setUnread((u) => u + 1);
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "executions" }, (payload: { old: Record<string, unknown>; new: Record<string, unknown> }) => {
        const oldStatus = payload.old?.status as string | undefined;
        const exec = payload.new;
        if (user?.id && exec?.user_id && exec.user_id !== user.id) return;
        if (!exec || exec.status === oldStatus) return;
        if (exec.status !== "success" && exec.status !== "failed") return;
        const title = exec.status === "success" ? "Fluxo concluído" : "Fluxo falhou";
        const msg = (exec.error_message as string) || `Execução ${exec.id}`;
        const item = { id: exec.id as string, type: `execution_${exec.status}`, message: msg, created_at: (exec.completed_at || exec.started_at) as string, execution_id: exec.id as string, flow_id: exec.flow_id as string };
        setNotifications((prev) => [item, ...prev].slice(0, 50));
        const isError = exec.status === "failed";
        (isError ? toast.error : toast.success)(title, { description: msg });
        setUnread((u) => u + 1);
      });
    channel.subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  const initials = React.useMemo(() => {
    const email = user?.email ?? "";
    if (!email) return "MZ";
    const name = email.split("@")[0];
    const parts = name.split(/[.\-_]/);
    const init = (parts[0]?.[0] ?? "M") + (parts[1]?.[0] ?? "Z");
    return init.toUpperCase();
  }, [user?.email]);

  const pageTitle = React.useMemo(() => {
    if (location.pathname.startsWith("/instances")) return "Instâncias";
    if (location.pathname.startsWith("/contacts/")) return "Contatos da Lista";
    if (location.pathname.startsWith("/contacts")) return "Contatos";
    if (location.pathname.startsWith("/campaigns")) return "Campanhas";
    if (location.pathname.startsWith("/logs")) return "Logs";
    if (location.pathname.startsWith("/profile")) return "Meu Perfil";
    if (location.pathname.startsWith("/crm")) return "Clientes (CRM)";
    if (location.pathname.startsWith("/webhooks")) return "Webhooks";
    return "Dashboard";
  }, [location.pathname]);

  return (
    <div className="sticky top-0 z-30 mb-6">
      <div className="rounded-2xl bg-white/70 dark:bg-white/5 backdrop-blur supports-[backdrop-filter]:backdrop-blur border border-purple-100/70 dark:border-white/10 px-4 sm:px-6 py-3 shadow-[0_2px_12px_rgba(89,63,255,0.08)]">
        <div className="flex items-center gap-3">
          <div className="hidden sm:block">
            <div className="text-sm text-purple-700/80 dark:text-purple-200">
              {firstName ? `Olá, ${firstName}` : "Olá"}
            </div>
            <div className="flex items-center gap-2">
              <div className="font-semibold text-purple-900 dark:text-purple-100">{pageTitle}</div>
            </div>
          </div>

          <div className="flex-1" />

          <div className={cn("relative w-full max-w-md")}>
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-purple-400" />
            <Input
              placeholder="Pesquisar..."
              className="pl-9 pr-3 h-10 rounded-full bg-white/80 dark:bg-white/10 border-purple-100 focus-visible:ring-2 focus-visible:ring-purple-400/60 placeholder:text-purple-300"
            />
          </div>

          <div className="flex-1" />

          <Popover open={notifOpen} onOpenChange={(o) => { setNotifOpen(o); if (o) setUnread(0); }}>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full text-purple-600 hover:text-purple-700 hover:bg-purple-100/60 relative"
                aria-label="Notificações"
              >
                <Bell className="h-5 w-5" />
                {unread > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] leading-none rounded-full px-1.5 py-0.5">{unread}</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0" align="end">
              <div className="border-b px-3 py-2 text-sm font-semibold">Notificações</div>
              <div className="max-h-80 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="px-3 py-3 text-sm text-muted-foreground">Sem notificações</div>
                ) : (
                  notifications.map((n) => (
                    <div key={n.id} className="px-3 py-2 border-b last:border-0">
                      <div className="flex items-start gap-2">
                        <Badge className="shrink-0">{formatNotifType(n.type)}</Badge>
                        <div className="text-sm">
                          <div className="font-medium">{n.message}</div>
                          <div className="text-xs text-muted-foreground">{new Date(n.created_at).toLocaleString()}</div>
                        </div>
                      </div>
                      {n.campaign_id ? (
                        <div className="mt-1">
                          <Button variant="link" size="sm" className="px-0" onClick={() => navigate(`/campaigns/${n.campaign_id}/logs`)}>Ver Campanha</Button>
                        </div>
                      ) : null}
                      {n.execution_id && n.flow_id ? (
                        <div className="mt-1">
                          <Button variant="link" size="sm" className="px-0" onClick={() => navigate(`/flows/${n.flow_id}/executions/${n.execution_id}`)}>Ver Execução</Button>
                        </div>
                      ) : null}
                    </div>
                  ))
                )}
              </div>
            </PopoverContent>
          </Popover>

          <button
            onClick={() => navigate("/profile")}
            className="ml-1 inline-flex items-center justify-center rounded-full border border-purple-100 bg-white/70 dark:bg-white/10 dark:border-white/10 hover:shadow-sm transition-all"
            aria-label="Perfil"
          >
            <Avatar className="h-9 w-9">
              {avatarUrl ? (
                <AvatarImage src={avatarUrl} alt={firstName || user?.email || "Avatar"} />
              ) : null}
              <AvatarFallback className="bg-gradient-to-br from-purple-500 to-indigo-500 text-white">
                {initials}
              </AvatarFallback>
            </Avatar>
          </button>
        </div>
      </div>
    </div>
  );
};

export default HeaderBar;