import React, { useCallback, useRef, useState } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  addEdge,
  applyNodeChanges,
  applyEdgeChanges,
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
import { CreateCampaignNode } from './nodes/CreateCampaignNode';
import { FlowNode, FlowEdge } from '@/lib/flow-types';

const nodeTypes = {
  start: StartNode,
  send_message: SendMessageNode,
  send_media: SendMediaNode,
  wait: WaitNode,
  condition: ConditionNode,
  webhook: WebhookNode,
  create_campaign: CreateCampaignNode,
  end: EndNode,
};

interface FlowCanvasProps {
  nodes: FlowNode[];
  edges: FlowEdge[];
  onNodesChange: (nodes: FlowNode[]) => void;
  onEdgesChange: (edges: FlowEdge[]) => void;
  onNodeSelect: (node: FlowNode | null) => void;
}

export const FlowCanvas: React.FC<FlowCanvasProps> = ({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onNodeSelect,
}) => {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);

  const onConnect = useCallback(
    (params: Connection) => {
      const newEdges = addEdge(params, edges as Edge[]);
      onEdgesChange(newEdges as FlowEdge[]);
    },
    [edges, onEdgesChange]
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

      const updatedNodes = [...nodes, newNode];
      onNodesChange(updatedNodes);
    },
    [reactFlowInstance, nodes, onNodesChange]
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

  const onNodesDelete = useCallback(
    (deleted: Node[]) => {
      const deletedIds = deleted.map(n => n.id);
      
      // Remover edges conectadas aos nodes deletados
      const updatedEdges = edges.filter(
        edge => !deletedIds.includes(edge.source) && !deletedIds.includes(edge.target)
      );
      
      onEdgesChange(updatedEdges as FlowEdge[]);
      
      // Se o node selecionado foi deletado, limpar seleção
      if (deleted.some(n => n.id === (onNodeSelect as any).id)) {
        onNodeSelect(null);
      }
    },
    [edges, onEdgesChange, onNodeSelect]
  );

  const handleNodesChange = useCallback(
    (changes: any) => {
      const next = applyNodeChanges(changes, nodes as Node[]);
      onNodesChange(next as FlowNode[]);
    },
    [nodes, onNodesChange]
  );

  const handleEdgesChange = useCallback(
    (changes: any) => {
      const next = applyEdgeChanges(changes, edges as Edge[]);
      onEdgesChange(next as FlowEdge[]);
    },
    [edges, onEdgesChange]
  );

  return (
    <div ref={reactFlowWrapper} className="flex-1 h-full">
      <ReactFlow
        nodes={nodes as Node[]}
        edges={edges as Edge[]}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        onConnect={onConnect}
        onInit={setReactFlowInstance}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        onNodesDelete={onNodesDelete}
        nodeTypes={nodeTypes}
        fitView
      >
        <Background />
        <Controls />
        <MiniMap />
      </ReactFlow>
    </div>
  );
};