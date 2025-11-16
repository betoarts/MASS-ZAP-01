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
import { Job } from "@/lib/flow-types";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Eye, Clock, CheckCircle, XCircle, Loader2 } from "lucide-react";

interface FlowJobTableProps {
  jobs: Job[];
  isLoading: boolean;
}

export const FlowJobTable: React.FC<FlowJobTableProps> = ({ jobs, isLoading }) => {
  const getStatusBadge = (status: Job['status']) => {
    switch (status) {
      case 'pending':
        return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100 flex items-center gap-1"><Clock className="h-3 w-3" /> Pendente</Badge>;
      case 'processing':
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100 flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> Processando</Badge>;
      case 'completed':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100 flex items-center gap-1"><CheckCircle className="h-3 w-3" /> Concluído</Badge>;
      case 'failed':
        return <Badge variant="destructive" className="flex items-center gap-1"><XCircle className="h-3 w-3" /> Falha</Badge>;
      default:
        return <Badge variant="secondary">Desconhecido</Badge>;
    }
  };

  if (isLoading) {
    return <div className="text-center py-8 text-muted-foreground">Carregando jobs...</div>;
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Node ID</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Agendado Para</TableHead>
            <TableHead>Processado Em</TableHead>
            <TableHead>Tentativas</TableHead>
            <TableHead className="text-right">Detalhes</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {jobs.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                Nenhum job registrado para esta execução.
              </TableCell>
            </TableRow>
          ) : (
            jobs.map((job) => (
              <TableRow key={job.id}>
                <TableCell className="font-mono text-xs text-muted-foreground">{job.node_id.substring(0, 8)}...</TableCell>
                <TableCell>{job.node_type}</TableCell>
                <TableCell>{getStatusBadge(job.status)}</TableCell>
                <TableCell>
                  {format(new Date(job.scheduled_at), "dd-MM-yyyy HH:mm", { locale: ptBR })}
                </TableCell>
                <TableCell>
                  {job.processed_at ? format(new Date(job.processed_at), "dd-MM-yyyy HH:mm", { locale: ptBR }) : "-"}
                </TableCell>
                <TableCell>{job.retry_count} / {job.max_retries}</TableCell>
                <TableCell className="text-right">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs p-2">
                      <div className="space-y-2">
                        <p className="font-bold">Dados do Node:</p>
                        <pre className="text-xs whitespace-pre-wrap break-all bg-muted p-1 rounded">
                          {JSON.stringify(job.node_data, null, 2)}
                        </pre>
                        {job.error_message && (
                          <>
                            <p className="font-bold text-red-600">Erro:</p>
                            <pre className="text-xs whitespace-pre-wrap break-all bg-red-50 p-1 rounded">
                              {job.error_message}
                            </pre>
                          </>
                        )}
                      </div>
                    </TooltipContent>
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