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
import { Button } from "@/components/ui/button";
import { Edit, Trash2, Globe } from "lucide-react";
import { WebhookSource } from "@/lib/webhook-storage";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";

interface WebhookSourcesTableProps {
  sources: WebhookSource[];
  onEdit: (source: WebhookSource) => void;
  onDelete: (id: string) => void;
}

export const WebhookSourcesTable: React.FC<WebhookSourcesTableProps> = ({ sources, onEdit, onDelete }) => {
  const getSourceTypeBadge = (type: string) => {
    switch (type) {
      case 'hubspot':
        return <Badge className="bg-orange-100 text-orange-800">HubSpot</Badge>;
      case 'salesforce':
        return <Badge className="bg-blue-100 text-blue-800">Salesforce</Badge>;
      case 'pipedrive':
        return <Badge className="bg-green-100 text-green-800">Pipedrive</Badge>;
      default:
        return <Badge variant="secondary">{type}</Badge>;
    }
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Mapeamento</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sources.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                Nenhuma fonte de webhook configurada
              </TableCell>
            </TableRow>
          ) : (
            sources.map((source) => (
              <TableRow key={source.id}>
                <TableCell className="font-medium">{source.name}</TableCell>
                <TableCell>{getSourceTypeBadge(source.source_type)}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {Object.keys(source.field_mapping).map((field) => (
                      <Badge key={field} variant="outline" className="text-xs">
                        {field} → {source.field_mapping[field]}
                      </Badge>
                    ))}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onEdit(source)}
                        className="mr-2"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Editar Fonte</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onDelete(source.id)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Excluir Fonte</TooltipContent>
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