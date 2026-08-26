import { useMemo, useState } from "react";
import { useNavigate, useParams, Navigate } from "react-router-dom";
import { useProductStore } from "@/store/productStore";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  BookOpen,
  Download,
  Edit,
  Package,
  PlusCircle,
  Trash2,
  Upload,
  Archive,
  CheckSquare,
  Square,
  X,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ImportProductsDialog } from "@/components/products/ImportProductsDialog";
import { ExportProductsDialog } from "@/components/products/ExportProductsDialog";
import { ArchivedProductsDialog } from "@/components/products/ArchivedProductsDialog";
import { useAuthStore } from "@/store/authStore";
import { canDownloadCatalogPdf, getDefaultLandingPath } from "@/lib/routeAccess";
import { toast } from "sonner";

const HospitalHub = () => {
  const { hospitalId } = useParams<{ hospitalId: string }>();
  const navigate = useNavigate();
  const canAccess = useAuthStore((s) => s.canAccess);
  const hospitals = useProductStore((s) => s.hospitals);
  const allProducts = useProductStore((s) => s.products);
  const deleteProduct = useProductStore((s) => s.deleteProduct);
  const deleteProducts = useProductStore((s) => s.deleteProducts);
  const archiveProducts = useProductStore((s) => s.archiveProducts);

  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isArchivedOpen, setIsArchivedOpen] = useState(false);
  const [selectedProductIds, setSelectedProductIds] = useState<Set<string>>(new Set());
  const [batchDeleteDialogOpen, setBatchDeleteDialogOpen] = useState(false);
  const [isBatchProcessing, setIsBatchProcessing] = useState(false);

  const hospital = useMemo(
    () => (hospitalId ? hospitals.find((h) => h.id === hospitalId) : undefined),
    [hospitalId, hospitals],
  );
  const products = useMemo(
    () => (hospitalId ? allProducts.filter((p) => p.hospitalId === hospitalId) : []),
    [hospitalId, allProducts],
  );

  const activeProducts = useMemo(
    () => products.filter((p) => !p.arquivado),
    [products],
  );

  const archivedProducts = useMemo(
    () => products.filter((p) => p.arquivado),
    [products],
  );

  if (!hospitalId || !hospital) {
    const to = getDefaultLandingPath(canAccess);
    return <Navigate to={to} replace />;
  }

  const canProducts = canAccess("produtos");
  const canNew = canAccess("novo_produto");
  const canCatalog = canDownloadCatalogPdf(canAccess);

  const toggleSelectProduct = (id: string) => {
    setSelectedProductIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSelectAllToggle = () => {
    if (selectedProductIds.size === activeProducts.length) {
      setSelectedProductIds(new Set());
    } else {
      setSelectedProductIds(new Set(activeProducts.map((p) => p.id)));
    }
  };

  const handleBatchArchive = async () => {
    const ids = Array.from(selectedProductIds);
    if (ids.length === 0) return;

    setIsBatchProcessing(true);
    try {
      await archiveProducts(ids, true);
      toast.success(
        `${ids.length} produto${ids.length !== 1 ? "s" : ""} desativado${ids.length !== 1 ? "s" : ""} e arquivado${ids.length !== 1 ? "s" : ""}!`,
      );
      setSelectedProductIds(new Set());
    } catch (err: any) {
      toast.error(err.message || "Erro ao arquivar produtos.");
    } finally {
      setIsBatchProcessing(false);
    }
  };

  const handleBatchDelete = async () => {
    const ids = Array.from(selectedProductIds);
    if (ids.length === 0) return;

    setIsBatchProcessing(true);
    try {
      await deleteProducts(ids);
      toast.success(
        `${ids.length} produto${ids.length !== 1 ? "s" : ""} excluído${ids.length !== 1 ? "s" : ""} com sucesso!`,
      );
      setSelectedProductIds(new Set());
      setBatchDeleteDialogOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Erro ao excluir produtos.");
    } finally {
      setIsBatchProcessing(false);
    }
  };

  const handleSingleArchive = async (productId: string, productName: string) => {
    try {
      await archiveProducts([productId], true);
      toast.success(`«${productName}» foi desativado e arquivado.`);
      setSelectedProductIds((prev) => {
        const next = new Set(prev);
        next.delete(productId);
        return next;
      });
    } catch (err: any) {
      toast.error(err.message || "Erro ao arquivar produto.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <Button variant="ghost" size="sm" className="-ml-2 mb-2" onClick={() => navigate("/hospitais")}>
            <ArrowLeft className="mr-1 h-4 w-4" />
            Hospitais
          </Button>
          <h1 className="text-3xl font-bold tracking-tight">{hospital.nome}</h1>
          {hospital.cidade ? <p className="text-muted-foreground mt-1">{hospital.cidade}</p> : null}
          <p className="text-muted-foreground mt-1 text-sm">
            {activeProducts.length} produto{activeProducts.length !== 1 ? "s" : ""} ativo{activeProducts.length !== 1 ? "s" : ""} neste hospital
            {archivedProducts.length > 0 ? ` · ${archivedProducts.length} arquivado(s)` : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {/* Botão Acessar Arquivados */}
          <Button
            variant="outline"
            onClick={() => setIsArchivedOpen(true)}
            className="gap-1.5 border-amber-500/30 hover:bg-amber-500/10 text-amber-700 dark:text-amber-300"
            title="Acessar pasta de produtos desativados e arquivados"
          >
            <Archive className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            Acessar arquivados
            {archivedProducts.length > 0 ? (
              <Badge
                variant="secondary"
                className="ml-1 px-1.5 py-0 text-[10px] bg-amber-500/20 text-amber-800 dark:text-amber-200 border-none font-semibold"
              >
                {archivedProducts.length}
              </Badge>
            ) : null}
          </Button>

          {canCatalog ? (
            <Button variant="outline" onClick={() => navigate(`/hospital/${hospitalId}/catalogo`)} disabled={activeProducts.length === 0}>
              <BookOpen className="mr-2 h-4 w-4" />
              Gerar catálogo
            </Button>
          ) : null}

          <Button
            variant="outline"
            onClick={() => setIsExportOpen(true)}
            disabled={activeProducts.length === 0}
            title="Exportar cadastro dos produtos em formato JSON"
          >
            <Download className="mr-2 h-4 w-4" />
            Exportar produtos
          </Button>

          {canNew || canProducts ? (
            <Button
              variant="outline"
              onClick={() => setIsImportOpen(true)}
              title="Importar produtos a partir de arquivo JSON"
            >
              <Upload className="mr-2 h-4 w-4" />
              Importar produtos
            </Button>
          ) : null}

          {canNew ? (
            <Button onClick={() => navigate(`/hospital/${hospitalId}/produto/novo`)}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Novo produto
            </Button>
          ) : null}
        </div>
      </div>

      {/* Floating/Sticky Batch Selection Action Bar */}
      {selectedProductIds.size > 0 ? (
        <div className="sticky top-2 z-20 flex flex-wrap items-center justify-between gap-3 p-3.5 bg-card/95 backdrop-blur border-2 border-primary/30 rounded-xl shadow-lg animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-3">
            <Badge variant="default" className="text-xs px-2.5 py-1">
              {selectedProductIds.size} de {activeProducts.length} selecionado{selectedProductIds.size !== 1 ? "s" : ""}
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-8"
              onClick={() => setSelectedProductIds(new Set())}
            >
              <X className="mr-1 h-3.5 w-3.5" />
              Limpar seleção
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-8"
              onClick={handleSelectAllToggle}
            >
              {selectedProductIds.size === activeProducts.length ? (
                <>
                  <Square className="mr-1 h-3.5 w-3.5" />
                  Desmarcar todos
                </>
              ) : (
                <>
                  <CheckSquare className="mr-1 h-3.5 w-3.5" />
                  Selecionar todos
                </>
              )}
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleBatchArchive}
              disabled={isBatchProcessing}
              className="h-8 text-xs gap-1.5 text-amber-600 dark:text-amber-400 border-amber-500/40 hover:bg-amber-500/10"
              title="Mover produtos selecionados para a pasta de arquivados"
            >
              <Archive className="h-3.5 w-3.5" />
              Desativar e Arquivar ({selectedProductIds.size})
            </Button>

            <Button
              variant="destructive"
              size="sm"
              onClick={() => setBatchDeleteDialogOpen(true)}
              disabled={isBatchProcessing}
              className="h-8 text-xs gap-1.5"
              title="Excluir produtos selecionados do sistema"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Excluir ({selectedProductIds.size})
            </Button>
          </div>
        </div>
      ) : null}

      {activeProducts.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Package className="mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="mb-1 text-lg font-semibold">
              {archivedProducts.length > 0
                ? "Todos os produtos deste hospital estão arquivados"
                : "Nenhum produto neste hospital"}
            </h3>
            <p className="mb-4 text-center text-sm text-muted-foreground max-w-md">
              {archivedProducts.length > 0 ? (
                <>
                  Existem {archivedProducts.length} produto(s) na pasta de arquivados. Você pode clicar no botão <strong>"Acessar arquivados"</strong> para reativá-los ou cadastrar um novo produto.
                </>
              ) : canNew ? (
                "Adicione o primeiro produto ou importe a partir de um arquivo de outro hospital."
              ) : (
                "Nenhum produto cadastrado neste hospital."
              )}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2">
              {archivedProducts.length > 0 ? (
                <Button variant="outline" onClick={() => setIsArchivedOpen(true)} className="gap-1.5">
                  <Archive className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  Acessar arquivados ({archivedProducts.length})
                </Button>
              ) : null}
              {canNew ? (
                <Button onClick={() => navigate(`/hospital/${hospitalId}/produto/novo`)}>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Novo produto
                </Button>
              ) : null}
              {canNew || canProducts ? (
                <Button variant="outline" onClick={() => setIsImportOpen(true)}>
                  <Upload className="mr-2 h-4 w-4" />
                  Importar produtos
                </Button>
              ) : null}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {activeProducts.map((product) => {
            const isSelected = selectedProductIds.has(product.id);
            return (
              <Card
                key={product.id}
                className={`group transition-all duration-200 relative hover:shadow-md ${
                  isSelected
                    ? "border-primary ring-2 ring-primary/20 bg-primary/[0.02]"
                    : ""
                }`}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start gap-2.5">
                    {/* Quadrado de Seleção */}
                    <div
                      className="pt-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleSelectProduct(product.id)}
                        className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                        aria-label={`Selecionar ${product.nome}`}
                      />
                    </div>

                    <div className="min-w-0 flex-1">
                      <CardTitle className="truncate text-lg">{product.nome}</CardTitle>
                      <CardDescription className="mt-1">
                        {product.referencia && `Ref: ${product.referencia} · `}
                        {product.categoria}
                      </CardDescription>
                    </div>

                    {product.imagemPrincipal ? (
                      <div className="ml-1 h-16 w-16 shrink-0 overflow-hidden rounded-lg border bg-muted">
                        <img src={product.imagemPrincipal} alt="" className="h-full w-full object-contain" />
                      </div>
                    ) : null}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="mb-3 flex flex-wrap gap-1">
                    {product.tamanhos.slice(0, 4).map((t) => (
                      <span key={t} className="rounded-full bg-secondary px-2 py-0.5 text-xs text-secondary-foreground">
                        {t}
                      </span>
                    ))}
                    {product.tamanhos.length > 4 ? (
                      <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                        +{product.tamanhos.length - 4}
                      </span>
                    ) : null}
                  </div>
                  <div className="mb-4 flex items-center gap-1">
                    {product.cores.slice(0, 6).map((c) => (
                      <div
                        key={c.id}
                        className="h-5 w-5 rounded-full border"
                        style={{ backgroundColor: c.hex }}
                        title={c.nome}
                      />
                    ))}
                  </div>
                  <div className="flex gap-2">
                    {canProducts ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => navigate(`/hospital/${hospitalId}/produto/${product.id}`)}
                      >
                        <Edit className="mr-1 h-3 w-3" />
                        Editar
                      </Button>
                    ) : null}

                    {canProducts ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-amber-600 dark:text-amber-400 hover:bg-amber-500/10"
                        onClick={() => handleSingleArchive(product.id, product.nome)}
                        title="Desativar e arquivar produto"
                      >
                        <Archive className="h-3 w-3" />
                      </Button>
                    ) : null}

                    {canProducts ? (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" title="Excluir produto">
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Excluir produto?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Tem certeza que deseja excluir «{product.nome}»?
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={async () => {
                                await deleteProduct(product.id);
                                toast.success("Produto excluído com sucesso!");
                              }}
                            >
                              Excluir
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Batch Delete Confirmation Dialog */}
      <AlertDialog open={batchDeleteDialogOpen} onOpenChange={setBatchDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir produtos selecionados?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir {selectedProductIds.size} produto{selectedProductIds.size !== 1 ? "s" : ""}? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isBatchProcessing}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBatchDelete}
              disabled={isBatchProcessing}
              className="bg-destructive hover:bg-destructive/90"
            >
              Excluir definitivamente
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {hospital ? (
        <>
          <ExportProductsDialog
            open={isExportOpen}
            onOpenChange={setIsExportOpen}
            hospital={hospital}
            products={activeProducts}
          />
          <ImportProductsDialog
            open={isImportOpen}
            onOpenChange={setIsImportOpen}
            hospital={hospital}
          />
          <ArchivedProductsDialog
            open={isArchivedOpen}
            onOpenChange={setIsArchivedOpen}
            hospital={hospital}
            archivedProducts={archivedProducts}
          />
        </>
      ) : null}
    </div>
  );
};

export default HospitalHub;
