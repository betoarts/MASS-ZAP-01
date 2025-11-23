# MassZapp - Automação e Gestão de WhatsApp

O **MassZapp** é uma plataforma completa para gerenciamento de campanhas de WhatsApp, automação de atendimento e CRM. Projetado para escalar operações de comunicação, ele permite conectar múltiplas instâncias, criar fluxos de conversa automatizados e gerenciar contatos de forma eficiente.

## 🚀 Funcionalidades Principais

### 📱 Gestão de WhatsApp

- **Múltiplas Instâncias:** Conecte e gerencie várias contas de WhatsApp via QR Code.
- **Campanhas em Massa:** Crie, agende e envie campanhas para listas segmentadas de contatos.
- **Logs Detalhados:** Acompanhe o status de entrega de cada mensagem.

### 🤖 Automação e Fluxos

- **Flow Builder Visual:** Crie fluxos de conversa complexos com uma interface drag-and-drop intuitiva.
- **Webhooks:** Configure integrações para receber e processar eventos externos.
- **Execuções de Fluxo:** Monitore a execução das automações em tempo real.

### 👥 CRM e Contatos

- **Gestão de Contatos:** Importe listas, organize contatos e gerencie tags.
- **CRM Integrado:** Pipeline de vendas simples para gerenciar clientes e oportunidades.
- **Envio de Propostas:** Envie mensagens e propostas personalizadas diretamente pelo painel.

### 🛡️ Administração e Segurança

- **Sistema de Aprovação:** Novos usuários entram como "Pendentes" e requerem aprovação de um administrador.
- **Gestão de Usuários:** Painel administrativo para ativar, pausar, bloquear e gerenciar períodos de teste de usuários.
- **Integração de Suporte:** Botões de ação rápida para contactar usuários via WhatsApp.

## 🛠️ Stack Tecnológico

### Frontend

- **Framework:** [React](https://react.dev/) com [Vite](https://vitejs.dev/)
- **Linguagem:** [TypeScript](https://www.typescriptlang.org/)
- **Estilização:** [Tailwind CSS](https://tailwindcss.com/)
- **Componentes:** [Shadcn/ui](https://ui.shadcn.com/)
- **Ícones:** [Lucide React](https://lucide.dev/)
- **Gerenciamento de Estado/Data:** [TanStack Query](https://tanstack.com/query/latest)
- **Formulários:** [React Hook Form](https://react-hook-form.com/) com [Zod](https://zod.dev/) para validação.

### Backend (Serverless)

- **Plataforma:** [Supabase](https://supabase.com/)
- **Banco de Dados:** PostgreSQL
- **Autenticação:** Supabase Auth
- **Serverless Functions:** Supabase Edge Functions (Deno)

## 📦 Como Rodar o Projeto

1. **Clone o repositório**

   ```bash
   git clone <url-do-repositorio>
   cd MASS-ZAP-01
   ```

2. **Instale as dependências**

   ```bash
   pnpm install
   ```

3. **Configure as Variáveis de Ambiente**
   Crie um arquivo `.env` na raiz do projeto com suas credenciais do Supabase:

   ```env
   VITE_SUPABASE_URL=sua_url_do_supabase
   VITE_SUPABASE_ANON_KEY=sua_chave_anonima_do_supabase
   ```

4. **Inicie o Servidor de Desenvolvimento**
   ```bash
   pnpm dev
   ```

## 📂 Estrutura de Pastas

- `src/components`: Componentes React reutilizáveis, divididos por contexto (auth, crm, ui, etc).
- `src/pages`: Páginas principais da aplicação (rotas).
- `src/lib`: Configurações de clientes (Supabase), utilitários e tipos.
- `src/hooks`: Custom hooks.
- `supabase/functions`: Edge Functions para lógica de backend (agendamento de campanhas, etc).

## 📄 Licença

Este projeto está licenciado sob a licença MIT.
