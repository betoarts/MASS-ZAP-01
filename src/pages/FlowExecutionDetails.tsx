"use client";

import * as React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, RefreshCw, Info, Clock, CheckCircle, XCircle } from "lucide-react";
import { getExecutionById, getJobsByExecutionId } from "@/lib/flow-storage";
import { Execution, Job } from "@/lib/flow-types";
import { toast } from "sonner";
import PageHeader from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FlowJobTable } from "@/components/flow/FlowJobTable";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const FlowExecutionDetails: React.FC = () => {
  const { flowId, executionId } = useParams<{ flowId: string, executionId: string }>();
  const navigate = useNavigate();
  const [execution, setExecution] = React.useState<Execution | null>(null);
  const [jobs, setJobs] = React.useState<Job[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  const fetchDetails = React.useCallback(async () => {
    if (!executionId) return;

    setIsLoading(true);
    const fetchedExecution = await getExecutionById(executionId);
    if (!fetchedExecution) {
      toast.error("Execução não encontrada.");
      navigate(`/flows/${flowId}/executions`);
      return;
    }
    setExecution(fetchedExecution);

    const fetchedJobs = await getJobsByExecutionId(executionId);
    setJobs(fetchedJobs);
    setIsLoading(false);
  }, [executionId, flowId, navigate]);

  React.useEffect(() => {
    fetchDetails();
  }, [fetchDetails]);

  const getStatusIcon = (status: Execution['status']) => {
    switch (status) {
      case 'running':
        return <Clock className="h-5 w-5 text-blue-600" />;
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-600" />;
      default:
        return <Info className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: Execution['status']) => {
    switch (status) {
      case 'running':
        return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">Em Execução</Badge>;
      case 'success':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Sucesso</Badge>;
      case 'failed':
        return <Badge variant="destructive">Falha</Badge>;
      default:
        return <Badge variant="secondary">Desconhecido</Badge>;
    }
  };

  if (!execution && isLoading) {
    return <div className="min-h-screen flex items-center justify-center">Carregando detalhes da execução...</div>;
  }

  if (!execution) {
    return null;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Detalhes da Execução: ${execution.id.substring(0, 8)}...`}
        subtitle={`Fluxo ID: ${execution.flow_id.substring(0, 8)}...`}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate(`/flows/${flowId}/executions`)}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar ao Histórico
            </Button>
            <Button onClick={fetchDetails} disabled={isLoading}>
              <RefreshCw className={isLoading ? "mr-2 h-4 w-4 animate-spin" : "mr-2 h-4 w-4"} />
              {isLoading ? "Atualizando..." : "Atualizar"}
            </Button>
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Status</CardTitle>
            {getStatusIcon(execution.status)}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{getStatusBadge(execution.status)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {execution.completed_at ? `Concluído em ${format(new Date(execution.completed_at), "dd/MM HH:mm", { locale: ptBR })}` : "Em andamento"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Início</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {format(new Date(execution.started_at), "dd/MM/yyyy")}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {format(new Date(execution.started_at), "HH:mm:ss", { locale: ptBR })}
            </p>
          </CardContent>
        </Card>

        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-sm font-medium">Contexto Inicial</CardTitle>
          </CardHeader>
          <CardContent>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="sm" className="w-full justify-start truncate">
                  {JSON.stringify(execution.context)}
                </Button>
              </TooltipTrigger>
              <TooltipContent className="max-w-md p-2">
                <pre className="text-xs whitespace-pre-wrap break-all">
                  {JSON.stringify(execution.context, null, 2)}
                </pre>
              </TooltipContent>
            </Tooltip>
            {execution.error_message && (
              <p className="text-xs text-red-600 mt-2">
                Erro: {execution.error_message}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <h2 className="text-2xl font-bold pt-4">Jobs Processados</h2>
      <FlowJobTable jobs={jobs} isLoading={isLoading} />
    </div>
  );
};

export default FlowExecutionDetails;