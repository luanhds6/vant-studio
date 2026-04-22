# Vant Studio — visão geral e funcionalidades

## Propósito do sistema

O **Vant Studio** (subtítulo: *Catálogo Digital*) é uma aplicação web para **criar, organizar e publicar catálogos de produtos empresariais** de forma padronizada. Foi pensado para equipas que precisam de:

- **Agrupar ofertas por unidade de negócio** (no produto, cada “hospital” ou unidade concentra os seus produtos);
- **Registar ficha técnica rica** por artigo (dimensões, tecido, cores, desenhos, pintura, marca do cliente, detalhes, etc.);
- **Gerar documentos de catálogo em PDF** (retrato ou paisagem), prontos para partilha ou impressão, alinhados com a identidade da empresa (logo, nome, slogan).

Em resumo: o sistema serve de **fábrica de catálogos digitais e PDFs**, com **controlo de acesso** por perfis e **dados centralizados** (base de dados na cloud via Supabase).

---

## O que o sistema já oferece (módulos e funções)

### Autenticação e utilizadores

- **Login** com e-mail e palavra-passe (Supabase Auth).
- **Perfis** com nome, e-mail, foto, perfil de permissões.
- **Papéis**: administrador (acesso total) e utilizador (permissões à medida).
- **Permissões granulares** (chaves usadas no código):
  - `pagina_inicial` — aceder à home e, onde aplicável, **criar/eliminar hospitais** a partir daí;
  - `gerar_catalogo` — fluxo de **pré-visualização e exportação do catálogo em PDF**;
  - `novo_produto` — **criar** produtos;
  - `produtos` — **editar** (e ações associadas) produtos existentes;
  - `configuracoes` — definições da empresa e ecrãs gerais;
  - `usuarios` — **gestão de utilizadores** (quem tem permissão de administração de contas).
- A **página de configurações** pode incluir **gestão de utilizadores** (conforme permissão), além de dados da empresa.

### Hospitais (unidades)

- **Listagem e CRUD** de unidades: nome, cidade, identificador.
- Cada unidade possui o **seu conjunto de produtos**; o catálogo e listagens respeitam essa separação.
- A **página inicial** mostra as unidades e atalhos para abrir a unidade ou, com permissão, **ir diretamente à geração do catálogo (PDF)**.

### Produtos

- **Cadastro completo** por produto, incluindo (entre outros):
  - Nome, categoria, **referência / código de etiqueta**;
  - **Tecido**, **tamanhos**, **cores** (ligadas a uma paleta global);
  - **Dimensões** (largura, altura, unidade);
  - **Detalhes técnicos** (lista numerada);
  - **Imagem principal** e **imagens de detalhe** (títulos);
  - Blocos informativos: **pintura**, **marca do cliente**, **nome de campo**, **timbrado**, **rastreável** (com textos e imagens quando aplicável);
  - **Metadados** de criação e atualização.
- **Dois modos de edição** previstos na aplicação:
  - **Cadastro de produtos** (lista por hospital, filtro, leitura por QR/código, modal de criação/edição com geração de **QR da etiqueta** e exportação PNG);
  - **Formulário detalhado** por rota hospital/produto (criar ou editar ficha longa).
- Sincronização de dados com **atualizações em tempo quase real** (Supabase Realtime) após alterações na base de dados.

### Catálogo digital e PDF

- **Pré-visualização** do catálogo no browser para os produtos selecionados de um hospital.
- **Orientação A4**: **retrato** ou **paisagem**, com layout distinto otimizado para leitura e impressão.
- **Exportação para PDF** (captura do layout e gravação em ficheiro), com identidade da empresa (configurações globais).
- Acesso condicionado à permissão de **gerar catálogo** (e regras de rota associadas).

### Cores (paleta global)

- **CRUD** de cores base (nome, código hex) reutilizáveis nos produtos.
- Acesso depende das permissões (configuração / criação de produtos, conforme regras de rota).

### Configurações da empresa

- Dados como **logo**, **nome da empresa** e **slogan** (usados no catálogo e na interface).
- Integração com **área de utilizadores** para administradores.

### Perfil do utilizador

- Página de **perfil** (dados do utilizador autenticado).

### Experiência de utilização (interface)

- **Tema claro/escuro**.
- **Layout** com navegação lateral, cabeçalho e transições entre rotas.
- **Indicador de versão** da aplicação (canto do ecrã).

### Dados e robustez

- Dados principais em **Supabase** (Postgres, Auth, Realtime).
- Lógica de **atualização em lote** dos dados da loja (evitando pedidos em excesso) e **canal Realtime** unificado para alterações.
- Tratamento de **rotas antigas** (redirecionos de URLs legadas de produto, quando existirem).

---

## Resumo em uma frase

O **Vant Studio** é o **ambiente de trabalho** onde a organização regista **unidades**, **fichas de produto** detalhadas e **identidade visual** da empresa, e **exporta catálogos em PDF** — com **segurança** e **permissões** adaptadas a cada função (comercial, produção, administração).

---

## Nota

Este documento descreve o **comportamento e o âmbito** implementados no código da aplicação. Evoluções futuras (novos módulos, integrações ou relatórios) podem ser acrescentadas a este ficheiro ou a documentos complementares na pasta `docs/`.
