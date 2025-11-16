import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import { FlowNode, NodeData } from '@/lib/flow-types';
import { Instance, getInstances } from '@/lib/storage';
import { ContactList, getContactLists } from '@/lib/contact-storage';
import { Switch } from '@/components/ui/switch';
import { WebhookSource, getWebhookSources } from '@/lib/webhook-storage';
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
  const [webhookSources, setWebhookSources] = React.useState<WebhookSource[]>([]);
  const [campaignDate, setCampaignDate] = React.useState<string>('');
  const [campaignTime, setCampaignTime] = React.useState<string>('');
  

  React.useEffect(() => {
    if (user) {
      getInstances(user.id).then(setInstances);
      getContactLists().then(setContactLists);
      getWebhookSources(user.id).then(setWebhookSources);
    }
  }, [user]);

  React.useEffect(() => {
    if (!selectedNode || selectedNode.type !== 'create_campaign') {
      setCampaignDate('');
      setCampaignTime('');
      return;
    }
    const sa = selectedNode.data.scheduledAt;
    if (!sa) {
      setCampaignDate('');
      setCampaignTime('');
      return;
    }
    const d = new Date(sa);
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = String(d.getFullYear());
    const hh = String(d.getHours()).padStart(2, '0');
    const mi = String(d.getMinutes()).padStart(2, '0');
    setCampaignDate(`${dd}-${mm}-${yyyy}`);
    setCampaignTime(`${hh}:${mi}`);
  }, [selectedNode?.id, selectedNode?.type, selectedNode?.data?.scheduledAt]);

  if (!selectedNode) {
    return (
      <div className="w-80 bg-white border-l border-gray-200 p-4">
        <p className="text-gray-500 text-center mt-8">Selecione um bloco para editar</p>
      </div>
    );
  }

  const handleChange = (field: keyof NodeData, value: any) => {
    onUpdateNode(selectedNode.id, { ...selectedNode.data, [field]: value });
  };

  const handleDelete = () => {
    if (confirm('Tem certeza que deseja excluir este bloco?')) {
      onDeleteNode(selectedNode.id);
    }
  };

  // Função auxiliar para mapear valor do Select para o estado do nó
  const handleSelectChange = (field: keyof NodeData, value: string) => {
    // Se o valor for 'none' (nosso placeholder para vazio), definimos como undefined
    const finalValue = value === 'none' ? undefined : value;
    handleChange(field, finalValue);
  };

  

  const renderContactListSelect = (field: keyof NodeData) => (
    <div>
      <Label>Usar Lista de Contatos (Opcional)</Label>
      <select
        className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 mt-1"
        value={(selectedNode.data[field] as string | undefined) ?? ''}
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

  const renderInstanceSelect = (field: keyof NodeData) => (
    <div>
      <Label>Instância WhatsApp</Label>
      <select
        className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 mt-1"
        value={(selectedNode.data[field] as string | undefined) ?? ''}
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
                <Label>Fonte de Webhook (da aplicação)</Label>
                <select
                  className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 mt-1"
                  value={selectedNode.data.webhookSourceId ?? ''}
                  onChange={(e) => handleChange('webhookSourceId', e.target.value || undefined)}
                >
                  <option value="">Nenhuma</option>
                  {webhookSources.map((s) => (
                    <option key={s.id} value={s.id}>{s.name} ({s.source_type})</option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">Selecione uma fonte criada em Webhooks para integração automática</p>
              </div>
              
              <div>
                <Label>Payload (JSON)</Label>
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

          {/* CREATE CAMPAIGN NODE */}
          {selectedNode.type === 'create_campaign' && (
            <>
              <div>
                <Label>Nome da Campanha</Label>
                <Input
                  value={selectedNode.data.campaignName || ''}
                  onChange={(e) => handleChange('campaignName', e.target.value)}
                  placeholder="Minha Campanha"
                  className="mt-1"
                />
              </div>
              {renderInstanceSelect('instanceId')}
              {renderContactListSelect('contactListId')}
              <div>
                <Label>Mensagem</Label>
                <Textarea
                  value={selectedNode.data.messageText || ''}
                  onChange={(e) => handleChange('messageText', e.target.value)}
                  placeholder="Olá {{primeiro_nome}}..."
                  rows={3}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>URL da Mídia (Opcional)</Label>
                <Input
                  value={selectedNode.data.mediaUrl || ''}
                  onChange={(e) => handleChange('mediaUrl', e.target.value)}
                  placeholder="https://exemplo.com/arquivo.jpg"
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Legenda da Mídia (Opcional)</Label>
                <Textarea
                  value={selectedNode.data.mediaCaption || ''}
                  onChange={(e) => handleChange('mediaCaption', e.target.value)}
                  rows={2}
                  className="mt-1"
                />
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={!!selectedNode.data.linkPreview}
                    onCheckedChange={(v) => handleChange('linkPreview', v)}
                  />
                  <Label>Preview de Link</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={!!selectedNode.data.mentionsEveryOne}
                    onCheckedChange={(v) => handleChange('mentionsEveryOne', v)}
                  />
                  <Label>Mencionar todos</Label>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Data (dd-mm-yyyy)</Label>
                  <Input
                    value={campaignDate}
                    onChange={(e) => {
                      const digits = e.target.value.replace(/\D/g, '').slice(0, 8);
                      let formatted = digits.slice(0, 2);
                      if (digits.length > 2) formatted += '-' + digits.slice(2, 4);
                      if (digits.length > 4) formatted += '-' + digits.slice(4, 8);
                      setCampaignDate(formatted);
                      if (digits.length === 8) {
                        const dd = parseInt(digits.slice(0, 2));
                        const mm = parseInt(digits.slice(2, 4));
                        const yyyy = parseInt(digits.slice(4, 8));
                        const timeDigits = campaignTime.replace(/\D/g, '').slice(0, 4);
                        if (timeDigits.length === 4) {
                          const hh = parseInt(timeDigits.slice(0, 2));
                          const mi = parseInt(timeDigits.slice(2, 4));
                          const iso = new Date(yyyy, mm - 1, dd, hh, mi).toISOString();
                          handleChange('scheduledAt', iso);
                        }
                      }
                    }}
                    inputMode="numeric"
                    maxLength={10}
                    placeholder="dd-mm-yyyy"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Hora (HH:mm)</Label>
                  <Input
                    value={campaignTime}
                    onChange={(e) => {
                      const digits = e.target.value.replace(/\D/g, '').slice(0, 4);
                      let hh = digits.slice(0, 2);
                      let mi = digits.slice(2, 4);
                      let hhNum = hh ? Math.min(Math.max(parseInt(hh), 0), 23) : NaN;
                      let miNum = mi ? Math.min(Math.max(parseInt(mi), 0), 59) : NaN;
                      let formatted = hh;
                      if (digits.length > 2) formatted += ':' + mi;
                      if (!isNaN(hhNum) && !isNaN(miNum) && digits.length === 4) {
                        const hhStr = String(hhNum).padStart(2, '0');
                        const miStr = String(miNum).padStart(2, '0');
                        formatted = `${hhStr}:${miStr}`;
                        const dateDigits = campaignDate.replace(/\D/g, '').slice(0, 8);
                        if (dateDigits.length === 8) {
                          const dd = parseInt(dateDigits.slice(0, 2));
                          const mm = parseInt(dateDigits.slice(2, 4));
                          const yyyy = parseInt(dateDigits.slice(4, 8));
                          const iso = new Date(yyyy, mm - 1, dd, hhNum, miNum).toISOString();
                          handleChange('scheduledAt', iso);
                        }
                      }
                      setCampaignTime(formatted);
                    }}
                    inputMode="numeric"
                    maxLength={5}
                    placeholder="HH:mm"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Atraso Mín/Máx (segundos)</Label>
                  <div className="grid grid-cols-2 gap-2 mt-1">
                    <Input
                      type="number"
                      value={selectedNode.data.minDelay ?? 1}
                      onChange={(e) => handleChange('minDelay', parseInt(e.target.value))}
                      min={0}
                    />
                    <Input
                      type="number"
                      value={selectedNode.data.maxDelay ?? 2}
                      onChange={(e) => handleChange('maxDelay', parseInt(e.target.value))}
                      min={0}
                    />
                  </div>
                </div>
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
