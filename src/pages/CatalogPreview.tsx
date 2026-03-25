import { useRef, useState } from "react";
import { useProductStore } from "@/store/productStore";
import { CatalogPage } from "@/components/catalog/CatalogPage";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, Eye, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

const CatalogPreview = () => {
  const { products, settings } = useProductStore();
  const [selected, setSelected] = useState<string[]>(products.map((p) => p.id));
  const [generating, setGenerating] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const catalogRef = useRef<HTMLDivElement>(null);

  const toggleProduct = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const selectedProducts = products.filter((p) => selected.includes(p.id));

  const generatePDF = async () => {
    if (selectedProducts.length === 0) {
      toast({ title: "Selecione ao menos um produto", variant: "destructive" });
      return;
    }

    setGenerating(true);
    setShowPreview(true);

    // Wait for render
    await new Promise((r) => setTimeout(r, 500));

    try {
      const pdf = new jsPDF("p", "mm", "a4");
      const pages = catalogRef.current?.querySelectorAll(".catalog-page");

      if (!pages) throw new Error("Sem páginas");

      for (let i = 0; i < pages.length; i++) {
        const canvas = await html2canvas(pages[i] as HTMLElement, {
          scale: 2,
          useCORS: true,
          backgroundColor: "#ffffff",
        });

        const imgData = canvas.toDataURL("image/jpeg", 0.95);
        const pdfWidth = 210;
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

        if (i > 0) pdf.addPage();
        pdf.addImage(imgData, "JPEG", 0, 0, pdfWidth, pdfHeight);
      }

      pdf.save(`catalogo-${settings.nomeEmpresa.replace(/\s+/g, "-").toLowerCase()}.pdf`);
      toast({ title: "PDF gerado com sucesso!" });
    } catch (err) {
      console.error(err);
      toast({ title: "Erro ao gerar PDF", variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gerar Catálogo</h1>
          <p className="text-muted-foreground mt-1">
            Selecione os produtos e gere o PDF do catálogo.
          </p>
        </div>
        <div className="flex gap-3">
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

      {products.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Nenhum produto cadastrado. Adicione produtos primeiro.</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center justify-between">
              <span>Produtos ({selected.length}/{products.length} selecionados)</span>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => setSelected(products.map((p) => p.id))}>
                  Selecionar todos
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setSelected([])}>
                  Limpar
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {products.map((p) => (
                <label
                  key={p.id}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                >
                  <Checkbox
                    checked={selected.includes(p.id)}
                    onCheckedChange={() => toggleProduct(p.id)}
                  />
                  {p.imagemPrincipal && (
                    <img src={p.imagemPrincipal} alt="" className="w-10 h-10 object-contain rounded border" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{p.nome}</div>
                    <div className="text-xs text-muted-foreground">
                      {p.referencia && `Ref: ${p.referencia} · `}
                      {p.categoria}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    {p.cores.slice(0, 4).map((c) => (
                      <div key={c.id} className="w-4 h-4 rounded-full border" style={{ backgroundColor: c.hex }} />
                    ))}
                  </div>
                </label>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Hidden catalog for PDF generation + preview */}
      {showPreview && selectedProducts.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Pré-visualização</h2>
          <div className="overflow-auto border rounded-xl bg-muted/30 p-4">
            <div ref={catalogRef} className="flex flex-col items-center gap-6">
              {selectedProducts.map((product) => (
                <div key={product.id} className="shadow-lg">
                  <CatalogPage product={product} settings={settings} />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Off-screen render for PDF (when not previewing) */}
      {!showPreview && generating && (
        <div style={{ position: "absolute", left: "-9999px", top: 0 }}>
          <div ref={catalogRef}>
            {selectedProducts.map((product) => (
              <CatalogPage key={product.id} product={product} settings={settings} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default CatalogPreview;
