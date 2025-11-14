import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FlowNode } from '@/lib/flow-types';

interface NodeEditorProps {
  selectedNode: FlowNode | null;
  onUpdateNode: (nodeId: string, data: any) => void;
}

export const NodeEditor: React.FC<NodeEditorProps> = ({ selectedNode, onUpdateNode }) => {
  if (!selectedNode) {
    return (
      <div className="w-80 bg-white border-l border-gray-200 p-4">
        <p className="text-gray-500 text-center mt-8">Selecione um bloco para editar</p>
      </div>
    );
  }

  const handleChange = (field: string, value: any) => {
    onUpdateNode(selectedNode.id, { ...selectedNode.data, [field]: value });
  };

  return (
    <div className="w-80 bg-white border-l border-gray-200 p-4 overflow-y-auto">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Editar Bloco</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {selectedNode.type === 'send_message' && (
            <>
              <div>
                <Label>Mensagem</Label>
                <Textarea
                  value={selectedNode.data.message || ''}
                  onChange={(e) => handleChange('message', e.target.value)}
                  placeholder="Olá {{name}}, tudo bem?"
                  rows={4}
                  className="mt-1"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Use {'{{name}}'}, {'{{phone}}'} para personalizar
                </p>
              </div>
            </>
          )}

          {selectedNode.type === 'wait' && (
            <>
              <div>
                <Label>Tempo de Espera</Label>
                <Input
                  type="number"
                  value={selectedNode.data.delay || 30}
                  onChange={(e) => handleChange('delay', parseInt(e.target.value))}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Unidade</Label>
                <Select
                  value={selectedNode.data.delayUnit || 'seconds'}
                  onValueChange={(value) => handleChange('delayUnit', value)}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="seconds">Segundos</SelectItem>
                    <SelectItem value="minutes">Minutos</SelectItem>
                    <SelectItem value="hours">Horas</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          {selectedNode.type === 'condition' && (
            <>
              <div>
                <Label>Expressão</Label>
                <Input
                  value={selectedNode.data.expression || ''}
                  onChange={(e) => handleChange('expression', e.target.value)}
                  placeholder="context.age > 18"
                  className="mt-1"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Ex: context.name == "João"
                </p>
              </div>
            </>
          )}

          {selectedNode.type === 'webhook' && (
            <>
              <div>
                <Label>URL</Label>
                <Input
                  value={selectedNode.data.url || ''}
                  onChange={(e) => handleChange('url', e.target.value)}
                  placeholder="https://api.exemplo.com/webhook"
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Método</Label>
                <Select
                  value={selectedNode.data.method || 'POST'}
                  onValueChange={(value) => handleChange('method', value)}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="GET">GET</SelectItem>
                    <SelectItem value="POST">POST</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};