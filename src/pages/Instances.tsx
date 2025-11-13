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

const Instances = () => {
  const [instances, setInstances] = React.useState<Instance[]>([]);
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [editingInstance, setEditingInstance] = React.useState<Instance | null>(null);
  const { user } = useSession();

  React.useEffect(() => {
    const fetchInstances = async () => {
      const fetchedInstances = await getInstances();
      setInstances(fetchedInstances);
    };
    fetchInstances();
  }, []);

  const handleSave = async (newInstanceData: Omit<Instance, 'id' | 'user_id'>) => {
    if (!user) {
      toast.error("Você precisa estar logado para salvar instâncias.");
      return;
    }

    // Se estamos editando, usar o ID existente
    const instanceToSave = editingInstance 
      ? { ...newInstanceData, id: editingInstance.id }
      : newInstanceData;

    const savedInstance = await saveInstance(user.id, instanceToSave);
    if (savedInstance) {
      if (editingInstance) { // Se estava editando, atualizar na lista
        setInstances((prev) =>
          prev.map((inst) => (inst.id === savedInstance.id ? savedInstance : inst))
        );
      } else { // Se era novo, adicionar à lista
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
    const success = await deleteInstance(id);
    if (success) {
      setInstances((prev) => prev.filter((inst) => inst.id !== id));
      toast.success("Instância excluída com sucesso!");
    } else {
      toast.error("Falha ao excluir instância.");
    }
  };

  const handleImportConfig = (config: Omit<Instance, 'id' | 'user_id'>) => {
    // Criar uma nova instância com as configurações importadas
    const newInstance: Omit<Instance, 'id' | 'user_id'> = {
      name: config.name + " (Importado)",
      url: config.url,
      instanceName: config.instanceName,
      apiKey: config.apiKey,
    };
    
    // Abrir o formulário com os dados importados
    setEditingInstance(newInstance as Instance);
    setIsFormOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Gerenciamento de Instâncias</h1>
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
      </div>
      <InstanceTable
        instances={instances}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onImportConfig={handleImportConfig}
      />
    </div>
  );
};

export default Instances;