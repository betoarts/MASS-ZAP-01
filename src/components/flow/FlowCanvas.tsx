import React, { useCallback, useRef, useState } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  addEdge,
  applyNodeChanges,
  applyEdgeChanges,
  useNodesState,
  useEdgesState,
  Connection,
  Node,
  Edge,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { StartNode } from './nodes/StartNode';
import { SendMessageNode } from './nodes/SendMessageNode';
import { SendMediaNode } from './nodes/SendMediaNode';
import { WaitNode } from './nodes/WaitNode';
import { ConditionNode } from './nodes/ConditionNode';
import { WebhookNode } from './nodes/WebhookNode';
import { EndNode } from './nodes/EndNode';
import { FlowNode, FlowEdge } from '@/lib/flow-types';

const nodeTypes = {
  start: StartNode,
  send_message: SendMessageNode,
  send_media: SendMediaNode,
  wait: WaitNode,
  condition: ConditionNode,
  webhook: WebhookNode,
  end: EndNode,
};

interface FlowCanvasProps {
  initialNodes: FlowNode[];
  initialEdges: FlowEdge[];
  onNodesChange: (nodes: FlowNode[]) => void;
  onEdgesChange: (edges: FlowEdge[]) => void;
  onNodeSelect: (node: FlowNode | null) => void;
}

export const FlowCanvas: React.FC<FlowCanvasProps> = ({
  initialNodes,
  initialEdges,
  onNodesChange,
  onEdgesChange,
  onNodeSelect,
}) => {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [nodes, setNodes, onNodesChangeInternal] = useNodesState(initialNodes as Node[]);
  const [edges, setEdges, onEdgesChangeInternal] = useEdgesState(initialEdges as Edge[]);
  const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);
  const [isDragging, setIsDragging] = useState(false);

  const onConnect = useCallback(
    (params: Connection) => {
      const newEdges = addEdge(params, edges);
      setEdges(newEdges);
      onEdgesChange(newEdges as FlowEdge[]);
    },
    [edges, setEdges, onEdgesChange]
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const type = event.dataTransfer.getData('application/reactflow');
      if (!type || !reactFlowInstance) return;

      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const newNode: FlowNode = {
        id: `${type}_${Date.now()}`,
        type: type as any,
        position,
        data: { label: type },
      };

      const updatedNodes = [...nodes, newNode as Node];
      setNodes(updatedNodes);
      onNodesChange(updatedNodes as FlowNode[]);
    },
    [reactFlowInstance, nodes, setNodes, onNodesChange]
  );

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      onNodeSelect(node as FlowNode);
    },
    [onNodeSelect]
  );

  const onPaneClick = useCallback(() => {
    onNodeSelect(null);
  }, [onNodeSelect]);

  // A função onNodesDelete é mantida, mas só será chamada se for explicitamente acionada (o que não acontece por padrão sem deleteKeyCode)
  const onNodesDelete = useCallback(
    (deleted: Node[]) => {
      const deletedIds = deleted.map(n => n.id);
      
      // Remover edges conectadas aos nodes deletados
      const updatedEdges = edges.filter(
        edge => !deletedIds.includes(edge.source) && !deletedIds.includes(edge.target)
      );
      
      setEdges(updatedEdges);
      onEdgesChange(updatedEdges as FlowEdge[]);
      
      // Se o node selecionado foi deletado, limpar seleção
      if (deleted.some(n => n.id === (onNodeSelect as any).id)) {
        onNodeSelect(null);
      }
    },
    [edges, setEdges, onEdgesChange, onNodeSelect]
  );

  // Removido: Listener para teclas Delete/Backspace

  const handleNodesChange = useCallback(
    (changes: any) => {
      setNodes((nds) => {
        const next = applyNodeChanges(changes, nds);
        onNodesChange(next as FlowNode[]);
        return next;
      });
    },
    [onNodesChange]
  );

  const handleEdgesChange = useCallback(
    (changes: any) => {
      setEdges((eds) => {
        const next = applyEdgeChanges(changes, eds);
        onEdgesChange(next as FlowEdge[]);
        return next;
      });
    },
    [onEdgesChange]
  );

  React.useEffect(() => {
    if (!isDragging) {
      setNodes(initialNodes as Node[]);
    }
  }, [initialNodes, isDragging]);

  React.useEffect(() => {
    if (!isDragging) {
      setEdges(initialEdges as Edge[]);
    }
  }, [initialEdges, isDragging]);

  return (
    <div ref={reactFlowWrapper} className="flex-1 h-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={handleNodesChange} // Usando handleNodesChange para garantir que o estado externo seja atualizado
        onEdgesChange={handleEdgesChange} // Usando handleEdgesChange para garantir que o estado externo seja atualizado
        onConnect={onConnect}
        onInit={setReactFlowInstance}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        onNodesDelete={onNodesDelete}
        nodeTypes={nodeTypes}
        fitView
        // Removido: deleteKeyCode={['Delete', 'Backspace']}
      >
        <Background />
        <Controls />
        <MiniMap />
      </ReactFlow>
    </div>
  );
};