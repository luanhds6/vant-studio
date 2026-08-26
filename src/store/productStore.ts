import { create } from "zustand";
import { persist, createJSONStorage, type StateStorage } from "zustand/middleware";
import { supabase } from "@/lib/supabase";
import { withTimeout } from "@/lib/withTimeout";
import { Product, CompanySettings, Hospital, type BaseColor } from "@/types/Product";

/** Inserções com várias imagens em base64 podem demorar; evita espera infinita na UI. */
const PRODUCT_WRITE_TIMEOUT_MS = 240_000;
const PRODUCT_WRITE_TIMEOUT_MSG =
  "O servidor não respondeu a tempo. Verifique a rede ou reduza o tamanho das imagens e tente novamente.";

const WRITE_RETRY_DELAY_MS = 2_000;

async function withProductWriteRetry<T>(run: () => Promise<T>): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      return await run();
    } catch (e) {
      lastErr = e;
      const isTimeout = e instanceof Error && e.message === PRODUCT_WRITE_TIMEOUT_MSG;
      if (!isTimeout || attempt === 1) throw e;
      await new Promise((r) => setTimeout(r, WRITE_RETRY_DELAY_MS));
    }
  }
  throw lastErr;
}

/** IDs estáveis quando o JSON antigo não traz `id` — evita snapshot de autosave mudar a cada chamada. */
function stableFallbackId(prefix: string, index: number, seed: string): string {
  let h = 2166136261 >>> 0;
  const str = `${prefix}|${index}|${seed}`;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return `${prefix}-tmp-${index}-${h.toString(16).padStart(8, "0")}`;
}

export function normalizeDimensoes(raw: unknown): Product["dimensoes"] {
  const block = (index: number, x: Record<string, unknown>): Product["dimensoes"][0] => {
    const titulo = typeof x.titulo === "string" ? x.titulo : "";
    const largura = typeof x.largura === "string" ? x.largura : "";
    const altura = typeof x.altura === "string" ? x.altura : "";
    const unidade = typeof x.unidade === "string" && x.unidade.length > 0 ? x.unidade : "cm";
    const id =
      typeof x.id === "string" && x.id.length > 0
        ? x.id
        : stableFallbackId("dim", index, `${titulo}\0${largura}\0${altura}\0${unidade}`);
    return { id, titulo, largura, altura, unidade };
  };

  if (Array.isArray(raw)) {
    const list = raw.map((item, i) => block(i, (item ?? {}) as Record<string, unknown>));
    return list.length > 0 ? list : [block(0, {})];
  }
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    const o = raw as { largura?: string; altura?: string; unidade?: string };
    return [
      block(0, {
        largura: o.largura ?? "",
        altura: o.altura ?? "",
        unidade: o.unidade ?? "cm",
        titulo: "",
      }),
    ];
  }
  return [block(0, {})];
}

function normalizeDetalhes(raw: unknown): Product["detalhes"] {
  if (!Array.isArray(raw)) return [];
  return raw.map((item, index) => {
    const d = item as { id?: string; texto?: string; imagem?: string };
    const texto = typeof d.texto === "string" ? d.texto : "";
    const imagem = typeof d.imagem === "string" ? d.imagem : "";
    return {
      id: typeof d.id === "string" && d.id.length > 0 ? d.id : stableFallbackId("det", index, `${texto}\0${imagem}`),
      texto,
      imagem,
    };
  });
}

function normalizeCoresArray(raw: unknown): Product["cores"] {
  if (!Array.isArray(raw)) return [];
  return raw.map((item, index) => {
    const c = item as { id?: string; nome?: string; hex?: string; fabricTypeId?: string };
    const nome = typeof c.nome === "string" ? c.nome : "";
    const hex = typeof c.hex === "string" && c.hex.length > 0 ? c.hex : "#000000";
    const fabricTypeId = typeof c.fabricTypeId === "string" && c.fabricTypeId.length > 0 ? c.fabricTypeId : "";
    return {
      id:
        typeof c.id === "string" && c.id.length > 0
          ? c.id
          : stableFallbackId("cor", index, `${nome}\0${hex}\0${fabricTypeId}`),
      nome,
      hex,
      fabricTypeId: fabricTypeId.length > 0 ? fabricTypeId : undefined,
    };
  });
}

function normalizeImagensDetalhe(raw: unknown): Product["imagensDetalhe"] {
  if (!Array.isArray(raw)) return [];
  return raw.map((item, index) => {
    const d = item as { id?: string; titulo?: string; imagem?: string; posicao?: string };
    const titulo = typeof d.titulo === "string" ? d.titulo : "";
    const imagem = typeof d.imagem === "string" ? d.imagem : "";
    const posicao = typeof d.posicao === "string" ? d.posicao : "";
    return {
      id:
        typeof d.id === "string" && d.id.length > 0
          ? d.id
          : stableFallbackId("imgd", index, `${titulo}\0${posicao}\0${imagem.slice(0, 64)}`),
      titulo,
      imagem,
      posicao,
    };
  });
}

/** Garante tipos e strings definidas para JSONB / PostgREST (evita undefined e formas antigas). */
export function prepareProductForPersistence(product: Product): Product {
  const pintura = product.pintura ?? { cor: "", tamanho: "", localizacao: "", imagem: "" };
  const marcaCliente = product.marcaCliente ?? { cor: "", tamanho: "", localizacao: "", imagem: "" };
  const nomeCampo = {
    texto: "",
    cor: "",
    tamanho: "",
    localizacao: "",
    ...(typeof product.nomeCampo === "object" && product.nomeCampo !== null ? product.nomeCampo : {}),
  };
  const timbrado = product.timbrado ?? { ativo: false, imagem: "" };
  const rastreavel = product.rastreavel ?? { ativo: false, imagem: "" };

  return {
    id: String(product.id ?? "").trim(),
    hospitalId: String(product.hospitalId ?? "").trim(),
    nome: String(product.nome ?? "").trim(),
    categoria: String(product.categoria ?? ""),
    referencia: String(product.referencia ?? ""),
    tecido: String(product.tecido ?? ""),
    tamanhos: Array.isArray(product.tamanhos) ? product.tamanhos.map((t) => String(t ?? "")) : [],
    cores: normalizeCoresArray(product.cores),
    dimensoes: normalizeDimensoes(product.dimensoes),
    detalhes: normalizeDetalhes(product.detalhes),
    imagemPrincipal: String(product.imagemPrincipal ?? ""),
    imagensDetalhe: normalizeImagensDetalhe(product.imagensDetalhe),
    pintura: {
      cor: String(pintura.cor ?? ""),
      tamanho: String(pintura.tamanho ?? ""),
      localizacao: String(pintura.localizacao ?? ""),
      imagem: String(pintura.imagem ?? ""),
    },
    marcaCliente: {
      cor: String(marcaCliente.cor ?? ""),
      tamanho: String(marcaCliente.tamanho ?? ""),
      localizacao: String(marcaCliente.localizacao ?? ""),
      imagem: String(marcaCliente.imagem ?? ""),
    },
    nomeCampo: {
      texto: String(nomeCampo.texto ?? ""),
      cor: String(nomeCampo.cor ?? ""),
      tamanho: String(nomeCampo.tamanho ?? ""),
      localizacao: String(nomeCampo.localizacao ?? ""),
    },
    timbrado: {
      ativo: Boolean(timbrado.ativo),
      imagem: String(timbrado.imagem ?? ""),
    },
    rastreavel: {
      ativo: Boolean(rastreavel.ativo),
      imagem: String(rastreavel.imagem ?? ""),
    },
    arquivado: Boolean(product.arquivado),
    createdAt: String(product.createdAt ?? new Date().toISOString()),
    updatedAt: String(product.updatedAt ?? new Date().toISOString()),
  };
}

function throwIfSupabaseError(error: { message?: string; details?: string; hint?: string } | null): void {
  if (!error) return;
  const msg = [error.message, error.details, error.hint]
    .map((x) => (x == null ? "" : String(x).trim()))
    .filter(Boolean)
    .join(" — ");
  throw new Error(msg.length > 0 ? msg : "Erro ao gravar no servidor.");
}

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
  addProducts: (
    products: Product[],
    onProgress?: (completed: number, total: number) => void,
  ) => Promise<void>;
  updateProduct: (product: Product) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  deleteProducts: (ids: string[]) => Promise<void>;
  archiveProducts: (ids: string[], arquivado?: boolean) => Promise<void>;

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
  /** Upserts + inserts + deletes numa sequência e um único fetch (edição de vínculos de cor). */
  applyColorEdits: (opts: {
    upserts: Omit<BaseColor, "createdAt">[];
    inserts: Omit<BaseColor, "createdAt">[];
    deleteIds: string[];
  }) => Promise<void>;
  
  updateSettings: (settings: Partial<CompanySettings>) => Promise<void>;
  
  getHospital: (id: string) => Hospital | undefined;
  getProductsByHospital: (hospitalId: string) => Product[];
  getProduct: (id: string) => Product | undefined;

  /** Sem sessão: limpa cache, remove Realtime e liberta o primeiro ecrã (login) sem esperar pelo fetch. */
  resetSession: () => void;
}

const REALTIME_DEBOUNCE_MS = 6_000;

let realtimeSubscribed = false;
let realtimeChannel: ReturnType<typeof supabase.channel> | null = null;
let realtimeDebounce: ReturnType<typeof setTimeout> | null = null;
let currentFetchId = 0;
let lastFetchTimestamp = 0;

function scheduleRealtimeRefetch(get: () => ProductStore) {
  if (realtimeDebounce) {
    clearTimeout(realtimeDebounce);
  }
  realtimeDebounce = setTimeout(() => {
    realtimeDebounce = null;
    const now = Date.now();
    // Throttle fetches so we don't spam disk reads on the Nano instance
    if (now - lastFetchTimestamp > 5_000) {
      lastFetchTimestamp = now;
      void get().fetchData();
    }
  }, REALTIME_DEBOUNCE_MS);
}

const indexedDBStorage: StateStorage = {
  getItem: async (name: string): Promise<string | null> => {
    return new Promise((resolve) => {
      const request = indexedDB.open("vant-studio-db", 1);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains("store")) {
          db.createObjectStore("store");
        }
      };
      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction("store", "readonly");
        const objectStore = transaction.objectStore("store");
        const getRequest = objectStore.get(name);
        getRequest.onsuccess = () => {
          resolve((getRequest.result as string) || null);
        };
        getRequest.onerror = () => resolve(null);
      };
      request.onerror = () => resolve(null);
    });
  },
  setItem: async (name: string, value: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open("vant-studio-db", 1);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains("store")) {
          db.createObjectStore("store");
        }
      };
      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction("store", "readwrite");
        const objectStore = transaction.objectStore("store");
        const putRequest = objectStore.put(value, name);
        putRequest.onsuccess = () => resolve();
        putRequest.onerror = () => reject(putRequest.error);
      };
      request.onerror = () => reject(request.error);
    });
  },
  removeItem: async (name: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open("vant-studio-db", 1);
      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction("store", "readwrite");
        const objectStore = transaction.objectStore("store");
        const deleteRequest = objectStore.delete(name);
        deleteRequest.onsuccess = () => resolve();
        deleteRequest.onerror = () => reject(deleteRequest.error);
      };
      request.onerror = () => reject(request.error);
    });
  },
};

export const useProductStore = create<ProductStore>()(
  persist(
    (set, get) => ({
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
      const fetchTablesPromise = Promise.all([
        supabase.from('hospitals').select('*').order('created_at', { ascending: true }),
        supabase.from('products').select('*').order('created_at', { ascending: true }),
        supabase.from('company_settings').select('*').limit(1),
        supabase.from('colors').select('*').order('nome', { ascending: true }),
        supabase.from('fabric_industries').select('*').order('nome', { ascending: true }),
        supabase.from('fabric_types').select('*').order('nome', { ascending: true })
      ]);

      const [hospitalsRes, productsRes, settingsRes, colorsRes, indRes, fabRes] = await Promise.race([
        fetchTablesPromise,
        new Promise<any[]>((_, reject) =>
          setTimeout(() => reject(new Error("Timeout ao buscar dados das tabelas")), 8000),
        ),
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
        cores: normalizeCoresArray(p.cores),
        dimensoes: normalizeDimensoes(p.dimensoes),
        detalhes: normalizeDetalhes(p.detalhes),
        imagemPrincipal: p.imagem_principal || '',
        imagensDetalhe: normalizeImagensDetalhe(p.imagens_detalhe),
        pintura: p.pintura || { cor: '', tamanho: '', localizacao: '', imagem: '' },
        marcaCliente: p.marca_cliente || { cor: '', tamanho: '', localizacao: '', imagem: '' },
        nomeCampo: {
          texto: "",
          cor: "",
          tamanho: "",
          localizacao: "",
          ...(typeof p.nome_campo === "object" && p.nome_campo !== null ? p.nome_campo : {}),
        },
        timbrado: p.timbrado || { ativo: false, imagem: '' },
        rastreavel: p.rastreavel || { ativo: false, imagem: '' },
        arquivado: Boolean(p.arquivado),
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
    const newH: Hospital = {
      id: h.id,
      nome: h.nome,
      cidade: h.cidade || '',
      createdAt: h.createdAt || new Date().toISOString(),
    };
    const { error } = await supabase.from('hospitals').insert({
      id: newH.id,
      nome: newH.nome,
      cidade: newH.cidade
    });
    if (error) {
      console.error('Erro ao adicionar hospital:', error);
      throw error;
    }
    set((state) => ({
      hospitals: state.hospitals.some((x) => x.id === newH.id)
        ? state.hospitals.map((x) => (x.id === newH.id ? newH : x))
        : [...state.hospitals, newH],
    }));
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
    set((state) => ({
      hospitals: state.hospitals.map((x) =>
        x.id === h.id ? { ...x, nome: h.nome, cidade: h.cidade || '' } : x
      ),
    }));
  },

  deleteHospital: async (id) => {
    const { error } = await supabase.from('hospitals').delete().eq('id', id);
    if (error) {
      console.error('Erro ao deletar hospital:', error);
      throw error;
    }
    set((state) => ({
      hospitals: state.hospitals.filter((x) => x.id !== id),
      products: state.products.filter((p) => p.hospitalId !== id),
    }));
  },

  addProduct: async (product) => {
    const safe = prepareProductForPersistence(product);
    const { error } = await withProductWriteRetry(() =>
      withTimeout(
        supabase.from('products').insert({
          id: safe.id,
          hospital_id: safe.hospitalId,
          nome: safe.nome,
          categoria: safe.categoria,
          referencia: safe.referencia,
          tecido: safe.tecido,
          tamanhos: safe.tamanhos,
          cores: safe.cores,
          dimensoes: safe.dimensoes,
          detalhes: safe.detalhes,
          imagem_principal: safe.imagemPrincipal,
          imagens_detalhe: safe.imagensDetalhe,
          pintura: safe.pintura,
          marca_cliente: safe.marcaCliente,
          nome_campo: safe.nomeCampo,
          timbrado: safe.timbrado,
          rastreavel: safe.rastreavel,
          arquivado: safe.arquivado,
        }),
        PRODUCT_WRITE_TIMEOUT_MS,
        PRODUCT_WRITE_TIMEOUT_MSG,
      ),
    );
    if (error) {
      console.group('❌ ERRO AO ADICIONAR PRODUTO');
      console.error('Mensagem:', error.message);
      console.error('Detalhes:', error.details);
      console.error('Código:', error.code);
      console.error('Dados Enviados:', safe);
      console.groupEnd();
      throwIfSupabaseError(error);
    }
    console.log('✅ Produto adicionado ao banco com sucesso.');
    set((state) => ({
      products: state.products.some((p) => p.id === safe.id)
        ? state.products.map((p) => (p.id === safe.id ? safe : p))
        : [...state.products, safe],
    }));
  },

  addProducts: async (
    newProducts: Product[],
    onProgress?: (completed: number, total: number) => void,
  ) => {
    const safeList = newProducts.map(prepareProductForPersistence);
    if (safeList.length === 0) return;

    const total = safeList.length;
    const CHUNK_SIZE = 5;
    for (let i = 0; i < safeList.length; i += CHUNK_SIZE) {
      const chunk = safeList.slice(i, i + CHUNK_SIZE);
      const rows = chunk.map((safe) => ({
        id: safe.id,
        hospital_id: safe.hospitalId,
        nome: safe.nome,
        categoria: safe.categoria,
        referencia: safe.referencia,
        tecido: safe.tecido,
        tamanhos: safe.tamanhos,
        cores: safe.cores,
        dimensoes: safe.dimensoes,
        detalhes: safe.detalhes,
        imagem_principal: safe.imagemPrincipal,
        imagens_detalhe: safe.imagensDetalhe,
        pintura: safe.pintura,
        marca_cliente: safe.marcaCliente,
        nome_campo: safe.nomeCampo,
        timbrado: safe.timbrado,
        rastreavel: safe.rastreavel,
        arquivado: safe.arquivado,
      }));

      const { error } = await withProductWriteRetry(() =>
        withTimeout(
          supabase.from('products').insert(rows),
          PRODUCT_WRITE_TIMEOUT_MS,
          PRODUCT_WRITE_TIMEOUT_MSG,
        ),
      );

      if (error) {
        console.error('❌ Erro ao adicionar lote de produtos:', error);
        throwIfSupabaseError(error);
      }

      if (onProgress) {
        const completed = Math.min(i + chunk.length, total);
        onProgress(completed, total);
      }
    }

    set((state) => {
      const existingIds = new Set(state.products.map((p) => p.id));
      const newItems = safeList.filter((p) => !existingIds.has(p.id));
      return {
        products: [...state.products, ...newItems],
      };
    });
  },

  updateProduct: async (product) => {
    const safe = prepareProductForPersistence(product);
    const { error } = await withProductWriteRetry(() =>
      withTimeout(
        supabase.from('products').update({
          nome: safe.nome,
          categoria: safe.categoria,
          referencia: safe.referencia,
          tecido: safe.tecido,
          tamanhos: safe.tamanhos,
          cores: safe.cores,
          dimensoes: safe.dimensoes,
          detalhes: safe.detalhes,
          imagem_principal: safe.imagemPrincipal,
          imagens_detalhe: safe.imagensDetalhe,
          pintura: safe.pintura,
          marca_cliente: safe.marcaCliente,
          nome_campo: safe.nomeCampo,
          timbrado: safe.timbrado,
          rastreavel: safe.rastreavel,
          arquivado: safe.arquivado,
          updated_at: new Date().toISOString(),
        }).eq('id', safe.id),
        PRODUCT_WRITE_TIMEOUT_MS,
        PRODUCT_WRITE_TIMEOUT_MSG,
      ),
    );
    if (error) {
      console.group('❌ ERRO AO ATUALIZAR PRODUTO');
      console.error('Mensagem:', error.message);
      console.error('Detalhes:', error.details);
      console.error('Código:', error.code);
      console.error('ID:', safe.id);
      console.groupEnd();
      throwIfSupabaseError(error);
    }
    console.log('✅ Produto atualizado no banco com sucesso.');
    set((state) => ({
      products: state.products.map((p) => (p.id === safe.id ? safe : p)),
    }));
  },

  deleteProduct: async (id) => {
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) {
      console.error('Erro ao deletar produto:', error);
      throw error;
    }
    set((state) => ({
      products: state.products.filter((p) => p.id !== id),
    }));
  },

  deleteProducts: async (ids) => {
    if (!ids.length) return;
    const { error } = await supabase.from('products').delete().in('id', ids);
    if (error) {
      console.error('Erro ao deletar produtos em lote:', error);
      throwIfSupabaseError(error);
    }
    set((state) => ({
      products: state.products.filter((p) => !ids.includes(p.id)),
    }));
  },

  archiveProducts: async (ids, arquivado = true) => {
    if (!ids.length) return;
    const { error } = await supabase
      .from('products')
      .update({ arquivado, updated_at: new Date().toISOString() })
      .in('id', ids);
    if (error) {
      console.error('Erro ao arquivar/desarquivar produtos:', error);
      throwIfSupabaseError(error);
    }
    set((state) => ({
      products: state.products.map((p) =>
        ids.includes(p.id) ? { ...p, arquivado } : p
      ),
    }));
  },

  addIndustry: async (industry) => {
    const newInd: FabricIndustry = {
      id: industry.id,
      nome: industry.nome,
      createdAt: new Date().toISOString(),
    };
    const { error } = await supabase.from('fabric_industries').insert({
      id: newInd.id,
      nome: newInd.nome
    });
    if (error) {
      console.error('Erro ao adicionar industria:', error);
      throw error;
    }
    set((state) => ({
      industries: state.industries.some((x) => x.id === newInd.id)
        ? state.industries.map((x) => (x.id === newInd.id ? newInd : x))
        : [...state.industries, newInd],
    }));
  },

  deleteIndustry: async (id) => {
    const { error } = await supabase.from('fabric_industries').delete().eq('id', id);
    if (error) {
      console.error('Erro ao deletar industria:', error);
      throw error;
    }
    set((state) => ({
      industries: state.industries.filter((x) => x.id !== id),
    }));
  },

  addFabricType: async (fabricType) => {
    const newFab: FabricType = {
      id: fabricType.id,
      industryId: fabricType.industryId,
      nome: fabricType.nome,
      createdAt: new Date().toISOString(),
    };
    const { error } = await supabase.from('fabric_types').insert({
      id: newFab.id,
      industry_id: newFab.industryId,
      nome: newFab.nome
    });
    if (error) {
      console.error('Erro ao adicionar tecido:', error);
      throw error;
    }
    set((state) => ({
      fabricTypes: state.fabricTypes.some((x) => x.id === newFab.id)
        ? state.fabricTypes.map((x) => (x.id === newFab.id ? newFab : x))
        : [...state.fabricTypes, newFab],
    }));
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
    set((state) => ({
      fabricTypes: state.fabricTypes.map((x) =>
        x.id === fabricType.id ? { ...x, ...fabricType } : x
      ),
    }));
  },

  deleteFabricType: async (id) => {
    const { error } = await supabase.from('fabric_types').delete().eq('id', id);
    if (error) {
      console.error('Erro ao deletar tecido:', error);
      throw error;
    }
    set((state) => ({
      fabricTypes: state.fabricTypes.filter((x) => x.id !== id),
      colors: state.colors.filter((c) => c.fabricTypeId !== id),
    }));
  },

  addColor: async (color) => {
    const newCol: BaseColor = {
      id: color.id,
      fabricTypeId: color.fabricTypeId,
      codigo: color.codigo,
      nome: color.nome,
      hex: color.hex,
      createdAt: new Date().toISOString(),
    };
    const { error } = await supabase.from('colors').insert({
      id: newCol.id,
      fabric_type_id: newCol.fabricTypeId,
      codigo: newCol.codigo,
      nome: newCol.nome,
      hex: newCol.hex
    });
    if (error) {
      console.error('Erro ao adicionar cor:', error);
      throw error;
    }
    set((state) => ({
      colors: state.colors.some((x) => x.id === newCol.id)
        ? state.colors.map((x) => (x.id === newCol.id ? newCol : x))
        : [...state.colors, newCol],
    }));
  },

  addColors: async (items) => {
    if (!items.length) return;
    const newCols: BaseColor[] = items.map((color) => ({
      id: color.id,
      fabricTypeId: color.fabricTypeId,
      codigo: color.codigo,
      nome: color.nome,
      hex: color.hex,
      createdAt: new Date().toISOString(),
    }));
    const { error } = await supabase.from('colors').insert(
      newCols.map((color) => ({
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
    set((state) => {
      const existingIds = new Set(state.colors.map((c) => c.id));
      const toAdd = newCols.filter((c) => !existingIds.has(c.id));
      return { colors: [...state.colors, ...toAdd] };
    });
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
    set((state) => ({
      colors: state.colors.map((c) =>
        c.id === color.id ? { ...c, ...color } : c
      ),
    }));
  },

  deleteColor: async (id) => {
    const { error } = await supabase.from('colors').delete().eq('id', id);
    if (error) {
      console.error('Erro ao deletar cor:', error);
      throw error;
    }
    set((state) => ({
      colors: state.colors.filter((c) => c.id !== id),
    }));
  },

  deleteColors: async (ids) => {
    if (!ids.length) return;
    const { error } = await supabase.from('colors').delete().in('id', ids);
    if (error) {
      console.error('Erro ao deletar cores em lote:', error);
      throw error;
    }
    set((state) => ({
      colors: state.colors.filter((c) => !ids.includes(c.id)),
    }));
  },

  applyColorEdits: async ({ upserts, inserts, deleteIds }) => {
    if (deleteIds.length) {
      const { error } = await supabase.from('colors').delete().in('id', deleteIds);
      if (error) {
        console.error('Erro ao remover vínculos de cor:', error);
        throw error;
      }
    }
    if (upserts.length) {
      const { error } = await supabase.from('colors').upsert(
        upserts.map((c) => ({
          id: c.id,
          fabric_type_id: c.fabricTypeId,
          codigo: c.codigo,
          nome: c.nome,
          hex: c.hex,
        })),
        { onConflict: 'id' },
      );
      if (error) {
        console.error('Erro ao atualizar cores:', error);
        throw error;
      }
    }
    if (inserts.length) {
      const { error } = await supabase.from('colors').insert(
        inserts.map((c) => ({
          id: c.id,
          fabric_type_id: c.fabricTypeId,
          codigo: c.codigo,
          nome: c.nome,
          hex: c.hex,
        })),
      );
      if (error) {
        console.error('Erro ao inserir novos vínculos de cor:', error);
        throw error;
      }
    }
    set((state) => {
      let updated = state.colors;
      if (deleteIds.length) {
        const delSet = new Set(deleteIds);
        updated = updated.filter((c) => !delSet.has(c.id));
      }
      if (upserts.length) {
        const upMap = new Map(upserts.map((u) => [u.id, u]));
        updated = updated.map((c) => upMap.get(c.id) ? { ...c, ...upMap.get(c.id)! } : c);
      }
      if (inserts.length) {
        const newItems: BaseColor[] = inserts.map((ins) => ({
          id: ins.id,
          fabricTypeId: ins.fabricTypeId,
          codigo: ins.codigo,
          nome: ins.nome,
          hex: ins.hex,
          createdAt: new Date().toISOString(),
        }));
        updated = [...updated, ...newItems];
      }
      return { colors: updated };
    });
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
      set({ settings: updated });
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
    }),
    {
      name: "vant-product-storage",
      storage: createJSONStorage(() => indexedDBStorage),
      partialize: (state) => ({
        hospitals: state.hospitals,
        products: state.products,
        colors: state.colors,
        industries: state.industries,
        fabricTypes: state.fabricTypes,
        settings: state.settings,
      }),
    }
  )
);
