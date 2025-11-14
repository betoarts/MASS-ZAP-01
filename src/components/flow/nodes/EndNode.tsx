import React from 'react';
import { Handle, Position } from 'reactflow';
import { Square } from 'lucide-react';

export const EndNode: React.FC<any> = ({ data }) => {
  return (
    <div className="px-4 py-2 shadow-md rounded-md bg-red-100 border-2 border-red-400 min-w-[150px]">
      <Handle type="target" position={Position.Top} className="w-3 h-3" />
      <div className="flex items-center gap-2">
        <Square className="h-4 w-4 text-red-700" />
        <div className="font-bold text-red-700">Fim</div>
      </div>
    </div>
  );
};