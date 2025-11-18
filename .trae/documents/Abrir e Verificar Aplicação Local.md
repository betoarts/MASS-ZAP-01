## Objetivo
Abrir a aplicação no navegador e validar rapidamente que a UI e os fluxos carregam sem erros.

## Abrir servidor de desenvolvimento
- Verificar se o servidor já está rodando no terminal de desenvolvimento.
- Se não estiver, iniciar com `pnpm dev` na raiz do projeto.
- Identificar a URL exibida pelo servidor (geralmente `http://localhost:5173`).
- Abrir a URL no navegador.

## Verificação rápida da UI
- Se aparecer tela de login, autenticar-se e chegar ao dashboard `/`.
- Navegar até `/_flows_` pela barra lateral e abrir um fluxo existente.
- No editor, confirmar que os blocos carregam e é possível selecionar instância/lista.
- Clicar em “Salvar” e verificar se não há mensagens de erro.

## Validação de execução
- Clicar em “Executar Teste” dentro do editor do fluxo.
- Abrir “Ver Execuções” para acompanhar os jobs e confirmar que aparecem como processados.

## Alternativa (build + preview)
- Fazer build com `pnpm build`.
- Servir com `pnpm preview` e abrir `http://localhost:4173` para validar a versão compilada.

## Troubleshooting
- Porta ocupada: reiniciar o servidor ou iniciar com `pnpm dev --port 5174`.
- Página em branco/erros: abrir o console do navegador e reportar logs; verificar se a sessão está ativa para acessar rotas protegidas.
- Edge Functions/CORS: se chamadas falharem, verificar a conectividade de rede e a autenticação do cliente Supabase.

Confirma prosseguir para abrir a aplicação e executar a verificação?