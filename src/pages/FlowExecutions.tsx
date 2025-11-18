"use client";

import * as React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { getFlowById, getExecutions } from "@/lib/flow-storage";
import { Flow, Execution } from "@/lib/flow-types";
import { toast } from "sonner";
import { FlowExecutionTable } from "@/components/flow/FlowExecutionTable";
import PageHeader from "@/components/layout/PageHeader";
import { supabase } from "@/integrations/supabase/client";
import { RequireSubscription } from "@/components/auth/RequireSubscription";

const FlowExecutions: React.FC = () => {
  const { flowId } = useParams<{ flowId: string }>();
  const navigate = useNavigate();
  const [flow, setFlow] = React.useState<Flow | null>(null);
  const [executions, setExecutions] = React.useState<Execution[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isProcessing, setIsProcessing] = React.useState(false);

  const fetchExecutions = React.useCallback(async () => {
    if (!flowId) return;

    setIsLoading(true);
    const fetchedFlow = await getFlowById(flowId);
    if (!fetchedFlow) {
      toast.error("Fluxo não encontrado.");
      navigate("/flows");
      return;
    }
    setFlow(fetchedFlow);

    const fetchedExecutions = await getExecutions(flowId);
    setExecutions(fetchedExecutions);
    setIsLoading(false);
  }, [flowId, navigate]);

  const processNow = React.useCallback(async () => {
    setIsProcessing(true);
    try {
      let total = 0;
      for (let i = 0; i < 5; i++) {
        try {
          const res = await supabase.functions.invoke("process-due-jobs");
          const processed = (res.data && (res.data.processed ?? 0)) || 0;
          if (processed > 0) {
            total += processed;
            await new Promise((r) => setTimeout(r, 300));
            continue;
          }
        } catch (_) {}
        try {
          const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/process-due-jobs`;
          const resp = await fetch(url, {
            method: "POST",
            headers: {
              apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
              "Content-Type": "application/json",
            },
          });
          const json = await resp.json().catch(() => ({}));
          const processed = (json && (json.processed ?? 0)) || 0;
          if (processed > 0) {
            total += processed;
            await new Promise((r) => setTimeout(r, 300));
            continue;
          }
        } catch (_) {}
        break;
      }
      toast.success(total > 0 ? `Processados: ${total} job(s)` : "Nenhum job para processar");
      fetchExecutions();
    } catch (err: any) {
      toast.error("Falha ao processar agora", { description: err?.message });
    } finally {
      setIsProcessing(false);
    }
  }, [fetchExecutions]);

  React.useEffect(() => {
    fetchExecutions();
  }, [fetchExecutions]);

  if (!flow && isLoading) {
    return <div className="min-h-screen flex items-center justify-center">Carregando histórico do fluxo...</div>;
  }

  if (!flow) {
    return null;
  }

  return (
    <RequireSubscription>
      <div className="space-y-6">
        <PageHeader
          title={`Execuções do Fluxo: ${flow.name}`}
          subtitle="Histórico de todas as vezes que este fluxo foi iniciado."
          actions={
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => navigate(`/flows/${flowId}`)}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar ao Editor
              </Button>
              <Button onClick={fetchExecutions} disabled={isLoading}>
                <RefreshCw className={isLoading ? "mr-2 h-4 w-4 animate-spin" : "mr-2 h-4 w-4"} />
                {isLoading ? "Atualizando..." : "Atualizar"}
              </Button>
              <Button onClick={processNow} disabled={isProcessing}>
                {isProcessing ? (
                  <span className="inline-flex items-center gap-2"><RefreshCw className="h-4 w-4 animate-spin" />Processando…</span>
                ) : (
                  "Processar Agora"
                )}
              </Button>
            </div>
          }
        />

        <FlowExecutionTable executions={executions} isLoading={isLoading} />
      </div>
    </RequireSubscription>
  );
};

export default FlowExecutions;