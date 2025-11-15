import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FlowSidebar } from '@/components/flow/FlowSidebar';
import { FlowCanvas } from '@/components/flow/FlowCanvas';
import { NodeEditor } from '@/components/flow/NodeEditor';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Save, Play, ArrowLeft, Info, ListChecks } from 'lucide-react';
import { FlowNode, FlowEdge } from '@/lib/flow-types';
import { getFlowById, updateFlow } from '@/lib/flow-storage';
import { useSession } from '@/components/auth/SessionContextProvider';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Alert, AlertDescription } from '@/components/ui/alert';

const FlowBuilder: React.FC = () => {
  const { flowId } = useParams<{ flowId: string }>();
  const navigate = useNavigate();
  const { user } = useSession();
  const [flowName, setFlowName] = useState('Novo Fluxo');
  const [nodes, setNodes] = useState<FlowNode[]>([]);
  const [edges, setEdges] = useState<FlowEdge[]>([]);
  const [selectedNode, setSelectedNode] = useState<FlowNode | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (flowId) {
      loadFlow();
    }
  }, [flowId]);

  const loadFlow = async () => {
    if (!flowId) return;
    const flow = await getFlowById(flowId);
    if (flow) {
      setFlowName(flow.name);
      setNodes(flow.nodes);
      setEdges(flow.edges);
    }
  };

  const handleSave = async () => {
    if (!flowId) return;
    setIsSaving(true);
    const success = await updateFlow(flowId, nodes, edges, flowName);
    if (success) {
      toast.success('Fluxo salvo com sucesso!');
    } else {
      toast.error('Erro ao salvar fluxo');
    }
    setIsSaving(false);
  };

  const handleUpdateNode = useCallback((nodeId: string, newData: any) => {
    setNodes((nds) => nds.map((node) => (node.id === nodeId ? { ...node, data: newData } : node)));
    setSelectedNode((sel) => (sel && sel.id === nodeId ? { ...sel, data: newData } : sel));
  }, []);

  const handleDeleteNode = useCallback((nodeId: string) => {
    setNodes((nds) => nds.filter((node) => node.id !== nodeId));
    setEdges((eds) => eds.filter((edge) => edge.source !== nodeId && edge.target !== nodeId));
    setSelectedNode(null);
    toast.success('Bloco excluído com sucesso!');
  }, []);

  const handleExecuteTest = async () => {
    if (!flowId || !user) return;

    // Validar se o flow tem um node start
    const hasStart = nodes.some(n => n.type === 'start');
    if (!hasStart) {
      toast.error('O fluxo precisa ter um bloco de Início!');
      return;
    }

    // Garantir que o backend tenha os nodes/edges atualizados
    const saved = await updateFlow(flowId, nodes, edges, flowName);
    if (!saved) {
      toast.error('Erro ao salvar fluxo antes de executar.');
      return;
    }

    const testContext = {
      name: 'João Silva',
      phone: '5511987654321',
      email: 'joao@exemplo.com',
    };

    const loadingToast = toast.loading('Iniciando execução de teste...');

    try {
      const { data, error } = await supabase.functions.invoke('execute-flow', {
        body: {
          flowId,
          userId: user.id,
          context: testContext,
        },
      });

      if (error) {
        toast.error('Erro ao executar fluxo', { 
          description: error.message,
          id: loadingToast 
        });
      } else {
        toast.success('Fluxo iniciado com sucesso!', { 
          description: `Execution ID: ${data.executionId}`,
          id: loadingToast 
        });
      }
    } catch (err: any) {
      toast.error('Erro inesperado', { 
        description: err.message,
        id: loadingToast 
      });
    }
  };

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/flows')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <Input
            value={flowName}
            onChange={(e) => setFlowName(e.target.value)}
            className="font-semibold text-lg border-none shadow-none focus-visible:ring-0 max-w-md"
          />
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={() => navigate(`/flows/${flowId}/executions`)} 
            variant="outline"
            disabled={!flowId}
          >
            <ListChecks className="mr-2 h-4 w-4" />
            Ver Execuções
          </Button>
          <Button onClick={handleSave} disabled={isSaving} variant="outline">
            <Save className="mr-2 h-4 w-4" />
            {isSaving ? 'Salvando...' : 'Salvar'}
          </Button>
          <Button onClick={handleExecuteTest} variant="default">
            <Play className="mr-2 h-4 w-4" />
            Executar Teste
          </Button>
        </div>
      </div>

      {/* Info Alert */}
      <div className="px-4 py-2 bg-blue-50">
        <Alert className="border-blue-200 bg-blue-50">
          <Info className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-sm text-blue-800">
            <strong>Dica:</strong> Arraste blocos da barra lateral, conecte-os e configure clicando neles. 
            Use o botão "Excluir Bloco" no painel lateral para remover blocos.
          </AlertDescription>
        </Alert>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        <FlowSidebar />
        <FlowCanvas
          nodes={nodes}
          edges={edges}
          onNodesChange={setNodes}
          onEdgesChange={setEdges}
          onNodeSelect={setSelectedNode}
        />
        <NodeEditor 
          selectedNode={selectedNode} 
          onUpdateNode={handleUpdateNode}
          onDeleteNode={handleDeleteNode}
        />
      </div>
    </div>
  );
};

export default FlowBuilder;