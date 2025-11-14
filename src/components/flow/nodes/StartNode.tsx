import React from 'react';
import { Handle, Position } from 'reactflow';
import { Play } from 'lucide-react';

export const StartNode: React.FC<any> = ({ data }) => {
  return (
    <div className="px-4 py-2 shadow-md rounded-md bg-green-100 border-2 border-green-400 min-w-[150px]">
      <div className="flex items-center gap-2">
        <Play className="h-4 w-4 text-green-700" />
        <div className="font-bold text-green-700">Início</div>
      </div>
      <Handle type="source" position={Position.Bottom} className="w-3 h-3" />
    </div>
  );
};