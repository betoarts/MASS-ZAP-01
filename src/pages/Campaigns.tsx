"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Campaign, getCampaigns, addCampaign, updateCampaign, deleteCampaign, updateCampaignStatus } from "@/lib/campaign-storage";
import { CampaignTable } from "@/components/campaigns/CampaignTable";
import { CampaignForm } from "@/components/campaigns/CampaignForm";
import { Instance, getInstances } from "@/lib/storage";
import { ContactList, getContactLists } from "@/lib/contact-storage";
import { toast } from "sonner";
import { useSession } from "@/components/auth/SessionContextProvider";
import { CampaignFormData } from "@/lib/campaign-utils";
import PageHeader from "@/components/layout/PageHeader";
import { supabase } from "@/integrations/supabase/client";
import { RequireSubscription } from "@/components/auth/RequireSubscription";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const Campaigns = () => {
  const [campaigns, setCampaigns] = React.useState<Campaign[]>([]);
  const [instances, setInstances] = React.useState<Instance[]>([]);
  const [contactLists, setContactLists] = React.useState<ContactList[]>([]);
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [editingCampaign, setEditingCampaign] = React.useState<Campaign | null>(null);
  const { user } = useSession();
  const [accountStatus, setAccountStatus] = React.useState<string | null>(null);

  const fetchCampaignData = React.useCallback(async () => {
    const fetchedCampaigns = await getCampaigns();
    setCampaigns(fetchedCampaigns);
    
    if (user) {
      const fetchedInstances = await getInstances(user.id);
      setInstances(fetchedInstances);
    }
    
    const fetchedContactLists = await getContactLists();
    setContactLists(fetchedContactLists);
  }, [user]);

  React.useEffect(() => {
    fetchCampaignData();
  }, [fetchCampaignData]);

  React.useEffect(() => {
    const fetchStatus = async () => {
      if (!user) return;
      const { data } = await supabase.from("profiles").select("account_status").eq("id", user.id).single();
      setAccountStatus((data as any)?.account_status ?? null);
    };
    fetchStatus();
  }, [user]);

  const handleSaveCampaign = async (formData: CampaignFormData) => {
    if (!user) {
      toast.error("Você precisa estar logado para criar/atualizar campanhas.");
      return;
    }

    if (accountStatus === "paused") {
      toast.error("Pacote de mensagens encerrado.", { description: "Seu pacote acabou. Entre em contato com suporte." });
      return;
    }

    let success = false;
    const now = new Date();
    const scheduledAt = formData.scheduledAt ? new Date(formData.scheduledAt) : null;
    const shouldAutoSchedule = scheduledAt && scheduledAt > now;
    const shouldAutoStart = scheduledAt && scheduledAt <= now;
    if (editingCampaign) {
      const updatedCampaign = await updateCampaign(
        user.id,
        { ...formData, id: editingCampaign.id, status: shouldAutoSchedule ? 'scheduled' : shouldAutoStart ? 'running' : editingCampaign.status }
      );
      if (updatedCampaign) {
        toast.success("Campanha atualizada com sucesso!");
        if (shouldAutoStart) {
          const { data: invokeData, error } = await supabase.functions.invoke('send-campaign', {
            body: { campaignId: editingCampaign.id, userId: user.id },
          });
          if (error) {
            const errorMsg = (invokeData as any)?.error || error.message || 'Erro desconhecido';
            console.error('send-campaign error:', error, 'response:', invokeData);
            toast.error("Falha ao invocar send-campaign", { description: errorMsg });
          } else {
            toast.success("Campanha iniciada automaticamente");
          }
        }
        success = true;
      } else {
        toast.error("Falha ao atualizar campanha.");
      }
    } else {
      const newCampaign = await addCampaign(user.id, formData);
      if (newCampaign) {
        toast.success("Campanha criada com sucesso!");
        if (shouldAutoSchedule) {
          const scheduled = await updateCampaignStatus(newCampaign.id, 'scheduled');
          if (scheduled) {
            toast.success("Campanha agendada automaticamente.");
          } else {
            toast.error("Falha ao agendar automaticamente a campanha.");
          }
        } else if (shouldAutoStart) {
          const { data: invokeData, error } = await supabase.functions.invoke('send-campaign', {
            body: { campaignId: newCampaign.id, userId: user.id },
          });
          if (error) {
            const errorMsg = (invokeData as any)?.error || error.message || 'Erro desconhecido';
            console.error('send-campaign error:', error, 'response:', invokeData);
            toast.error("Falha ao invocar send-campaign", { description: errorMsg });
          } else {
            toast.success("Campanha iniciada automaticamente");
          }
        }
        success = true;
      } else {
        toast.error("Falha ao criar campanha.");
      }
    }
    
    if (success) {
      await fetchCampaignData();
      setIsFormOpen(false);
      setEditingCampaign(null);
    }
  };

  const handleEditCampaign = (campaign: Campaign) => {
    setEditingCampaign(campaign);
    setIsFormOpen(true);
  };

  const handleDeleteCampaign = async (id: string) => {
    const success = await deleteCampaign(id);
    if (success) {
      toast.success("Campanha excluída com sucesso!");
      await fetchCampaignData();
    } else {
      toast.error("Falha ao excluir campanha.");
    }
  };

  return (
    <RequireSubscription>
    <div className="space-y-6">
      <PageHeader
        title="Gerenciamento de Campanhas"
        actions={
          <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => { setEditingCampaign(null); setIsFormOpen(true); }} disabled={accountStatus === "paused"}>
                <PlusCircle className="mr-2 h-4 w-4" /> Criar Nova Campanha
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingCampaign ? "Editar Campanha" : "Criar Nova Campanha"}</DialogTitle>
                <DialogDescription>
                  {editingCampaign ? "Edite os detalhes da sua campanha existente." : "Preencha os detalhes para criar uma nova campanha."}
                </DialogDescription>
              </DialogHeader>
              <CampaignForm
                initialData={editingCampaign}
                onSave={handleSaveCampaign}
                instances={instances}
                contactLists={contactLists}
              />
            </DialogContent>
          </Dialog>
        }
      />
      {accountStatus === "paused" && (
        <Alert variant="destructive">
          <AlertTitle>Pacote de mensagens encerrado</AlertTitle>
          <AlertDescription>Seu pacote acabou. Entre em contato com suporte para liberar mais envios.</AlertDescription>
        </Alert>
      )}
      <CampaignTable
        campaigns={campaigns}
        instances={instances}
        contactLists={contactLists}
        onEdit={handleEditCampaign}
        onDelete={handleDeleteCampaign}
        onCampaignStatusChange={fetchCampaignData}
      />
    </div>
    </RequireSubscription>
  );
};

export default Campaigns;