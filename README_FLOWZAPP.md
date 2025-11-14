# 🚀 FlowZapp - Sistema de Automação Visual de WhatsApp

Sistema completo de workflow visual drag-and-drop para automação de WhatsApp, similar a Manychat, Zapier e Make.

## 📋 Funcionalidades

- ✅ Editor visual drag-and-drop com React Flow
- ✅ Blocos: Start, Send Message, Wait, Condition, Webhook, End
- ✅ Execução assíncrona com enfileiramento
- ✅ Retry automático com exponential backoff
- ✅ Integração com Evolution API v2
- ✅ Multi-tenant com Supabase Auth
- ✅ Substituição de variáveis ({{name}}, {{phone}})
- ✅ Condições com expressões JEXL
- ✅ Delays configuráveis (segundos/minutos/horas)

## 🛠️ Stack Tecnológica

- **Frontend**: React + Vite + TypeScript + React Flow
- **Backend**: Supabase (Auth, Database, Storage)
- **Worker**: Supabase Edge Functions (Deno)
- **Mensageria**: Tabela `jobs` com scheduler
- **WhatsApp**: Evolution API v2

## 📦 Instalação

### 1. Pré-requisitos

- Node.js 18+
- Conta Supabase
- Evolution API configurada

### 2. Clonar e Instalar

```bash
git clone <seu-repo>
cd flowzapp
npm install
```

### 3. Configurar Variáveis de Ambiente

Crie `.env` na raiz:

```env
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-anon
```

### 4. Criar Tabelas no Supabase

Execute o SQL fornecido no Supabase SQL Editor:
- Tabelas: `flows`, `executions`, `jobs`
- Políticas RLS configuradas

### 5. Deploy das Edge Functions

```bash
# Instalar Supabase CLI
npm install -g supabase

# Login
supabase login

# Link ao projeto
supabase link --project-ref seu-projeto-id

# Deploy das funções
supabase functions deploy execute-flow
supabase functions deploy process-due-jobs
```

### 6. Configurar Cron Job

No Supabase Dashboard:
1. Vá em Database → Cron Jobs
2. Crie um job que chama `process-due-jobs` a cada 1 minuto:

```sql
SELECT cron.schedule(
  'process-flow-jobs',
  '* * * * *',
  $$
  SELECT net.http_post(
    url := 'https://seu-projeto.supabase.co/functions/v1/process-due-jobs',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.settings.service_role_key') || '"}'::jsonb
  );
  $$
);
```

## 🎯 Como Usar

### 1. Criar um Flow

1. Acesse `/flows`
2. Clique em "Novo Fluxo"
3. Arraste blocos da sidebar para o canvas
4. Conecte os blocos
5. Configure cada bloco clicando nele
6. Salve o fluxo

### 2. Executar um Flow

```javascript
// Via botão "Executar Teste" na interface
// Ou via código:
const { data } = await supabase.functions.invoke('execute-flow', {
  body: {
    flowId: 'uuid-do-flow',
    userId: 'uuid-do-usuario',
    context: {
      name: 'João',
      phone: '5511987654321',
    },
  },
});
```

### 3. Exemplo de Flow

**Fluxo de Boas-Vindas:**

```
Start
  ↓
Send Message: "Olá {{name}}, bem-vindo!"
  ↓
Wait: 30 segundos
  ↓
Send Message: "Como posso ajudar?"
  ↓
End
```

## 🔐 Segurança

- ✅ RLS habilitado em todas as tabelas
- ✅ Service Role Key apenas no backend
- ✅ Validação de ownership em todas as operações
- ✅ CORS configurado nas Edge Functions

## 🧪 Testes

### Testar Execução de Flow

1. Crie um flow simples
2. Clique em "Executar Teste"
3. Verifique os logs na tabela `jobs`
4. Confirme recebimento da mensagem no WhatsApp

### Testar Worker

```bash
# Invocar manualmente
curl -X POST https://seu-projeto.supabase.co/functions/v1/process-due-jobs \
  -H "Authorization: Bearer sua-service-role-key"
```

## 📊 Monitoramento

### Ver Execuções

```sql
SELECT * FROM executions 
WHERE user_id = 'seu-user-id' 
ORDER BY started_at DESC;
```

### Ver Jobs Pendentes

```sql
SELECT * FROM jobs 
WHERE status = 'pending' 
ORDER BY scheduled_at;
```

### Ver Jobs com Erro

```sql
SELECT * FROM jobs 
WHERE status = 'failed' 
ORDER BY created_at DESC;
```

## 🚀 Deploy em Produção

### Frontend (Vercel/Netlify)

```bash
npm run build
# Deploy da pasta dist/
```

### Edge Functions

```bash
supabase functions deploy --project-ref seu-projeto-id
```

### Configurar Domínio Customizado

No Supabase Dashboard → Settings → API

## 🐛 Troubleshooting

### Jobs não estão sendo processados

1. Verifique se o cron job está ativo
2. Confirme que `process-due-jobs` está deployada
3. Verifique logs no Supabase Dashboard

### Mensagens não estão sendo enviadas

1. Confirme que a instância Evolution está conectada
2. Verifique se a API key está correta
3. Confirme que o número está no formato correto

### Condições não funcionam

1. Verifique a sintaxe da expressão JEXL
2. Confirme que as variáveis existem no contexto
3. Teste a expressão em https://jexl.omniboard.dev/

## 📚 Recursos Adicionais

- [React Flow Docs](https://reactflow.dev/)
- [Supabase Docs](https://supabase.com/docs)
- [JEXL Syntax](https://github.com/TomFrost/Jexl)
- [Evolution API](https://doc.evolution-api.com/)

## 🤝 Contribuindo

1. Fork o projeto
2. Crie uma branch (`git checkout -b feature/nova-funcionalidade`)
3. Commit suas mudanças (`git commit -m 'Adiciona nova funcionalidade'`)
4. Push para a branch (`git push origin feature/nova-funcionalidade`)
5. Abra um Pull Request

## 📄 Licença

MIT License - veja LICENSE para detalhes

## 💬 Suporte

- WhatsApp: +55 54 99168-0204
- Email: suporte@vendaszapp.com
- Discord: [Link do servidor]

---

Desenvolvido com ❤️ por MassZapp Team