## Diagnóstico
- O erro “Falha ao enviar proposta.” é retornado pela Edge Function quando o envio de texto ou mídia falha: `supabase/functions/send-proposal/index.ts:204`.
- O formulário consome esse retorno e exibe o toast de erro em `src/components/crm/SendProposalForm.tsx:139` e monta a descrição usando `details.text`/`details.media` em `src/components/crm/SendProposalForm.tsx:151`.
- A chamada ao endpoint ocorre via `supabase.functions.invoke('send-proposal')`: `src/components/crm/SendProposalForm.tsx:122`.

## Causas Prováveis
- Parâmetros obrigatórios ausentes: `send-proposal/index.ts:62–68`.
- Cliente inválido/não encontrado: `send-proposal/index.ts:79–85`.
- Telefone ausente ou formato incorreto: `send-proposal/index.ts:91–96`.
- Instância não autorizada ou inexistente (verifica `user_id`): `send-proposal/index.ts:98–112`.
- Falha na Evolution API para texto (`sendText`) ou mídia (`sendMedia`): `send-proposal/index.ts:152–159` e `send-proposal/index.ts:190–193`.

## Verificações Imediatas (sem código)
- Confirmar que o payload do frontend tem `userId`, `instanceId`, `messageText` e `phone_number`: `src/components/crm/SendProposalForm.tsx:123–135`.
- Checar se o telefone está em formato internacional aceito pela Evolution API (ex.: `55DDDNUMERO`).
- Validar se a instância usada pertence ao usuário logado e possui `url`, `instance_name` e `api_key` corretamente configurados.

## Correções no Frontend
1. Exibir detalhes do erro no toast para depuração do usuário
   - Incorporar `details.text?.error` e `details.media?.error` quando presentes em `src/components/crm/SendProposalForm.tsx:151`.
2. Tratar sucesso parcial
   - Se texto foi enviado e mídia falhou, mostrar sucesso com aviso; se ambos falharam, manter erro.
3. Normalizar telefone enviado
   - Sanitizar `phone_number` antes do invoke para o formato esperado.

## Correções na Edge Function
1. Melhorar mensagem de erro com causa específica
   - Propagar `errorBody` da Evolution API em `details` e tornar `error` mais descritivo: `send-proposal/index.ts:156–159` e `send-proposal/index.ts:190–193`.
2. Sucesso parcial
   - Se texto OK e mídia falha: retornar `{ success: true, warning: ..., details: ... }`.
3. Validações claras
   - Detalhar qual parâmetro está ausente em `send-proposal/index.ts:62–68`.
4. Normalização de mídia
   - Melhorar detecção de `mediatype` por extensão e tratar URLs inválidas.

## Validação
- Testar envio só texto, só mídia e ambos; simular número inválido e instância sem permissão.
- Verificar toasts exibindo causas específicas e confirmar que sucesso parcial não bloqueia fluxo.

## Resultado Esperado
- Usuário recebe mensagens claras com a causa da falha.
- Sucesso parcial não é tratado como erro total.
- Menos falhas por formatação de telefone e validações mais úteis.