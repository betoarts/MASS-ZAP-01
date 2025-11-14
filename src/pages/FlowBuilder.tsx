import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FlowSidebar } from '@/components/flow/FlowSidebar';
import { FlowCanvas } from '@/components/flow/FlowCanvas';
import { NodeEditor } from '@/components/flow/NodeEditor';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Save, Play, ArrowLeft } from 'lucide-react';
import { FlowNode, FlowEdge } from '@/lib/flow-types';
import { getFlowById, updateFlow } from '@/lib/flow-storage';
import { useSession } from '@/components/auth/SessionContextProvider';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

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
    const success = await updateFlow(flowId, nodes, edges);
    if (success) {
      toast.success('Fluxo salvo com sucesso!');
    } else {
      toast.error('Erro ao salvar fluxo');
    }
    setIsSaving(false);
  };

  const handleUpdateNode = useCallback((nodeId: string, newData: any) => {
    setNodes((nds) =>
      nds.map((node) =>
        node.id === nodeId ? { ...node, data: newData } : node
      )
    );
  }, []);

  const handleExecuteTest = async () => {
    if (!flowId || !user) return;

    const testContext = {
      name: 'João',
      phone: '5511987654321',
    };

    toast.loading('Iniciando execução de teste...');

    try {
      const { data, error } = await supabase.functions.invoke('execute-flow', {
        body: {
          flowId,
          userId: user.id,
          context: testContext,
        },
      });

      if (error) {
        toast.error('Erro ao executar fluxo: ' + error.message);
      } else {
        toast.success('Fluxo iniciado! Execution ID: ' + data.executionId);
      }
    } catch (err: any) {
      toast.error('Erro: ' + err.message);
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
            className="font-semibold text-lg border-none shadow-none focus-visible:ring-0"
          />
        </div>
        <div className="flex gap-2">
          <Button onClick={handleSave} disabled={isSaving}>
            <Save className="mr-2 h-4 w-4" />
            {isSaving ? 'Salvando...' : 'Salvar'}
          </Button>
          <Button onClick={handleExecuteTest} variant="default">
            <Play className="mr-2 h-4 w-4" />
            Executar Teste
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        <FlowSidebar />
        <FlowCanvas
          initialNodes={nodes}
          initialEdges={edges}
          onNodesChange={setNodes}
          onEdgesChange={setEdges}
          onNodeSelect={setSelectedNode}
        />
        <NodeEditor selectedNode={selectedNode} onUpdateNode={handleUpdateNode} />
      </div>
    </div>
  );
};

export default FlowBuilder;