## Objetivo
Permitir ao usuário selecionar o tipo de mídia (image, video, document) ao enviar proposta, suportar upload/URL e enviar PDF (document) sem base64 para abrir normalmente no WhatsApp.

## Alterações no Frontend
### SendProposalForm
- Adicionar seletor `Tipo de mídia` com opções: `image`, `video`, `document`.
- Adicionar `input file` com `accept` dinâmico:
  - image: `image/*`
  - video: `video/*`
  - document: `.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx`
- Alternar entre upload local e URL externa:
  - Se upload: enviar arquivo para `Supabase Storage` (bucket público `proposals`) e obter `publicURL`.
  - Preencher `mediaUrl` automaticamente com a `publicURL`.
- Validações:
  - Tamanho máximo (ex.: 20MB para PDF/Document; 10MB para image; 50MB para video).
  - MIME e extensão coerentes com o tipo selecionado.
- UX:
  - Barra de progresso, preview do nome do arquivo, remover/substituir.
  - Manter o banner de conta pausada e desabilitar envio quando `paused`.

## Alterações no Backend (send-proposal)
- Aceitar campo novo `mediaType` (`image` | `video` | `document`).
- Caso `mediaType` esteja presente, usar diretamente como `mediatype` no payload Evolution API.
- Caso não esteja, manter `detectMediaType` atual com reforço para `.pdf` → `document`.
- Não usar base64: enviar sempre `media` como URL pública.

## Storage e Segurança
- Criar/usar bucket `proposals` com leitura pública; escrita restrita pelo cliente autenticado.
- Caminho do arquivo: `proposals/<userId>/<instanceId>/<uuid>.ext`.
- Sanitizar nome, validar MIME no cliente, nunca expor conteúdo sensível.

## Telemetria e Logs
- Incluir `metadata.media_type` em `proposal_sent` para auditoria.
- Manter `metadata.instance_id` para contagem por instância.

## Testes
- Upload de PDF local → URL pública → envio `document` abre no WhatsApp.
- URL externa direta para PDF/imagem/vídeo.
- Validação de tamanhos e formatos.
- Conta pausada bloqueia envio e mostra alerta.
- Contador por instância soma `proposal_sent` e `message_sent` corretamente.

## Critérios de Aceitação
- Usuário consegue escolher `image|video|document`.
- PDF enviado via URL pública abre no WhatsApp sem base64.
- Upload local gera URL pública automaticamente.
- Erros de formato/tamanho geram mensagens claras.
- Conta pausada impede envio.

Confirma que posso seguir com essa implementação?