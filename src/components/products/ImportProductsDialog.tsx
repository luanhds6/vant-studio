import React, { useState, useMemo, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { ProgressBar } from "@/components/ui/progress-bar";
import {
  Upload,
  FileJson,
  CheckCircle2,
  AlertCircle,
  Package,
  Search,
  CheckSquare,
  Square,
  Sparkles,
  Layers,
} from "lucide-react";
import { Product, Hospital } from "@/types/Product";
import { useProductStore } from "@/store/productStore";
import { toast } from "sonner";

interface ImportProductsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  hospital: Hospital;
}

interface ParsedImportData {
  products: Product[];
  sourceName?: string;
  exportDate?: string;
  totalCount: number;
}

export const ImportProductsDialog: React.FC<ImportProductsDialogProps> = ({
  open,
  onOpenChange,
  hospital,
}) => {
  const addProducts = useProductStore((s) => s.addProducts);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedImportData | null>(null);
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
  const [searchTerm, setSearchTerm] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0 });
  const [error, setError] = useState<string | null>(null);

  const resetState = () => {
    setFile(null);
    setParsedData(null);
    setSelectedIndices(new Set());
    setSearchTerm("");
    setIsImporting(false);
    setImportProgress({ current: 0, total: 0 });
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleClose = (newOpen: boolean) => {
    if (isImporting) return; // Prevent closing while importing
    if (!newOpen) {
      resetState();
    }
    onOpenChange(newOpen);
  };

  const parseJsonContent = (jsonString: string, filename: string) => {
    try {
      const raw = JSON.parse(jsonString);
      let rawProducts: any[] = [];
      let sourceName: string | undefined = undefined;
      let exportDate: string | undefined = undefined;

      if (Array.isArray(raw)) {
        rawProducts = raw;
      } else if (raw && typeof raw === "object") {
        if (Array.isArray(raw.products)) {
          rawProducts = raw.products;
          sourceName = raw.hospital?.nome || raw.sourceHospital?.nome || raw.sourceName;
          exportDate = raw.exportedAt || raw.exportDate;
        } else if (raw.nome || raw.name) {
          // Single product object
          rawProducts = [raw];
        } else {
          throw new Error(
            "O arquivo JSON não contém uma lista de produtos válida (formato não reconhecido).",
          );
        }
      }

      if (rawProducts.length === 0) {
        throw new Error("Nenhum produto encontrado no arquivo selecionado.");
      }

      // Convert raw items into standardized Product format
      const validProducts: Product[] = rawProducts.map((p, index) => {
        const id = p.id || crypto.randomUUID();
        const nome = String(p.nome || p.name || `Produto Importado #${index + 1}`).trim();
        const categoria = String(p.categoria || p.category || "Geral").trim();
        const referencia = String(p.referencia || p.ref || "").trim();
        const tecido = String(p.tecido || p.fabric || "").trim();
        const tamanhos = Array.isArray(p.tamanhos)
          ? p.tamanhos.map((t: any) => String(t))
          : Array.isArray(p.sizes)
            ? p.sizes.map((t: any) => String(t))
            : [];

        // Cores
        const cores = Array.isArray(p.cores)
          ? p.cores.map((c: any, cIdx: number) => ({
              id: c.id || `cor-${cIdx}-${crypto.randomUUID().slice(0, 8)}`,
              nome: String(c.nome || c.name || "Cor"),
              hex: String(c.hex || "#000000"),
              fabricTypeId: c.fabricTypeId ? String(c.fabricTypeId) : undefined,
            }))
          : [];

        // Dimensões
        let dimensoes = [];
        if (Array.isArray(p.dimensoes)) {
          dimensoes = p.dimensoes.map((d: any, dIdx: number) => ({
            id: d.id || `dim-${dIdx}-${crypto.randomUUID().slice(0, 8)}`,
            titulo: String(d.titulo || d.title || ""),
            largura: String(d.largura || d.width || ""),
            altura: String(d.altura || d.height || ""),
            unidade: String(d.unidade || d.unit || "cm"),
          }));
        } else if (p.dimensoes && typeof p.dimensoes === "object") {
          dimensoes = [
            {
              id: `dim-0-${crypto.randomUUID().slice(0, 8)}`,
              titulo: "",
              largura: String(p.dimensoes.largura || ""),
              altura: String(p.dimensoes.altura || ""),
              unidade: String(p.dimensoes.unidade || "cm"),
            },
          ];
        } else {
          dimensoes = [
            {
              id: `dim-0-${crypto.randomUUID().slice(0, 8)}`,
              titulo: "",
              largura: "",
              altura: "",
              unidade: "cm",
            },
          ];
        }

        // Detalhes técnicos
        const detalhes = Array.isArray(p.detalhes)
          ? p.detalhes.map((dt: any, dtIdx: number) => ({
              id: dt.id || `det-${dtIdx}-${crypto.randomUUID().slice(0, 8)}`,
              texto: String(dt.texto || dt.text || ""),
              imagem: String(dt.imagem || dt.image || ""),
            }))
          : [];

        // Imagens Detalhe
        const imagensDetalhe = Array.isArray(p.imagensDetalhe)
          ? p.imagensDetalhe.map((img: any, imgIdx: number) => ({
              id: img.id || `imgd-${imgIdx}-${crypto.randomUUID().slice(0, 8)}`,
              titulo: String(img.titulo || img.title || ""),
              posicao: String(img.posicao || img.position || ""),
              imagem: String(img.imagem || img.image || ""),
            }))
          : [];

        // Outros campos
        const imagemPrincipal = String(p.imagemPrincipal || p.imagem_principal || p.image || "");
        const pintura = p.pintura || { cor: "", tamanho: "", localizacao: "", imagem: "" };
        const marcaCliente = p.marcaCliente || p.marca_cliente || {
          cor: "",
          tamanho: "",
          localizacao: "",
          imagem: "",
        };
        const nomeCampo = p.nomeCampo || p.nome_campo || {
          texto: "",
          cor: "",
          tamanho: "",
          localizacao: "",
        };
        const timbrado = p.timbrado || { ativo: false, imagem: "" };
        const rastreavel = p.rastreavel || { ativo: false, imagem: "" };

        return {
          id,
          hospitalId: hospital.id,
          nome,
          categoria,
          referencia,
          tecido,
          tamanhos,
          cores,
          dimensoes,
          detalhes,
          imagemPrincipal,
          imagensDetalhe,
          pintura: {
            cor: String(pintura.cor || ""),
            tamanho: String(pintura.tamanho || ""),
            localizacao: String(pintura.localizacao || ""),
            imagem: String(pintura.imagem || ""),
          },
          marcaCliente: {
            cor: String(marcaCliente.cor || ""),
            tamanho: String(marcaCliente.tamanho || ""),
            localizacao: String(marcaCliente.localizacao || ""),
            imagem: String(marcaCliente.imagem || ""),
          },
          nomeCampo: {
            texto: String(nomeCampo.texto || ""),
            cor: String(nomeCampo.cor || ""),
            tamanho: String(nomeCampo.tamanho || ""),
            localizacao: String(nomeCampo.localizacao || ""),
          },
          timbrado: {
            ativo: Boolean(timbrado.ativo),
            imagem: String(timbrado.imagem || ""),
          },
          rastreavel: {
            ativo: Boolean(rastreavel.ativo),
            imagem: String(rastreavel.imagem || ""),
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
      });

      setParsedData({
        products: validProducts,
        sourceName,
        exportDate,
        totalCount: validProducts.length,
      });

      // Default: all selected
      const allSelected = new Set<number>();
      for (let i = 0; i < validProducts.length; i++) {
        allSelected.add(i);
      }
      setSelectedIndices(allSelected);
      setError(null);
    } catch (err: any) {
      console.error("Erro ao analisar arquivo JSON:", err);
      setError(err.message || "Erro ao ler o arquivo JSON. Certifique-se de que é um JSON válido.");
      setParsedData(null);
      setSelectedIndices(new Set());
    }
  };

  const handleFileProcess = (selectedFile: File) => {
    if (!selectedFile.name.endsWith(".json")) {
      setError("Por favor, selecione um arquivo no formato JSON (.json).");
      return;
    }

    setFile(selectedFile);
    setError(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      parseJsonContent(content, selectedFile.name);
    };
    reader.onerror = () => {
      setError("Falha ao ler o arquivo. Tente novamente.");
    };
    reader.readAsText(selectedFile);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileProcess(e.dataTransfer.files[0]);
    }
  };

  const toggleSelectIndex = (index: number) => {
    setSelectedIndices((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const handleSelectAllFiltered = (filteredIndices: number[]) => {
    setSelectedIndices((prev) => {
      const next = new Set(prev);
      const allFilteredSelected = filteredIndices.every((idx) => next.has(idx));
      if (allFilteredSelected) {
        filteredIndices.forEach((idx) => next.delete(idx));
      } else {
        filteredIndices.forEach((idx) => next.add(idx));
      }
      return next;
    });
  };

  // Filter products by search term
  const filteredProductItems = useMemo(() => {
    if (!parsedData) return [];
    const term = searchTerm.toLowerCase().trim();
    return parsedData.products
      .map((product, originalIndex) => ({ product, originalIndex }))
      .filter(({ product }) => {
        if (!term) return true;
        return (
          product.nome.toLowerCase().includes(term) ||
          product.referencia.toLowerCase().includes(term) ||
          product.categoria.toLowerCase().includes(term) ||
          product.tecido.toLowerCase().includes(term)
        );
      });
  }, [parsedData, searchTerm]);

  const filteredIndices = useMemo(
    () => filteredProductItems.map((item) => item.originalIndex),
    [filteredProductItems],
  );

  const isAllFilteredSelected =
    filteredIndices.length > 0 &&
    filteredIndices.every((idx) => selectedIndices.has(idx));

  const handleExecuteImport = async () => {
    if (!parsedData || selectedIndices.size === 0) return;

    const itemsToImport = Array.from(selectedIndices).map((idx) => {
      const orig = parsedData.products[idx];
      // Generate clean new IDs for the imported product and all subcomponents
      return {
        ...orig,
        id: crypto.randomUUID(),
        hospitalId: hospital.id,
        cores: orig.cores.map((c) => ({
          ...c,
          id: `cor-${crypto.randomUUID().slice(0, 8)}`,
        })),
        dimensoes: orig.dimensoes.map((d) => ({
          ...d,
          id: `dim-${crypto.randomUUID().slice(0, 8)}`,
        })),
        detalhes: orig.detalhes.map((dt) => ({
          ...dt,
          id: `det-${crypto.randomUUID().slice(0, 8)}`,
        })),
        imagensDetalhe: orig.imagensDetalhe.map((img) => ({
          ...img,
          id: `imgd-${crypto.randomUUID().slice(0, 8)}`,
        })),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    });

    setIsImporting(true);
    setImportProgress({ current: 0, total: itemsToImport.length });

    try {
      await addProducts(itemsToImport, (completed, total) => {
        setImportProgress({ current: completed, total });
      });
      toast.success(
        `${itemsToImport.length} produto${itemsToImport.length !== 1 ? "s" : ""} importado${itemsToImport.length !== 1 ? "s" : ""} com sucesso para «${hospital.nome}»!`,
      );
      handleClose(false);
    } catch (err: any) {
      console.error("Erro ao importar produtos:", err);
      toast.error(
        err.message || "Ocorreu um erro ao importar os produtos para o servidor.",
      );
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-6">
        <DialogHeader className="pb-2">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Upload className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-xl">Importar Produtos</DialogTitle>
              <DialogDescription className="text-sm">
                Destino: <strong className="text-foreground">{hospital.nome}</strong>
                {hospital.cidade ? ` (${hospital.cidade})` : ""}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {!parsedData ? (
          <div className="space-y-4 py-4 flex-1 flex flex-col justify-center">
            <div
              className={`border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-3 ${
                dragActive
                  ? "border-primary bg-primary/5 scale-[0.99]"
                  : "border-muted-foreground/30 hover:border-primary/60 hover:bg-muted/30"
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleFileProcess(e.target.files[0]);
                  }
                }}
              />
              <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-1">
                <FileJson className="h-7 w-7" />
              </div>
              <div>
                <p className="text-base font-semibold text-foreground">
                  Arraste e solte o arquivo JSON aqui
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  ou clique para selecionar um arquivo exportado (.json)
                </p>
              </div>
              <Badge variant="secondary" className="text-xs font-normal">
                Suporta exportações completas do Vant Studio ou listas de produtos JSON
              </Badge>
            </div>

            {error ? (
              <div className="flex items-start gap-2 p-3 text-sm rounded-lg bg-destructive/10 text-destructive border border-destructive/20">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                <div className="flex-1">{error}</div>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="flex flex-col flex-1 min-h-0 space-y-3 pt-2">
            {/* Header info & search */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 p-3 bg-muted/50 rounded-lg border">
              <div className="flex items-center gap-2 min-w-0">
                <FileJson className="h-5 w-5 text-primary shrink-0" />
                <div className="truncate">
                  <p className="text-sm font-semibold truncate">
                    {file?.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {parsedData.totalCount} produto{parsedData.totalCount !== 1 ? "s" : ""} encontrado{parsedData.totalCount !== 1 ? "s" : ""}
                    {parsedData.sourceName ? ` · Origem: ${parsedData.sourceName}` : ""}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-muted-foreground hover:text-foreground"
                onClick={resetState}
                disabled={isImporting}
              >
                Trocar arquivo
              </Button>
            </div>

            {/* Filter and selection bar */}
            <div className="flex items-center justify-between gap-2">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome, ref, categoria..."
                  className="pl-8 h-9 text-sm"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  disabled={isImporting}
                />
              </div>

              <Button
                variant="outline"
                size="sm"
                className="text-xs h-9"
                onClick={() => handleSelectAllFiltered(filteredIndices)}
                disabled={filteredIndices.length === 0 || isImporting}
              >
                {isAllFilteredSelected ? (
                  <>
                    <Square className="mr-1.5 h-3.5 w-3.5" />
                    Desmarcar visíveis
                  </>
                ) : (
                  <>
                    <CheckSquare className="mr-1.5 h-3.5 w-3.5" />
                    Selecionar visíveis
                  </>
                )}
              </Button>
            </div>

            {/* Product list */}
            <div className="border rounded-lg flex-1 min-h-0 overflow-hidden flex flex-col bg-card">
              <div className="p-2 border-b bg-muted/30 flex items-center justify-between text-xs font-medium text-muted-foreground px-3">
                <span>Produtos a importar</span>
                <span>
                  {selectedIndices.size} de {parsedData.totalCount} selecionados
                </span>
              </div>

              <ScrollArea className="flex-1 max-h-[380px]">
                <div className="p-2 space-y-1 divide-y divide-border/40">
                  {filteredProductItems.length === 0 ? (
                    <div className="py-12 text-center text-sm text-muted-foreground">
                      Nenhum produto corresponde aos critérios de busca.
                    </div>
                  ) : (
                    filteredProductItems.map(({ product, originalIndex }) => {
                      const isSelected = selectedIndices.has(originalIndex);
                      return (
                        <div
                          key={`${product.nome}-${originalIndex}`}
                          onClick={() => {
                            if (!isImporting) toggleSelectIndex(originalIndex);
                          }}
                          className={`flex items-center gap-3 p-2.5 rounded-lg transition-colors cursor-pointer select-none ${
                            isSelected
                              ? "bg-primary/5 hover:bg-primary/10"
                              : "opacity-60 hover:opacity-100 hover:bg-muted/40"
                          }`}
                        >
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleSelectIndex(originalIndex)}
                            disabled={isImporting}
                            onClick={(e) => e.stopPropagation()}
                          />

                          {product.imagemPrincipal ? (
                            <div className="h-10 w-10 shrink-0 rounded-md border bg-muted overflow-hidden">
                              <img
                                src={product.imagemPrincipal}
                                alt=""
                                className="h-full w-full object-contain"
                              />
                            </div>
                          ) : (
                            <div className="h-10 w-10 shrink-0 rounded-md border bg-muted/60 flex items-center justify-center text-muted-foreground">
                              <Package className="h-5 w-5" />
                            </div>
                          )}

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-semibold truncate">
                                {product.nome}
                              </p>
                              {product.referencia ? (
                                <Badge variant="outline" className="text-[10px] py-0 px-1.5">
                                  {product.referencia}
                                </Badge>
                              ) : null}
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5 truncate">
                              <span>{product.categoria || "Geral"}</span>
                              {product.tecido ? (
                                <>
                                  <span>·</span>
                                  <span className="truncate">{product.tecido}</span>
                                </>
                              ) : null}
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            {product.tamanhos?.length > 0 ? (
                              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                                {product.tamanhos.length} tam
                              </Badge>
                            ) : null}
                            {product.cores?.length > 0 ? (
                              <div className="flex items-center -space-x-1">
                                {product.cores.slice(0, 3).map((c, i) => (
                                  <span
                                    key={i}
                                    className="h-3.5 w-3.5 rounded-full border border-background shadow-xs inline-block"
                                    style={{ backgroundColor: c.hex }}
                                  />
                                ))}
                                {product.cores.length > 3 ? (
                                  <span className="text-[9px] text-muted-foreground pl-1.5">
                                    +{product.cores.length - 3}
                                  </span>
                                ) : null}
                              </div>
                            ) : null}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </ScrollArea>
            </div>

            {isImporting ? (
              <div className="pt-2">
                <ProgressBar
                  value={
                    importProgress.total > 0
                      ? (importProgress.current / importProgress.total) * 100
                      : 0
                  }
                  label={`Gravando produtos no banco de dados... (${importProgress.current} de ${importProgress.total})`}
                />
              </div>
            ) : null}
          </div>
        )}

        <DialogFooter className="pt-3 border-t mt-2 flex flex-row items-center justify-between sm:justify-between gap-2">
          <Button
            variant="outline"
            onClick={() => handleClose(false)}
            disabled={isImporting}
          >
            Cancelar
          </Button>

          {parsedData ? (
            <Button
              onClick={handleExecuteImport}
              disabled={selectedIndices.size === 0 || isImporting}
              className="gap-1.5"
            >
              <CheckCircle2 className="h-4 w-4" />
              Importar {selectedIndices.size} produto{selectedIndices.size !== 1 ? "s" : ""}
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
