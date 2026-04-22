import { create } from "zustand";
import { supabase } from "@/lib/supabase";
import { Product, CompanySettings, Hospital, type BaseColor } from "@/types/Product";

const defaultSettings: CompanySettings = {
  logo: "",
  nomeEmpresa: "Minha Empresa",
  slogan: "",
};

interface ProductStore {
  hospitals: Hospital[];
  products: Product[];
  colors: BaseColor[];
  settings: CompanySettings;
  isLoading: boolean;
  
  initialize: () => Promise<void>;
  fetchData: () => Promise<void>;
  
  addHospital: (h: Hospital) => Promise<void>;
  updateHospital: (h: Hospital) => Promise<void>;
  deleteHospital: (id: string) => Promise<void>;
  
  addProduct: (product: Product) => Promise<void>;
  updateProduct: (product: Product) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;

  addColor: (color: Omit<BaseColor, 'createdAt'>) => Promise<void>;
  deleteColor: (id: string) => Promise<void>;
  
  updateSettings: (settings: Partial<CompanySettings>) => Promise<void>;
  
  getHospital: (id: string) => Hospital | undefined;
  getProductsByHospital: (hospitalId: string) => Product[];
  getProduct: (id: string) => Product | undefined;
}

const REALTIME_DEBOUNCE_MS = 400;

let realtimeSubscribed = false;
let realtimeDebounce: ReturnType<typeof setTimeout> | null = null;
let fetchInflight: Promise<void> | null = null;

function scheduleRealtimeRefetch(get: () => ProductStore) {
  if (realtimeDebounce) {
    clearTimeout(realtimeDebounce);
  }
  realtimeDebounce = setTimeout(() => {
    realtimeDebounce = null;
    void get().fetchData();
  }, REALTIME_DEBOUNCE_MS);
}

export const useProductStore = create<ProductStore>((set, get) => ({
  hospitals: [],
  products: [],
  colors: [],
  settings: defaultSettings,
  isLoading: true,

  initialize: async () => {
    try {
      await get().fetchData();

      /* Um único canal + debounce: evita canais Realtime em duplicado (Strict Mode / re-init) e
         rajadas de fetch a cada evento. */
      if (realtimeSubscribed) return;
      realtimeSubscribed = true;

      const channel = supabase
        .channel("app-data-listeners")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "hospitals" },
          () => scheduleRealtimeRefetch(get),
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "products" },
          () => scheduleRealtimeRefetch(get),
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "company_settings" },
          () => scheduleRealtimeRefetch(get),
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "colors" },
          () => scheduleRealtimeRefetch(get),
        )
        .subscribe((status) => {
          if (status === "CHANNEL_ERROR") {
            console.error("Erro na subscrição Realtime (app-data-listeners)");
          }
        });
      void channel;
    } catch (err) {
      console.error("Erro ao inicializar subscrições Realtime:", err);
    }
  },

  fetchData: async () => {
    if (fetchInflight) {
      return fetchInflight;
    }
    fetchInflight = (async () => {
    try {
      const [hospitalsRes, productsRes, settingsRes, colorsRes] = await Promise.all([
        supabase.from('hospitals').select('*').order('created_at', { ascending: true }),
        supabase.from('products').select('*').order('created_at', { ascending: true }),
        supabase.from('company_settings').select('*').limit(1),
        supabase.from('colors').select('*').order('nome', { ascending: true })
      ]);

      if (hospitalsRes.error) console.error("Error fetching hospitals:", hospitalsRes.error);
      if (productsRes.error) console.error("Error fetching products:", productsRes.error);
      if (colorsRes.error) console.error("Error fetching colors:", colorsRes.error);

      const hospitals: Hospital[] = (hospitalsRes.data || []).map(h => ({
        id: h.id,
        nome: h.nome,
        cidade: h.cidade || '',
        createdAt: h.created_at
      }));

      const products: Product[] = (productsRes.data || []).map(p => ({
        id: p.id,
        hospitalId: p.hospital_id,
        nome: p.nome,
        categoria: p.categoria || '',
        referencia: p.referencia || '',
        tecido: p.tecido || '',
        tamanhos: p.tamanhos || [],
        cores: p.cores || [],
        dimensoes: p.dimensoes || { largura: '', altura: '', unidade: '' },
        detalhes: p.detalhes || [],
        imagemPrincipal: p.imagem_principal || '',
        imagensDetalhe: p.imagens_detalhe || [],
        pintura: p.pintura || { cor: '', tamanho: '', localizacao: '', imagem: '' },
        marcaCliente: p.marca_cliente || { cor: '', tamanho: '', localizacao: '', imagem: '' },
        nomeCampo: p.nome_campo || { texto: '', cor: '', tamanho: '', localizacao: '' },
        timbrado: p.timbrado || { ativo: false, imagem: '' },
        rastreavel: p.rastreavel || { ativo: false, imagem: '' },
        createdAt: p.created_at,
        updatedAt: p.updated_at
      }));

      const sData = settingsRes.data?.[0];
      const settings: CompanySettings = sData ? {
        logo: sData.logo || '',
        nomeEmpresa: sData.nome_empresa || '',
        slogan: sData.slogan || ''
      } : defaultSettings;

      const colors: BaseColor[] = (colorsRes.data || []).map(c => ({
        id: c.id,
        nome: c.nome,
        hex: c.hex,
        createdAt: c.created_at
      }));

      set({ hospitals, products, settings, colors, isLoading: false });
    } catch (err) {
      console.error("Critical error in fetchData:", err);
      set({ isLoading: false });
    } finally {
      fetchInflight = null;
    }
    })();
    return fetchInflight;
  },

  addHospital: async (h) => {
    const { error } = await supabase.from('hospitals').insert({
      id: h.id,
      nome: h.nome,
      cidade: h.cidade
    });
    if (error) {
      console.error('Erro ao adicionar hospital:', error);
      throw error;
    }
    await get().fetchData();
  },

  updateHospital: async (h) => {
    const { error } = await supabase.from('hospitals').update({
      nome: h.nome,
      cidade: h.cidade
    }).eq('id', h.id);
    if (error) {
      console.error('Erro ao atualizar hospital:', error);
      throw error;
    }
    await get().fetchData();
  },

  deleteHospital: async (id) => {
    const { error } = await supabase.from('hospitals').delete().eq('id', id);
    if (error) {
      console.error('Erro ao deletar hospital:', error);
      throw error;
    }
    await get().fetchData();
  },

  addProduct: async (product) => {
    const { error } = await supabase.from('products').insert({
      id: product.id,
      hospital_id: product.hospitalId,
      nome: product.nome,
      categoria: product.categoria,
      referencia: product.referencia,
      tecido: product.tecido,
      tamanhos: product.tamanhos,
      cores: product.cores,
      dimensoes: product.dimensoes,
      detalhes: product.detalhes,
      imagem_principal: product.imagemPrincipal,
      imagens_detalhe: product.imagensDetalhe,
      pintura: product.pintura,
      marca_cliente: product.marcaCliente,
      nome_campo: product.nomeCampo,
      timbrado: product.timbrado,
      rastreavel: product.rastreavel
    });
    if (error) {
      console.group('❌ ERRO AO ADICIONAR PRODUTO');
      console.error('Mensagem:', error.message);
      console.error('Detalhes:', error.details);
      console.error('Código:', error.code);
      console.error('Dados Enviados:', product);
      console.groupEnd();
      throw error;
    }
    console.log('✅ Produto adicionado ao banco com sucesso.');
    // Não damos await no fetchData aqui para não travar a UI. 
    // O Realtime já vai disparar o fetch automaticamente.
    get().fetchData(); 
  },

  updateProduct: async (product) => {
    const { error } = await supabase.from('products').update({
      nome: product.nome,
      categoria: product.categoria,
      referencia: product.referencia,
      tecido: product.tecido,
      tamanhos: product.tamanhos,
      cores: product.cores,
      dimensoes: product.dimensoes,
      detalhes: product.detalhes,
      imagem_principal: product.imagemPrincipal,
      imagens_detalhe: product.imagensDetalhe,
      pintura: product.pintura,
      marca_cliente: product.marcaCliente,
      nome_campo: product.nomeCampo,
      timbrado: product.timbrado,
      rastreavel: product.rastreavel,
      updated_at: new Date().toISOString()
    }).eq('id', product.id);
    if (error) {
      console.group('❌ ERRO AO ATUALIZAR PRODUTO');
      console.error('Mensagem:', error.message);
      console.error('Detalhes:', error.details);
      console.error('Código:', error.code);
      console.error('ID:', product.id);
      console.groupEnd();
      throw error;
    }
    console.log('✅ Produto atualizado no banco com sucesso.');
    get().fetchData();
  },

  deleteProduct: async (id) => {
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) {
      console.error('Erro ao deletar produto:', error);
      throw error;
    }
    await get().fetchData();
  },

  addColor: async (color) => {
    const { error } = await supabase.from('colors').insert({
      id: color.id,
      nome: color.nome,
      hex: color.hex
    });
    if (error) {
      console.error('Erro ao adicionar cor:', error);
      throw error;
    }
    await get().fetchData();
  },

  deleteColor: async (id) => {
    const { error } = await supabase.from('colors').delete().eq('id', id);
    if (error) {
      console.error('Erro ao deletar cor:', error);
      throw error;
    }
    await get().fetchData();
  },

  updateSettings: async (newSettings) => {
    try {
      const { settings } = get();
      const updated = { ...settings, ...newSettings };
      
      const { data: existing, error: fetchError } = await supabase.from('company_settings').select('id').limit(1);
      
      if (fetchError) {
        console.error('Erro ao buscar configurações existentes:', fetchError);
        throw fetchError;
      }

      if (existing && existing.length > 0) {
        const { error: updateError } = await supabase.from('company_settings').update({
          logo: updated.logo,
          nome_empresa: updated.nomeEmpresa,
          slogan: updated.slogan
        }).eq('id', existing[0].id);

        if (updateError) {
          console.error('Erro ao atualizar configurações da empresa:', updateError);
          throw updateError;
        }
      } else {
        const { error: insertError } = await supabase.from('company_settings').insert({
          logo: updated.logo,
          nome_empresa: updated.nomeEmpresa,
          slogan: updated.slogan
        });

        if (insertError) {
          console.error('Erro ao inserir configurações da empresa:', insertError);
          throw insertError;
        }
      }
      await get().fetchData();
    } catch (err) {
      console.error('Erro crítico no updateSettings:', err);
      throw err;
    }
  },

  getHospital: (id) => get().hospitals.find((h) => h.id === id),

  getProductsByHospital: (hospitalId) =>
    get().products.filter((p) => p.hospitalId === hospitalId),

  getProduct: (id) => get().products.find((p) => p.id === id),
}));
