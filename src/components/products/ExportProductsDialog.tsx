import React, { useState, useMemo, useEffect } from "react";
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
import {
  Download,
  Package,
  Search,
  CheckSquare,
  Square,
  FileJson,
} from "lucide-react";
import { Product, Hospital } from "@/types/Product";
import { toast } from "sonner";

interface ExportProductsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  hospital: Hospital;
  products: Product[];
}

export const ExportProductsDialog: React.FC<ExportProductsDialogProps> = ({
  open,
  onOpenChange,
  hospital,
  products,
}) => {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState("");

  // When dialog opens or products change, default to selecting all products
  useEffect(() => {
    if (open) {
      const allIds = new Set<string>();
      products.forEach((p) => allIds.add(p.id));
      setSelectedIds(allIds);
      setSearchTerm("");
    }
  }, [open, products]);

  const toggleSelectId = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSelectAllFiltered = (filteredIdsList: string[]) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      const allFilteredSelected = filteredIdsList.every((id) => next.has(id));
      if (allFilteredSelected) {
        filteredIdsList.forEach((id) => next.delete(id));
      } else {
        filteredIdsList.forEach((id) => next.add(id));
      }
      return next;
    });
  };

  const filteredProducts = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return products;
    return products.filter((product) => {
      return (
        product.nome.toLowerCase().includes(term) ||
        product.referencia.toLowerCase().includes(term) ||
        product.categoria.toLowerCase().includes(term) ||
        product.tecido.toLowerCase().includes(term)
      );
    });
  }, [products, searchTerm]);

  const filteredIds = useMemo(() => filteredProducts.map((p) => p.id), [filteredProducts]);

  const isAllFilteredSelected =
    filteredIds.length > 0 && filteredIds.every((id) => selectedIds.has(id));

  const handleExecuteExport = () => {
    const itemsToExport = products.filter((p) => selectedIds.has(p.id));
    if (itemsToExport.length === 0) {
      toast.error("Selecione ao menos um produto para exportar.");
      return;
    }

    const exportPayload = {
      app: "VantStudioCatalogo",
      version: "1.0",
      exportedAt: new Date().toISOString(),
      hospital: {
        id: hospital.id,
        nome: hospital.nome,
        cidade: hospital.cidade,
      },
      totalProducts: itemsToExport.length,
      products: itemsToExport,
    };

    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
      JSON.stringify(exportPayload, null, 2),
    )}`;

    const safeHospitalName = hospital.nome
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    const dateStr = new Date().toISOString().split("T")[0];
    const filename = `produtos-${safeHospitalName || "hospital"}-${dateStr}.json`;

    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", jsonString);
    downloadAnchor.setAttribute("download", filename);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();

    toast.success(
      `${itemsToExport.length} produto${itemsToExport.length !== 1 ? "s" : ""} exportado${itemsToExport.length !== 1 ? "s" : ""} com sucesso!`,
    );
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-6">
        <DialogHeader className="pb-2">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Download className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-xl">Exportar Produtos</DialogTitle>
              <DialogDescription className="text-sm">
                Hospital de origem: <strong className="text-foreground">{hospital.nome}</strong>
                {hospital.cidade ? ` (${hospital.cidade})` : ""}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex flex-col flex-1 min-h-0 space-y-3 pt-2">
          {/* Header statistics summary */}
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border">
            <div className="flex items-center gap-2 min-w-0">
              <FileJson className="h-5 w-5 text-primary shrink-0" />
              <div>
                <p className="text-sm font-semibold">
                  Arquivo de Exportação JSON
                </p>
                <p className="text-xs text-muted-foreground">
                  Selecione os produtos que farão parte do arquivo exportado
                </p>
              </div>
            </div>
            <Badge variant="outline" className="text-xs">
              {selectedIds.size} de {products.length} selecionados
            </Badge>
          </div>

          {/* Filter and select-all bar */}
          <div className="flex items-center justify-between gap-2">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, ref, categoria..."
                className="pl-8 h-9 text-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <Button
              variant="outline"
              size="sm"
              className="text-xs h-9"
              onClick={() => handleSelectAllFiltered(filteredIds)}
              disabled={filteredIds.length === 0}
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

          {/* Products List */}
          <div className="border rounded-lg flex-1 min-h-0 overflow-hidden flex flex-col bg-card">
            <div className="p-2 border-b bg-muted/30 flex items-center justify-between text-xs font-medium text-muted-foreground px-3">
              <span>Produtos disponíveis</span>
              <span>
                {selectedIds.size} de {products.length} selecionados
              </span>
            </div>

            <ScrollArea className="flex-1 max-h-[380px]">
              <div className="p-2 space-y-1 divide-y divide-border/40">
                {filteredProducts.length === 0 ? (
                  <div className="py-12 text-center text-sm text-muted-foreground">
                    Nenhum produto encontrado para a busca.
                  </div>
                ) : (
                  filteredProducts.map((product) => {
                    const isSelected = selectedIds.has(product.id);
                    return (
                      <div
                        key={product.id}
                        onClick={() => toggleSelectId(product.id)}
                        className={`flex items-center gap-3 p-2.5 rounded-lg transition-colors cursor-pointer select-none ${
                          isSelected
                            ? "bg-primary/5 hover:bg-primary/10"
                            : "opacity-60 hover:opacity-100 hover:bg-muted/40"
                        }`}
                      >
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleSelectId(product.id)}
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
        </div>

        <DialogFooter className="pt-3 border-t mt-2 flex flex-row items-center justify-between sm:justify-between gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </Button>

          <Button
            onClick={handleExecuteExport}
            disabled={selectedIds.size === 0}
            className="gap-1.5"
          >
            <Download className="h-4 w-4" />
            Exportar {selectedIds.size} produto{selectedIds.size !== 1 ? "s" : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
