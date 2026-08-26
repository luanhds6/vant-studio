import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useShallow } from "zustand/react/shallow";
import { useProductStore, prepareProductForPersistence } from "@/store/productStore";
import { Product, ProductColor, ProductDetail } from "@/types/Product";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useDropzone } from "react-dropzone";
import { toast } from "@/hooks/use-toast";
import {
  Pencil,
  Plus,
  Trash2,
  Upload,
  Image as ImageIcon,
  Loader2,
  X,
  Check,
  Ruler,
  Palette,
  Sparkles,
  Layers,
  FileText,
  Search,
  Building2,
  Factory,
  ChevronDown,
  ChevronRight,
} from "lucide-react";

const generateId = () => crypto.randomUUID();

const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

interface CatalogEditProductDialogProps {
  product: Product | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: (updatedProduct: Product) => void;
}

const COMMON_SIZES = ["PP", "P", "M", "G", "GG", "XG", "Único"];
const UNIDADES = ["cm", "m", "mm", "in"] as const;

export function CatalogEditProductDialog({
  product,
  open,
  onOpenChange,
  onSaved,
}: CatalogEditProductDialogProps) {
  const { updateProduct, availableColors, industries, fabricTypes } = useProductStore(
    useShallow((s) => ({
      updateProduct: s.updateProduct,
      availableColors: s.colors,
      industries: s.industries,
      fabricTypes: s.fabricTypes,
    }))
  );

  const [form, setForm] = useState<Product | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("basico");

  // Inputs temporários
  const [newSizeInput, setNewSizeInput] = useState("");
  const [newColorDraft, setNewColorDraft] = useState({ nome: "", hex: "#f97316" });
  const [newDetailText, setNewDetailText] = useState("");
  const [colorSearchQuery, setColorSearchQuery] = useState("");
  const [expandedIndustryIds, setExpandedIndustryIds] = useState<string[]>([]);
  const detailImageInputRef = useRef<HTMLInputElement>(null);
  const [targetDetailIdForImage, setTargetDetailIdForImage] = useState<string | null>(null);

  // Inicializa o formulário com o produto selecionado
  useEffect(() => {
    if (product && open) {
      // Clona profundamente para edição segura
      setForm(JSON.parse(JSON.stringify(product)));
      setActiveTab("basico");
      setColorSearchQuery("");
      // Expande todas as indústrias por padrão
      setExpandedIndustryIds(industries.map((ind) => ind.id));
    } else {
      setForm(null);
    }
  }, [product, open, industries]);

  const toggleIndustryExpanded = (id: string) => {
    setExpandedIndustryIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  // Cores agrupadas por Indústria e por Tipo de Tecido com busca por Tecido, Cor e Indústria
  const filteredColorsByIndustry = useMemo(() => {
    const q = colorSearchQuery.trim().toLowerCase();

    return industries
      .map((ind) => {
        const industryMatches = q ? ind.nome.toLowerCase().includes(q) : false;
        const types = fabricTypes.filter((ft) => ft.industryId === ind.id);
        const typesWithColors = types
          .map((ft) => {
            const ftColors = availableColors.filter((c) => c.fabricTypeId === ft.id);
            const fabricMatches = q ? ft.nome.toLowerCase().includes(q) : false;

            const matchingColors = q
              ? fabricMatches || industryMatches
                ? ftColors
                : ftColors.filter(
                    (c) =>
                      c.nome.toLowerCase().includes(q) ||
                      (c.codigo && c.codigo.toLowerCase().includes(q)) ||
                      (c.hex && c.hex.toLowerCase().includes(q))
                  )
              : ftColors;
            return {
              ...ft,
              isDirectMatch: fabricMatches,
              colors: matchingColors,
            };
          })
          .filter((ft) => ft.colors.length > 0);

        const totalMatchingColors = typesWithColors.reduce((acc, ft) => acc + ft.colors.length, 0);

        return {
          ...ind,
          fabricTypes: typesWithColors,
          totalColors: totalMatchingColors,
        };
      })
      .filter((ind) => ind.totalColors > 0);
  }, [industries, fabricTypes, availableColors, colorSearchQuery]);

  // Cores avulsas (sem tipo de tecido vinculado a uma indústria)
  const standaloneColors = useMemo(() => {
    const q = colorSearchQuery.trim().toLowerCase();
    const allAssignedColorIds = new Set(
      fabricTypes.flatMap((ft) =>
        availableColors.filter((c) => c.fabricTypeId === ft.id).map((c) => c.id)
      )
    );
    const unassigned = availableColors.filter((c) => !allAssignedColorIds.has(c.id));
    if (!q) return unassigned;
    return unassigned.filter(
      (c) =>
        c.nome.toLowerCase().includes(q) ||
        (c.codigo && c.codigo.toLowerCase().includes(q)) ||
        (c.hex && c.hex.toLowerCase().includes(q))
    );
  }, [availableColors, fabricTypes, colorSearchQuery]);

  // Dropzone da Imagem Principal
  const onDropMainImage = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;
    try {
      const base64 = await fileToBase64(acceptedFiles[0]);
      setForm((prev) => (prev ? { ...prev, imagemPrincipal: base64 } : null));
      toast({ title: "Imagem principal carregada!" });
    } catch {
      toast({ title: "Erro ao processar imagem", variant: "destructive" });
    }
  }, []);

  const {
    getRootProps: getMainRootProps,
    getInputProps: getMainInputProps,
    isDragActive: isMainDragActive,
  } = useDropzone({
    onDrop: onDropMainImage,
    accept: { "image/*": [] },
    maxFiles: 1,
  });

  // Dropzone para Galeria de Imagens de Detalhe
  const onDropDetailImages = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;
    try {
      const base64List = await Promise.all(acceptedFiles.map(fileToBase64));
      setForm((prev) =>
        prev
          ? {
              ...prev,
              imagensDetalhe: [...(prev.imagensDetalhe || []), ...base64List],
            }
          : null
      );
      toast({ title: `${base64List.length} imagem(ns) de detalhe adicionada(s)!` });
    } catch {
      toast({ title: "Erro ao processar imagens", variant: "destructive" });
    }
  }, []);

  const {
    getRootProps: getGalleryRootProps,
    getInputProps: getGalleryInputProps,
    isDragActive: isGalleryDragActive,
  } = useDropzone({
    onDrop: onDropDetailImages,
    accept: { "image/*": [] },
  });

  // Dropzone para Imagem da Pintura
  const onDropPinturaImage = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;
    try {
      const base64 = await fileToBase64(acceptedFiles[0]);
      setForm((prev) =>
        prev
          ? {
              ...prev,
              pintura: {
                ...(prev.pintura || { cor: "", tamanho: "", localizacao: "" }),
                imagem: base64,
              },
            }
          : null
      );
      toast({ title: "Imagem da pintura anexada com sucesso!" });
    } catch {
      toast({ title: "Erro ao processar imagem", variant: "destructive" });
    }
  }, []);

  const {
    getRootProps: getPinturaRootProps,
    getInputProps: getPinturaInputProps,
    isDragActive: isPinturaDragActive,
  } = useDropzone({
    onDrop: onDropPinturaImage,
    accept: { "image/*": [] },
    maxFiles: 1,
  });

  // Dropzone para Imagem da Marca do Cliente
  const onDropMarcaClienteImage = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;
    try {
      const base64 = await fileToBase64(acceptedFiles[0]);
      setForm((prev) =>
        prev
          ? {
              ...prev,
              marcaCliente: {
                ...(prev.marcaCliente || { cor: "", tamanho: "", localizacao: "" }),
                imagem: base64,
              },
            }
          : null
      );
      toast({ title: "Imagem da marca do cliente anexada com sucesso!" });
    } catch {
      toast({ title: "Erro ao processar imagem", variant: "destructive" });
    }
  }, []);

  const {
    getRootProps: getMarcaRootProps,
    getInputProps: getMarcaInputProps,
    isDragActive: isMarcaDragActive,
  } = useDropzone({
    onDrop: onDropMarcaClienteImage,
    accept: { "image/*": [] },
    maxFiles: 1,
  });

  // Dropzone para Imagem do Timbrado
  const onDropTimbradoImage = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;
    try {
      const base64 = await fileToBase64(acceptedFiles[0]);
      setForm((prev) =>
        prev
          ? {
              ...prev,
              timbrado: {
                ativo: true,
                imagem: base64,
              },
            }
          : null
      );
      toast({ title: "Imagem do timbrado anexada com sucesso!" });
    } catch {
      toast({ title: "Erro ao processar imagem", variant: "destructive" });
    }
  }, []);

  const {
    getRootProps: getTimbradoRootProps,
    getInputProps: getTimbradoInputProps,
    isDragActive: isTimbradoDragActive,
  } = useDropzone({
    onDrop: onDropTimbradoImage,
    accept: { "image/*": [] },
    maxFiles: 1,
  });

  // Dropzone para Imagem do Rastreável
  const onDropRastreavelImage = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;
    try {
      const base64 = await fileToBase64(acceptedFiles[0]);
      setForm((prev) =>
        prev
          ? {
              ...prev,
              rastreavel: {
                ativo: true,
                imagem: base64,
              },
            }
          : null
      );
      toast({ title: "Imagem de rastreabilidade anexada com sucesso!" });
    } catch {
      toast({ title: "Erro ao processar imagem", variant: "destructive" });
    }
  }, []);

  const {
    getRootProps: getRastreavelRootProps,
    getInputProps: getRastreavelInputProps,
    isDragActive: isRastreavelDragActive,
  } = useDropzone({
    onDrop: onDropRastreavelImage,
    accept: { "image/*": [] },
    maxFiles: 1,
  });

  if (!form) return null;

  // Handlers de Dimensões
  const addDimensao = () => {
    setForm((prev) =>
      prev
        ? {
            ...prev,
            dimensoes: [
              ...prev.dimensoes,
              { id: generateId(), titulo: "", largura: "", altura: "", unidade: "cm" },
            ],
          }
        : null
    );
  };

  const removeDimensao = (index: number) => {
    setForm((prev) =>
      prev
        ? {
            ...prev,
            dimensoes: prev.dimensoes.filter((_, i) => i !== index),
          }
        : null
    );
  };

  const updateDimensao = (index: number, field: string, val: string) => {
    setForm((prev) => {
      if (!prev) return null;
      const dims = [...prev.dimensoes];
      dims[index] = { ...dims[index], [field]: val };
      return { ...prev, dimensoes: dims };
    });
  };

  // Handlers de Tamanhos
  const addTamanho = (size: string) => {
    const s = size.trim();
    if (!s) return;
    setForm((prev) => {
      if (!prev) return null;
      if (prev.tamanhos.includes(s)) return prev;
      return { ...prev, tamanhos: [...prev.tamanhos, s] };
    });
    setNewSizeInput("");
  };

  const removeTamanho = (size: string) => {
    setForm((prev) =>
      prev
        ? {
            ...prev,
            tamanhos: prev.tamanhos.filter((t) => t !== size),
          }
        : null
    );
  };

  // Handlers de Cores
  const addColorFromAvailable = (color: ProductColor) => {
    setForm((prev) => {
      if (!prev) return null;
      if (prev.cores.some((c) => c.id === color.id || (c.nome === color.nome && c.hex === color.hex))) {
        return prev;
      }
      return { ...prev, cores: [...prev.cores, color] };
    });
  };

  const addCustomColor = () => {
    if (!newColorDraft.nome.trim()) {
      toast({ title: "Informe o nome da cor", variant: "destructive" });
      return;
    }
    const newColor: ProductColor = {
      id: generateId(),
      nome: newColorDraft.nome.trim(),
      hex: newColorDraft.hex,
    };
    setForm((prev) =>
      prev
        ? {
            ...prev,
            cores: [...prev.cores, newColor],
          }
        : null
    );
    setNewColorDraft({ nome: "", hex: "#f97316" });
  };

  const removeColor = (index: number) => {
    setForm((prev) =>
      prev
        ? {
            ...prev,
            cores: prev.cores.filter((_, i) => i !== index),
          }
        : null
    );
  };

  // Handlers de Detalhes Técnicos
  const addDetail = () => {
    if (!newDetailText.trim()) return;
    const newDetail: ProductDetail = {
      id: generateId(),
      texto: newDetailText.trim(),
    };
    setForm((prev) =>
      prev
        ? {
            ...prev,
            detalhes: [...prev.detalhes, newDetail],
          }
        : null
    );
    setNewDetailText("");
  };

  const removeDetail = (id: string) => {
    setForm((prev) =>
      prev
        ? {
            ...prev,
            detalhes: prev.detalhes.filter((d) => d.id !== id),
          }
        : null
    );
  };

  const updateDetailText = (id: string, text: string) => {
    setForm((prev) =>
      prev
        ? {
            ...prev,
            detalhes: prev.detalhes.map((d) => (d.id === id ? { ...d, texto: text } : d)),
          }
        : null
    );
  };

  const handleDetailImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !targetDetailIdForImage) return;
    try {
      const base64 = await fileToBase64(file);
      setForm((prev) =>
        prev
          ? {
              ...prev,
              detalhes: prev.detalhes.map((d) =>
                d.id === targetDetailIdForImage ? { ...d, imagem: base64 } : d
              ),
            }
          : null
      );
      toast({ title: "Foto do detalhe anexada com sucesso!" });
    } catch {
      toast({ title: "Erro ao anexar foto do detalhe", variant: "destructive" });
    } finally {
      setTargetDetailIdForImage(null);
      if (e.target) e.target.value = "";
    }
  };

  const removeDetailImage = (id: string) => {
    setForm((prev) =>
      prev
        ? {
            ...prev,
            detalhes: prev.detalhes.map((d) => (d.id === id ? { ...d, imagem: undefined } : d)),
          }
        : null
    );
  };

  // Salvar Alterações no Banco e no Estado Global
  const handleSave = async () => {
    if (!form.nome.trim()) {
      toast({ title: "O nome do produto é obrigatório", variant: "destructive" });
      return;
    }

    setIsSaving(true);
    try {
      const safeProduct = prepareProductForPersistence(form);
      await updateProduct(safeProduct);

      toast({
        title: "Produto salvo com sucesso!",
        description: "As alterações foram atualizadas no catálogo e em todo o banco de dados.",
      });

      if (onSaved) {
        onSaved(safeProduct);
      }
      onOpenChange(false);
    } catch (err: any) {
      console.error("Erro ao salvar produto:", err);
      toast({
        title: "Erro ao salvar alterações",
        description: err?.message || "Tente novamente mais tarde.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <input
        type="file"
        ref={detailImageInputRef}
        className="hidden"
        accept="image/*"
        onChange={handleDetailImageUpload}
      />

      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="p-6 pb-2 border-b bg-card">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                  <Pencil className="h-5 w-5" />
                </div>
                <div>
                  <DialogTitle className="text-xl font-bold">Editar Produto na Folha</DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground">
                    Alterações salvas aqui atualizam o catálogo e todos os cadastros no banco.
                  </DialogDescription>
                </div>
              </div>
              <div className="text-right">
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-muted text-muted-foreground">
                  {form.referencia ? `Ref: ${form.referencia}` : "Sem Ref."}
                </span>
              </div>
            </div>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
            <div className="px-6 pt-3 border-b bg-muted/20">
              <TabsList className="grid grid-cols-5 w-full">
                <TabsTrigger value="basico" className="text-xs gap-1">
                  <FileText className="h-3.5 w-3.5" /> Básico & Tecido
                </TabsTrigger>
                <TabsTrigger value="medidas" className="text-xs gap-1">
                  <Ruler className="h-3.5 w-3.5" /> Medidas & Tamanhos
                </TabsTrigger>
                <TabsTrigger value="cores" className="text-xs gap-1">
                  <Palette className="h-3.5 w-3.5" /> Paleta de Cores
                </TabsTrigger>
                <TabsTrigger value="detalhes" className="text-xs gap-1">
                  <Layers className="h-3.5 w-3.5" /> Fotos & Detalhes
                </TabsTrigger>
                <TabsTrigger value="personalizacao" className="text-xs gap-1">
                  <Sparkles className="h-3.5 w-3.5" /> Personalização
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* TAB 1: BÁSICO & TECIDO */}
              <TabsContent value="basico" className="m-0 space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2 space-y-2">
                    <Label htmlFor="edit-nome" className="text-sm font-semibold">
                      Nome do Produto *
                    </Label>
                    <Input
                      id="edit-nome"
                      value={form.nome}
                      onChange={(e) => setForm({ ...form, nome: e.target.value })}
                      placeholder="Ex: Avental Cirúrgico com Mangas"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-ref" className="text-sm font-semibold">
                      Referência / Código
                    </Label>
                    <Input
                      id="edit-ref"
                      value={form.referencia}
                      onChange={(e) => setForm({ ...form, referencia: e.target.value })}
                      placeholder="Ex: SB - 0002"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-categoria" className="text-sm font-semibold">
                      Categoria
                    </Label>
                    <Input
                      id="edit-categoria"
                      value={form.categoria}
                      onChange={(e) => setForm({ ...form, categoria: e.target.value })}
                      placeholder="Ex: Cirúrgico, Hotelaria, Geral"
                    />
                  </div>
                  <div className="md:col-span-2 space-y-2">
                    <Label htmlFor="edit-tecido" className="text-sm font-semibold">
                      Tecido / Matéria-Prima
                    </Label>
                    <Input
                      id="edit-tecido"
                      value={form.tecido}
                      onChange={(e) => setForm({ ...form, tecido: e.target.value })}
                      placeholder="Ex: Brim 100% Algodão / Punho de Ribana"
                    />
                  </div>
                </div>

                {/* Seleção Rápida de Tecidos Cadastrados */}
                {fabricTypes.length > 0 && (
                  <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
                    <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Sugestões de Tecidos Cadastrados (Clique para preencher)
                    </Label>
                    <div className="flex flex-wrap gap-1.5">
                      {fabricTypes.slice(0, 10).map((ft) => (
                        <button
                          key={ft.id}
                          type="button"
                          onClick={() => setForm({ ...form, tecido: ft.nome })}
                          className="text-xs px-2.5 py-1 rounded border bg-background hover:bg-primary/10 hover:border-primary transition-colors text-left"
                        >
                          {ft.nome}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </TabsContent>

              {/* TAB 2: MEDIDAS & TAMANHOS */}
              <TabsContent value="medidas" className="m-0 space-y-6">
                {/* DIMENSÕES */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-bold flex items-center gap-1.5">
                      <Ruler className="h-4 w-4 text-primary" /> Dimensões Técnicas do Produto
                    </Label>
                    <Button type="button" variant="outline" size="sm" onClick={addDimensao} className="text-xs gap-1">
                      <Plus className="h-3.5 w-3.5" /> Adicionar Outra Medida
                    </Button>
                  </div>

                  <div className="space-y-3">
                    {form.dimensoes.map((dim, idx) => (
                      <div key={dim.id || idx} className="flex flex-col sm:flex-row items-start sm:items-end gap-3 p-3.5 rounded-lg border bg-muted/20">
                        <div className="flex-1 space-y-1 w-full sm:w-auto">
                          <Label className="text-xs text-muted-foreground">Título / Descrição da Medida</Label>
                          <Input
                            value={dim.titulo || ""}
                            onChange={(e) => updateDimensao(idx, "titulo", e.target.value)}
                            placeholder="Ex: Medida Padrão, Manga, etc."
                            className="h-9"
                          />
                        </div>
                        <div className="w-28 space-y-1">
                          <Label className="text-xs text-muted-foreground">Largura</Label>
                          <Input
                            value={dim.largura}
                            onChange={(e) => updateDimensao(idx, "largura", e.target.value)}
                            placeholder="75"
                            className="h-9"
                          />
                        </div>
                        <div className="w-28 space-y-1">
                          <Label className="text-xs text-muted-foreground">Altura / Comp.</Label>
                          <Input
                            value={dim.altura}
                            onChange={(e) => updateDimensao(idx, "altura", e.target.value)}
                            placeholder="115"
                            className="h-9"
                          />
                        </div>
                        <div className="w-24 space-y-1">
                          <Label className="text-xs text-muted-foreground">Unidade</Label>
                          <select
                            value={dim.unidade || "cm"}
                            onChange={(e) => updateDimensao(idx, "unidade", e.target.value)}
                            className="h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                          >
                            {UNIDADES.map((u) => (
                              <option key={u} value={u}>
                                {u}
                              </option>
                            ))}
                          </select>
                        </div>
                        {form.dimensoes.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeDimensao(idx)}
                            className="h-9 w-9 text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* GRADE DE TAMANHOS */}
                <div className="space-y-3 pt-3 border-t">
                  <Label className="text-sm font-bold">Grade de Tamanhos</Label>
                  <div className="flex flex-wrap gap-2 items-center">
                    {form.tamanhos.map((tam) => (
                      <span
                        key={tam}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md border bg-primary/10 border-primary/30 text-primary font-bold text-sm"
                      >
                        {tam}
                        <button
                          type="button"
                          onClick={() => removeTamanho(tam)}
                          className="hover:text-destructive transition-colors"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </span>
                    ))}
                    {form.tamanhos.length === 0 && (
                      <span className="text-xs text-muted-foreground italic">Nenhum tamanho adicionado.</span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 max-w-md pt-1">
                    <Input
                      value={newSizeInput}
                      onChange={(e) => setNewSizeInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addTamanho(newSizeInput);
                        }
                      }}
                      placeholder="Digitar tamanho (ex: GG, 42, Especial)"
                      className="h-9"
                    />
                    <Button type="button" size="sm" onClick={() => addTamanho(newSizeInput)} className="gap-1 h-9">
                      <Plus className="h-4 w-4" /> Adicionar
                    </Button>
                  </div>

                  <div className="flex items-center gap-1.5 pt-1">
                    <span className="text-xs text-muted-foreground">Tamanhos rápidos:</span>
                    {COMMON_SIZES.map((cs) => (
                      <button
                        key={cs}
                        type="button"
                        onClick={() => addTamanho(cs)}
                        className="text-xs px-2 py-0.5 rounded border bg-muted hover:bg-primary/10 hover:text-primary transition-colors"
                      >
                        +{cs}
                      </button>
                    ))}
                  </div>
                </div>
              </TabsContent>

              {/* TAB 3: PALETA DE CORES */}
              <TabsContent value="cores" className="m-0 space-y-5">
                <div className="space-y-3">
                  <Label className="text-sm font-bold">Cores Selecionadas para este Produto</Label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                    {form.cores.map((c, idx) => (
                      <div
                        key={c.id || idx}
                        className="flex items-center justify-between p-2.5 rounded-lg border bg-card shadow-xs"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className="h-6 w-6 rounded-full border border-black/20 flex-shrink-0"
                            style={{ backgroundColor: c.hex }}
                          />
                          <div className="truncate text-xs font-semibold">{c.nome}</div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeColor(idx)}
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}
                    {form.cores.length === 0 && (
                      <div className="col-span-full py-4 text-center text-xs text-muted-foreground border rounded-lg border-dashed">
                        Nenhuma cor atribuída a este produto.
                      </div>
                    )}
                  </div>
                </div>

                {/* Adicionar Nova Cor Customizada */}
                <div className="p-4 rounded-lg border bg-muted/20 space-y-3">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Criar Nova Amostra de Cor
                  </Label>
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={newColorDraft.hex}
                        onChange={(e) => setNewColorDraft({ ...newColorDraft, hex: e.target.value })}
                        className="h-9 w-12 rounded cursor-pointer border border-input p-0.5 bg-background"
                      />
                      <span className="text-xs font-mono">{newColorDraft.hex}</span>
                    </div>
                    <Input
                      value={newColorDraft.nome}
                      onChange={(e) => setNewColorDraft({ ...newColorDraft, nome: e.target.value })}
                      placeholder="Nome da cor (ex: Azul Marinho, Verde Hospitalar)"
                      className="h-9 flex-1 min-w-[200px]"
                    />
                    <Button type="button" size="sm" onClick={addCustomColor} className="h-9 gap-1">
                      <Plus className="h-4 w-4" /> Adicionar Cor
                    </Button>
                  </div>
                </div>

                {/* Amostras Disponíveis da Empresa Agrupadas por Indústria e com Busca */}
                <div className="space-y-3 pt-2 border-t">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <Palette className="h-3.5 w-3.5 text-primary" />
                      Cores Cadastradas ({availableColors.length} no total)
                    </Label>
                    <span className="text-[11px] text-muted-foreground">
                      Clique sobre qualquer cor para adicionar à folha
                    </span>
                  </div>

                  {/* Barra de Pesquisa de Cor e Tecido */}
                  <div className="relative flex items-center">
                    <Search className="absolute left-3 h-4 w-4 text-muted-foreground pointer-events-none" />
                    <Input
                      value={colorSearchQuery}
                      onChange={(e) => setColorSearchQuery(e.target.value)}
                      placeholder="Pesquisar por tecido, cor, código pantone ou indústria (ex: CEDROMIX, Brim, Azul, 8113)..."
                      className="pl-9 pr-8 h-9 text-xs"
                    />
                    {colorSearchQuery && (
                      <button
                        type="button"
                        onClick={() => setColorSearchQuery("")}
                        className="absolute right-2.5 text-muted-foreground hover:text-foreground"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                  {/* Lista de Cores Agrupadas por Indústria */}
                  <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                    {filteredColorsByIndustry.map((ind) => {
                      const isExpanded =
                        expandedIndustryIds.includes(ind.id) || colorSearchQuery.trim().length > 0;
                      return (
                        <div key={ind.id} className="rounded-lg border bg-card overflow-hidden shadow-xs">
                          {/* Cabeçalho da Indústria */}
                          <div
                            onClick={() => toggleIndustryExpanded(ind.id)}
                            className="flex items-center justify-between px-3 py-2 bg-muted/40 hover:bg-muted/70 cursor-pointer select-none transition-colors border-b"
                          >
                            <div className="flex items-center gap-2">
                              <Building2 className="h-3.5 w-3.5 text-primary" />
                              <span className="text-xs font-bold uppercase tracking-wide">
                                {ind.nome}
                              </span>
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-semibold">
                                {ind.totalColors} {ind.totalColors === 1 ? "cor" : "cores"}
                              </span>
                            </div>
                            <div className="text-muted-foreground">
                              {isExpanded ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                            </div>
                          </div>

                          {/* Conteúdo da Indústria (Tipos de Tecido e Cores) */}
                          {isExpanded && (
                            <div className="p-3 space-y-3">
                              {ind.fabricTypes.map((ft) => (
                                <div key={ft.id} className="space-y-1.5 pl-2 border-l-2 border-primary/20">
                                  <div className="flex items-center gap-1.5">
                                    <Factory className="h-3 w-3 text-muted-foreground" />
                                    <span
                                      className={`text-[11px] font-semibold ${
                                        (ft as any).isDirectMatch
                                          ? "text-primary bg-primary/10 px-1.5 py-0.5 rounded"
                                          : "text-muted-foreground"
                                      }`}
                                    >
                                      {ft.nome}
                                    </span>
                                  </div>
                                  <div className="flex flex-wrap gap-1.5">
                                    {ft.colors.map((c) => {
                                      const isAdded = form.cores.some(
                                        (x) =>
                                          (x.id && x.id === c.id) ||
                                          (x.nome.trim().toLowerCase() === c.nome.trim().toLowerCase() &&
                                            x.hex.toLowerCase() === c.hex.toLowerCase())
                                      );
                                      return (
                                        <button
                                          key={c.id}
                                          type="button"
                                          disabled={isAdded}
                                          onClick={() => {
                                            addColorFromAvailable({
                                              id: c.id,
                                              nome: c.codigo ? `${c.codigo} - ${c.nome}` : c.nome,
                                              hex: c.hex,
                                              fabricTypeId: c.fabricTypeId,
                                            });
                                            toast({ title: `Cor ${c.nome} adicionada!` });
                                          }}
                                          className={`group flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs border transition-all ${
                                            isAdded
                                              ? "opacity-50 bg-muted border-dashed cursor-not-allowed text-muted-foreground"
                                              : "hover:border-primary hover:bg-primary/5 hover:scale-102 cursor-pointer bg-background shadow-2xs font-medium"
                                          }`}
                                        >
                                          <div
                                            className="h-3 w-3 rounded-full border border-black/20 flex-shrink-0"
                                            style={{ backgroundColor: c.hex }}
                                          />
                                          <span className="truncate max-w-[200px]">
                                            {c.codigo ? `${c.codigo} - ` : ""}
                                            {c.nome}
                                          </span>
                                          {isAdded && (
                                            <Check className="h-3 w-3 text-green-600 font-bold ml-0.5" />
                                          )}
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {/* Cores Avulsas / Outras */}
                    {standaloneColors.length > 0 && (
                      <div className="rounded-lg border bg-card p-3 space-y-2">
                        <Label className="text-[11px] font-bold text-muted-foreground uppercase">
                          Outras Cores Cadastradas ({standaloneColors.length})
                        </Label>
                        <div className="flex flex-wrap gap-1.5">
                          {standaloneColors.map((c) => {
                            const isAdded = form.cores.some(
                              (x) =>
                                (x.id && x.id === c.id) ||
                                (x.nome.trim().toLowerCase() === c.nome.trim().toLowerCase() &&
                                  x.hex.toLowerCase() === c.hex.toLowerCase())
                            );
                            return (
                              <button
                                key={c.id}
                                type="button"
                                disabled={isAdded}
                                onClick={() => {
                                  addColorFromAvailable({
                                    id: c.id,
                                    nome: c.codigo ? `${c.codigo} - ${c.nome}` : c.nome,
                                    hex: c.hex,
                                    fabricTypeId: c.fabricTypeId,
                                  });
                                  toast({ title: `Cor ${c.nome} adicionada!` });
                                }}
                                className={`group flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs border transition-all ${
                                  isAdded
                                    ? "opacity-50 bg-muted border-dashed cursor-not-allowed"
                                    : "hover:border-primary hover:bg-primary/5 cursor-pointer bg-background"
                                }`}
                              >
                                <div
                                  className="h-3 w-3 rounded-full border border-black/20 flex-shrink-0"
                                  style={{ backgroundColor: c.hex }}
                                />
                                <span>
                                  {c.codigo ? `${c.codigo} - ` : ""}
                                  {c.nome}
                                </span>
                                {isAdded && <Check className="h-3 w-3 text-green-600 ml-0.5" />}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {filteredColorsByIndustry.length === 0 && standaloneColors.length === 0 && (
                      <div className="py-8 text-center text-xs text-muted-foreground border rounded-lg border-dashed">
                        Nenhuma cor encontrada com os termos "{colorSearchQuery}".
                      </div>
                    )}
                  </div>
                </div>
              </TabsContent>

              {/* TAB 4: FOTOS & DETALHES TÉCNICOS */}
              <TabsContent value="detalhes" className="m-0 space-y-6">
                {/* IMAGEM PRINCIPAL */}
                <div className="space-y-3">
                  <Label className="text-sm font-bold flex items-center gap-1.5">
                    <ImageIcon className="h-4 w-4 text-primary" /> Imagem Principal (Desenho Técnico)
                  </Label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                    <div
                      {...getMainRootProps()}
                      className={`md:col-span-2 border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
                        isMainDragActive ? "border-primary bg-primary/5" : "border-border hover:bg-muted/40"
                      }`}
                    >
                      <input {...getMainInputProps()} />
                      <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-xs font-semibold">Arraste uma nova imagem ou clique para selecionar</p>
                      <p className="text-[10px] text-muted-foreground mt-1">Formatos aceitos: PNG, JPG, WebP, SVG</p>
                    </div>

                    <div className="flex flex-col items-center justify-center p-3 rounded-xl border bg-muted/20 min-h-[140px]">
                      {form.imagemPrincipal ? (
                        <div className="relative group">
                          <img
                            src={form.imagemPrincipal}
                            alt="Principal"
                            className="h-28 w-28 object-contain rounded border bg-white shadow-xs"
                          />
                          <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            onClick={() => setForm({ ...form, imagemPrincipal: "" })}
                            className="absolute -top-2 -right-2 h-6 w-6 rounded-full shadow-md"
                          >
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ) : (
                        <div className="text-center text-xs text-muted-foreground">Sem imagem principal</div>
                      )}
                    </div>
                  </div>
                </div>

                {/* DETALHES TÉCNICOS NUMERADOS */}
                <div className="space-y-3 pt-3 border-t">
                  <Label className="text-sm font-bold flex items-center gap-1.5">
                    <Layers className="h-4 w-4 text-primary" /> Detalhes Técnicos Numerados
                  </Label>

                  <div className="space-y-2.5">
                    {form.detalhes.map((det, idx) => (
                      <div key={det.id || idx} className="flex items-center gap-3 p-3 rounded-lg border bg-card">
                        <div className="h-6 w-6 rounded-full bg-orange-500 text-white font-bold text-xs flex items-center justify-center flex-shrink-0">
                          {idx + 1}
                        </div>

                        {det.imagem ? (
                          <div className="relative group flex-shrink-0">
                            <img
                              src={det.imagem}
                              alt=""
                              className="h-9 w-9 rounded-full object-cover border border-primary"
                            />
                            <button
                              type="button"
                              onClick={() => removeDetailImage(det.id)}
                              className="absolute -top-1 -right-1 bg-destructive text-white rounded-full p-0.5 shadow-sm"
                              title="Remover foto do detalhe"
                            >
                              <X className="h-2.5 w-2.5" />
                            </button>
                          </div>
                        ) : (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setTargetDetailIdForImage(det.id);
                              detailImageInputRef.current?.click();
                            }}
                            className="h-8 text-xs gap-1 flex-shrink-0"
                          >
                            <ImageIcon className="h-3.5 w-3.5" /> + Foto
                          </Button>
                        )}

                        <Input
                          value={det.texto}
                          onChange={(e) => updateDetailText(det.id, e.target.value)}
                          placeholder="Ex: Gola reforçada com acabamento em viés"
                          className="h-9 flex-1"
                        />

                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeDetail(det.id)}
                          className="h-8 w-8 text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    <Input
                      value={newDetailText}
                      onChange={(e) => setNewDetailText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addDetail();
                        }
                      }}
                      placeholder="Adicionar novo detalhe técnico..."
                      className="h-9"
                    />
                    <Button type="button" size="sm" onClick={addDetail} className="gap-1 h-9 flex-shrink-0">
                      <Plus className="h-4 w-4" /> Adicionar Detalhe
                    </Button>
                  </div>
                </div>

                {/* GALERIA DE FOTOS DE DETALHE */}
                <div className="space-y-3 pt-3 border-t">
                  <Label className="text-sm font-bold flex items-center gap-1.5">
                    <ImageIcon className="h-4 w-4 text-primary" /> Galeria de Imagens de Detalhe (Costuras / Acabamentos)
                  </Label>

                  <div
                    {...getGalleryRootProps()}
                    className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-colors ${
                      isGalleryDragActive ? "border-primary bg-primary/5" : "border-border hover:bg-muted/40"
                    }`}
                  >
                    <input {...getGalleryInputProps()} />
                    <Upload className="h-6 w-6 mx-auto mb-1 text-muted-foreground" />
                    <p className="text-xs font-semibold">Clique ou arraste fotos de detalhes para a galeria</p>
                  </div>

                  {form.imagensDetalhe && form.imagensDetalhe.length > 0 && (
                    <div className="grid grid-cols-4 sm:grid-cols-6 gap-3 pt-2">
                      {form.imagensDetalhe.map((img, i) => (
                        <div key={i} className="relative group rounded-lg border bg-white p-1 shadow-xs">
                          <img src={img} alt="" className="h-16 w-full object-contain rounded" />
                          <button
                            type="button"
                            onClick={() =>
                              setForm({
                                ...form,
                                imagensDetalhe: form.imagensDetalhe?.filter((_, idx) => idx !== i) || [],
                              })
                            }
                            className="absolute -top-2 -right-2 bg-destructive text-white rounded-full p-1 shadow-md opacity-90 hover:opacity-100"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* TAB 5: PERSONALIZAÇÃO */}
              <TabsContent value="personalizacao" className="m-0 space-y-5">
                {/* PINTURA */}
                <div className="p-4 rounded-xl border bg-muted/10 space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-bold">Pintura / Estampa</Label>
                    {form.pintura?.imagem && (
                      <span className="text-xs font-medium text-primary flex items-center gap-1">
                        <ImageIcon className="h-3.5 w-3.5" /> Arte anexada
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Cor da Pintura</Label>
                      <Input
                        value={form.pintura?.cor || ""}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            pintura: { ...(form.pintura || { tamanho: "", localizacao: "", imagem: "" }), cor: e.target.value },
                          })
                        }
                        placeholder="Ex: Branco / Azul"
                        className="h-9"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Tamanho</Label>
                      <Input
                        value={form.pintura?.tamanho || ""}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            pintura: { ...(form.pintura || { cor: "", localizacao: "", imagem: "" }), tamanho: e.target.value },
                          })
                        }
                        placeholder="Ex: 10 x 5 cm"
                        className="h-9"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Localização</Label>
                      <Input
                        value={form.pintura?.localizacao || ""}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            pintura: { ...(form.pintura || { cor: "", tamanho: "", imagem: "" }), localizacao: e.target.value },
                          })
                        }
                        placeholder="Ex: Peito Esquerdo"
                        className="h-9"
                      />
                    </div>
                  </div>

                  {/* Anexo de Imagem da Pintura */}
                  <div className="pt-2">
                    <Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">
                      Imagem / Arte da Pintura
                    </Label>
                    {form.pintura?.imagem ? (
                      <div className="flex items-center gap-3 p-2.5 rounded-lg border bg-background">
                        <img
                          src={form.pintura.imagem}
                          alt="Pintura"
                          className="h-16 w-16 object-contain rounded border bg-white"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-foreground">Arte da pintura carregada</p>
                          <p className="text-[10px] text-muted-foreground">Esta arte será exibida na folha do catálogo</p>
                        </div>
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          onClick={() =>
                            setForm({
                              ...form,
                              pintura: { ...(form.pintura || { cor: "", tamanho: "", localizacao: "" }), imagem: "" },
                            })
                          }
                          className="gap-1 text-xs h-8"
                        >
                          <Trash2 className="h-3.5 w-3.5" /> Excluir Imagem
                        </Button>
                      </div>
                    ) : (
                      <div
                        {...getPinturaRootProps()}
                        className={`border-2 border-dashed rounded-lg p-3 text-center cursor-pointer transition-colors ${
                          isPinturaDragActive ? "border-primary bg-primary/5" : "border-border hover:bg-muted/40 bg-background"
                        }`}
                      >
                        <input {...getPinturaInputProps()} />
                        <Upload className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                        <p className="text-xs font-semibold">Clique ou arraste para anexar imagem da pintura</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* MARCA CLIENTE */}
                <div className="p-4 rounded-xl border bg-muted/10 space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-bold">Marca do Cliente / Bordado</Label>
                    {form.marcaCliente?.imagem && (
                      <span className="text-xs font-medium text-primary flex items-center gap-1">
                        <ImageIcon className="h-3.5 w-3.5" /> Logo anexado
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Cor da Marca</Label>
                      <Input
                        value={form.marcaCliente?.cor || ""}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            marcaCliente: {
                              ...(form.marcaCliente || { tamanho: "", localizacao: "", imagem: "" }),
                              cor: e.target.value,
                            },
                          })
                        }
                        placeholder="Ex: Padrão Logotipo"
                        className="h-9"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Tamanho</Label>
                      <Input
                        value={form.marcaCliente?.tamanho || ""}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            marcaCliente: {
                              ...(form.marcaCliente || { cor: "", localizacao: "", imagem: "" }),
                              tamanho: e.target.value,
                            },
                          })
                        }
                        placeholder="Ex: 8 cm"
                        className="h-9"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Localização</Label>
                      <Input
                        value={form.marcaCliente?.localizacao || ""}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            marcaCliente: {
                              ...(form.marcaCliente || { cor: "", tamanho: "", imagem: "" }),
                              localizacao: e.target.value,
                            },
                          })
                        }
                        placeholder="Ex: Manga Direita"
                        className="h-9"
                      />
                    </div>
                  </div>

                  {/* Anexo de Imagem da Marca */}
                  <div className="pt-2">
                    <Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">
                      Imagem / Logotipo da Marca do Cliente
                    </Label>
                    {form.marcaCliente?.imagem ? (
                      <div className="flex items-center gap-3 p-2.5 rounded-lg border bg-background">
                        <img
                          src={form.marcaCliente.imagem}
                          alt="Marca do Cliente"
                          className="h-16 w-16 object-contain rounded border bg-white"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-foreground">Logotipo da marca carregado</p>
                          <p className="text-[10px] text-muted-foreground">Será renderizado no catálogo do cliente</p>
                        </div>
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          onClick={() =>
                            setForm({
                              ...form,
                              marcaCliente: {
                                ...(form.marcaCliente || { cor: "", tamanho: "", localizacao: "" }),
                                imagem: "",
                              },
                            })
                          }
                          className="gap-1 text-xs h-8"
                        >
                          <Trash2 className="h-3.5 w-3.5" /> Excluir Imagem
                        </Button>
                      </div>
                    ) : (
                      <div
                        {...getMarcaRootProps()}
                        className={`border-2 border-dashed rounded-lg p-3 text-center cursor-pointer transition-colors ${
                          isMarcaDragActive ? "border-primary bg-primary/5" : "border-border hover:bg-muted/40 bg-background"
                        }`}
                      >
                        <input {...getMarcaInputProps()} />
                        <Upload className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                        <p className="text-xs font-semibold">Clique ou arraste para anexar logotipo da marca do cliente</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* NOME DE CAMPO */}
                <div className="p-4 rounded-xl border bg-muted/10 space-y-3">
                  <Label className="text-sm font-bold">Nome de Campo / Identificação</Label>
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Texto</Label>
                      <Input
                        value={form.nomeCampo?.texto || ""}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            nomeCampo: {
                              ...(form.nomeCampo || { cor: "", tamanho: "", localizacao: "" }),
                              texto: e.target.value,
                            },
                          })
                        }
                        placeholder="Ex: CIRÚRGICO"
                        className="h-9"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Cor</Label>
                      <Input
                        value={form.nomeCampo?.cor || ""}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            nomeCampo: {
                              ...(form.nomeCampo || { texto: "", tamanho: "", localizacao: "" }),
                              cor: e.target.value,
                            },
                          })
                        }
                        placeholder="Ex: Preto"
                        className="h-9"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Tamanho</Label>
                      <Input
                        value={form.nomeCampo?.tamanho || ""}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            nomeCampo: {
                              ...(form.nomeCampo || { texto: "", cor: "", localizacao: "" }),
                              tamanho: e.target.value,
                            },
                          })
                        }
                        placeholder="Ex: 2 cm"
                        className="h-9"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Localização</Label>
                      <Input
                        value={form.nomeCampo?.localizacao || ""}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            nomeCampo: {
                              ...(form.nomeCampo || { texto: "", cor: "", tamanho: "" }),
                              localizacao: e.target.value,
                            },
                          })
                        }
                        placeholder="Ex: Barra Inferior"
                        className="h-9"
                      />
                    </div>
                  </div>
                </div>

                {/* TIMBRADO E RASTREABILIDADE */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* TIMBRADO */}
                  <div className="p-4 rounded-xl border bg-muted/10 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-sm font-bold">Item Timbrado</Label>
                        <p className="text-xs text-muted-foreground">Exibir selo timbrado na folha</p>
                      </div>
                      <Switch
                        checked={Boolean(form.timbrado?.ativo)}
                        onCheckedChange={(v) =>
                          setForm({
                            ...form,
                            timbrado: { ativo: v, imagem: form.timbrado?.imagem || "" },
                          })
                        }
                      />
                    </div>

                    {form.timbrado?.ativo && (
                      <div className="pt-2 border-t space-y-2">
                        <Label className="text-xs font-semibold text-muted-foreground">
                          Imagem do Timbrado
                        </Label>
                        {form.timbrado?.imagem ? (
                          <div className="flex items-center gap-3 p-2 rounded-lg border bg-background">
                            <img
                              src={form.timbrado.imagem}
                              alt="Timbrado"
                              className="h-12 w-12 object-contain rounded border bg-white"
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium text-foreground">Selo timbrado ativo</p>
                            </div>
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              onClick={() =>
                                setForm({
                                  ...form,
                                  timbrado: { ...(form.timbrado || { ativo: true }), imagem: "" },
                                })
                              }
                              className="h-7 text-xs gap-1"
                            >
                              <Trash2 className="h-3 w-3" /> Excluir
                            </Button>
                          </div>
                        ) : (
                          <div
                            {...getTimbradoRootProps()}
                            className={`border-2 border-dashed rounded-lg p-2.5 text-center cursor-pointer transition-colors ${
                              isTimbradoDragActive ? "border-primary bg-primary/5" : "border-border hover:bg-muted/40 bg-background"
                            }`}
                          >
                            <input {...getTimbradoInputProps()} />
                            <Upload className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                            <p className="text-xs font-semibold">Clique ou arraste a imagem do timbrado</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* RASTREABILIDADE */}
                  <div className="p-4 rounded-xl border bg-muted/10 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-sm font-bold">Item Rastreável</Label>
                        <p className="text-xs text-muted-foreground">Indicar rastreabilidade</p>
                      </div>
                      <Switch
                        checked={Boolean(form.rastreavel?.ativo)}
                        onCheckedChange={(v) =>
                          setForm({
                            ...form,
                            rastreavel: { ativo: v, imagem: form.rastreavel?.imagem || "" },
                          })
                        }
                      />
                    </div>

                    {form.rastreavel?.ativo && (
                      <div className="pt-2 border-t space-y-2">
                        <Label className="text-xs font-semibold text-muted-foreground">
                          Imagem de Rastreabilidade (Selo / QR Code)
                        </Label>
                        {form.rastreavel?.imagem ? (
                          <div className="flex items-center gap-3 p-2 rounded-lg border bg-background">
                            <img
                              src={form.rastreavel.imagem}
                              alt="Rastreável"
                              className="h-12 w-12 object-contain rounded border bg-white"
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium text-foreground">Selo de rastreabilidade ativo</p>
                            </div>
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              onClick={() =>
                                setForm({
                                  ...form,
                                  rastreavel: { ...(form.rastreavel || { ativo: true }), imagem: "" },
                                })
                              }
                              className="h-7 text-xs gap-1"
                            >
                              <Trash2 className="h-3 w-3" /> Excluir
                            </Button>
                          </div>
                        ) : (
                          <div
                            {...getRastreavelRootProps()}
                            className={`border-2 border-dashed rounded-lg p-2.5 text-center cursor-pointer transition-colors ${
                              isRastreavelDragActive ? "border-primary bg-primary/5" : "border-border hover:bg-muted/40 bg-background"
                            }`}
                          >
                            <input {...getRastreavelInputProps()} />
                            <Upload className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                            <p className="text-xs font-semibold">Clique ou arraste a imagem de rastreabilidade</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </TabsContent>
            </div>
          </Tabs>

          <DialogFooter className="p-4 border-t bg-card flex items-center justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSaving}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              {isSaving ? "Salvando Alterações..." : "Salvar Alterações no Banco"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
