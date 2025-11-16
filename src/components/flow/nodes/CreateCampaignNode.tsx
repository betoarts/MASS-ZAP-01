import React from 'react';
import { Handle, Position } from 'reactflow';
import { Send } from 'lucide-react';

export const CreateCampaignNode: React.FC<any> = ({ data }) => {
  return (
    <div className="px-4 py-2 shadow-md rounded-md bg-teal-100 border-2 border-teal-400 min-w-[220px]">
      <Handle type="target" position={Position.Top} className="w-3 h-3" />
      <div className="flex items-center gap-2 mb-2">
        <Send className="h-4 w-4 text-teal-700" />
        <div className="font-bold text-teal-700">Criar Campanha</div>
      </div>
      <div className="text-xs text-gray-700 truncate max-w-[200px]">
        {data.campaignName || 'Defina nome da campanha'}
      </div>
      <div className="text-[10px] text-teal-700 mt-1">
        {data.scheduledAt ? 'Agendada' : 'Envio imediato'}
      </div>
      <Handle type="source" position={Position.Bottom} className="w-3 h-3" />
    </div>
  );
};