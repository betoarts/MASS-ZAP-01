"use client";

import * as React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { PlusCircle, ArrowLeft } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ContactList, getContactListById, getContactsByListId, addContact, updateContact, deleteContact, Contact } from "@/lib/contact-storage";
import { ContactDetailsTable } from "@/components/contacts/ContactDetailsTable";
import { ContactDetailsForm } from "@/components/contacts/ContactDetailsForm";
import { toast } from "sonner";
import { useSession } from "@/components/auth/SessionContextProvider"; // Import useSession
import { RequireSubscription } from "@/components/auth/RequireSubscription";

const ContactDetails = () => {
  const { listId } = useParams<{ listId: string }>();
  const navigate = useNavigate();
  const [contactList, setContactList] = React.useState<ContactList | null>(null);
  const [contacts, setContacts] = React.useState<Contact[]>([]);
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [editingContact, setEditingContact] = React.useState<Contact | null>(null);
  const { user } = useSession(); // Get user from session

  const fetchContactData = React.useCallback(async () => {
    if (listId) {
      const fetchedList = await getContactListById(listId);
      if (fetchedList) {
        setContactList(fetchedList);
        setContacts(fetchedList.contacts);
      } else {
        toast.error("Lista de contatos não encontrada.");
        navigate("/contacts"); // Redirect if list not found
      }
    }
  }, [listId, navigate]);

  React.useEffect(() => {
    fetchContactData();
  }, [fetchContactData]);

  const handleSaveContact = async (newContactData: Omit<Contact, 'id' | 'contact_list_id'>) => {
    if (!listId || !user) {
      toast.error("Você precisa estar logado e ter uma lista selecionada para adicionar/atualizar contatos.");
      return;
    }

    if (editingContact) {
      const updatedContact = await updateContact(user.id, { ...editingContact, ...newContactData, contact_list_id: listId });
      if (updatedContact) {
        toast.success("Contato atualizado com sucesso!");
        fetchContactData();
      } else {
        toast.error("Falha ao atualizar contato.");
      }
    } else {
      const newContact = await addContact(user.id, { ...newContactData, contact_list_id: listId });
      if (newContact) {
        toast.success("Contato adicionado com sucesso!");
        fetchContactData();
      } else {
        toast.error("Falha ao adicionar contato.");
      }
    }
    setIsFormOpen(false);
    setEditingContact(null);
  };

  const handleEditContact = (contact: Contact) => {
    setEditingContact(contact);
    setIsFormOpen(true);
  };

  const handleDeleteContact = async (id: string) => {
    const success = await deleteContact(id);
    if (success) {
      toast.success("Contato excluído com sucesso!");
      fetchContactData();
    } else {
      toast.error("Falha ao excluir contato.");
    }
  };

  if (!contactList) {
    return <div className="min-h-screen flex items-center justify-center">Carregando contatos...</div>;
  }

  return (
    <RequireSubscription>
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/contacts")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-3xl font-bold">Contatos da Lista: {contactList.name}</h1>
        </div>
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { setEditingContact(null); setIsFormOpen(true); }}>
              <PlusCircle className="mr-2 h-4 w-4" /> Adicionar Contato
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>{editingContact ? "Editar Contato" : "Adicionar Novo Contato"}</DialogTitle>
            </DialogHeader>
            <ContactDetailsForm initialData={editingContact} onSave={handleSaveContact} />
          </DialogContent>
        </Dialog>
      </div>
      <ContactDetailsTable
        contacts={contacts}
        onEdit={handleEditContact}
        onDelete={handleDeleteContact}
      />
    </div>
    </RequireSubscription>
  );
};

export default ContactDetails;