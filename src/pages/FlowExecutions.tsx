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

const FlowExecutions: React.FC = () => {
  const { flowId } = useParams<{ flowId: string }>();
  const navigate = useNavigate();
  const [flow, setFlow] = React.useState<Flow | null>(null);
  const [executions, setExecutions] = React.useState<Execution[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

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
          </div>
        }
      />
      
      <FlowExecutionTable executions={executions} isLoading={isLoading} />
    </div>
  );
};

export default FlowExecutions;