# Bright Parrot Skid

Este é um aplicativo web para gerenciar campanhas de WhatsApp. Ele permite configurar instâncias do WhatsApp, gerenciar listas de contatos, criar e enviar campanhas, e acompanhar seus resultados.

## Features

- **Dashboard:** Uma visão geral de suas campanhas, com estatísticas e atividades recentes.
- **Instâncias:** Gerencie suas instâncias do WhatsApp.
- **Contatos:** Importe e gerencie suas listas de contatos.
- **Campanhas:** Crie, agende e envie campanhas de WhatsApp.
- **Clientes (CRM):** Gerencie seus clientes, adicione detalhes e envie propostas personalizadas diretamente para eles.
- **Logs:** Acompanhe o status de suas campanhas e mensagens.

## Tech Stack

- **Frontend:**
  - Vite
  - React
  - TypeScript
  - Tailwind CSS
  - Shadcn UI
- **Backend:**
  - Supabase

## Como rodar

1. Clone o repositório.
2. Instale as dependências com `pnpm install`.
3. Crie um arquivo `.env` na raiz do projeto com as seguintes variáveis:

   ```
   VITE_SUPABASE_URL=YOUR_SUPABASE_URL
   VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
   ```

4. Rode o servidor de desenvolvimento com `pnpm dev`.

## Licença

Este projeto está licenciado sob a licença MIT.