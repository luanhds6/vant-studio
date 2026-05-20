# Vant Studio Catalogo

Aplicação web (**React**, **TypeScript**, **Vite**) para criar, organizar e exportar catálogos de produtos em PDF, com gestão de unidades, fichas técnicas, cores/tecidos e contratos opcionais. Dados centralizados no **Supabase** (Auth, Postgres, Storage, Edge Functions).

## Configuração local

1. Copie `.env.example` para `.env` e preencha apenas as variáveis públicas do cliente:

   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

2. **Nunca** coloque `SUPABASE_SERVICE_ROLE_KEY` no `.env` do frontend. Essa chave fica apenas nas Edge Functions (`supabase/functions`), configurada no painel Supabase.

3. Instale dependências e inicie:

```bash
npm ci
npm run dev
```

## Segurança

- A **anon key** no browser é esperada; o acesso aos dados é limitado por **RLS** no Postgres.
- Operações administrativas (criar/remover utilizadores, alterar Auth) passam por **Edge Functions** com validação de sessão e papel admin.
- O cliente inclui: fluxo **PKCE**, limite de tentativas de login, sanitização de logs em produção e cabeçalhos CSP em build de produção.
- Não versione `.env` nem `dist/env-config.js` com credenciais reais.

## Scripts

| Comando | Descrição |
|--------|-----------|
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build:prod` | Build de produção |
| `npm run test` | Testes Vitest |
| `npm run lint` | ESLint |

## Deploy (Docker / Easypanel)

Defina em runtime `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`. O `docker-entrypoint.sh` gera `dist/env-config.js` sem expor segredos no repositório.
