import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PlusCircle, Edit, Trash2 } from 'lucide-react';
import { Flow } from '@/lib/flow-types';
import { getFlows, createFlow, deleteFlow } from '@/lib/flow-storage';
import { useSession } from '@/components/auth/SessionContextProvider';
import { toast } from 'sonner';
import PageHeader from '@/components/layout/PageHeader';
import { RequireSubscription } from '@/components/auth/RequireSubscription';

const FlowList: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useSession();
  const [flows, setFlows] = useState<Flow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadFlows();
    }
  }, [user]);

  const loadFlows = async () => {
    if (!user) return;
    setIsLoading(true);
    const data = await getFlows(user.id);
    setFlows(data);
    setIsLoading(false);
  };

  const handleCreateFlow = async () => {
    if (!user) return;
    const newFlow = await createFlow(user.id, 'Novo Fluxo');
    if (newFlow) {
      navigate(`/flows/${newFlow.id}`);
    } else {
      toast.error('Erro ao criar fluxo');
    }
  };

  const handleDeleteFlow = async (flowId: string) => {
    const success = await deleteFlow(flowId);
    if (success) {
      toast.success('Fluxo excluído');
      loadFlows();
    } else {
      toast.error('Erro ao excluir fluxo');
    }
  };

  return (
    <RequireSubscription>
    <div className="space-y-6">
      <PageHeader
        title="Meus Fluxos"
        subtitle="Crie e gerencie seus fluxos de automação"
        actions={
          <Button onClick={handleCreateFlow}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Novo Fluxo
          </Button>
        }
      />

      {isLoading ? (
        <p>Carregando...</p>
      ) : flows.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-gray-500 mb-4">Você ainda não tem fluxos criados</p>
            <Button onClick={handleCreateFlow}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Criar Primeiro Fluxo
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {flows.map((flow) => (
            <Card key={flow.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle>{flow.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-500 mb-4">
                  {flow.nodes.length} blocos • {flow.edges.length} conexões
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/flows/${flow.id}`)}
                  >
                    <Edit className="mr-2 h-4 w-4" />
                    Editar
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDeleteFlow(flow.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
    </RequireSubscription>
  );
};

export default FlowList;