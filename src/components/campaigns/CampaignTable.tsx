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
import { Edit, Trash2, Play, Pause, StopCircle, FileText } from "lucide-react";
import { Campaign, updateCampaign, updateCampaignStatus } from "@/lib/campaign-storage";
import { Instance } from "@/lib/storage";
import { ContactList } from "@/lib/contact-storage";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useSession } from "@/components/auth/SessionContextProvider";
import { mapCampaignToFormData } from "@/lib/campaign-utils";

interface CampaignTableProps {
  campaigns: Campaign[];
  instances: Instance[];
  contactLists: ContactList[];
  onEdit: (campaign: Campaign) => void;
  onDelete: (id: string) => void;
  onCampaignStatusChange: () => void;
}

export const CampaignTable: React.FC<CampaignTableProps> = ({
  campaigns,
  instances,
  contactLists,
  onEdit,
  onDelete,
  onCampaignStatusChange,
}) => {
  const navigate = useNavigate();
  const { user } = useSession();

  const getInstanceName = (instanceId: string) => {
    const instance = instances.find((inst) => inst.id === instanceId);
    return instance ? instance.name : "Desconhecida";
  };

  const getContactListName = (contactListId: string) => {
    const list = contactLists.find((cl) => cl.id === contactListId);
    return list ? list.name : "Desconhecida";
  };

  const getStatusBadge = (status: Campaign['status']) => {
    switch (status) {
      case 'draft':
        return <Badge variant="outline" className="bg-gray-100 text-gray-800">Rascunho</Badge>;
      case 'scheduled':
        return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">Agendada</Badge>;
      case 'running':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Em Andamento</Badge>;
      case 'completed':
        return <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100">Concluída</Badge>;
      case 'failed':
        return <Badge variant="destructive">Falha</Badge>;
      case 'stopped':
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Parada</Badge>;
      default:
        return <Badge variant="secondary">Desconhecido</Badge>;
    }
  };

  const handleRunSchedule = async (campaign: Campaign) => {
    if (!user) {
      toast.error("Você precisa estar logado para agendar campanhas.");
      return;
    }
    const loadingToastId = toast.loading(`Verificando agendamento da campanha "${campaign.name}"...`);
    try {
      const now = new Date();
      const scheduledTime = campaign.scheduled_at ? new Date(campaign.scheduled_at) : null;

      if (!scheduledTime || scheduledTime <= now) {
        toast.error("Para agendar uma campanha, ela deve ter uma data e hora de agendamento futuras.", { id: loadingToastId });
        return;
      }

      // Usamos mapCampaignToFormData para garantir que todos os campos necessários para a atualização estejam presentes
      const formData = mapCampaignToFormData(campaign);
      const updatedCampaign = await updateCampaign(user.id, { ...formData, id: campaign.id, status: 'scheduled' });
      if (updatedCampaign) {
        toast.success(`Campanha "${campaign.name}" agendada com sucesso para ${format(scheduledTime, "PPP HH:mm", { locale: ptBR })}.`, { id: loadingToastId });
        onCampaignStatusChange(); // Refresh campaign list
      } else {
        toast.error("Falha ao agendar campanha.", { id: loadingToastId });
      }
    } catch (error: any) {
      console.error("Error in handleRunSchedule:", error);
      toast.error(`Erro inesperado ao agendar campanha "${campaign.name}".`, { description: error.message, id: loadingToastId });
    }
  };

  const handlePause = async (campaign: Campaign) => {
    if (!user) {
      toast.error("Você precisa estar logado para pausar campanhas.");
      return;
    }
    const loadingToastId = toast.loading(`Pausando campanha "${campaign.name}"...`);
    try {
      const updatedCampaign = await updateCampaignStatus(campaign.id, 'stopped');
      if (updatedCampaign) {
        toast.success(`Campanha "${campaign.name}" pausada com sucesso.`, { id: loadingToastId });
        onCampaignStatusChange();
      } else {
        toast.error("Falha ao pausar campanha.", { id: loadingToastId });
      }
    } catch (error: any) {
      console.error("Error in handlePause:", error);
      toast.error(`Erro inesperado ao pausar campanha "${campaign.name}".`, { description: error.message, id: loadingToastId });
    }
  };

  const handleStop = async (campaign: Campaign) => {
    if (!user) {
      toast.error("Você precisa estar logado para parar campanhas.");
      return;
    }
    const loadingToastId = toast.loading(`Parando campanha "${campaign.name}"...`);
    try {
      const updatedCampaign = await updateCampaignStatus(campaign.id, 'stopped');
      if (updatedCampaign) {
        toast.success(`Campanha "${campaign.name}" parada com sucesso.`, { id: loadingToastId });
        onCampaignStatusChange();
      } else {
        toast.error("Falha ao parar campanha.", { id: loadingToastId });
      }
    } catch (error: any) {
      console.error("Error in handleStop:", error);
      toast.error(`Erro inesperado ao parar campanha "${campaign.name}".`, { description: error.message, id: loadingToastId });
    }
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>ID</TableHead>
            <TableHead>Nome da Campanha</TableHead>
            <TableHead>Instância</TableHead>
            <TableHead>Lista de Contatos</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Agendada Para</TableHead>
            <TableHead>Criada Em</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {campaigns.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                Nenhuma campanha configurada. Crie uma para começar!
              </TableCell>
            </TableRow>
          ) : (
            campaigns.map((campaign) => (
              <TableRow key={campaign.id}>
                <TableCell className="font-mono text-xs text-muted-foreground">{campaign.id.substring(0, 8)}...</TableCell>
                <TableCell className="font-medium">{campaign.name}</TableCell>
                <TableCell>{getInstanceName(campaign.instance_id)}</TableCell>
                <TableCell>{getContactListName(campaign.contact_list_id)}</TableCell>
                <TableCell>{getStatusBadge(campaign.status)}</TableCell>
                <TableCell>
                  {campaign.scheduled_at
                    ? format(new Date(campaign.scheduled_at), "PPP HH:mm", { locale: ptBR })
                    : "Não Agendada"}
                </TableCell>
                <TableCell>{format(new Date(campaign.created_at), "PPP HH:mm", { locale: ptBR })}</TableCell>
                <TableCell className="text-right">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => navigate(`/campaigns/${campaign.id}/logs`)}
                        className="mr-2"
                      >
                        <FileText className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Ver Logs da Campanha</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onEdit(campaign)}
                        className="mr-2"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Editar Campanha</TooltipContent>
                  </Tooltip>
                  {(campaign.status === 'draft' || campaign.status === 'completed' || campaign.status === 'failed' || campaign.status === 'stopped') ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRunSchedule(campaign)}
                          className="mr-2"
                        >
                          <Play className="h-4 w-4 text-green-500" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Agendar Campanha</TooltipContent>
                    </Tooltip>
                  ) : (campaign.status === 'running' || campaign.status === 'scheduled') && (
                    <>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handlePause(campaign)}
                            className="mr-2"
                          >
                            <Pause className="h-4 w-4 text-yellow-500" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Pausar Campanha</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleStop(campaign)}
                            className="mr-2"
                          >
                            <StopCircle className="h-4 w-4 text-red-500" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Parar Campanha</TooltipContent>
                      </Tooltip>
                    </>
                  )}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onDelete(campaign.id)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Excluir Campanha</TooltipContent>
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