import React, { useState, useMemo, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Archive,
  ArchiveRestore,
  Trash2,
  Search,
  CheckSquare,
  Square,
  Package,
  RotateCcw,
} from "lucide-react";
import { Product, Hospital } from "@/types/Product";
import { useProductStore } from "@/store/productStore";
import { toast } from "sonner";

interface ArchivedProductsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  hospital: Hospital;
  archivedProducts: Product[];
}

export const ArchivedProductsDialog: React.FC<ArchivedProductsDialogProps> = ({
  open,
  onOpenChange,
  hospital,
  archivedProducts,
}) => {
  const archiveProducts = useProductStore((s) => s.archiveProducts);
  const deleteProducts = useProductStore((s) => s.deleteProducts);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState("");
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (open) {
      setSelectedIds(new Set());
      setSearchTerm("");
    }
  }, [open]);

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
    if (!term) return archivedProducts;
    return archivedProducts.filter((product) => {
      return (
        product.nome.toLowerCase().includes(term) ||
        product.referencia.toLowerCase().includes(term) ||
        product.categoria.toLowerCase().includes(term) ||
        product.tecido.toLowerCase().includes(term)
      );
    });
  }, [archivedProducts, searchTerm]);

  const filteredIds = useMemo(
    () => filteredProducts.map((p) => p.id),
    [filteredProducts],
  );

  const isAllFilteredSelected =
    filteredIds.length > 0 && filteredIds.every((id) => selectedIds.has(id));

  const handleRestoreSelected = async (idsToRestore?: string[]) => {
    const targetIds = idsToRestore || Array.from(selectedIds);
    if (targetIds.length === 0) return;

    setIsProcessing(true);
    try {
      await archiveProducts(targetIds, false);
      toast.success(
        `${targetIds.length} produto${targetIds.length !== 1 ? "s" : ""} reativado${targetIds.length !== 1 ? "s" : ""} com sucesso!`,
      );
      setSelectedIds(new Set());
      if (archivedProducts.length <= targetIds.length) {
        onOpenChange(false);
      }
    } catch (err: any) {
      toast.error(err.message || "Erro ao reativar produtos.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeletePermanent = async (idsToDelete?: string[]) => {
    const targetIds = idsToDelete || Array.from(selectedIds);
    if (targetIds.length === 0) return;

    setIsProcessing(true);
    try {
      await deleteProducts(targetIds);
      toast.success(
        `${targetIds.length} produto${targetIds.length !== 1 ? "s" : ""} excluído${targetIds.length !== 1 ? "s" : ""} permanentemente!`,
      );
      setSelectedIds(new Set());
      setConfirmDeleteOpen(false);
      if (archivedProducts.length <= targetIds.length) {
        onOpenChange(false);
      }
    } catch (err: any) {
      toast.error(err.message || "Erro ao excluir produtos.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-6">
          <DialogHeader className="pb-2">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <Archive className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-xl">Produtos Arquivados / Desativados</DialogTitle>
                <DialogDescription className="text-sm">
                  Hospital: <strong className="text-foreground">{hospital.nome}</strong>
                  {hospital.cidade ? ` (${hospital.cidade})` : ""}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {archivedProducts.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground flex flex-col items-center justify-center">
              <div className="p-4 rounded-full bg-muted/60 mb-3">
                <Archive className="h-10 w-10 opacity-40" />
              </div>
              <p className="text-base font-semibold text-foreground">
                Nenhum produto arquivado
              </p>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                Quando você desativar ou arquivar produtos na página principal do hospital, eles aparecerão aqui.
              </p>
            </div>
          ) : (
            <div className="flex flex-col flex-1 min-h-0 space-y-3 pt-2">
              {/* Header statistics summary */}
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border">
                <div className="flex items-center gap-2 min-w-0">
                  <Archive className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold">
                      Pasta de Arquivados ({archivedProducts.length})
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Produtos nesta pasta não aparecem no catálogo ativo
                    </p>
                  </div>
                </div>
                <Badge variant="secondary" className="text-xs">
                  {selectedIds.size} de {archivedProducts.length} selecionados
                </Badge>
              </div>

              {/* Filter and select-all bar */}
              <div className="flex items-center justify-between gap-2">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar nos arquivados..."
                    className="pl-8 h-9 text-sm"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    disabled={isProcessing}
                  />
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs h-9"
                  onClick={() => handleSelectAllFiltered(filteredIds)}
                  disabled={filteredIds.length === 0 || isProcessing}
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
                <ScrollArea className="flex-1 max-h-[380px]">
                  <div className="p-2 space-y-1 divide-y divide-border/40">
                    {filteredProducts.length === 0 ? (
                      <div className="py-12 text-center text-sm text-muted-foreground">
                        Nenhum produto arquivado encontrado com este filtro.
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
                                ? "bg-amber-500/10 hover:bg-amber-500/15"
                                : "hover:bg-muted/40"
                            }`}
                          >
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => toggleSelectId(product.id)}
                              disabled={isProcessing}
                              onClick={(e) => e.stopPropagation()}
                            />

                            {product.imagemPrincipal ? (
                              <div className="h-10 w-10 shrink-0 rounded-md border bg-muted overflow-hidden opacity-80">
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
                                <Badge variant="secondary" className="text-[10px] bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30">
                                  Arquivado
                                </Badge>
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

                            <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 text-xs text-primary border-primary/30 hover:bg-primary/10 gap-1"
                                onClick={() => handleRestoreSelected([product.id])}
                                disabled={isProcessing}
                                title="Reativar e mover para produtos ativos"
                              >
                                <ArchiveRestore className="h-3.5 w-3.5" />
                                Reativar
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:bg-destructive/10"
                                onClick={() => {
                                  setSelectedIds(new Set([product.id]));
                                  setConfirmDeleteOpen(true);
                                }}
                                disabled={isProcessing}
                                title="Excluir permanentemente"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </ScrollArea>
              </div>
            </div>
          )}

          <DialogFooter className="pt-3 border-t mt-2 flex flex-row items-center justify-between sm:justify-between gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isProcessing}
            >
              Fechar
            </Button>

            {selectedIds.size > 0 ? (
              <div className="flex items-center gap-2">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setConfirmDeleteOpen(true)}
                  disabled={isProcessing}
                  className="gap-1.5"
                >
                  <Trash2 className="h-4 w-4" />
                  Excluir permanentemente ({selectedIds.size})
                </Button>
                <Button
                  size="sm"
                  onClick={() => handleRestoreSelected()}
                  disabled={isProcessing}
                  className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  <RotateCcw className="h-4 w-4" />
                  Reativar {selectedIds.size} selecionado{selectedIds.size !== 1 ? "s" : ""}
                </Button>
              </div>
            ) : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog for Permanent Deletion */}
      <AlertDialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir permanentemente?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir permanentemente {selectedIds.size} produto{selectedIds.size !== 1 ? "s" : ""}? Esta ação não pode ser desfeita e os dados serão removidos do servidor.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleDeletePermanent()}
              disabled={isProcessing}
              className="bg-destructive hover:bg-destructive/90"
            >
              Excluir definitivamente
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
