# Vant Studio — visão geral e funcionalidades

**Marca:** Vant Studio · *Catálogo Digital* (`src/brand.ts`).  
**Versão da aplicação:** lida do `package.json` e exibida na interface (cantos / área de sistema).

---

## Propósito do sistema

O **Vant Studio** é uma aplicação web (**React**, **TypeScript**, **Vite**) para **criar, organizar e publicar catálogos de produtos** com ficha técnica rica e **exportação em PDF**. Foi pensado para equipas que precisam de:

- **Agrupar ofertas por unidade** (no produto, cada *hospital* ou unidade concentra os seus artigos);
- **Registar fichas detalhadas** (dimensões, tecido, cores, imagens, blocos técnicos, identidade no PDF, etc.);
- **Gerar documentos de catálogo em A4** (retrato ou paisagem), alinhados com a **identidade da empresa** (logo, nome, slogan);
- **Opcional:** fluxo de **contratos** com modelo em PDF, link de assinatura e carimbo de assinatura no documento (área administrativa + página pública de assinatura).

Os dados vivem na **cloud (Supabase)**: Postgres, autenticação, armazenamento de ficheiros (ex.: contratos) e **atualizações em tempo quase real** nas listagens principais.

---

## O que o sistema oferece hoje (módulos e funções)

### Autenticação e sessão

- **Login** com e-mail e palavra-passe (Supabase Auth).
- **Alteração obrigatória de palavra-passe** quando a conta tem senha temporária: um diálogo bloqueia o resto da app até o utilizador definir uma nova senha (mínimo 6 caracteres).
- **Perfis** com nome, e-mail, foto e **papel** normalizado no código:
  - **Administrador** — reconhecido por vários alias na base de dados (`admin`, `administrador`, `master`, etc.) e recebe **todas** as permissões, independentemente do array gravado.
  - **Utilizador** — permissões vindas da base; se a lista estiver vazia, a app aplica o conjunto por omissão: apenas **`gerar_catalogo`**.

### Permissões (chaves usadas nas rotas e no menu)

| Chave | Função resumida |
|--------|------------------|
| `pagina_inicial` | Acede à **home**; pode **criar e eliminar hospitais** a partir dos fluxos previstos; o item *Hospitais* no menu lateral **não** aparece só com esta permissão (cadastro de unidades continua disponível na home quando aplicável). |
| `gerar_catalogo` | Acede à home “estilo catálogo” e à **pré-visualização** do catálogo; no texto de ajuda do sistema, o PDF também é considerado para quem tem página inicial, produtos ou novo produto (ver regras de rota abaixo). |
| `novo_produto` | **Criar** produtos (rotas e formulários protegidos). |
| `produtos` | **Editar** (e ações associadas, p.ex. eliminar) produtos existentes. |
| `configuracoes` | **Configurações da empresa**, área geral e módulo de **contratos** (`/contratos`). |
| `usuarios` | **Gestão de utilizadores** e permissões (integrada nas configurações quando aplicável). |

Textos mais longos para administradores que configuram contas: `PERMISSION_HELP` em `src/lib/permissions.ts`.

### Regras de navegação importantes (resumo)

- **Rota `/` (página inicial):** apenas quem tem `pagina_inicial` **ou** `gerar_catalogo`.
- **Módulo hospitais** (`/hospitais`, `/hospital/:id`): quem tem **qualquer** de `pagina_inicial`, `produtos`, `gerar_catalogo`, `novo_produto`.
- **Catálogo / PDF** (`/hospital/:hospitalId/catalogo`): quem pertence ao **módulo hospitais** acima (função `canDownloadCatalogPdf` — **não** é só a chave `gerar_catalogo`). Assim, utilizadores com cadastro ou edição de produtos também acedem à geração do PDF.
- **Item *Hospitais* no menu:** aparece para `produtos`, `gerar_catalogo` ou `novo_produto` (não para quem tem só `pagina_inicial`).
- **Configurações (`/config`):** quem tem `configuracoes` **ou** `usuarios`.
- **Aterragem após login** (`getDefaultLandingPath`): home, depois hospitais, depois config, conforme o primeiro bloco de permissões válido.

### Hospitais (unidades)

- **Listagem e CRUD** de unidades (nome, cidade, identificador).
- Cada unidade tem **o seu conjunto de produtos**; catálogo e contagens respeitam essa separação.
- Na **página inicial**, ao abrir um hospital: quem pode usar o módulo de catálogo/PDF é enviado **direto** para `/hospital/:id/catalogo`; caso contrário, para o **hub** do hospital (`/hospital/:id`).

### Produtos

- **Cadastro completo** por artigo: nome, categoria, referência, tecido, tamanhos, cores (ligadas à paleta), dimensões, detalhes numerados, imagem principal, imagens de detalhe, blocos (pintura, marca do cliente, nome de campo, timbrado, rastreável), metadados de criação/atualização (`src/types/Product.ts`).
- **Dois modos de trabalho:**
  1. **Cadastro de produtos** (`/cadastro-produtos`, com filtro por hospital na query): lista, filtros, leitura por QR/código, modal de criação/edição com **QR da etiqueta** e exportação PNG — requer `novo_produto` **ou** `produtos`.
  2. **Formulário longo** por rota: `/hospital/:hospitalId/produto/novo` (só `novo_produto`) e `/hospital/:hospitalId/produto/:id` (só `produtos`).
- **Rotas antigas** de produto (`/produto/:id`, etc.) redirecionam para o modelo atual (`LegacyProductRedirect`).
- Sincronização com a base e **Realtime** onde implementado na store (alterações refletem-se nas vistas sem recarregar a página inteira de forma desnecessária).

### Catálogo digital e PDF

- **Pré-visualização** no browser dos produtos **selecionáveis** por hospital (checkboxes).
- **Orientação A4:** retrato ou paisagem; layout dedicado em `CatalogPage` (inclui ajustes de margem e rodapé para evitar sobreposição com galerias em retrato).
- **Exportação PDF** via captura do layout (canvas) e composição em documento, com identidade da empresa.
- Em **tema escuro**, a pré-visualização pode usar uma “ilha” clara só para o catálogo (melhor leitura do PDF na exportação).

### Tecido / cores (paleta)

- Rota **`/cores`** (*Tecido/cores* no menu): gestão avançada da paleta — inclui conceitos como **indústria**, **tipo de tecido**, cores base, opções de **forma/marcador** para representação no catálogo (`src/lib/shapes.ts`), impressão de legenda, etc.
- Acesso: permissão `configuracoes` **ou** `novo_produto`.

### Configurações da empresa

- Dados globais: **logo**, **nome da empresa**, **slogan** (usados no catálogo e na experiência).
- Integração com **gestão de utilizadores** para perfis autorizados.

### Contratos (novo âmbito face a versões só de catálogo)

- Rota **`/contratos`** (menu *Contratos*), protegida por **`configuracoes`**.
- **Modelos** de contrato (PDF) armazenados no bucket Supabase `contracts`; possibilidade de atualizar modelo, criar **pedidos de assinatura**, copiar **link público**.
- **Página pública** (sem layout autenticado): **`/contrato/assinar/:id`** — o signatário identifica-se, posiciona o carimbo na última página e o sistema grava o PDF assinado (usa `pdfjs-dist`, `pdf-lib` / utilitários em `src/lib/pdfSignature.ts`).
- Estados do contrato: `pending` | `signed` (`src/types/Contract.ts`). Fluxo administrativo inclui também registo manual e gestão de pastas no storage, conforme `ContractsPage` / `contractStore`.

### Perfil do utilizador

- Rota **`/perfil`**: dados do utilizador autenticado (e atalho na barra lateral).

### Experiência de utilização

- **Tema claro / escuro** (`next-themes`, sem seguir automaticamente o tema do sistema — preferência guardada em `localStorage`).
- **Layout** com barra lateral colapsável, transições entre rotas e componentes **shadcn/ui** (Radix).
- **React Query** para pedidos com política de cache definida em `App.tsx`.
- **Indicador de versão** da build.

### Infraestrutura e extensões Supabase

- **Edge Functions** no repositório (exemplos): criação/atualização/remoção de utilizadores (`supabase/functions/...`), alinhadas à gestão de contas na app.

---

## Resumo numa frase

O **Vant Studio** é o **ambiente operacional** onde a organização gere **unidades**, **fichas de produto**, **paleta de tecidos/cores**, **identidade da empresa** e **exporta catálogos em PDF** — com **contratos opcionais** assináveis por link — tudo com **acesso por permissões** e dados **centralizados no Supabase**.

---

## Nota

Este documento descreve o **comportamento e o âmbito** implementados no código da aplicação (início de 2026). Para uma versão curta para **apresentação oral ou reunião**, use em paralelo o ficheiro `docs/apresentacao-do-sistema-vant-studio.md`.
