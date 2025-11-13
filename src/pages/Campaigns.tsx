"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog"; // Import DialogDescription
import { Campaign, getCampaigns, addCampaign, updateCampaign, deleteCampaign } from "@/lib/campaign-storage";
import { CampaignTable } from "@/components/campaigns/CampaignTable";
import { CampaignForm } from "@/components/campaigns/CampaignForm";
import { Instance, getInstances } from "@/lib/storage";
import { ContactList, getContactLists } from "@/lib/contact-storage";
import { toast } from "sonner"; // Import toast for feedback
import { useSession } from "@/components/auth/SessionContextProvider"; // Import useSession
import { CampaignFormData } from "@/lib/campaign-utils"; // Importar CampaignFormData

const Campaigns = () => {
  const [campaigns, setCampaigns] = React.useState<Campaign[]>([]);
  const [instances, setInstances] = React.useState<Instance[]>([]);
  const [contactLists, setContactLists] = React.useState<ContactList[]>([]);
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [editingCampaign, setEditingCampaign] = React.useState<Campaign | null>(null);
  const { user } = useSession(); // Get user from session

  const fetchCampaignData = React.useCallback(async () => {
    const fetchedCampaigns = await getCampaigns();
    setCampaigns(fetchedCampaigns);
    const fetchedInstances = await getInstances();
    setInstances(fetchedInstances);
    const fetchedContactLists = await getContactLists();
    setContactLists(fetchedContactLists);
  }, []);

  React.useEffect(() => {
    fetchCampaignData();
  }, [fetchCampaignData]);

  const handleSaveCampaign = async (formData: CampaignFormData) => { // Usar CampaignFormData
    if (!user) {
      toast.error("Você precisa estar logado para criar/atualizar campanhas.");
      return;
    }

    let success = false;
    if (editingCampaign) {
      // Ao atualizar, combinamos os dados do formulário (formData) com o ID e status da campanha existente
      const updatedCampaign = await updateCampaign(user.id, { ...formData, id: editingCampaign.id, status: editingCampaign.status });
      if (updatedCampaign) {
        toast.success("Campanha atualizada com sucesso!");
        success = true;
      } else {
        toast.error("Falha ao atualizar campanha.");
      }
    } else {
      // Ao criar, passamos os dados do formulário diretamente
      const newCampaign = await addCampaign(user.id, formData);
      if (newCampaign) {
        toast.success("Campanha criada com sucesso!");
        success = true;
      } else {
        toast.error("Falha ao criar campanha.");
      }
    }
    
    if (success) {
      await fetchCampaignData(); // Re-fetch all data to ensure consistency
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
      await fetchCampaignData(); // Re-fetch all data after deletion
    } else {
      toast.error("Falha ao excluir campanha.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Gerenciamento de Campanhas</h1>
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { setEditingCampaign(null); setIsFormOpen(true); }}>
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
      </div>
      <CampaignTable
        campaigns={campaigns}
        instances={instances}
        contactLists={contactLists}
        onEdit={handleEditCampaign}
        onDelete={handleDeleteCampaign}
        onCampaignStatusChange={fetchCampaignData} // This already calls fetchCampaignData
      />
    </div>
  );
};

export default Campaigns;