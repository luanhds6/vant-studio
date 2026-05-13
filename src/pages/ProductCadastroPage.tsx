import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useDropzone } from "react-dropzone";
import { useShallow } from "zustand/react/shallow";
import { useAuthStore } from "@/store/authStore";
import { useProductStore } from "@/store/productStore";
import { getDefaultLandingPath } from "@/lib/routeAccess";
import type { Product } from "@/types/Product";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft, Building2, Download, ImageIcon, Pencil, PlayCircle, PlusCircle, QrCode, RefreshCw, Search, Upload } from "lucide-react";

const generateId = () => crypto.randomUUID();

const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

const norm = (s: string) => s.trim().toLowerCase();

function productMatchesQuery(p: Product, q: string): boolean {
  const t = norm(q);
  if (!t) return false;
  if (norm(p.nome).includes(t)) return true;
  if (norm(p.referencia).includes(t)) return true;
  if (p.id.toLowerCase() === t) return true;
  return false;
}

function findExactByEtiqueta(products: Product[], q: string): Product | undefined {
  const t = norm(q);
  if (!t) return undefined;
  return products.find((p) => norm(p.referencia) === t || p.id.toLowerCase() === t);
}

const UNIDADES = ["cm", "m", "mm", "in"] as const;

const EMPTY_PRODUCTS: Product[] = [];

async function generateQrDataUrl(text: string): Promise<string> {
  const QRCode = (await import("qrcode")).default;
  return QRCode.toDataURL(text, { width: 220, margin: 2, errorCorrectionLevel: "M" });
}

function productToDraft(p: Product) {
  const first = p.dimensoes[0];
  const u = first?.unidade || "cm";
  return {
    nome: p.nome,
    largura: first?.largura ?? "",
    altura: first?.altura ?? "",
    unidade: (UNIDADES as readonly string[]).includes(u) ? u : "cm",
    codigoEtiqueta: p.referencia,
    imagem: p.imagemPrincipal,
  };
}

function buildProductFromDraft(
  hospitalId: string,
  draft: {
    nome: string;
    largura: string;
    altura: string;
    unidade: string;
    codigoEtiqueta: string;
    imagem: string;
  },
  existing?: Product,
): Product {
  const now = new Date().toISOString();
  const base: Omit<Product, "id" | "createdAt" | "updatedAt"> = {
    hospitalId,
    nome: draft.nome.trim(),
    categoria: existing?.categoria ?? "Geral",
    referencia: draft.codigoEtiqueta.trim(),
    tecido: existing?.tecido ?? "",
    tamanhos: existing?.tamanhos ?? [],
    cores: existing?.cores ?? [],
    dimensoes: (() => {
      const firstExisting = existing?.dimensoes?.[0];
      const rest = existing?.dimensoes?.slice(1) ?? [];
      const first: Product["dimensoes"][0] = {
        id: firstExisting?.id ?? generateId(),
        titulo: existing ? (firstExisting?.titulo ?? "") : "Medida principal",
        largura: draft.largura.trim(),
        altura: draft.altura.trim(),
        unidade: draft.unidade,
      };
      return [first, ...rest];
    })(),
    detalhes: existing?.detalhes ?? [],
    imagemPrincipal: draft.imagem,
    imagensDetalhe: existing?.imagensDetalhe ?? [],
    pintura: existing?.pintura ?? { cor: "", tamanho: "", localizacao: "", imagem: "" },
    marcaCliente: existing?.marcaCliente ?? { cor: "", tamanho: "", localizacao: "", imagem: "" },
    nomeCampo: existing?.nomeCampo ?? { texto: "", cor: "", tamanho: "", localizacao: "" },
  };
  if (existing) {
    return {
      ...base,
      id: existing.id,
      createdAt: existing.createdAt,
      updatedAt: now,
    };
  }
  return {
    ...base,
    id: generateId(),
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Lista de produtos por hospital; cadastro/edição em modal flutuante.
 */
export default function ProductCadastroPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const canAccess = useAuthStore((s) => s.canAccess);
  const hospitals = useProductStore((s) => s.hospitals);
  const getHospital = useProductStore((s) => s.getHospital);
  const addProduct = useProductStore((s) => s.addProduct);
  const updateProduct = useProductStore((s) => s.updateProduct);

  const [selectedHospitalId, setSelectedHospitalId] = useState<string | null>(null);
  const [listQuery, setListQuery] = useState("");
  const [debouncedListQuery, setDebouncedListQuery] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [nome, setNome] = useState("");
  const [largura, setLargura] = useState("");
  const [altura, setAltura] = useState("");
  const [unidade, setUnidade] = useState("cm");
  const [codigoEtiqueta, setCodigoEtiqueta] = useState("");
  const [imagem, setImagem] = useState("");
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [qrError, setQrError] = useState<string | null>(null);

  useEffect(() => {
    const fromUrl = searchParams.get("hospital");
    if (fromUrl && hospitals.some((h) => h.id === fromUrl)) {
      setSelectedHospitalId(fromUrl);
      return;
    }
    setSelectedHospitalId((prev) => {
      if (prev && hospitals.some((h) => h.id === prev)) return prev;
      if (hospitals.length === 1) return hospitals[0].id;
      return null;
    });
  }, [hospitals, searchParams]);

  const hospitalId = selectedHospitalId ?? "";
  const hospital = hospitalId ? getHospital(hospitalId) : undefined;
  const products = useProductStore(
    useShallow((s) => (hospitalId ? s.products.filter((p) => p.hospitalId === hospitalId) : EMPTY_PRODUCTS)),
  );

  const canCreate = canAccess("novo_produto");
  const canEdit = canAccess("produtos");

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedListQuery(listQuery), 200);
    return () => window.clearTimeout(t);
  }, [listQuery]);

  useEffect(() => {
    if (!modalOpen) {
      setQrDataUrl(null);
      setQrError(null);
      return;
    }
    let cancelled = false;
    const text = codigoEtiqueta.trim() || " ";
    void generateQrDataUrl(text)
      .then((url) => {
        if (!cancelled) {
          setQrDataUrl(url);
          setQrError(null);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setQrDataUrl(null);
          setQrError("Não foi possível gerar o QR Code.");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [modalOpen, codigoEtiqueta]);

  const displayedProducts = useMemo(() => {
    const q = debouncedListQuery.trim();
    if (!q) return products;
    return products.filter((p) => productMatchesQuery(p, q));
  }, [products, debouncedListQuery]);

  const resetModalForm = useCallback(() => {
    setEditingId(null);
    setNome("");
    setLargura("");
    setAltura("");
    setUnidade("cm");
    setCodigoEtiqueta("");
    setImagem("");
  }, []);

  const onHospitalChange = useCallback(
    (id: string) => {
      setSelectedHospitalId(id);
      setSearchParams({ hospital: id }, { replace: true });
      resetModalForm();
      setModalOpen(false);
    },
    [setSearchParams, resetModalForm],
  );

  const openEditModal = useCallback((p: Product) => {
    const d = productToDraft(p);
    setEditingId(p.id);
    setNome(d.nome);
    setLargura(d.largura);
    setAltura(d.altura);
    setUnidade(d.unidade || "cm");
    setCodigoEtiqueta(d.codigoEtiqueta);
    setImagem(d.imagem);
    setModalOpen(true);
  }, []);

  const openNewModal = useCallback(() => {
    resetModalForm();
    setModalOpen(true);
  }, [resetModalForm]);

  const tryResolveListSearch = useCallback(() => {
    const q = listQuery.trim();
    if (!q) return;
    const exact = findExactByEtiqueta(products, q);
    if (exact) {
      if (!canEdit) {
        toast({
          title: "Somente leitura",
          description: "Sem permissão para editar. Use «Novo produto» para cadastrar com outro código.",
        });
        return;
      }
      openEditModal(exact);
      toast({ title: "Produto encontrado", description: "Aberto para edição." });
      return;
    }
    const loose = products.filter((p) => productMatchesQuery(p, q));
    if (loose.length === 1 && canEdit) {
      openEditModal(loose[0]);
      toast({ title: "Produto encontrado", description: "Aberto para edição." });
      return;
    }
    if (loose.length === 0) {
      toast({ title: "Nenhum resultado", description: "Ajuste o filtro ou cadastre um novo produto." });
    } else {
      toast({
        title: "Vários resultados",
        description: "Refine a busca ou clique em «Editar» na linha da tabela.",
      });
    }
  }, [listQuery, products, canEdit, openEditModal]);

  const onDropImage = useCallback(async (files: File[]) => {
    if (files[0]) {
      const b64 = await fileToBase64(files[0]);
      setImagem(b64);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: onDropImage,
    accept: { "image/*": [] },
    maxFiles: 1,
  });

  const handleSave = () => {
    if (!hospitalId || !hospital) return;
    if (!nome.trim()) {
      toast({ title: "Nome obrigatório", variant: "destructive" });
      return;
    }
    if (!codigoEtiqueta.trim()) {
      toast({ title: "Código da etiqueta obrigatório", variant: "destructive" });
      return;
    }
    const draft = { nome, largura, altura, unidade, codigoEtiqueta, imagem };
    if (editingId) {
      if (!canEdit) {
        toast({ title: "Sem permissão", description: "Não é possível salvar alterações sem permissão de Produtos.", variant: "destructive" });
        return;
      }
      const existing = products.find((p) => p.id === editingId);
      if (!existing) return;
      updateProduct(buildProductFromDraft(hospitalId, draft, existing));
      toast({ title: "Produto atualizado" });
      setModalOpen(false);
      resetModalForm();
    } else {
      if (!canCreate) {
        toast({ title: "Sem permissão", description: "Não é possível criar produtos sem permissão de Novo produto.", variant: "destructive" });
        return;
      }
      const dup = products.some((p) => norm(p.referencia) === norm(codigoEtiqueta));
      if (dup) {
        toast({
          title: "Código já utilizado",
          description: "Já existe produto com este código. Busque na lista ou edite o existente.",
          variant: "destructive",
        });
        return;
      }
      addProduct(buildProductFromDraft(hospitalId, draft));
      toast({ title: "Produto cadastrado" });
      setModalOpen(false);
      resetModalForm();
    }
  };

  const downloadQrPng = () => {
    if (!qrDataUrl) return;
    const a = document.createElement("a");
    a.href = qrDataUrl;
    a.download = `qr-etiqueta-${(codigoEtiqueta || "produto").replace(/\s+/g, "-")}.png`;
    a.click();
  };

  const showMain = Boolean(hospitalId && hospital);

  const dimLabel = (p: Product) => {
    const parts = p.dimensoes
      .filter((d) => d.titulo.trim() || d.largura.trim() || d.altura.trim())
      .map((d) => {
        const u = d.unidade || "cm";
        const dim = `${d.largura || "?"}×${d.altura || "?"} ${u}`;
        const t = d.titulo.trim();
        return t ? `${t}: ${dim}` : dim;
      });
    return parts.length > 0 ? parts.join(" · ") : "—";
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Button variant="ghost" size="sm" className="-ml-2 mb-2" onClick={() => navigate(getDefaultLandingPath(canAccess))}>
            <ArrowLeft className="mr-1 h-4 w-4" />
            Voltar
          </Button>
          <h1 className="text-3xl font-bold tracking-tight">Cadastro de produtos</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {hospital ? hospital.nome : "Escolha o hospital para continuar"}
          </p>
        </div>
        {showMain && canCreate ? (
          <Button onClick={openNewModal} className="shrink-0 self-start sm:self-center">
            <PlusCircle className="mr-2 h-4 w-4" />
            Novo produto
          </Button>
        ) : null}
      </div>

      {hospitals.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <Building2 className="h-10 w-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Não há hospitais cadastrados. Cadastre uma unidade na página inicial ou em Hospitais para usar o cadastro de produtos.
            </p>
          </CardContent>
        </Card>
      ) : !showMain ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Building2 className="h-5 w-5" />
              Hospital
            </CardTitle>
            <CardDescription>Selecione o hospital para listar os produtos cadastrados.</CardDescription>
          </CardHeader>
          <CardContent className="max-w-md space-y-2">
            <Label htmlFor="cad-hospital">Unidade</Label>
            <Select value={selectedHospitalId ?? undefined} onValueChange={onHospitalChange}>
              <SelectTrigger id="cad-hospital">
                <SelectValue placeholder="Escolha um hospital" />
              </SelectTrigger>
              <SelectContent>
                {hospitals.map((h) => (
                  <SelectItem key={h.id} value={h.id}>
                    {h.nome}
                    {h.cidade ? ` — ${h.cidade}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      ) : (
        <>
          {hospitals.length > 1 ? (
            <Card>
              <CardContent className="flex flex-col gap-3 pt-6 sm:flex-row sm:items-end">
                <div className="min-w-0 flex-1 space-y-2">
                  <Label htmlFor="cad-hospital-switch">Hospital ativo</Label>
                  <Select value={selectedHospitalId!} onValueChange={onHospitalChange}>
                    <SelectTrigger id="cad-hospital-switch">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {hospitals.map((h) => (
                        <SelectItem key={h.id} value={h.id}>
                          {h.nome}
                          {h.cidade ? ` — ${h.cidade}` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader className="space-y-1">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Search className="h-5 w-5" />
                Produtos cadastrados
              </CardTitle>
              <CardDescription>
                Filtre por nome ou código da etiqueta; com leitor de QR/código de barras, use o campo abaixo e Enter para abrir o produto
                {canEdit ? " em edição" : ""}.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input
                  placeholder="Filtrar por nome, código da etiqueta ou leitura do QR…"
                  value={listQuery}
                  onChange={(e) => setListQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      tryResolveListSearch();
                    }
                  }}
                  className="flex-1"
                  autoComplete="off"
                />
                <Button type="button" variant="secondary" onClick={tryResolveListSearch}>
                  <Search className="mr-2 h-4 w-4" />
                  Buscar / identificar
                </Button>
              </div>

              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-14" />
                      <TableHead>Nome</TableHead>
                      <TableHead className="hidden sm:table-cell">Código da etiqueta</TableHead>
                      <TableHead className="hidden md:table-cell">Dimensões</TableHead>
                      <TableHead className="w-[100px] text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {displayedProducts.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                          {products.length === 0
                            ? "Nenhum produto neste hospital. Clique em «Novo produto» para cadastrar."
                            : "Nenhum produto corresponde ao filtro."}
                        </TableCell>
                      </TableRow>
                    ) : (
                      displayedProducts.map((p) => (
                        <TableRow
                          key={p.id}
                          className={canEdit ? "cursor-pointer hover:bg-muted/50" : ""}
                          onClick={canEdit ? () => openEditModal(p) : undefined}
                        >
                          <TableCell className="py-2">
                            {p.imagemPrincipal ? (
                              <img src={p.imagemPrincipal} alt="" className="h-10 w-10 rounded border object-cover" />
                            ) : (
                              <div className="flex h-10 w-10 items-center justify-center rounded border bg-muted">
                                <ImageIcon className="h-4 w-4 text-muted-foreground" />
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="font-medium">
                            <div className="truncate max-w-[200px] sm:max-w-xs">{p.nome}</div>
                            <div className="text-xs text-muted-foreground sm:hidden">
                              Etiqueta: <span className="font-mono">{p.referencia || "—"}</span>
                            </div>
                          </TableCell>
                          <TableCell className="hidden font-mono text-sm sm:table-cell">{p.referencia || "—"}</TableCell>
                          <TableCell className="hidden text-sm text-muted-foreground md:table-cell">{dimLabel(p)}</TableCell>
                          <TableCell className="text-right">
                            {canEdit ? (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openEditModal(p);
                                }}
                              >
                                <Pencil className="mr-1 h-3.5 w-3.5" />
                                Editar
                              </Button>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
              <p className="text-xs text-muted-foreground">
                Exibindo {displayedProducts.length} de {products.length} produto{products.length !== 1 ? "s" : ""}
                {debouncedListQuery.trim() ? " (filtro ativo)" : ""}.
              </p>
            </CardContent>
          </Card>
        </>
      )}

      <Dialog
        open={modalOpen}
        onOpenChange={(open) => {
          setModalOpen(open);
          if (!open) resetModalForm();
        }}
      >
        <DialogContent className="max-h-[min(90vh,800px)] max-w-[95vw] overflow-y-auto border-border sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar produto" : "Novo produto"}</DialogTitle>
            <DialogDescription>
              Imagem, dimensões, código da etiqueta e QR gerado automaticamente a partir do código.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-6 lg:grid-cols-[1fr_200px]">
            <div className="space-y-4">
              <div
                {...getRootProps()}
                className={`cursor-pointer rounded-lg border-2 border-dashed p-6 text-center transition-colors ${
                  isDragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50"
                }`}
              >
                <input {...getInputProps()} />
                {imagem ? (
                  <div className="space-y-3">
                    <img src={imagem} alt="" className="mx-auto max-h-40 rounded-md border object-contain" />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setImagem("");
                      }}
                    >
                      Remover imagem
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2 py-4">
                    <Upload className="h-8 w-8 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">Arraste ou clique para anexar a imagem do produto</p>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="cad-nome">Nome do produto</Label>
                <Input id="cad-nome" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: Avental descartável" />
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="cad-largura">Largura</Label>
                  <Input id="cad-largura" value={largura} onChange={(e) => setLargura(e.target.value)} placeholder="Ex: 120" inputMode="decimal" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cad-altura">Altura</Label>
                  <Input id="cad-altura" value={altura} onChange={(e) => setAltura(e.target.value)} placeholder="Ex: 90" inputMode="decimal" />
                </div>
                <div className="space-y-2">
                  <Label>Unidade de medida</Label>
                  <Select value={unidade} onValueChange={setUnidade}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cm">cm</SelectItem>
                      <SelectItem value="m">m</SelectItem>
                      <SelectItem value="mm">mm</SelectItem>
                      <SelectItem value="in">pol (in)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="cad-etiqueta">Código da etiqueta</Label>
                <Input
                  id="cad-etiqueta"
                  value={codigoEtiqueta}
                  onChange={(e) => setCodigoEtiqueta(e.target.value)}
                  placeholder="Código impresso na etiqueta (também conteúdo do QR)"
                  className="font-mono"
                  autoComplete="off"
                />
                <p className="text-xs text-muted-foreground">
                  O QR Code ao lado codifica este valor — ao bipar de volta, use a busca na página para localizar o produto.
                </p>
              </div>
            </div>

            <div className="flex flex-col items-center gap-3 rounded-lg border bg-muted/30 p-4">
              <div className="flex items-center gap-2 text-sm font-medium">
                <QrCode className="h-4 w-4" />
                QR da etiqueta
              </div>
              {qrDataUrl ? (
                <img src={qrDataUrl} alt="QR Code do código da etiqueta" className="rounded-md border bg-white p-2" width={200} height={200} />
              ) : (
                <div className="flex h-[200px] w-[200px] items-center justify-center rounded-md border border-dashed text-center text-xs text-muted-foreground">
                  {qrError ?? "Informe o código da etiqueta"}
                </div>
              )}
              <div className="flex w-full flex-col gap-2">
                <Button type="button" variant="outline" size="sm" className="w-full" onClick={downloadQrPng} disabled={!qrDataUrl || !codigoEtiqueta.trim()}>
                  <Download className="mr-2 h-4 w-4" />
                  Baixar PNG
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="w-full"
                  onClick={() => {
                    void generateQrDataUrl(codigoEtiqueta.trim() || " ").then(setQrDataUrl);
                  }}
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Regenerar
                </Button>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 border-t pt-4">
            <Button type="button" onClick={handleSave} disabled={(!editingId && !canCreate) || (Boolean(editingId) && !canEdit)}>
              {editingId ? "Salvar alterações" : "Salvar produto"}
            </Button>
            <Button type="button" variant="outline" onClick={resetModalForm}>
              Limpar formulário
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
