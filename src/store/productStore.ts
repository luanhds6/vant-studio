import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Product, CompanySettings } from '@/types/Product';

interface ProductStore {
  products: Product[];
  settings: CompanySettings;
  addProduct: (product: Product) => void;
  updateProduct: (product: Product) => void;
  deleteProduct: (id: string) => void;
  getProduct: (id: string) => Product | undefined;
  updateSettings: (settings: Partial<CompanySettings>) => void;
}

export const useProductStore = create<ProductStore>()(
  persist(
    (set, get) => ({
      products: [],
      settings: {
        logo: '',
        nomeEmpresa: 'Minha Empresa',
        slogan: '',
      },
      addProduct: (product) =>
        set((state) => ({ products: [...state.products, product] })),
      updateProduct: (product) =>
        set((state) => ({
          products: state.products.map((p) =>
            p.id === product.id ? { ...product, updatedAt: new Date().toISOString() } : p
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
      name: 'flux-catalog-store',
    }
  )
);
