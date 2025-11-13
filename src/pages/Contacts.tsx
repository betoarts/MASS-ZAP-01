"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ContactList, getContactLists, addContactList, updateContactList, deleteContactList } from "@/lib/contact-storage";
import { ContactListTable } from "@/components/contacts/ContactListTable";
import { ContactListForm } from "@/components/contacts/ContactListForm";
import { ContactImportDialog } from "@/components/contacts/ContactImportDialog";
import { useSession } from "@/components/auth/SessionContextProvider";
import { toast } from "sonner";
import PageHeader from "@/components/layout/PageHeader";

const Contacts = () => {
  const [contactLists, setContactLists] = React.useState<ContactList[]>([]);
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = React.useState(false);
  const [editingList, setEditingList] = React.useState<ContactList | null>(null);
  const [selectedListForImport, setSelectedListForImport] = React.useState<ContactList | null>(null);
  const { user } = useSession();

  React.useEffect(() => {
    const fetchLists = async () => {
      const lists = await getContactLists();
      setContactLists(lists);
    };
    fetchLists();
  }, []);

  const handleSaveList = async (listName: string) => {
    if (!user) {
      toast.error("Você precisa estar logado para criar/atualizar listas de contatos.");
      return;
    }

    if (editingList) {
      const updatedList = await updateContactList(user.id, { ...editingList, name: listName });
      if (updatedList) {
        setContactLists((prev) =>
          prev.map((list) => (list.id === updatedList.id ? updatedList : list))
        );
      }
    } else {
      const newList = await addContactList(user.id, { name: listName });
      if (newList) {
        setContactLists((prev) => [...prev, newList]);
      }
    }
    setIsFormOpen(false);
    setEditingList(null);
  };

  const handleEditList = (list: ContactList) => {
    setEditingList(list);
    setIsFormOpen(true);
  };

  const handleDeleteList = async (id: string) => {
    const success = await deleteContactList(id);
    if (success) {
      setContactLists((prev) => prev.filter((list) => list.id !== id));
    }
  };

  const handleOpenImportDialog = (list: ContactList) => {
    setSelectedListForImport(list);
    setIsImportDialogOpen(true);
  };

  const handleImportSuccess = async () => {
    const lists = await getContactLists();
    setContactLists(lists);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Gerenciamento de Contatos"
        actions={
          <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => { setEditingList(null); setIsFormOpen(true); }}>
                <PlusCircle className="mr-2 h-4 w-4" /> Adicionar Lista de Contatos
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>{editingList ? "Editar Lista de Contatos" : "Adicionar Nova Lista de Contatos"}</DialogTitle>
              </DialogHeader>
              <ContactListForm initialData={editingList} onSave={handleSaveList} />
            </DialogContent>
          </Dialog>
        }
      />
      <ContactListTable
        contactLists={contactLists}
        onEdit={handleEditList}
        onDelete={handleDeleteList}
        onImportContacts={handleOpenImportDialog}
      />

      {selectedListForImport && (
        <ContactImportDialog
          isOpen={isImportDialogOpen}
          onOpenChange={setIsImportDialogOpen}
          contactList={selectedListForImport}
          onImportSuccess={handleImportSuccess}
        />
      )}
    </div>
  );
};

export default Contacts;