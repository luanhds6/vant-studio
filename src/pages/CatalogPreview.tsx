import { useEffect, useMemo, useRef, useState } from "react";
import { useTheme } from "next-themes";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { useProductStore } from "@/store/productStore";
import { useAuthStore } from "@/store/authStore";
import { canAccessRouteHome, getDefaultLandingPath } from "@/lib/routeAccess";
import { cn } from "@/lib/utils";
import { CatalogPage, type CatalogOrientation } from "@/components/catalog/CatalogPage";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { ArrowLeft, Download, Eye, Loader2 } from "lucide-react";
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
  const [showPreview, setShowPreview] = useState(false);
  const [catalogOrientation, setCatalogOrientation] = useState<CatalogOrientation>("portrait");
  const catalogRef = useRef<HTMLDivElement>(null);

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
    setShowPreview(true);

    await new Promise((r) => setTimeout(r, 500));

    try {
      const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
        import("html2canvas"),
        import("jspdf"),
      ]);
      const isLandscape = catalogOrientation === "landscape";
      const pdf = new jsPDF(isLandscape ? "l" : "p", "mm", "a4");
      const pdfWidth = isLandscape ? 297 : 210;
      const pdfHeight = isLandscape ? 210 : 297;
      const pages = catalogRef.current?.querySelectorAll(".catalog-page");

      if (!pages?.length) throw new Error("Sem páginas");

      const waitForPaint = () =>
        new Promise<void>((resolve) => {
          requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
        });

      for (let i = 0; i < pages.length; i++) {
        const pageEl = pages[i] as HTMLElement;
        pageEl.scrollIntoView({ block: "center", inline: "nearest" });
        await waitForPaint();
        await new Promise((r) => setTimeout(r, 120));

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

        const imgData = canvas.toDataURL("image/jpeg", 1.0);
        const { x, y, w, h } = fitCanvasToPdfPage(canvas.width, canvas.height, pdfWidth, pdfHeight);

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
            <Button variant="outline" onClick={() => setShowPreview(!showPreview)} disabled={selectedProducts.length === 0}>
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
        <Card>
          <CardHeader>
            <CardTitle className="flex flex-col gap-2 text-lg sm:flex-row sm:items-center sm:justify-between">
              <span>
                Produtos ({selected.length}/{products.length} selecionados)
              </span>
              <div className="flex flex-wrap gap-2">
                <Button variant="ghost" size="sm" onClick={() => setSelected(products.map((p) => p.id))}>
                  Catálogo completo
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setSelected([])}>
                  Limpar seleção
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-3 text-xs text-muted-foreground">
              Use «Catálogo completo» para todas as páginas no PDF, ou desmarque itens para gerar só os produtos escolhidos.
            </p>
            <div className="space-y-2">
              {products.map((p) => (
                <label
                  key={p.id}
                  className="flex cursor-pointer items-center gap-3 rounded-lg p-3 transition-colors hover:bg-muted/50"
                >
                  <Checkbox checked={selected.includes(p.id)} onCheckedChange={() => toggleProduct(p.id)} />
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
                    <div className="truncate font-medium">{p.nome}</div>
                    <div className="text-xs text-muted-foreground">
                      {p.referencia && `Ref: ${p.referencia} · `}
                      {p.categoria}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    {p.cores.slice(0, 4).map((c) => (
                      <div key={c.id} className="h-4 w-4 rounded-full border" style={{ backgroundColor: c.hex }} />
                    ))}
                  </div>
                </label>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {showPreview && selectedProducts.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">
            Pré-visualização — {catalogOrientation === "landscape" ? "A4 paisagem" : "A4 retrato"}
          </h2>
          <div className="catalog-pdf-capture-root overflow-auto rounded-xl border bg-muted/30 p-4">
            <div ref={catalogRef} className="flex flex-col items-center gap-6">
              {selectedProducts.map((product) => (
                <div key={product.id} className="shadow-lg">
                  <CatalogPage product={product} settings={settings} orientation={catalogOrientation} />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {!showPreview && generating && (
        <div
          style={{
            position: "absolute",
            left: "-9999px",
            top: 0,
            width: catalogOrientation === "landscape" ? "297mm" : "210mm",
          }}
        >
          <div ref={catalogRef} style={{ width: catalogOrientation === "landscape" ? "297mm" : "210mm" }}>
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
    </div>
  );
};

export default CatalogPreview;
