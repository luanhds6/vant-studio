import type { Product } from "@/types/Product";

export type ProductFormDraftShape = Omit<Product, "id" | "createdAt" | "updatedAt">;

const STORAGE_KEY_PREFIX = "vant-produto-rascunho-v1";

export function productDraftStorageKey(hospitalId: string): string {
  return `${STORAGE_KEY_PREFIX}:${hospitalId}`;
}

function stripImagesFromForm(form: ProductFormDraftShape): ProductFormDraftShape {
  return {
    ...form,
    imagemPrincipal: "",
    detalhes: form.detalhes.map((d) => ({ ...d, imagem: "" })),
    pintura: { ...form.pintura, imagem: "" },
    marcaCliente: { ...form.marcaCliente, imagem: "" },
    timbrado: { ...form.timbrado, imagem: "" },
    rastreavel: { ...form.rastreavel, imagem: "" },
  };
}

export type SaveProductDraftResult =
  | { ok: true; imagesOmitted?: boolean }
  | { ok: false; reason: "quota" | "serialize" };

export function saveProductDraft(hospitalId: string, form: ProductFormDraftShape): SaveProductDraftResult {
  const wrap = (f: ProductFormDraftShape, imagesOmitted?: boolean) =>
    JSON.stringify({ v: 1 as const, savedAt: Date.now(), form: f, imagesOmitted: Boolean(imagesOmitted) });

  try {
    const full = wrap(form);
    if (full.length > 4_200_000) {
      const slim = stripImagesFromForm(form);
      sessionStorage.setItem(productDraftStorageKey(hospitalId), wrap(slim, true));
      return { ok: true, imagesOmitted: true };
    }
    sessionStorage.setItem(productDraftStorageKey(hospitalId), full);
    return { ok: true };
  } catch (e) {
    const isQuota =
      e instanceof DOMException && (e.name === "QuotaExceededError" || (e as DOMException).code === 22);
    if (isQuota) {
      try {
        const slim = stripImagesFromForm(form);
        sessionStorage.setItem(productDraftStorageKey(hospitalId), wrap(slim, true));
        return { ok: true, imagesOmitted: true };
      } catch {
        return { ok: false, reason: "quota" };
      }
    }
    return { ok: false, reason: "serialize" };
  }
}

export function loadProductDraft(hospitalId: string): {
  form: ProductFormDraftShape;
  imagesOmitted?: boolean;
} | null {
  try {
    const raw = sessionStorage.getItem(productDraftStorageKey(hospitalId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as {
      v?: number;
      form?: ProductFormDraftShape;
      imagesOmitted?: boolean;
    };
    if (parsed?.v !== 1 || !parsed.form || typeof parsed.form !== "object") return null;
    return { form: parsed.form, imagesOmitted: parsed.imagesOmitted };
  } catch {
    return null;
  }
}

export function clearProductDraft(hospitalId: string): void {
  try {
    sessionStorage.removeItem(productDraftStorageKey(hospitalId));
  } catch {
    /* ignore */
  }
}

export function isDraftMostlyEmpty(form: ProductFormDraftShape): boolean {
  const hasText =
    form.nome.trim() ||
    form.categoria.trim() ||
    form.referencia.trim() ||
    form.tecido.trim() ||
    form.tamanhos.length > 0 ||
    form.cores.length > 0 ||
    form.detalhes.some((d) => d.texto.trim() || Boolean(d.imagem)) ||
    form.dimensoes.some((d) => d.titulo.trim() || d.largura.trim() || d.altura.trim());
  const hasImages =
    Boolean(form.imagemPrincipal) ||
    form.detalhes.some((d) => Boolean(d.imagem)) ||
    Boolean(form.pintura.imagem) ||
    Boolean(form.marcaCliente.imagem) ||
    Boolean(form.timbrado.imagem) ||
    Boolean(form.rastreavel.imagem) ||
    form.timbrado.ativo ||
    form.rastreavel.ativo;
  return !hasText && !hasImages;
}
