import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Product, CompanySettings, Hospital } from "@/types/Product";

const defaultSettings: CompanySettings = {
  logo: "",
  nomeEmpresa: "Minha Empresa",
  slogan: "",
};

const defaultHospital = (id: string): Hospital => ({
  id,
  nome: "Hospital padrão",
  cidade: "",
  createdAt: new Date().toISOString(),
});

interface ProductStore {
  hospitals: Hospital[];
  products: Product[];
  settings: CompanySettings;
  addHospital: (h: Hospital) => void;
  updateHospital: (h: Hospital) => void;
  deleteHospital: (id: string) => void;
  getHospital: (id: string) => Hospital | undefined;
  getProductsByHospital: (hospitalId: string) => Product[];
  addProduct: (product: Product) => void;
  updateProduct: (product: Product) => void;
  deleteProduct: (id: string) => void;
  getProduct: (id: string) => Product | undefined;
  updateSettings: (settings: Partial<CompanySettings>) => void;
}

type PersistedSlice = {
  hospitals?: Hospital[];
  products?: Product[];
  settings?: CompanySettings;
};

function ensureHospitalsAndProductLinks(p: PersistedSlice): Pick<ProductStore, "hospitals" | "products" | "settings"> {
  const products = (p.products ?? []) as Product[];
  if (p.hospitals && p.hospitals.length > 0) {
    const anchor = p.hospitals[0].id;
    return {
      hospitals: p.hospitals,
      products: products.map((pr) => ({
        ...pr,
        hospitalId: pr.hospitalId ?? anchor,
      })),
      settings: { ...defaultSettings, ...p.settings },
    };
  }
  const hid = crypto.randomUUID();
  return {
    hospitals: [defaultHospital(hid)],
    products: products.map((pr) => ({ ...pr, hospitalId: pr.hospitalId ?? hid })),
    settings: { ...defaultSettings, ...p.settings },
  };
}

export const useProductStore = create<ProductStore>()(
  persist(
    (set, get) => ({
      hospitals: [],
      products: [],
      settings: defaultSettings,

      addHospital: (h) => set((state) => ({ hospitals: [...state.hospitals, h] })),

      updateHospital: (h) =>
        set((state) => ({
          hospitals: state.hospitals.map((x) => (x.id === h.id ? h : x)),
        })),

      deleteHospital: (id) =>
        set((state) => ({
          hospitals: state.hospitals.filter((x) => x.id !== id),
          products: state.products.filter((p) => p.hospitalId !== id),
        })),

      getHospital: (id) => get().hospitals.find((h) => h.id === id),

      getProductsByHospital: (hospitalId) =>
        get().products.filter((p) => p.hospitalId === hospitalId),

      addProduct: (product) =>
        set((state) => ({ products: [...state.products, product] })),

      updateProduct: (product) =>
        set((state) => ({
          products: state.products.map((p) =>
            p.id === product.id ? { ...product, updatedAt: new Date().toISOString() } : p,
          ),
        })),

      deleteProduct: (id) =>
        set((state) => ({
          products: state.products.filter((p) => p.id !== id),
        })),

      getProduct: (id) => get().products.find((p) => p.id === id),

      updateSettings: (newSettings) =>
        set((state) => ({
          settings: { ...state.settings, ...newSettings },
        })),
    }),
    {
      name: "flux-catalog-store",
      version: 2,
      migrate: (persistedState) =>
        ensureHospitalsAndProductLinks((persistedState ?? {}) as PersistedSlice),
      merge: (persistedState, currentState) => {
        const p = (persistedState ?? {}) as PersistedSlice;
        const { hospitals, products, settings } = ensureHospitalsAndProductLinks(p);
        return Object.assign({}, currentState, {
          hospitals,
          products,
          settings,
        });
      },
    },
  ),
);
