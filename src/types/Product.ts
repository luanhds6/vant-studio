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
}

export interface Product {
  id: string;
  nome: string;
  categoria: string;
  referencia: string;
  tecido: string;
  tamanhos: string[];
  cores: ProductColor[];
  dimensoes: {
    largura: string;
    altura: string;
    unidade: string;
  };
  detalhes: { id: string; texto: string }[];
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
  createdAt: string;
  updatedAt: string;
}

export interface CompanySettings {
  logo: string; // base64
  nomeEmpresa: string;
  slogan: string;
}
