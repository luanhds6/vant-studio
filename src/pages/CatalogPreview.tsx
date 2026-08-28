import { useEffect, useMemo, useRef, useState } from "react";
import { useTheme } from "next-themes";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { useProductStore } from "@/store/productStore";
import { useAuthStore } from "@/store/authStore";
import { canAccessRouteHome, getDefaultLandingPath } from "@/lib/routeAccess";
import { cn } from "@/lib/utils";
import { CatalogPage, type CatalogOrientation } from "@/components/catalog/CatalogPage";
import { CatalogEditProductDialog } from "@/components/catalog/CatalogEditProductDialog";
import { ProductColorSimulatorDialog } from "@/components/catalog/ProductColorSimulatorDialog";
import type { Product } from "@/types/Product";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { ProgressBar } from "@/components/ui/progress-bar";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ArrowLeft, Download, Eye, Loader2, LayoutGrid, List, ChevronLeft, ChevronRight, Maximize2, Minimize2, Pencil, Palette } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { applyCatalogPdfAlignment } from "@/lib/catalogPdfAlignment";

const slug = (s: string) =>
  s
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");

/** Escala o bitmap capturado para caber no A4 em mm, sem cortar (equivalente a object-fit: contain). */
function fitCanvasToPdfPage(
  canvasWidthPx: number,
  canvasHeightPx: number,
  pdfWidthMm: number,
  pdfHeightMm: number,
  marginMm = 2,
): { x: number; y: number; w: number; h: number } {
  const innerW = Math.max(1, pdfWidthMm - 2 * marginMm);
  const innerH = Math.max(1, pdfHeightMm - 2 * marginMm);
  const scale = Math.min(innerW / canvasWidthPx, innerH / canvasHeightPx);
  const w = canvasWidthPx * scale;
  const h = canvasHeightPx * scale;
  const x = marginMm + (innerW - w) / 2;
  const y = marginMm + (innerH - h) / 2;
  return { x, y, w, h };
}

const CatalogPreview = () => {
  const { hospitalId } = useParams<{ hospitalId: string }>();
  const navigate = useNavigate();
  const canAccess = useAuthStore((s) => s.canAccess);
  const hospitals = useProductStore((s) => s.hospitals);
  const allProducts = useProductStore((s) => s.products);
  const settings = useProductStore((s) => s.settings);

  const hospital = useMemo(
    () => (hospitalId ? hospitals.find((h) => h.id === hospitalId) : undefined),
    [hospitalId, hospitals],
  );
  const products = useMemo(
    () => (hospitalId ? allProducts.filter((p) => p.hospitalId === hospitalId) : []),
    [hospitalId, allProducts],
  );

  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [generating, setGenerating] = useState(false);
  const [progressValue, setProgressValue] = useState(0);
  const [showPreview, setShowPreview] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "grid">("grid");
  const [isProductsExpanded, setIsProductsExpanded] = useState(true);
  const [activeZoomedProduct, setActiveZoomedProduct] = useState<any | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [simulatingProduct, setSimulatingProduct] = useState<Product | null>(null);
  const [simulatingHex, setSimulatingHex] = useState<string | undefined>(undefined);
  const [previewLayout, setPreviewLayout] = useState<"list" | "grid">("list");
  const [catalogOrientation, setCatalogOrientation] = useState<CatalogOrientation>("portrait");
  const captureRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setSelected(products.map((p) => p.id));
  }, [hospitalId, products]);

  const useCatalogIsland = mounted && resolvedTheme === "dark";

  const toggleProduct = (id: string) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const selectedProducts = products.filter((p) => selected.includes(p.id));

  if (!hospitalId || !hospital) {
    return <Navigate to={getDefaultLandingPath(canAccess)} replace />;
  }

  const goBackFromCatalog = () => {
    if (canAccessRouteHome(canAccess)) navigate("/");
    else if (hospitalId) navigate(`/hospital/${hospitalId}`);
    else navigate(getDefaultLandingPath(canAccess));
  };

  const generatePDF = async () => {
    if (selectedProducts.length === 0) {
      toast({ title: "Selecione ao menos um produto", variant: "destructive" });
      return;
    }

    setGenerating(true);
    setProgressValue(0);

    // Initial delay to make sure rendering is prepared
    await new Promise((r) => setTimeout(r, 300));

    try {
      const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
        import("html2canvas"),
        import("jspdf"),
      ]);
      const isLandscape = catalogOrientation === "landscape";
      const pdf = new jsPDF(isLandscape ? "l" : "p", "mm", "a4");
      const pdfWidth = isLandscape ? 297 : 210;
      const pdfHeight = isLandscape ? 210 : 297;
      const pages = captureRef.current?.querySelectorAll(".catalog-page");

      if (!pages?.length) throw new Error("Sem páginas");

      const waitForPaint = () =>
        new Promise<void>((resolve) => {
          requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
        });

      // Wait once for the entire container to render and paint
      await waitForPaint();

      // Process pages in concurrent batches of 3 to speed up html2canvas rendering
      const results: { index: number; imgData: string; width: number; height: number }[] = new Array(pages.length);
      const batchSize = 3;
      let completedCount = 0;

      const capturePage = async (pageEl: HTMLElement, pageIndex: number) => {
        const canvas = await html2canvas(pageEl, {
          scale: 2,
          useCORS: true,
          backgroundColor: "#ffffff",
          logging: false,
          width: pageEl.scrollWidth,
          height: pageEl.scrollHeight,
          onclone: (clonedDoc, clonedPage) => {
            const root = clonedDoc.querySelector(".catalog-pdf-capture-root");
            if (root instanceof HTMLElement) {
              root.style.overflow = "visible";
              root.style.maxHeight = "none";
              root.style.height = "auto";
            }
            if (clonedPage instanceof HTMLElement) {
              applyCatalogPdfAlignment(clonedPage);
            }
          },
        });

        // 0.95 quality reduces size and speeds up encoding dramatically with no visible quality loss
        const imgData = canvas.toDataURL("image/jpeg", 0.95);
        completedCount++;
        setProgressValue((completedCount / pages.length) * 100);

        return {
          index: pageIndex,
          imgData,
          width: canvas.width,
          height: canvas.height,
        };
      };

      for (let i = 0; i < pages.length; i += batchSize) {
        const batchPromises: Promise<any>[] = [];
        const slice = Array.from(pages).slice(i, i + batchSize);

        for (let j = 0; j < slice.length; j++) {
          const pageIndex = i + j;
          const pageEl = slice[j] as HTMLElement;
          batchPromises.push(
            capturePage(pageEl, pageIndex).then((res) => {
              results[pageIndex] = res;
            })
          );
        }

        await Promise.all(batchPromises);
      }

      // Add pages sequentially in correct order to the PDF
      for (let i = 0; i < results.length; i++) {
        const { imgData, width, height } = results[i];
        const { x, y, w, h } = fitCanvasToPdfPage(width, height, pdfWidth, pdfHeight);

        if (i > 0) pdf.addPage("a4", isLandscape ? "l" : "p");
        pdf.addImage(imgData, "JPEG", x, y, w, h);
      }

      const hosp = slug(hospital.nome);
      const emp = slug(settings.nomeEmpresa || "empresa");
      const suf = isLandscape ? "paisagem" : "retrato";
      pdf.save(`catalogo-${hosp}-${emp}-${suf}.pdf`);
      toast({ title: "PDF gerado com sucesso!" });
    } catch (err) {
      console.error(err);
      toast({ title: "Erro ao gerar PDF", variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div
      className={cn(
        "space-y-6 rounded-2xl border border-border p-6 shadow-sm",
        useCatalogIsland
          ? "catalog-surface bg-background text-foreground"
          : "bg-card text-card-foreground",
      )}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <Button variant="ghost" size="sm" className="-ml-2 mb-1" onClick={goBackFromCatalog}>
            <ArrowLeft className="mr-1 h-4 w-4" />
            {canAccessRouteHome(canAccess) ? "Página inicial" : "Voltar ao hospital"}
          </Button>
          <p className="text-sm font-medium text-muted-foreground">{hospital.nome}</p>
          <h1 className="text-3xl font-bold tracking-tight">Gerar catálogo</h1>
          <p className="mt-1 text-muted-foreground">
            Escolha retrato (A4 vertical) ou paisagem (A4 horizontal), pré-visualize e baixe o PDF no formato selecionado.
          </p>
        </div>
        <div className="flex flex-col items-stretch gap-3 sm:items-end">
          <div className="flex flex-col gap-2 sm:items-end">
            <Label className="text-xs text-muted-foreground">Formato do PDF</Label>
            <ToggleGroup
              type="single"
              variant="outline"
              value={catalogOrientation}
              onValueChange={(v) => {
                if (v === "portrait" || v === "landscape") setCatalogOrientation(v);
              }}
              className="justify-end"
            >
              <ToggleGroupItem value="portrait" aria-label="Retrato A4">
                Retrato
              </ToggleGroupItem>
              <ToggleGroupItem value="landscape" aria-label="Paisagem A4">
                Paisagem
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => {
                const next = !showPreview;
                setShowPreview(next);
                if (next) {
                  setIsProductsExpanded(false);
                }
              }}
              disabled={selectedProducts.length === 0}
            >
              <Eye className="mr-2 h-4 w-4" />
              {showPreview ? "Ocultar" : "Pré-visualizar"}
            </Button>
            <Button onClick={generatePDF} disabled={generating || selectedProducts.length === 0}>
              {generating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
              {generating ? "Gerando..." : "Gerar PDF"}
            </Button>
          </div>
        </div>
      </div>

      {generating && (
        <div className="pt-2 pb-2">
          <ProgressBar value={progressValue} label="Preparando e gerando o PDF..." />
        </div>
      )}

      {products.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              Nenhum produto neste hospital.
              {canAccess("novo_produto") ? (
                <>
                  {" "}
                  Cadastre produtos em <span className="font-medium text-foreground">Hospitais</span> → abra o
                  hospital → novo produto.
                </>
              ) : null}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <CardHeader
            className="cursor-pointer hover:bg-muted/30 transition-colors select-none"
            onClick={() => setIsProductsExpanded(!isProductsExpanded)}
          >
            <CardTitle className="flex flex-col gap-3 text-lg sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <span>Produtos ({selected.length}/{products.length} selecionados)</span>
                <span className="text-xs font-normal text-muted-foreground">
                  {isProductsExpanded ? "(Clique para recolher)" : "(Clique para expandir)"}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2" onClick={(e) => e.stopPropagation()}>
                {isProductsExpanded && (
                  <>
                    <ToggleGroup
                      type="single"
                      variant="outline"
                      value={viewMode}
                      onValueChange={(v) => {
                        if (v === "list" || v === "grid") setViewMode(v);
                      }}
                      className="mr-2"
                    >
                      <ToggleGroupItem value="grid" aria-label="Grade" className="h-8 w-8 p-0">
                        <LayoutGrid className="h-4 w-4" />
                      </ToggleGroupItem>
                      <ToggleGroupItem value="list" aria-label="Lista" className="h-8 w-8 p-0">
                        <List className="h-4 w-4" />
                      </ToggleGroupItem>
                    </ToggleGroup>
                    <Button variant="ghost" size="sm" onClick={() => setSelected(products.map((p) => p.id))}>
                      Catálogo completo
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setSelected([])}>
                      Limpar seleção
                    </Button>
                  </>
                )}
              </div>
            </CardTitle>
          </CardHeader>
          {isProductsExpanded && (
            <CardContent>
              <p className="mb-3 text-xs text-muted-foreground">
                Use «Catálogo completo» para todas as páginas no PDF, ou desmarque itens para gerar só os produtos escolhidos.
              </p>
              <div className={cn(
                viewMode === "grid"
                  ? "grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6"
                  : "space-y-2"
              )}>
                {products.map((p) => {
                  const isSelected = selected.includes(p.id);
                  return viewMode === "grid" ? (
                    <div
                      key={p.id}
                      onClick={() => toggleProduct(p.id)}
                      className={cn(
                        "relative flex flex-col items-center justify-between rounded-xl border p-4 text-center cursor-pointer transition-all hover:bg-muted/50 select-none",
                        isSelected ? "border-primary bg-primary/5 shadow-sm" : "border-border bg-card"
                      )}
                    >
                      <div className="absolute top-3 left-3" onClick={(e) => e.stopPropagation()}>
                        <Checkbox checked={isSelected} onCheckedChange={() => toggleProduct(p.id)} />
                      </div>
                      {p.imagemPrincipal ? (
                        <img
                          src={p.imagemPrincipal}
                          alt=""
                          className="h-20 w-20 rounded object-contain mb-2"
                          loading="lazy"
                          decoding="async"
                        />
                      ) : (
                        <div className="h-20 w-20 rounded bg-muted flex items-center justify-center mb-2 text-[10px] text-muted-foreground">Sem imagem</div>
                      )}
                      <div className="min-w-0 w-full space-y-1">
                        <div className="truncate font-semibold text-xs">{p.nome}</div>
                        <div className="text-[10px] text-muted-foreground truncate">
                          {p.referencia ? `Ref: ${p.referencia}` : `Ref: -`}
                        </div>
                        <div className="text-[10px] text-muted-foreground truncate">{p.categoria}</div>
                      </div>
                      <div className="flex gap-1 mt-2 justify-center flex-wrap">
                        {p.cores.slice(0, 4).map((c) => (
                          <div key={c.id} className="h-2.5 w-2.5 rounded-full border border-black/10" style={{ backgroundColor: c.hex }} />
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div
                      key={p.id}
                      onClick={() => toggleProduct(p.id)}
                      className={cn(
                        "flex cursor-pointer items-center gap-3 rounded-lg p-3 border transition-colors hover:bg-muted/50 select-none",
                        isSelected ? "border-primary bg-primary/5" : "border-transparent bg-card"
                      )}
                    >
                      <div onClick={(e) => e.stopPropagation()}>
                        <Checkbox checked={isSelected} onCheckedChange={() => toggleProduct(p.id)} />
                      </div>
                      {p.imagemPrincipal && (
                        <img
                          src={p.imagemPrincipal}
                          alt=""
                          className="h-10 w-10 rounded border object-contain"
                          loading="lazy"
                          decoding="async"
                        />
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-medium text-sm">{p.nome}</div>
                        <div className="text-xs text-muted-foreground">
                          {p.referencia && `Ref: ${p.referencia} · `}
                          {p.categoria}
                        </div>
                      </div>
                      <div className="flex gap-1 items-center">
                        {p.cores.slice(0, 4).map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            className="h-4 w-4 rounded-full border border-black/20 hover:scale-125 transition-transform"
                            style={{ backgroundColor: c.hex }}
                            title={`Simular «${p.nome}» na cor ${c.nome}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSimulatingProduct(p);
                              setSimulatingHex(c.hex);
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          )}
        </Card>
      )}

      {showPreview && selectedProducts.length > 0 && (
        <div className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-xl font-semibold">
              Pré-visualização — {catalogOrientation === "landscape" ? "A4 paisagem" : "A4 retrato"}
            </h2>
            <ToggleGroup
              type="single"
              variant="outline"
              value={previewLayout}
              onValueChange={(v) => {
                if (v === "list" || v === "grid") setPreviewLayout(v as "list" | "grid");
              }}
              className="justify-end"
            >
              <ToggleGroupItem value="list" aria-label="Folha a Folha" className="text-xs gap-1.5 py-1 px-3">
                <List className="h-3.5 w-3.5" /> Folha a Folha (Grande)
              </ToggleGroupItem>
              <ToggleGroupItem value="grid" aria-label="Grade de Folhas" className="text-xs gap-1.5 py-1 px-3">
                <LayoutGrid className="h-3.5 w-3.5" /> Grade de Folhas
              </ToggleGroupItem>
            </ToggleGroup>
          </div>

          {previewLayout === "grid" ? (
            <div className="rounded-xl border bg-muted/30 p-6">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6 justify-items-center">
                {selectedProducts.map((product) => {
                  const isLandscape = catalogOrientation === "landscape";
                  const pageW = isLandscape ? 297 : 210;
                  const pageH = isLandscape ? 210 : 297;
                  const scale = 0.22; // Miniaturized preview scale

                  return (
                    <div
                      key={product.id}
                      onClick={() => setActiveZoomedProduct(product)}
                      style={{
                        width: `${pageW * scale}mm`,
                        height: `${pageH * scale}mm`,
                      }}
                      className="group relative cursor-pointer overflow-hidden rounded-lg border border-border shadow-md bg-white transition-all duration-300 origin-center hover:scale-105 hover:shadow-2xl hover:z-10"
                    >
                      <div
                        className="pointer-events-none origin-top-left"
                        style={{
                          transform: `scale(${scale})`,
                          width: `${pageW}mm`,
                          height: `${pageH}mm`,
                        }}
                      >
                        <CatalogPage product={product} settings={settings} orientation={catalogOrientation} />
                      </div>
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col items-center justify-center gap-2 p-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveZoomedProduct(product);
                          }}
                          className="w-full max-w-[110px] text-white text-[11px] font-semibold flex items-center justify-center gap-1.5 bg-black/80 hover:bg-black py-1.5 rounded-md shadow-sm transition-transform hover:scale-105"
                        >
                          <Eye className="h-3.5 w-3.5" /> Ampliar
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSimulatingProduct(product);
                            setSimulatingHex(undefined);
                          }}
                          className="w-full max-w-[110px] text-white text-[11px] font-semibold flex items-center justify-center gap-1.5 bg-orange-600 hover:bg-orange-700 py-1.5 rounded-md shadow-sm transition-transform hover:scale-105"
                        >
                          <Palette className="h-3.5 w-3.5" /> Simular Cor
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingProduct(product);
                          }}
                          className="w-full max-w-[110px] text-white text-[11px] font-semibold flex items-center justify-center gap-1.5 bg-primary hover:bg-primary/90 py-1.5 rounded-md shadow-sm transition-transform hover:scale-105"
                        >
                          <Pencil className="h-3.5 w-3.5" /> Editar
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="catalog-pdf-capture-root overflow-auto rounded-xl border bg-muted/30 p-6 flex flex-col items-center gap-8">
              {selectedProducts.map((product, index) => {
                const isLandscape = catalogOrientation === "landscape";
                const a4W = isLandscape ? "297mm" : "210mm";
                return (
                  <div key={product.id} className="flex flex-col items-center gap-2 w-full max-w-[297mm]">
                    {/* Barra de Ações Superior da Folha */}
                    <div
                      style={{ width: a4W }}
                      className="flex items-center justify-between px-4 py-2 bg-card rounded-lg border border-border shadow-xs max-w-full"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-xs font-bold text-foreground">
                          Folha {index + 1} de {selectedProducts.length}
                        </span>
                        <span className="text-xs text-muted-foreground truncate">
                          · {product.nome}
                        </span>
                        {product.referencia && (
                          <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-muted text-muted-foreground">
                            Ref: {product.referencia}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {product.imagemPrincipal && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSimulatingProduct(product);
                              setSimulatingHex(undefined);
                            }}
                            className="gap-1.5 h-8 text-xs font-semibold border-orange-500/40 text-orange-600 dark:text-orange-400 hover:bg-orange-500/10"
                          >
                            <Palette className="h-3.5 w-3.5" /> Simular Cores
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => setEditingProduct(product)}
                          className="gap-1.5 h-8 text-xs font-semibold shadow-xs"
                        >
                          <Pencil className="h-3.5 w-3.5" /> Editar Produto
                        </Button>
                      </div>
                    </div>

                    {/* Folha A4 */}
                    <div className="shadow-xl bg-white rounded-lg border border-border overflow-hidden">
                      <CatalogPage
                        product={product}
                        settings={settings}
                        orientation={catalogOrientation}
                        onSimulateColor={(prod, hex) => {
                          setSimulatingProduct(prod);
                          setSimulatingHex(hex);
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {generating && (
        <div
          style={{
            position: "absolute",
            left: "-9999px",
            top: 0,
            width: catalogOrientation === "landscape" ? "297mm" : "210mm",
          }}
        >
          <div ref={captureRef} style={{ width: catalogOrientation === "landscape" ? "297mm" : "210mm" }}>
            {selectedProducts.map((product) => (
              <CatalogPage
                key={product.id}
                product={product}
                settings={settings}
                orientation={catalogOrientation}
              />
            ))}
          </div>
        </div>
      )}

      <ModalPreviewDialog
        products={selectedProducts}
        initialIndex={selectedProducts.findIndex((p) => p.id === activeZoomedProduct?.id)}
        settings={settings}
        orientation={catalogOrientation}
        onClose={() => setActiveZoomedProduct(null)}
        onEdit={(p) => setEditingProduct(p)}
        onSimulateColor={(prod, hex) => {
          setSimulatingProduct(prod);
          setSimulatingHex(hex);
        }}
      />

      <CatalogEditProductDialog
        product={editingProduct}
        open={Boolean(editingProduct)}
        onOpenChange={(open) => !open && setEditingProduct(null)}
        onSaved={(updated) => {
          if (activeZoomedProduct?.id === updated.id) {
            setActiveZoomedProduct(updated);
          }
        }}
      />

      <ProductColorSimulatorDialog
        product={simulatingProduct}
        open={Boolean(simulatingProduct)}
        onOpenChange={(open) => !open && setSimulatingProduct(null)}
        initialHex={simulatingHex}
      />
    </div>
  );
};

// Hook to track window size for dynamic scaling
function useWindowSize() {
  const [size, setSize] = useState({ width: 1200, height: 800 });
  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleResize = () => {
      setSize({ width: window.innerWidth, height: window.innerHeight });
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);
  return size;
}

interface ModalPreviewDialogProps {
  products: any[];
  initialIndex: number;
  settings: any;
  orientation: CatalogOrientation;
  onClose: () => void;
  onEdit: (product: Product) => void;
  onSimulateColor?: (product: Product, hex?: string) => void;
}

function ModalPreviewDialog({ products, initialIndex, settings, orientation, onClose, onEdit, onSimulateColor }: ModalPreviewDialogProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  // Sync state with open item index
  useEffect(() => {
    if (initialIndex >= 0 && initialIndex < products.length) {
      setCurrentIndex(initialIndex);
    }
  }, [initialIndex, products.length]);

  const { width: winW, height: winH } = useWindowSize();
  const isOpen = initialIndex !== -1 && products.length > 0;

  // Determine active index safely to avoid undefined product on initial mount or index sync
  const activeIndex =
    currentIndex >= 0 && currentIndex < products.length
      ? currentIndex
      : initialIndex >= 0 && initialIndex < products.length
      ? initialIndex
      : 0;

  const product = products[activeIndex];

  // Listen to keyboard left/right arrow keys
  useEffect(() => {
    if (!isOpen || products.length === 0) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        setCurrentIndex((prev) => (prev > 0 ? prev - 1 : products.length - 1));
      } else if (e.key === "ArrowRight") {
        setCurrentIndex((prev) => (prev < products.length - 1 ? prev + 1 : 0));
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, products.length]);

  if (!isOpen || !product) return null;

  const isLandscape = orientation === "landscape";
  const a4W = isLandscape ? 297 : 210;
  const a4H = isLandscape ? 210 : 297;

  // Use larger bounds to reduce horizontal/vertical purple margins
  const maxW = winW * 0.84; // Leave 8% on each side for prev/next buttons
  const maxH = winH * 0.94; // Use 94% of vertical viewport height

  const a4Wpx = a4W * 3.7795;
  const a4Hpx = a4H * 3.7795;

  const scaleX = maxW / a4Wpx;
  const scaleY = maxH / a4Hpx;

  const modalScale = Math.min(1, scaleX, scaleY);

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : products.length - 1));
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev < products.length - 1 ? prev + 1 : 0));
  };

  return (
    <Dialog open={initialIndex !== -1} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[98vw] max-h-[98vh] p-0 bg-slate-950/92 border-0 flex items-center justify-center overflow-hidden outline-none">
        
        {/* Top floating bar with product title and Edit/Simulate buttons */}
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-black/80 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/20 text-white shadow-xl">
          <span className="text-xs font-semibold">
            Folha {activeIndex + 1} de {products.length} · {product?.nome || ""}
          </span>
          {product?.imagemPrincipal && (
            <Button
              size="sm"
              variant="outline"
              onClick={(e) => {
                e.stopPropagation();
                if (product && onSimulateColor) onSimulateColor(product);
              }}
              className="h-7 text-xs gap-1.5 border-orange-400/50 bg-orange-500/20 text-orange-200 hover:bg-orange-500/30 rounded-full px-3 shadow-sm"
            >
              <Palette className="h-3.5 w-3.5 text-orange-400" /> Simular Cor
            </Button>
          )}
          <Button
            size="sm"
            variant="default"
            onClick={(e) => {
              e.stopPropagation();
              if (product) onEdit(product);
            }}
            className="h-7 text-xs gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-full px-3 shadow-sm"
          >
            <Pencil className="h-3.5 w-3.5" /> Editar Produto
          </Button>
        </div>

        {/* Relative wrapper for page + buttons */}
        <div className="relative flex items-center justify-center pt-8 pb-4">
          
          {/* Left Arrow Button */}
          <button
            onClick={handlePrev}
            className="absolute left-2 md:-left-16 top-1/2 -translate-y-1/2 flex h-12 w-12 items-center justify-center rounded-full bg-black/50 border border-white/20 text-white hover:bg-black/70 transition-all z-50 outline-none hover:scale-105 active:scale-95 shadow-lg animate-fade-in"
            title="Página anterior (Seta Esquerda)"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>

          {/* Zoomed Page container */}
          <div
            style={{
              width: `${a4W * modalScale}mm`,
              maxHeight: "88vh",
            }}
            className="bg-white rounded-lg shadow-2xl overflow-x-hidden overflow-y-auto [scrollbar-width:thin] transition-all duration-300"
          >
            <div style={{ zoom: modalScale, width: `${a4W}mm` }}>
              <CatalogPage
                product={product}
                settings={settings}
                orientation={orientation}
                onSimulateColor={onSimulateColor}
              />
            </div>
          </div>

          {/* Right Arrow Button */}
          <button
            onClick={handleNext}
            className="absolute right-2 md:-right-16 top-1/2 -translate-y-1/2 flex h-12 w-12 items-center justify-center rounded-full bg-black/50 border border-white/20 text-white hover:bg-black/70 transition-all z-50 outline-none hover:scale-105 active:scale-95 shadow-lg animate-fade-in"
            title="Próxima página (Seta Direita)"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
          
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default CatalogPreview;
