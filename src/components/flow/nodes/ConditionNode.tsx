import React from 'react';
import { Handle, Position } from 'reactflow';
import { GitBranch } from 'lucide-react';

export const ConditionNode: React.FC<any> = ({ data }) => {
  return (
    <div className="px-4 py-2 shadow-md rounded-md bg-purple-100 border-2 border-purple-400 min-w-[180px]">
      <Handle type="target" position={Position.Top} className="w-3 h-3" />
      <div className="flex items-center gap-2 mb-2">
        <GitBranch className="h-4 w-4 text-purple-700" />
        <div className="font-bold text-purple-700">Condição</div>
      </div>
      <div className="text-xs text-gray-600 truncate max-w-[160px]">
        {data.expression || 'Configure a condição'}
      </div>
      <div className="flex justify-between mt-2">
        <Handle
          type="source"
          position={Position.Bottom}
          id="true"
          className="w-3 h-3"
          style={{ left: '30%' }}
        />
        <Handle
          type="source"
          position={Position.Bottom}
          id="false"
          className="w-3 h-3"
          style={{ left: '70%' }}
        />
      </div>
      <div className="flex justify-between text-[10px] text-gray-500 mt-1">
        <span>Sim</span>
        <span>Não</span>
      </div>
    </div>
  );
};