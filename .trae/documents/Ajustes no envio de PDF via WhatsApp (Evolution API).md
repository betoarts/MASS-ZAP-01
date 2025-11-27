## O que está acontecendo
- O código atual já monta o payload com os campos esperados para PDF: `number`, `mediatype: 'document'`, `mimetype: 'application/pdf'`, `fileName` com `.pdf`, `media` (URL), `caption`, `delay`, `linkPreview`, `mentionsEveryOne` em `supabase/functions/send-proposal/index.ts:256–265`.
- A detecção força `document` para PDF e garante `.pdf` no nome do arquivo (`index.ts:246–253`). A URL é limpa, removendo crases/aspas (`index.ts:226`).
- Endpoints usados: `.../message/sendText/...` e `.../message/sendMedia/...` com `Content-Type: application/json` e `apikey` da instância (`index.ts:168–174`).

## Possíveis causas do PDF "fora de formato"
- Diferença de campos enviados para a função: ela espera `mimeType` (camelCase) no corpo de entrada, não `mimetype`. Se vier `mimetype`, o código tenta inferir pelo `.pdf`, mas pode haver inconsistências.
- URL com formatação (crases ``` `...` ```); embora o código limpe, é melhor enviar sem crases para evitar falsos positivos.
- Servidor do arquivo retorna tipo incorreto ou bloqueia acesso; há fallback para base64 se a URL falhar (`index.ts:274–303`).
- Ausência dos campos opcionais `mentioned` e `quoted` que seu exemplo prevê; hoje não são encaminhados.

## Plano de ajustes
1. Aceitar `delay` do corpo da requisição e repassar ao payload de mídia/texto (em vez de fixo `1200`).
2. Aceitar e repassar `mentioned` e `quoted` ao `sendMedia` quando fornecidos, mantendo compatibilidade quando ausentes.
3. Priorizar `mimeType` recebido (camelCase) e também aceitar `mimetype` (lowercase) para robustez, antes da inferência por extensão.
4. Fortalecer validação da `mediaUrl`: recusar URLs com crases/aspas e registrar motivo em log.
5. Logar o payload de mídia em caso de falha, para facilitar diagnóstico (sem expor dados sensíveis).
6. Testar com o exemplo fornecido (sem crases na URL), garantindo que chegue como documento PDF com nome/legenda corretos.

## Como você pode chamar a função hoje
- Corpo recomendado (exemplo simplificado):
  - `userId`, `instanceId`, `phone_number`, `messageText`, `mediaUrl`, `mediaCaption`, `mimeType: 'application/pdf'`, `fileName: 'documento.pdf'`, `linkPreview: true`, `mentionsEveryOne: true`.
- Isso resulta em payload equivalente ao seu JSON no envio para o Evolution API.

Confirme para eu aplicar os ajustes acima e validar com testes de envio, incluindo suporte a `mentioned`/`quoted` e `delay` dinâmico.