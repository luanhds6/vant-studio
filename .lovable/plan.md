

# Flux - Sistema de Catálogo Digital

## Entendimento do Modelo

Cada página do catálogo segue um layout técnico padronizado com:
- Logo da empresa (topo esquerdo)
- Nome do produto em banner laranja
- Desenhos técnicos do produto com cotas/dimensões
- Informações: tecido, tamanho, cores disponíveis
- Seção "Pintura" (etiqueta/carimbo)
- Seção "Marca do Cliente"
- Seção "Nome do campo" ou detalhes adicionais
- Miniaturas mostrando localização de cada detalhe

## Arquitetura

Sistema web com dados salvos no **localStorage** (sem backend), gerando catálogos em **PDF** com layout similar ao modelo.

## Estrutura de Páginas

1. **Dashboard** (`/`) - Lista de produtos cadastrados, botão gerar catálogo
2. **Cadastro de Produto** (`/produto/novo` e `/produto/:id`) - Formulário completo
3. **Visualização do Catálogo** (`/catalogo`) - Preview e exportação PDF
4. **Configurações** (`/config`) - Logo da empresa, marca do cliente

## Modelo de Dados do Produto

```text
Produto {
  nome, categoria,
  tecido, tamanhos[], cores[],
  dimensoes { largura, altura, unidade },
  detalhes[] { icone, texto },  // ex: "bainha de 1cm"
  imagemPrincipal (desenho técnico),
  imagensDetalhe[] { imagem, titulo, posicao },
  pintura { cor, tamanho, localizacao },
  marcaCliente { cor, tamanho, localizacao },
  nomecampo { texto, cor, tamanho, localizacao }
}
```

## Implementação

### 1. Layout e navegação
- Sidebar com logo "Flux", links: Produtos, Novo Produto, Gerar Catálogo, Configurações
- Design limpo, cores neutras com acento laranja (referência ao modelo)

### 2. Formulário de cadastro de produto
- Campos organizados em seções: Informações Básicas, Dimensões, Cores, Detalhes Técnicos, Imagens, Pintura/Marca
- Upload de imagens (desenho técnico principal + detalhes)
- Campos dinâmicos para adicionar múltiplas cores, tamanhos e detalhes

### 3. Geração do catálogo (PDF)
- Usar **html2canvas + jsPDF** ou **@react-pdf/renderer** para gerar PDF
- Cada produto = 1 página no layout do modelo:
  - Topo: logo + banner laranja com nome
  - Esquerda: imagem técnica com cotas
  - Direita: seções Pintura, Marca do Cliente, Nome do Campo
  - Rodapé: tecido, tamanho, cores

### 4. Armazenamento
- localStorage para produtos e configurações
- Imagens como base64 no localStorage

## Arquivos a criar/modificar

| Arquivo | Descrição |
|---------|-----------|
| `src/types/Product.ts` | Tipos TypeScript |
| `src/store/productStore.ts` | Zustand store com localStorage |
| `src/pages/Dashboard.tsx` | Lista de produtos |
| `src/pages/ProductForm.tsx` | Formulário CRUD |
| `src/pages/CatalogPreview.tsx` | Preview + gerar PDF |
| `src/pages/Settings.tsx` | Config empresa/cliente |
| `src/components/catalog/CatalogPage.tsx` | Layout de 1 página do catálogo |
| `src/components/layout/AppSidebar.tsx` | Navegação lateral |
| `src/App.tsx` | Rotas |
| `src/index.css` | Tema laranja |

## Dependências

- `zustand` - gerenciamento de estado
- `@react-pdf/renderer` - geração de PDF
- `react-dropzone` - upload de imagens
- `lucide-react` (já instalado) - ícones

