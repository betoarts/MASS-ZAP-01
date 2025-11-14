import React from 'react';
import { Handle, Position } from 'reactflow';
import { Webhook } from 'lucide-react';

export const WebhookNode: React.FC<any> = ({ data }) => {
  return (
    <div className="px-4 py-2 shadow-md rounded-md bg-orange-100 border-2 border-orange-400 min-w-[180px]">
      <Handle type="target" position={Position.Top} className="w-3 h-3" />
      <div className="flex items-center gap-2 mb-2">
        <Webhook className="h-4 w-4 text-orange-700" />
        <div className="font-bold text-orange-700">Webhook</div>
      </div>
      <div className="text-xs text-gray-600 truncate max-w-[160px]">
        {data.url || 'Configure a URL'}
      </div>
      <Handle type="source" position={Position.Bottom} className="w-3 h-3" />
    </div>
  );
};