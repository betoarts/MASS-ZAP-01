import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import { FlowNode } from '@/lib/flow-types';
import { Instance, getInstances } from '@/lib/storage';
import { ContactList, getContactLists } from '@/lib/contact-storage';
import { useSession } from '@/components/auth/SessionContextProvider';

interface NodeEditorProps {
  selectedNode: FlowNode | null;
  onUpdateNode: (nodeId: string, data: any) => void;
  onDeleteNode: (nodeId: string) => void;
}

export const NodeEditor: React.FC<NodeEditorProps> = ({ selectedNode, onUpdateNode, onDeleteNode }) => {
  const { user } = useSession();
  const [instances, setInstances] = React.useState<Instance[]>([]);
  const [contactLists, setContactLists] = React.useState<ContactList[]>([]);
  

  React.useEffect(() => {
    if (user) {
      getInstances(user.id).then(setInstances);
      getContactLists().then(setContactLists);
    }
  }, [user]);

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

  const handleDelete = () => {
    if (confirm('Tem certeza que deseja excluir este bloco?')) {
      onDeleteNode(selectedNode.id);
    }
  };

  // Função auxiliar para mapear valor do Select para o estado do nó
  const handleSelectChange = (field: string, value: string) => {
    // Se o valor for 'none' (nosso placeholder para vazio), definimos como undefined
    const finalValue = value === 'none' ? undefined : value;
    handleChange(field, finalValue);
  };

  // Função auxiliar para obter o valor do Select, usando 'none' se for undefined/null
  const getSelectValue = (value: string | undefined | null) => {
    return value || 'none';
  };

  const renderContactListSelect = (field: string) => (
    <div>
      <Label>Usar Lista de Contatos (Opcional)</Label>
      <select
        className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 mt-1"
        value={selectedNode.data[field] ?? ''}
        onChange={(e) => handleSelectChange(field, e.target.value || 'none')}
      >
        <option value="">Nenhuma (usar contexto)</option>
        {contactLists.map((list) => (
          <option key={list.id} value={list.id}>
            {list.name} ({list.contacts.length} contatos)
          </option>
        ))}
      </select>
      <p className="text-xs text-gray-500 mt-1">
        Se selecionado, enviará para todos os contatos da lista
      </p>
    </div>
  );

  const renderInstanceSelect = (field: string) => (
    <div>
      <Label>Instância WhatsApp</Label>
      <select
        className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 mt-1"
        value={selectedNode.data[field] ?? ''}
        onChange={(e) => handleSelectChange(field, e.target.value || 'none')}
      >
        <option value="">Nenhuma</option>
        {instances.length === 0 ? (
          <option value="no-instance" disabled>
            Nenhuma instância disponível
          </option>
        ) : (
          instances.map((instance) => (
            <option key={instance.id} value={instance.id!}>
              {instance.name} ({instance.instanceName})
            </option>
          ))
        )}
      </select>
      <p className="text-xs text-gray-500 mt-1">
        Instância que enviará a mensagem
      </p>
    </div>
  );

  return (
    <div className="w-80 bg-white border-l border-gray-200 p-4 overflow-y-auto">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-lg">Editar Bloco</CardTitle>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleDelete}
            className="text-red-500 hover:text-red-700 hover:bg-red-50"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* SEND MESSAGE NODE */}
          {selectedNode.type === 'send_message' && (
            <>
              {renderInstanceSelect('instanceId')}

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
                  Use {'{{name}}'}, {'{{phone}}'}, {'{{email}}'} para personalizar
                </p>
              </div>

              {renderContactListSelect('contactListId')}
            </>
          )}

          {/* SEND MEDIA NODE */}
          {selectedNode.type === 'send_media' && (
            <>
              {renderInstanceSelect('instanceId')}

              <div>
                <Label>URL da Mídia</Label>
                <Input
                  value={selectedNode.data.mediaUrl || ''}
                  onChange={(e) => handleChange('mediaUrl', e.target.value)}
                  placeholder="https://exemplo.com/imagem.jpg"
                  className="mt-1"
                />
                <p className="text-xs text-gray-500 mt-1">
                  URL completa da imagem, vídeo ou documento.
                </p>
              </div>

              <div>
                <Label>Legenda (Opcional)</Label>
                <Textarea
                  value={selectedNode.data.mediaCaption || ''}
                  onChange={(e) => handleChange('mediaCaption', e.target.value)}
                  placeholder="Confira este anexo, {{primeiro_nome}}!"
                  rows={2}
                  className="mt-1"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Suporta variáveis de personalização.
                </p>
              </div>

              {renderContactListSelect('contactListId')}
            </>
          )}

          {/* WAIT NODE */}
          {selectedNode.type === 'wait' && (
            <>
              <div>
                <Label>Tempo de Espera</Label>
                <Slider
                  value={[selectedNode.data.delay || 30]}
                  min={1}
                  max={selectedNode.data.delayUnit === 'hours' ? 24 : selectedNode.data.delayUnit === 'minutes' ? 120 : 3600}
                  step={1}
                  onValueChange={(val) => handleChange('delay', val[0])}
                  className="mt-2"
                />
                <Input
                  type="number"
                  value={selectedNode.data.delay || 30}
                  onChange={(e) => handleChange('delay', parseInt(e.target.value))}
                  className="mt-2"
                  min={1}
                />
              </div>
              <div>
                <Label>Unidade</Label>
                <select
                  className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 mt-1"
                  value={selectedNode.data.delayUnit || 'seconds'}
                  onChange={(e) => handleChange('delayUnit', e.target.value)}
                >
                  <option value="seconds">Segundos</option>
                  <option value="minutes">Minutos</option>
                  <option value="hours">Horas</option>
                </select>
              </div>
            </>
          )}

          {/* CONDITION NODE */}
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
                  Ex: context.name == "João" ou context.age {'>'} 18
                </p>
              </div>
              <div className="bg-blue-50 p-3 rounded-md">
                <p className="text-xs font-medium mb-2">Variáveis disponíveis:</p>
                <ul className="text-xs space-y-1 text-gray-600">
                  <li>• context.name - Nome do contato</li>
                  <li>• context.phone - Telefone</li>
                  <li>• context.email - Email</li>
                  <li>• context.* - Qualquer campo customizado</li>
                </ul>
              </div>
            </>
          )}

          {/* WEBHOOK NODE */}
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
              <div>
                <Label>Body (JSON)</Label>
                <Textarea
                  value={selectedNode.data.body || ''}
                  onChange={(e) => handleChange('body', e.target.value)}
                  placeholder='{"key": "{{name}}"}'
                  rows={3}
                  className="mt-1 font-mono text-sm"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Suporta variáveis do contexto
                </p>
              </div>
            </>
          )}

          {/* START NODE */}
          {selectedNode.type === 'start' && (
            <div className="bg-green-50 p-3 rounded-md">
              <p className="text-sm font-medium text-green-800 mb-2">Bloco de Início</p>
              <p className="text-xs text-gray-600">
                Este é o ponto de partida do fluxo. Conecte-o aos próximos blocos para definir o caminho da automação.
              </p>
            </div>
          )}

          {/* END NODE */}
          {selectedNode.type === 'end' && (
            <div className="bg-red-50 p-3 rounded-md">
              <p className="text-sm font-medium text-red-800 mb-2">Bloco de Fim</p>
              <p className="text-xs text-gray-600">
                Este bloco marca o final do fluxo. A execução será concluída quando chegar aqui.
              </p>
            </div>
          )}

          <div className="pt-4 border-t">
            <Button
              variant="destructive"
              className="w-full"
              onClick={handleDelete}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Excluir Bloco
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
