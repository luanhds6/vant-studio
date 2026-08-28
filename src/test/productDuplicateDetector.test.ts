import { describe, it, expect } from "vitest";
import {
  normalizeProductKey,
  isDuplicateProduct,
  analyzeImportBatch,
} from "@/lib/productDuplicateDetector";
import { Product } from "@/types/Product";

const mockExistingProducts: Product[] = [
  {
    id: "prod-1",
    hospitalId: "hosp-1",
    nome: "Avental Cirúrgico com Opa",
    categoria: "Cirúrgico",
    referencia: "SB - 0001",
    tecido: "Brim 100% algodão",
    tamanhos: ["UNICO"],
    cores: [],
    dimensoes: [],
    detalhes: [],
    imagemPrincipal: "",
    imagensDetalhe: [],
    pintura: { cor: "", tamanho: "", localizacao: "", imagem: "" },
    marcaCliente: { cor: "", tamanho: "", localizacao: "", imagem: "" },
    nomeCampo: { texto: "", cor: "", tamanho: "", localizacao: "" },
    timbrado: { ativo: false, imagem: "" },
    rastreavel: { ativo: false, imagem: "" },
    arquivado: false,
    createdAt: "",
    updatedAt: "",
  },
  {
    id: "prod-2",
    hospitalId: "hosp-1",
    nome: "Campo Fenestrado",
    categoria: "Campo",
    referencia: "SB - 0009",
    tecido: "Brim 100% algodão",
    tamanhos: ["UNICO"],
    cores: [],
    dimensoes: [],
    detalhes: [],
    imagemPrincipal: "",
    imagensDetalhe: [],
    pintura: { cor: "", tamanho: "", localizacao: "", imagem: "" },
    marcaCliente: { cor: "", tamanho: "", localizacao: "", imagem: "" },
    nomeCampo: { texto: "", cor: "", tamanho: "", localizacao: "" },
    timbrado: { ativo: false, imagem: "" },
    rastreavel: { ativo: false, imagem: "" },
    arquivado: false,
    createdAt: "",
    updatedAt: "",
  },
];

describe("productDuplicateDetector", () => {
  it("normalizes product strings correctly ignoring accents, case, and special characters", () => {
    expect(normalizeProductKey("Avental Cirúrgico com Opa")).toBe("aventalcirurgicocomopa");
    expect(normalizeProductKey("  avental   cirurgico COM opa  ")).toBe("aventalcirurgicocomopa");
    expect(normalizeProductKey("SB - 0001")).toBe("sb0001");
    expect(normalizeProductKey("sb-0001")).toBe("sb0001");
    expect(normalizeProductKey("SB 0001")).toBe("sb0001");
  });

  it("detects duplicate by name with different formatting", () => {
    const candidate = {
      id: "new-id-1",
      nome: "avental cirúrgico com opa",
      referencia: "OUTRA-REF",
    };
    const result = isDuplicateProduct(candidate, mockExistingProducts);
    expect(result.isDuplicate).toBe(true);
    expect(result.duplicateReason).toContain("já cadastrado no sistema");
  });

  it("detects duplicate by reference with different formatting", () => {
    const candidate = {
      id: "new-id-2",
      nome: "Outro Nome Inédito",
      referencia: "SB-0001",
    };
    const result = isDuplicateProduct(candidate, mockExistingProducts);
    expect(result.isDuplicate).toBe(true);
    expect(result.duplicateReason).toContain("SB - 0001");
  });

  it("allows new product with unique name and reference", () => {
    const candidate = {
      id: "new-id-3",
      nome: "Moletom M",
      referencia: "SB - 0031",
    };
    const result = isDuplicateProduct(candidate, mockExistingProducts);
    expect(result.isDuplicate).toBe(false);
  });

  it("analyzes batch: 100% duplicate file correctly triggers isAllDuplicates", () => {
    const importList: Product[] = [
      { ...mockExistingProducts[0], id: "temp-1" },
      { ...mockExistingProducts[1], id: "temp-2" },
    ];

    const result = analyzeImportBatch(importList, mockExistingProducts);
    expect(result.totalCount).toBe(2);
    expect(result.newCount).toBe(0);
    expect(result.duplicateCount).toBe(2);
    expect(result.isAllDuplicates).toBe(true);
    expect(result.initialSelectedIndices.size).toBe(0);
  });

  it("analyzes batch: mixed file ignores existing and auto-selects only new items", () => {
    const importList: Product[] = [
      { ...mockExistingProducts[0], id: "temp-1" }, // duplicate (SB-0001)
      {
        ...mockExistingProducts[0],
        id: "temp-new-1",
        nome: "Moletom M",
        referencia: "SB - 0031",
      }, // NEW
      { ...mockExistingProducts[1], id: "temp-2" }, // duplicate (SB-0009)
      {
        ...mockExistingProducts[0],
        id: "temp-new-2",
        nome: "Moletom G",
        referencia: "SB - 0032",
      }, // NEW
      {
        ...mockExistingProducts[0],
        id: "temp-dup-in-file",
        nome: "Moletom M", // duplicate in file!
        referencia: "SB - 0031",
      },
    ];

    const result = analyzeImportBatch(importList, mockExistingProducts);
    expect(result.totalCount).toBe(5);
    expect(result.newCount).toBe(2);
    expect(result.duplicateCount).toBe(3);
    expect(result.isAllDuplicates).toBe(false);
    expect(Array.from(result.initialSelectedIndices)).toEqual([1, 3]);
  });
});
