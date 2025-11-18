"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { InstanceForm } from "@/components/instances/InstanceForm";
import { InstanceTable } from "@/components/instances/InstanceTable";
import { Dialog, DialogContent, DialogHeader,  DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Instance, getInstances, saveInstance, deleteInstance } from "@/lib/storage";
import { useSession } from "@/components/auth/SessionContextProvider";
import { toast } from "sonner";
import PageHeader from "@/components/layout/PageHeader";
import { RequireSubscription } from "@/components/auth/RequireSubscription";

const Instances = () => {
  const [instances, setInstances] = React.useState<Instance[]>([]);
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [editingInstance, setEditingInstance] = React.useState<Instance | null>(null);
  const { user } = useSession();

  React.useEffect(() => {
    const fetchInstances = async () => {
      if (user) {
        const fetchedInstances = await getInstances(user.id);
        setInstances(fetchedInstances);
      }
    };
    fetchInstances();
  }, [user]);

  const handleSave = async (newInstanceData: Omit<Instance, 'id' | 'user_id'>) => {
    if (!user) {
      toast.error("Você precisa estar logado para salvar instâncias.");
      return;
    }

    const instanceToSave = editingInstance 
      ? { ...newInstanceData, id: editingInstance.id }
      : newInstanceData;

    const savedInstance = await saveInstance(user.id, instanceToSave);
    if (savedInstance) {
      if (editingInstance) {
        setInstances((prev) =>
          prev.map((inst) => (inst.id === savedInstance.id ? savedInstance : inst))
        );
      } else {
        setInstances((prev) => [...prev, savedInstance]);
      }
      toast.success("Instância salva com sucesso!");
    } else {
      toast.error("Falha ao salvar instância.");
    }
    setIsFormOpen(false);
    setEditingInstance(null);
  };

  const handleEdit = (instance: Instance) => {
    setEditingInstance(instance);
    setIsFormOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!user) {
      toast.error("Você precisa estar logado para excluir instâncias.");
      return;
    }

    const success = await deleteInstance(id, user.id);
    if (success) {
      setInstances((prev) => prev.filter((inst) => inst.id !== id));
      toast.success("Instância excluída com sucesso!");
    } else {
      toast.error("Falha ao excluir instância.");
    }
  };

  const handleImportConfig = (config: Omit<Instance, 'id' | 'user_id'>) => {
    const newInstance: Omit<Instance, 'id' | 'user_id'> = {
      name: config.name + " (Importado)",
      url: config.url,
      instanceName: config.instanceName,
      apiKey: config.apiKey,
    };
    setEditingInstance(newInstance as Instance);
    setIsFormOpen(true);
  };

  return (
    <RequireSubscription>
    <div className="space-y-6">
      <PageHeader
        title="Gerenciamento de Instâncias"
        actions={
          <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => { setEditingInstance(null); setIsFormOpen(true); }}>
                <PlusCircle className="mr-2 h-4 w-4" /> Adicionar Instância
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>{editingInstance ? "Editar Instância" : "Adicionar Nova Instância"}</DialogTitle>
              </DialogHeader>
              <InstanceForm initialData={editingInstance} onSave={handleSave} />
            </DialogContent>
          </Dialog>
        }
      />
      <InstanceTable
        instances={instances}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onImportConfig={handleImportConfig}
      />
    </div>
    </RequireSubscription>
  );
};

export default Instances;