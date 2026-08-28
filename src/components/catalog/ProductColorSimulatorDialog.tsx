import React, { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Download,
  Copy,
  ExternalLink,
  Sparkles,
  Palette,
  Check,
  Package,
  Layers,
  X,
} from "lucide-react";
import { Product, ProductColor } from "@/types/Product";
import {
  colorizeGarment,
  downloadImageSafely,
  copyImageToClipboard,
  openImageInNewTab,
} from "@/lib/garmentColorizer";
import { toast } from "sonner";

interface ProductColorSimulatorDialogProps {
  product: Product | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialHex?: string;
}

export const ProductColorSimulatorDialog: React.FC<ProductColorSimulatorDialogProps> = ({
  product,
  open,
  onOpenChange,
  initialHex,
}) => {
  const [selectedHex, setSelectedHex] = useState<string | null>(null);
  const [selectedColorName, setSelectedColorName] = useState<string>("");
  const [displayImage, setDisplayImage] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isCopying, setIsCopying] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);

  // Inicializa quando abre o produto
  useEffect(() => {
    if (!product) {
      setSelectedHex(null);
      setDisplayImage("");
      setZoomLevel(1);
      return;
    }

    const defaultImg = product.imagemPrincipal || "";
    setDisplayImage(defaultImg);
    setZoomLevel(1);

    if (initialHex) {
      const match = product.cores.find((c) => c.hex.toLowerCase() === initialHex.toLowerCase());
      if (match) {
        handleColorSelect(match);
      } else {
        handleCustomColor(initialHex, "Cor Selecionada");
      }
    } else if (product.cores.length > 0) {
      // Começa com o original ou primeira cor
      setSelectedHex(null);
      setSelectedColorName("Original (Branco)");
    }
  }, [product, open, initialHex]);

  const handleColorSelect = async (color: ProductColor) => {
    if (!product || !product.imagemPrincipal) return;

    setSelectedHex(color.hex);
    setSelectedColorName(color.nome);
    setIsProcessing(true);

    try {
      const tinted = await colorizeGarment(product.imagemPrincipal, color.hex);
      setDisplayImage(tinted);
    } catch (err) {
      console.error("Erro ao aplicar cor:", err);
      toast.error("Erro ao processar colorização da imagem.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCustomColor = async (hex: string, name: string) => {
    if (!product || !product.imagemPrincipal) return;

    setSelectedHex(hex);
    setSelectedColorName(name);
    setIsProcessing(true);

    try {
      const tinted = await colorizeGarment(product.imagemPrincipal, hex);
      setDisplayImage(tinted);
    } catch (err) {
      console.error("Erro ao aplicar cor:", err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleResetOriginal = () => {
    if (!product) return;
    setSelectedHex(null);
    setSelectedColorName("Original (Branco)");
    setDisplayImage(product.imagemPrincipal || "");
  };

  const handleDownloadSimulated = async () => {
    if (!displayImage || !product) return;
    setIsDownloading(true);
    const colorSuffix = selectedColorName ? `_${selectedColorName}` : "";
    const filename = `${product.nome}${colorSuffix}`;
    const success = await downloadImageSafely(displayImage, filename);
    setIsDownloading(false);
    if (success) {
      toast.success("Imagem do produto baixada com sucesso!");
    } else {
      toast.error("Não foi possível gerar o arquivo da imagem para download.");
    }
  };

  const handleCopyToClipboard = async () => {
    if (!displayImage) return;
    setIsCopying(true);
    const success = await copyImageToClipboard(displayImage);
    setIsCopying(false);
    if (success) {
      toast.success("Imagem copiada para a Área de Transferência! Você pode colar (Ctrl + V) em qualquer lugar.");
    } else {
      toast.error("Não foi possível copiar a imagem diretamente.");
    }
  };

  const handleOpenInNewTab = () => {
    if (!displayImage) return;
    openImageInNewTab(displayImage);
  };

  if (!product) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[92vh] flex flex-col p-6 overflow-hidden">
        <DialogHeader className="pb-3 border-b flex flex-row items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Palette className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold flex items-center gap-2">
                {product.nome}
                {product.referencia ? (
                  <Badge variant="outline" className="text-xs font-mono">
                    Ref: {product.referencia}
                  </Badge>
                ) : null}
              </DialogTitle>
              <DialogDescription className="text-xs">
                Simulador interativo de cores · {product.tecido || "Tecido padrão"}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Main Content: Viewer on Left + Palette on Right */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 flex-1 min-h-0 py-3 items-stretch">
          
          {/* Garment Viewer (Left / 7 cols) */}
          <div className="md:col-span-7 flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900/50 border rounded-2xl p-4 relative overflow-hidden group select-none min-h-[320px]">
            
            {/* Zoom Controls */}
            <div className="absolute top-3 right-3 flex items-center gap-1 bg-background/80 backdrop-blur-md border rounded-lg p-1 shadow-sm z-20">
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7"
                onClick={() => setZoomLevel((z) => Math.min(2.5, z + 0.25))}
                title="Aumentar Zoom"
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7"
                onClick={() => setZoomLevel((z) => Math.max(0.75, z - 0.25))}
                title="Diminuir Zoom"
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7"
                onClick={() => setZoomLevel(1)}
                title="Redefinir Zoom"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </Button>
            </div>

            {/* Active Color Floating Tag */}
            <div className="absolute top-3 left-3 flex items-center gap-2 bg-background/85 backdrop-blur-md border rounded-full py-1 px-3 shadow-xs z-20">
              <span
                className="h-3.5 w-3.5 rounded-full border border-black/20 shrink-0"
                style={{ backgroundColor: selectedHex || "#ffffff" }}
              />
              <span className="text-xs font-semibold text-foreground">
                {selectedColorName || "Original"}
              </span>
            </div>

            {/* Canvas / Image Display */}
            {displayImage ? (
              <div
                className="w-full h-full flex items-center justify-center transition-transform duration-200"
                style={{ transform: `scale(${zoomLevel})` }}
              >
                <img
                  src={displayImage}
                  alt={product.nome}
                  className={`max-h-[380px] max-w-full object-contain drop-shadow-md transition-opacity duration-200 ${
                    isProcessing ? "opacity-40" : "opacity-100"
                  }`}
                />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center text-muted-foreground py-16">
                <Package className="h-12 w-12 mb-2 opacity-30" />
                <p className="text-sm">Nenhum desenho técnico disponível para este produto.</p>
              </div>
            )}

            {isProcessing && (
              <div className="absolute inset-0 bg-background/40 backdrop-blur-xs flex items-center justify-center gap-2 text-sm font-medium z-30">
                <Sparkles className="h-5 w-5 text-primary animate-spin" />
                <span>Renderizando cor no traçado...</span>
              </div>
            )}
          </div>

          {/* Color Palette & Details (Right / 5 cols) */}
          <div className="md:col-span-5 flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold tracking-tight text-foreground flex items-center gap-1.5">
                  <Palette className="h-4 w-4 text-primary" />
                  Cores Disponíveis ({product.cores.length})
                </h4>
                {selectedHex && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs text-muted-foreground hover:text-foreground"
                    onClick={handleResetOriginal}
                  >
                    Restaurar branco
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[260px] overflow-y-auto pr-1">
                {/* Botão para cor Original / Branco */}
                <button
                  type="button"
                  onClick={handleResetOriginal}
                  className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-left transition-all ${
                    selectedHex === null
                      ? "border-primary bg-primary/10 shadow-xs ring-1 ring-primary"
                      : "border-border hover:bg-muted/50"
                  }`}
                >
                  <span className="h-6 w-6 rounded-full border border-black/20 bg-white flex items-center justify-center shrink-0 shadow-xs">
                    {selectedHex === null ? <Check className="h-3.5 w-3.5 text-black" /> : null}
                  </span>
                  <div className="min-w-0 flex-1 truncate">
                    <p className="text-xs font-semibold truncate text-foreground">Original (Branco)</p>
                    <p className="text-[10px] text-muted-foreground">Padrão</p>
                  </div>
                </button>

                {/* Cores cadastradas do produto */}
                {product.cores.map((c) => {
                  const isSelected = selectedHex?.toLowerCase() === c.hex.toLowerCase();
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => handleColorSelect(c)}
                      className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-left transition-all ${
                        isSelected
                          ? "border-primary bg-primary/10 shadow-xs ring-1 ring-primary"
                          : "border-border hover:bg-muted/50"
                      }`}
                    >
                      <span
                        className="h-6 w-6 rounded-full border border-black/20 flex items-center justify-center shrink-0 shadow-xs"
                        style={{ backgroundColor: c.hex }}
                      >
                        {isSelected ? (
                          <Check
                            className={`h-3.5 w-3.5 ${
                              // Inverte o check para cores muito claras
                              c.hex.toLowerCase() === "#ffffff" ? "text-black" : "text-white"
                            }`}
                          />
                        ) : null}
                      </span>
                      <div className="min-w-0 flex-1 truncate">
                        <p className="text-xs font-semibold truncate text-foreground">{c.nome}</p>
                        <p className="text-[10px] font-mono text-muted-foreground uppercase">
                          {c.hex}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Informações Técnicas da Peça */}
              <div className="p-3 bg-muted/40 rounded-xl border space-y-2 text-xs">
                <div className="flex justify-between items-center text-muted-foreground">
                  <span>Tecido:</span>
                  <span className="font-semibold text-foreground">{product.tecido || "—"}</span>
                </div>
                {product.tamanhos?.length > 0 && (
                  <div className="flex justify-between items-center text-muted-foreground">
                    <span>Tamanhos:</span>
                    <span className="font-semibold text-foreground">
                      {product.tamanhos.join(", ")}
                    </span>
                  </div>
                )}
                {product.dimensoes?.length > 0 && product.dimensoes[0]?.largura && (
                  <div className="flex justify-between items-center text-muted-foreground">
                    <span>Dimensões:</span>
                    <span className="font-semibold text-foreground">
                      {product.dimensoes[0].largura} × {product.dimensoes[0].altura}{" "}
                      {product.dimensoes[0].unidade || "cm"}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Button
                variant="default"
                size="sm"
                onClick={handleDownloadSimulated}
                disabled={!displayImage || isDownloading}
                className="w-full gap-2 text-xs h-9 font-semibold shadow-xs"
              >
                {isDownloading ? (
                  <>
                    <Sparkles className="h-4 w-4 animate-spin" />
                    Gerando arquivo...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4" />
                    Baixar Imagem Simulada (PNG)
                  </>
                )}
              </Button>

              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyToClipboard}
                  disabled={!displayImage || isCopying}
                  className="gap-1.5 text-xs h-8"
                  title="Copiar imagem para colar no WhatsApp, Word ou editor"
                >
                  <Copy className="h-3.5 w-3.5 text-primary" />
                  {isCopying ? "Copiando..." : "Copiar Imagem"}
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleOpenInNewTab}
                  disabled={!displayImage}
                  className="gap-1.5 text-xs h-8"
                  title="Visualizar a imagem em tamanho real no navegador"
                >
                  <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                  Abrir no Navegador
                </Button>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="pt-3 border-t mt-2 flex flex-row items-center justify-between">
          <p className="text-xs text-muted-foreground">
            O algoritmo preserva automaticamente os traçados pretos, costuras e o fundo branco.
          </p>
          <Button variant="default" size="sm" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
