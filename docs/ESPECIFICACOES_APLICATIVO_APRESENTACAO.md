# Flux Catalog Creator — Documento de Especificações e Funcionalidades

## 1) Visão Geral

O **Flux Catalog Creator** é uma aplicação web para cadastro de produtos e geração de catálogo em PDF, voltada para operação comercial/técnica.

O sistema permite:
- autenticação de usuários;
- gerenciamento de produtos com dados técnicos e imagens;
- configuração de identidade da empresa;
- pré-visualização e exportação de catálogo em PDF;
- controle de usuários (restrito a administradores).

---

## 2) Objetivo do Produto

Centralizar e padronizar a criação de catálogos digitais, reduzindo trabalho manual de montagem de documentos e acelerando a apresentação de portfólio para clientes.

---

## 3) Escopo Funcional Implementado

### 3.1 Autenticação e Controle de Acesso

- Tela de login com validação de e-mail/senha.
- Persistência de sessão local.
- Proteção de rotas internas por autenticação.
- Perfis de acesso:
  - **admin**: acesso total, incluindo gerenciamento de usuários;
  - **user**: acesso às funcionalidades de catálogo sem administração de usuários.
- Usuário administrador padrão inicial:
  - E-mail: `ti@servbrasil.com.br`
  - Senha: `Br@sil500`

### 3.2 Dashboard de Produtos

- Listagem de produtos cadastrados em cards.
- Ações rápidas:
  - criar novo produto;
  - editar produto;
  - excluir produto (com confirmação);
  - acessar geração de catálogo.
- Exibição resumida de:
  - nome, referência, categoria;
  - miniatura da imagem principal;
  - tamanhos e cores.

### 3.3 Cadastro e Edição de Produto

Campos e seções disponíveis atualmente:

- **Informações básicas**:
  - nome do produto (obrigatório);
  - referência;
  - categoria;
  - tecido.
- **Dimensões**:
  - largura, altura e unidade.
- **Tamanhos**:
  - inclusão dinâmica (chips) com remoção individual.
- **Cores**:
  - inclusão com nome e seletor hexadecimal;
  - remoção individual.
- **Detalhes técnicos**:
  - lista dinâmica de observações técnicas.
- **Imagem principal**:
  - upload de 1 imagem (desenho técnico);
  - visualização e remoção.
- **Imagens de detalhe**:
  - upload múltiplo;
  - edição de título por imagem;
  - remoção individual.
- **Pintura**:
  - cor, tamanho e localização;
  - **anexo de imagem da pintura** com preview e remoção.
- **Marca do cliente**:
  - cor, tamanho e localização;
  - **anexo de imagem da marca do cliente** com preview e remoção.
- **Nome do campo**:
  - texto, cor, tamanho.

### 3.4 Configurações da Empresa

- Cadastro/edição de:
  - nome da empresa;
  - slogan;
  - logo (upload de imagem com preview/remoção).
- Essas configurações são aplicadas no layout do catálogo gerado.

### 3.5 Geração de Catálogo

- Seleção de um ou mais produtos.
- Pré-visualização das páginas do catálogo.
- Exportação para PDF (`A4`) com uma página por produto.
- Nome do arquivo PDF baseado no nome da empresa.

### 3.6 Layout da Página de Catálogo (PDF/Preview)

Cada página inclui:
- cabeçalho com logo/nome/slogan da empresa;
- identificação do produto (nome, referência, categoria);
- imagem principal (desenho técnico);
- dimensões;
- detalhes técnicos;
- seções de tecido, tamanhos e cores;
- seção de pintura (incluindo imagem, quando anexada);
- seção de marca do cliente (incluindo imagem, quando anexada);
- bloco de detalhes do produto com imagens adicionais;
- rodapé institucional.

### 3.7 Gerenciamento de Usuários (Admin)

- Tela restrita ao perfil administrador.
- Listagem de usuários com nome, e-mail, papel e data de criação.
- Criação de novo usuário com:
  - nome;
  - e-mail (validação de duplicidade);
  - senha temporária;
  - papel (`admin` ou `user`).
- Exclusão de usuários (com bloqueio de autoexclusão da conta logada).

---

## 4) Arquitetura e Tecnologias

### 4.1 Front-end

- React 18 + TypeScript
- Vite
- React Router DOM
- Zustand (estado global e persistência local)
- React Query (infra já configurada)
- Tailwind CSS + componentes UI (shadcn/ui)

### 4.2 Bibliotecas de mídia e exportação

- `react-dropzone` para upload/drag-and-drop de imagens
- `html2canvas` para renderização das páginas
- `jspdf` para geração de PDF

### 4.3 Persistência de Dados

- Persistência local no navegador (`localStorage`) via middleware `persist` do Zustand:
  - `flux-auth-store` (autenticação e usuários)
  - `flux-catalog-store` (produtos e configurações)

### 4.4 Estrutura de Rotas

- `/login`
- `/` (dashboard)
- `/produto/novo`
- `/produto/:id`
- `/catalogo`
- `/config`
- `/usuarios` (visível para admin)

---

## 5) Modelo de Dados (Resumo)

### 5.1 Produto

Principais grupos de dados:
- identificação: nome, categoria, referência, tecido;
- especificações: tamanhos, cores, dimensões, detalhes;
- imagens: principal + detalhes;
- personalizações:
  - pintura: cor, tamanho, localização, **imagem**;
  - marcaCliente: cor, tamanho, localização, **imagem**;
  - nomeCampo: texto, cor, tamanho, localização;
- metadados: `id`, `createdAt`, `updatedAt`.

### 5.2 Configurações da Empresa

- `logo` (base64)
- `nomeEmpresa`
- `slogan`

### 5.3 Usuário

- `id`
- `name`
- `email`
- `password`
- `role` (`admin` | `user`)
- `createdAt`

---

## 6) Regras de Negócio Atuais

- Produto exige nome para salvar.
- Somente usuários autenticados acessam rotas protegidas.
- Somente `admin` visualiza/gerencia módulo de usuários.
- Não é permitido excluir o próprio usuário logado.
- Não é permitido cadastrar usuário com e-mail duplicado.
- Uploads de imagem são armazenados em base64 no estado persistido local.

---

## 7) Fluxo de Uso (Resumo para Apresentação)

1. Usuário faz login no sistema.
2. Cadastra/edita produtos com dados técnicos e imagens.
3. Configura identidade da empresa (nome, slogan, logo).
4. Seleciona os produtos desejados para catálogo.
5. Visualiza prévia.
6. Gera e baixa o PDF final para envio ao cliente.

---

## 8) Diferenciais Já Entregues

- Cadastro técnico completo de produto em interface única.
- Upload estruturado de múltiplas categorias de imagem.
- Inclusão recente de anexos visuais para:
  - pintura;
  - marca do cliente.
- Catálogo com layout padronizado para apresentação comercial.
- Controle de acesso por perfil e módulo administrativo.

---

## 9) Limitações Conhecidas no Estado Atual

- Persistência local (sem backend/API centralizada).
- Armazenamento de imagens em base64 pode aumentar uso de memória/localStorage.
- Sem trilha de auditoria/histórico de alterações.
- Sem versionamento de catálogos.

---

## 10) Próximas Evoluções Recomendadas

- Integração com backend e banco de dados.
- Upload de imagens para storage externo (evitar base64 em localStorage).
- Versionamento de catálogo e templates.
- Relatórios e indicadores de uso.
- Recuperação de senha e políticas de autenticação mais robustas.

---

## 11) Conclusão Executiva

Até o momento, o aplicativo já cobre o ciclo principal de operação para criação de catálogo digital: autenticar usuário, cadastrar produto com especificações e imagens, configurar identidade da empresa e gerar PDF de apresentação com padrão visual consistente.

As funcionalidades recentes de anexar imagem em **Pintura** e **Marca do Cliente** ampliam a fidelidade visual do material final e reforçam a aderência do sistema ao processo comercial.
