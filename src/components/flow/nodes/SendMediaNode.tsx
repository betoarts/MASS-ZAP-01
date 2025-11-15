import React from 'react';
import { Handle, Position } from 'reactflow';
import { Image } from 'lucide-react';

export const SendMediaNode: React.FC<any> = ({ data }) => {
  return (
    <div className="px-4 py-2 shadow-md rounded-md bg-pink-100 border-2 border-pink-400 min-w-[200px]">
      <Handle type="target" position={Position.Top} className="w-3 h-3" />
      <div className="flex items-center gap-2 mb-2">
        <Image className="h-4 w-4 text-pink-700" />
        <div className="font-bold text-pink-700">Enviar Mídia</div>
      </div>
      {data.instanceId && (
        <div className="text-[10px] text-pink-600 mb-1">
          📱 Instância configurada
        </div>
      )}
      <div className="text-xs text-gray-600 truncate max-w-[180px]">
        {data.mediaUrl ? 'Mídia configurada' : 'Configure a mídia'}
      </div>
      {data.contactListId && (
        <div className="text-[10px] text-pink-600 mt-1">
          👥 Lista de contatos selecionada
        </div>
      )}
      <Handle type="source" position={Position.Bottom} className="w-3 h-3" />
    </div>
  );
};