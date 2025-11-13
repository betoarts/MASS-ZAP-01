"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Customer, getCustomers, addCustomer, updateCustomer, deleteCustomer } from "@/lib/crm-storage";
import { ClientTable } from "@/components/crm/ClientTable";
import { ClientForm } from "@/components/crm/ClientForm";
import { SendProposalForm } from "@/components/crm/SendProposalForm";
import { useSession } from "@/components/auth/SessionContextProvider";
import { toast } from "sonner";

const CRM = () => {
  const [customers, setCustomers] = React.useState<Customer[]>([]);
  const [isClientFormOpen, setIsClientFormOpen] = React.useState(false);
  const [isSendProposalFormOpen, setIsSendProposalFormOpen] = React.useState(false);
  const [editingCustomer, setEditingCustomer] = React.useState<Customer | null>(null);
  const [selectedCustomerForProposal, setSelectedCustomerForProposal] = React.useState<Customer | null>(null);
  const { user } = useSession();

  const fetchCustomers = React.useCallback(async () => {
    const fetchedCustomers = await getCustomers();
    setCustomers(fetchedCustomers);
  }, []);

  React.useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const handleSaveClient = async (clientData: Omit<Customer, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    if (!user) {
      toast.error("Você precisa estar logado para salvar clientes.");
      return;
    }

    let success = false;
    if (editingCustomer) {
      const updatedClient = await updateCustomer(user.id, { ...clientData, id: editingCustomer.id });
      if (updatedClient) {
        toast.success("Cliente atualizado com sucesso!");
        success = true;
      } else {
        toast.error("Falha ao atualizar cliente.");
      }
    } else {
      const newClient = await addCustomer(user.id, clientData);
      if (newClient) {
        toast.success("Cliente adicionado com sucesso!");
        success = true;
      } else {
        toast.error("Falha ao adicionar cliente.");
      }
    }

    if (success) {
      fetchCustomers();
      setIsClientFormOpen(false);
      setEditingCustomer(null);
    }
  };

  const handleEditClient = (customer: Customer) => {
    setEditingCustomer(customer);
    setIsClientFormOpen(true);
  };

  const handleDeleteClient = async (id: string) => {
    const success = await deleteCustomer(id);
    if (success) {
      toast.success("Cliente excluído com sucesso!");
      fetchCustomers();
    } else {
      toast.error("Falha ao excluir cliente.");
    }
  };

  const handleSendProposal = (customer: Customer) => {
    setSelectedCustomerForProposal(customer);
    setIsSendProposalFormOpen(true);
  };

  const handleProposalSent = () => {
    setIsSendProposalFormOpen(false);
    setSelectedCustomerForProposal(null);
    // No need to re-fetch customers, as sending a proposal doesn't change customer data
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Gerenciamento de Clientes (CRM)</h1>
        <Dialog open={isClientFormOpen} onOpenChange={setIsClientFormOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { setEditingCustomer(null); setIsClientFormOpen(true); }}>
              <PlusCircle className="mr-2 h-4 w-4" /> Adicionar Cliente
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>{editingCustomer ? "Editar Cliente" : "Adicionar Novo Cliente"}</DialogTitle>
            </DialogHeader>
            <ClientForm initialData={editingCustomer} onSave={handleSaveClient} />
          </DialogContent>
        </Dialog>
      </div>
      <ClientTable
        customers={customers}
        onEdit={handleEditClient}
        onDelete={handleDeleteClient}
        onSendProposal={handleSendProposal}
      />

      {selectedCustomerForProposal && (
        <Dialog open={isSendProposalFormOpen} onOpenChange={setIsSendProposalFormOpen}>
          <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Enviar Proposta para {selectedCustomerForProposal.name}</DialogTitle>
            </DialogHeader>
            <SendProposalForm customer={selectedCustomerForProposal} onProposalSent={handleProposalSent} />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default CRM;