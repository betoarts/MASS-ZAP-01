import React from 'react';
import { Play, MessageCircle, Clock, GitBranch, Webhook, Square, Image, Send } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

const nodeTypes = [
  { type: 'start', label: 'Início', icon: Play, color: 'bg-green-100 border-green-400 text-green-700' },
  { type: 'send_message', label: 'Enviar Texto', icon: MessageCircle, color: 'bg-blue-100 border-blue-400 text-blue-700' },
  { type: 'send_media', label: 'Enviar Mídia', icon: Image, color: 'bg-pink-100 border-pink-400 text-pink-700' },
  { type: 'wait', label: 'Aguardar', icon: Clock, color: 'bg-yellow-100 border-yellow-400 text-yellow-700' },
  { type: 'condition', label: 'Condição', icon: GitBranch, color: 'bg-purple-100 border-purple-400 text-purple-700' },
  { type: 'webhook', label: 'Webhook', icon: Webhook, color: 'bg-orange-100 border-orange-400 text-orange-700' },
  { type: 'create_campaign', label: 'Criar Campanha', icon: Send, color: 'bg-teal-100 border-teal-400 text-teal-700' },
  { type: 'end', label: 'Fim', icon: Square, color: 'bg-red-100 border-red-400 text-red-700' },
];

export const FlowSidebar: React.FC = () => {
  const onDragStart = (event: React.DragEvent, nodeType: string) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div className="w-64 bg-white border-r border-gray-200 p-4 space-y-2">
      <h3 className="font-bold text-lg mb-4">Blocos Disponíveis</h3>
      {nodeTypes.map((node) => {
        const Icon = node.icon;
        return (
          <Card
            key={node.type}
            className={`cursor-move ${node.color} border-2`}
            draggable
            onDragStart={(e) => onDragStart(e, node.type)}
          >
            <CardContent className="p-3 flex items-center gap-2">
              <Icon className="h-5 w-5" />
              <span className="font-medium">{node.label}</span>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};