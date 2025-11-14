import React from 'react';
import { Handle, Position } from 'reactflow';
import { Clock } from 'lucide-react';

export const WaitNode: React.FC<any> = ({ data }) => {
  const getDelayText = () => {
    if (!data.delay) return 'Configure o tempo';
    const unit = data.delayUnit === 'seconds' ? 's' : data.delayUnit === 'minutes' ? 'min' : 'h';
    return `${data.delay}${unit}`;
  };

  return (
    <div className="px-4 py-2 shadow-md rounded-md bg-yellow-100 border-2 border-yellow-400 min-w-[150px]">
      <Handle type="target" position={Position.Top} className="w-3 h-3" />
      <div className="flex items-center gap-2 mb-2">
        <Clock className="h-4 w-4 text-yellow-700" />
        <div className="font-bold text-yellow-700">Aguardar</div>
      </div>
      <div className="text-xs text-gray-600">{getDelayText()}</div>
      <Handle type="source" position={Position.Bottom} className="w-3 h-3" />
    </div>
  );
};