export interface ProductDetail {
  id: string;
  titulo: string;
  imagem: string; // base64
  posicao: string;
}

export interface ProductColor {
  id: string;
  nome: string;
  hex: string;
  fabricTypeId?: string;
}

export interface FabricIndustry {
  id: string;
  nome: string;
  createdAt: string;
}

export interface FabricType {
  id: string;
  industryId: string;
  nome: string;
  createdAt: string;
}

export interface BaseColor {
  id: string;
  fabricTypeId?: string;
  codigo?: string;
  nome: string;
  hex: string;
  createdAt: string;
}

/** Hospital: produtos e catálogos ficam agrupados por hospital */
export interface Hospital {
  id: string;
  nome: string;
  cidade: string;
  createdAt: string;
}

/** Linha de detalhe técnico (lista numerada no catálogo). */
export interface ProductTechnicalDetail {
  id: string;
  texto: string;
  /** Imagem de exemplo opcional (base64), exibida ao lado do texto. */
  imagem: string;
}

/** Bloco de medidas (ex.: corpo, bolso, barra, elástico). */
export interface ProductDimensionBlock {
  id: string;
  titulo: string;
  largura: string;
  altura: string;
  unidade: string;
}

export interface Product {
  id: string;
  /** Produto pertence a um único hospital */
  hospitalId: string;
  nome: string;
  categoria: string;
  referencia: string;
  tecido: string;
  tamanhos: string[];
  cores: ProductColor[];
  dimensoes: ProductDimensionBlock[];
  detalhes: ProductTechnicalDetail[];
  imagemPrincipal: string; // base64
  imagensDetalhe: ProductDetail[];
  pintura: {
    cor: string;
    tamanho: string;
    localizacao: string;
    imagem: string; // base64
  };
  marcaCliente: {
    cor: string;
    tamanho: string;
    localizacao: string;
    imagem: string; // base64
  };
  nomeCampo: {
    texto: string;
    cor: string;
    tamanho: string;
    localizacao: string;
  };
  timbrado: {
    ativo: boolean;
    imagem: string; // base64
  };
  rastreavel: {
    ativo: boolean;
    imagem: string; // base64
  };
  createdAt: string;
  updatedAt: string;
}

export interface CompanySettings {
  logo: string; // base64
  nomeEmpresa: string;
  slogan: string;
}
