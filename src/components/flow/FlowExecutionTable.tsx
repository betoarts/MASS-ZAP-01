"use client";

import * as React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Execution } from "@/lib/flow-types";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Eye } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";

interface FlowExecutionTableProps {
  executions: Execution[];
  isLoading: boolean;
}

export const FlowExecutionTable: React.FC<FlowExecutionTableProps> = ({ executions, isLoading }) => {
  const navigate = useNavigate();
  const { flowId } = useParams<{ flowId: string }>();

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

  const handleViewDetails = (executionId: string) => {
    if (flowId) {
      navigate(`/flows/${flowId}/executions/${executionId}`);
    }
  };

  if (isLoading) {
    return <div className="text-center py-8 text-muted-foreground">Carregando execuções...</div>;
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>ID</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Iniciado Em</TableHead>
            <TableHead>Concluído Em</TableHead>
            <TableHead>Erro</TableHead>
            <TableHead className="text-right">Detalhes</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {executions.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                Nenhuma execução registrada para este fluxo.
              </TableCell>
            </TableRow>
          ) : (
            executions.map((exec) => (
              <TableRow key={exec.id}>
                <TableCell className="font-mono text-xs text-muted-foreground">{exec.id.substring(0, 8)}...</TableCell>
                <TableCell>{getStatusBadge(exec.status)}</TableCell>
                <TableCell>
                  {format(new Date(exec.started_at), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })}
                </TableCell>
                <TableCell>
                  {exec.completed_at ? format(new Date(exec.completed_at), "dd/MM/yyyy HH:mm:ss", { locale: ptBR }) : "-"}
                </TableCell>
                <TableCell className="max-w-[200px] truncate text-red-600">
                  {exec.error_message || "-"}
                </TableCell>
                <TableCell className="text-right">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleViewDetails(exec.id)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Ver Detalhes e Jobs</TooltipContent>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
};