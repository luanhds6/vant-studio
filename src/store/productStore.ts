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
  industries: FabricIndustry[];
  fabricTypes: FabricType[];
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

  addIndustry: (industry: Omit<FabricIndustry, 'createdAt'>) => Promise<void>;
  deleteIndustry: (id: string) => Promise<void>;

  addFabricType: (fabricType: Omit<FabricType, 'createdAt'>) => Promise<void>;
  updateFabricType: (fabricType: Omit<FabricType, 'createdAt'>) => Promise<void>;
  deleteFabricType: (id: string) => Promise<void>;

  addColor: (color: Omit<BaseColor, 'createdAt'>) => Promise<void>;
  /** Várias cores numa única gravação + um fetch (evita UI “congelada” com vários tecidos). */
  addColors: (colors: Omit<BaseColor, 'createdAt'>[]) => Promise<void>;
  updateColor: (color: Omit<BaseColor, 'createdAt'>) => Promise<void>;
  deleteColor: (id: string) => Promise<void>;
  deleteColors: (ids: string[]) => Promise<void>;
  
  updateSettings: (settings: Partial<CompanySettings>) => Promise<void>;
  
  getHospital: (id: string) => Hospital | undefined;
  getProductsByHospital: (hospitalId: string) => Product[];
  getProduct: (id: string) => Product | undefined;

  /** Sem sessão: limpa cache, remove Realtime e liberta o primeiro ecrã (login) sem esperar pelo fetch. */
  resetSession: () => void;
}

const REALTIME_DEBOUNCE_MS = 400;

let realtimeSubscribed = false;
let realtimeChannel: ReturnType<typeof supabase.channel> | null = null;
let realtimeDebounce: ReturnType<typeof setTimeout> | null = null;
let currentFetchId = 0;

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
  industries: [],
  fabricTypes: [],
  settings: defaultSettings,
  isLoading: true,

  initialize: async () => {
    set({ isLoading: true });
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
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "fabric_industries" },
          () => scheduleRealtimeRefetch(get),
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "fabric_types" },
          () => scheduleRealtimeRefetch(get),
        )
        .subscribe((status) => {
          if (status === "CHANNEL_ERROR") {
            console.error("Erro na subscrição Realtime (app-data-listeners)");
          }
        });
      realtimeChannel = channel;
    } catch (err) {
      console.error("Erro ao inicializar subscrições Realtime:", err);
    }
  },

  fetchData: async () => {
    const fetchId = ++currentFetchId;

    try {
      const [hospitalsRes, productsRes, settingsRes, colorsRes, indRes, fabRes] = await Promise.all([
        supabase.from('hospitals').select('*').order('created_at', { ascending: true }),
        supabase.from('products').select('*').order('created_at', { ascending: true }),
        supabase.from('company_settings').select('*').limit(1),
        supabase.from('colors').select('*').order('nome', { ascending: true }),
        supabase.from('fabric_industries').select('*').order('nome', { ascending: true }),
        supabase.from('fabric_types').select('*').order('nome', { ascending: true })
      ]);

      if (fetchId !== currentFetchId) {
        console.log("Ignorando fetch obsoleto", fetchId);
        return;
      }


      if (hospitalsRes.error) console.error("Error fetching hospitals:", hospitalsRes.error);
      if (productsRes.error) console.error("Error fetching products:", productsRes.error);
      if (colorsRes.error) console.error("Error fetching colors:", colorsRes.error);
      if (indRes.error) console.error("Error fetching industries:", indRes.error);
      if (fabRes.error) console.error("Error fetching fabric types:", fabRes.error);

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
        fabricTypeId: c.fabric_type_id,
        codigo: c.codigo,
        nome: c.nome,
        hex: c.hex,
        createdAt: c.created_at
      }));

      const industries: FabricIndustry[] = (indRes.data || []).map(i => ({
        id: i.id,
        nome: i.nome,
        createdAt: i.created_at
      }));

      const fabricTypes: FabricType[] = (fabRes.data || []).map(f => ({
        id: f.id,
        industryId: f.industry_id,
        nome: f.nome,
        createdAt: f.created_at
      }));

      set({ hospitals, products, settings, colors, industries, fabricTypes, isLoading: false });
    } catch (err) {
      console.error("Critical error in fetchData:", err);
      set({ isLoading: false });
    }
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

  addIndustry: async (industry) => {
    const { error } = await supabase.from('fabric_industries').insert({
      id: industry.id,
      nome: industry.nome
    });
    if (error) {
      console.error('Erro ao adicionar industria:', error);
      throw error;
    }
    await get().fetchData();
  },

  deleteIndustry: async (id) => {
    const { error } = await supabase.from('fabric_industries').delete().eq('id', id);
    if (error) {
      console.error('Erro ao deletar industria:', error);
      throw error;
    }
    await get().fetchData();
  },

  addFabricType: async (fabricType) => {
    const { error } = await supabase.from('fabric_types').insert({
      id: fabricType.id,
      industry_id: fabricType.industryId,
      nome: fabricType.nome
    });
    if (error) {
      console.error('Erro ao adicionar tecido:', error);
      throw error;
    }
    await get().fetchData();
  },

  updateFabricType: async (fabricType) => {
    const { error } = await supabase.from('fabric_types').update({
      industry_id: fabricType.industryId,
      nome: fabricType.nome
    }).eq('id', fabricType.id);
    if (error) {
      console.error('Erro ao atualizar tecido:', error);
      throw error;
    }
    await get().fetchData();
  },

  deleteFabricType: async (id) => {
    const { error } = await supabase.from('fabric_types').delete().eq('id', id);
    if (error) {
      console.error('Erro ao deletar tecido:', error);
      throw error;
    }
    await get().fetchData();
  },

  addColor: async (color) => {
    const { error } = await supabase.from('colors').insert({
      id: color.id,
      fabric_type_id: color.fabricTypeId,
      codigo: color.codigo,
      nome: color.nome,
      hex: color.hex
    });
    if (error) {
      console.error('Erro ao adicionar cor:', error);
      throw error;
    }
    await get().fetchData();
  },

  addColors: async (items) => {
    if (!items.length) return;
    const { error } = await supabase.from('colors').insert(
      items.map((color) => ({
        id: color.id,
        fabric_type_id: color.fabricTypeId,
        codigo: color.codigo,
        nome: color.nome,
        hex: color.hex,
      })),
    );
    if (error) {
      console.error('Erro ao adicionar cores:', error);
      throw error;
    }
    await get().fetchData();
  },

  updateColor: async (color) => {
    const { error } = await supabase.from('colors').upsert({
      id: color.id,
      fabric_type_id: color.fabricTypeId,
      codigo: color.codigo,
      nome: color.nome,
      hex: color.hex
    }, {
      onConflict: 'id'
    });
    if (error) {
      console.error('Erro ao atualizar cor:', error);
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

  deleteColors: async (ids) => {
    if (!ids.length) return;
    const { error } = await supabase.from('colors').delete().in('id', ids);
    if (error) {
      console.error('Erro ao deletar cores em lote:', error);
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
        const { error: insertError } = await supabase.from("company_settings").insert({
          id: crypto.randomUUID(),
          logo: updated.logo,
          nome_empresa: updated.nomeEmpresa,
          slogan: updated.slogan,
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

  resetSession: () => {
    if (realtimeDebounce) {
      clearTimeout(realtimeDebounce);
      realtimeDebounce = null;
    }
    if (realtimeChannel) {
      void supabase.removeChannel(realtimeChannel);
      realtimeChannel = null;
    }
    realtimeSubscribed = false;
    // Invalida respostas assíncronas de fetchData iniciadas antes do logout/reset.
    currentFetchId += 1;
    set({
      hospitals: [],
      products: [],
      colors: [],
      industries: [],
      fabricTypes: [],
      settings: defaultSettings,
      isLoading: false,
    });
  },
}));
