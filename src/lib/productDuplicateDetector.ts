import { Product } from "@/types/Product";

/**
 * Normaliza strings para comparação insensível a acentos, pontuação,
 * espaços múltiplos e maiúsculas/minúsculas.
 */
export function normalizeProductKey(str: string | undefined | null): string {
  if (!str) return "";
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove acentos
    .replace(/[^a-z0-9]/g, "") // Remove caracteres não alfanuméricos
    .trim();
}

export interface DuplicateCheckResult {
  isDuplicate: boolean;
  duplicateReason?: string;
  matchedProduct?: Product;
}

/**
 * Verifica se um produto candidato já existe em uma lista de produtos cadastrados.
 * Critérios de duplicidade:
 * 1. Mesmo ID existente (se ID for válido)
 * 2. Mesma Referência cadastrada (se ambos tiverem referência preenchida)
 * 3. Mesmo Nome de produto (normalizado)
 */
export function isDuplicateProduct(
  candidate: Pick<Product, "id" | "nome" | "referencia">,
  existingList: Product[],
): DuplicateCheckResult {
  const normCandidateName = normalizeProductKey(candidate.nome);
  const normCandidateRef = normalizeProductKey(candidate.referencia);
  const candidateId = candidate.id?.trim();

  for (const existing of existingList) {
    // 1. Verificação por ID
    if (candidateId && existing.id && candidateId === existing.id) {
      return {
        isDuplicate: true,
        duplicateReason: `ID já existente no sistema (${existing.nome})`,
        matchedProduct: existing,
      };
    }

    // 2. Verificação por Referência (se ambos tiverem referência preenchida)
    const normExistingRef = normalizeProductKey(existing.referencia);
    if (normCandidateRef && normExistingRef && normCandidateRef === normExistingRef) {
      return {
        isDuplicate: true,
        duplicateReason: `Referência «${existing.referencia}» já cadastrada (${existing.nome})`,
        matchedProduct: existing,
      };
    }

    // 3. Verificação por Nome (normalizado)
    const normExistingName = normalizeProductKey(existing.nome);
    if (normCandidateName && normExistingName && normCandidateName === normExistingName) {
      return {
        isDuplicate: true,
        duplicateReason: `Produto «${existing.nome}» já cadastrado no sistema`,
        matchedProduct: existing,
      };
    }
  }

  return { isDuplicate: false };
}

export interface AnalyzedImportProduct {
  product: Product;
  originalIndex: number;
  isDuplicate: boolean;
  duplicateReason?: string;
  matchedProduct?: Product;
  isDuplicateInFile?: boolean;
}

export interface BatchAnalysisResult {
  analyzedProducts: AnalyzedImportProduct[];
  totalCount: number;
  newCount: number;
  duplicateCount: number;
  isAllDuplicates: boolean;
  initialSelectedIndices: Set<number>;
}

/**
 * Analisa uma lista de produtos a importar contra os produtos já existentes no hospital.
 * Identifica:
 * - Produtos que já existem no banco de dados
 * - Produtos repetidos dentro do próprio arquivo
 * - Produtos novos elegíveis para importação
 */
export function analyzeImportBatch(
  parsedProducts: Product[],
  existingHospitalProducts: Product[],
): BatchAnalysisResult {
  const analyzedProducts: AnalyzedImportProduct[] = [];
  const initialSelectedIndices = new Set<number>();

  const seenInFileNames = new Set<string>();
  const seenInFileRefs = new Set<string>();

  let newCount = 0;
  let duplicateCount = 0;

  parsedProducts.forEach((product, originalIndex) => {
    // 1. Checa se já existe no banco do hospital
    const dbCheck = isDuplicateProduct(product, existingHospitalProducts);

    if (dbCheck.isDuplicate) {
      analyzedProducts.push({
        product,
        originalIndex,
        isDuplicate: true,
        duplicateReason: dbCheck.duplicateReason,
        matchedProduct: dbCheck.matchedProduct,
        isDuplicateInFile: false,
      });
      duplicateCount++;
      return;
    }

    // 2. Checa se é duplicado dentro do próprio arquivo (ocorrência anterior no mesmo lote)
    const normName = normalizeProductKey(product.nome);
    const normRef = normalizeProductKey(product.referencia);

    if (normName && seenInFileNames.has(normName)) {
      analyzedProducts.push({
        product,
        originalIndex,
        isDuplicate: true,
        duplicateReason: `Item duplicado dentro do próprio arquivo importado («${product.nome}»)`,
        isDuplicateInFile: true,
      });
      duplicateCount++;
      return;
    }

    if (normRef && seenInFileRefs.has(normRef)) {
      analyzedProducts.push({
        product,
        originalIndex,
        isDuplicate: true,
        duplicateReason: `Referência duplicada dentro do próprio arquivo («${product.referencia}»)`,
        isDuplicateInFile: true,
      });
      duplicateCount++;
      return;
    }

    // Produto inédito / novo
    if (normName) seenInFileNames.add(normName);
    if (normRef) seenInFileRefs.add(normRef);

    analyzedProducts.push({
      product,
      originalIndex,
      isDuplicate: false,
      isDuplicateInFile: false,
    });

    initialSelectedIndices.add(originalIndex);
    newCount++;
  });

  const totalCount = parsedProducts.length;
  const isAllDuplicates = totalCount > 0 && newCount === 0;

  return {
    analyzedProducts,
    totalCount,
    newCount,
    duplicateCount,
    isAllDuplicates,
    initialSelectedIndices,
  };
}
