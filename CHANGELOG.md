# Release: FlowZapp Improvements

## Principais mudanças

- Adicionado nó `Criar Campanha` ao FlowZapp (envio imediato ou agendado)
- Integração completa do nó `Webhook` com fontes da aplicação
- Notificações em tempo real no sino (campanhas, jobs, execuções)
- Aceleração de processamento:
  - Pós “Executar Teste” com múltiplas passagens
  - Botões “Processar Agora” em execuções/detalhes
- Melhorias de UI/UX no editor de fluxo:
  - Selects estáveis (HTML nativo), Slider para `Wait`
  - Sincronização de `selectedNode` e correção de jitter no canvas
  - Data `dd-mm-yyyy` e Hora `HH:mm` com máscara e 24h
- Infra e agendadores:
  - Habilitado `pg_cron` e agendado `process-due-jobs`
  - Cron `campaign-scheduler` para campanhas agendadas
- Ajustes de build/config:
  - `tsconfig.node.json` com `composite` e emissão de declarações
  - Flags futuras do React Router v7 ativadas
  - Salvamento de fluxo antes de executar teste

## Impacto

- Fluxos criam e disparam campanhas conforme configuração do nó
- Webhooks internos reutilizam mapeamentos e listas da aplicação
- Menor latência inicial de execução e melhor visibilidade operacional

## Próximos passos

- Opcional: suporte a fuso horário configurável no agendamento
- Opcional: filtros por usuário nos canais Realtime adicionais