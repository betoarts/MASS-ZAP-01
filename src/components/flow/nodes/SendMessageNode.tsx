import React from 'react';
import { Handle, Position } from 'reactflow';
import { MessageCircle } from 'lucide-react';

export const SendMessageNode: React.FC<any> = ({ data }) => {
  return (
    <div className="px-4 py-2 shadow-md rounded-md bg-blue-100 border-2 border-blue-400 min-w-[200px]">
      <Handle type="target" position={Position.Top} className="w-3 h-3" />
      <div className="flex items-center gap-2 mb-2">
        <MessageCircle className="h-4 w-4 text-blue-700" />
        <div className="font-bold text-blue-700">Enviar Mensagem</div>
      </div>
      <div className="text-xs text-gray-600 truncate max-w-[180px]">
        {data.message || 'Configure a mensagem'}
      </div>
      <Handle type="source" position={Position.Bottom} className="w-3 h-3" />
    </div>
  );
};