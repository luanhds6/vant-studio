import { useState, useEffect, useCallback, useRef, type ChangeEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useShallow } from "zustand/react/shallow";
import { useProductStore, normalizeDimensoes, prepareProductForPersistence } from "@/store/productStore";
import { useAuthStore } from "@/store/authStore";
import { getDefaultLandingPath } from "@/lib/routeAccess";
import { Product, ProductColor, ProductDetail } from "@/types/Product";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useDropzone } from "react-dropzone";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft, Plus, X, Upload, Image as ImageIcon, ChevronDown, ChevronRight, Pencil, Check, Factory } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { getFabricShapeSymbol, getFabricMarkerColor } from "@/lib/shapes";
import {
  clearProductDraft,
  isDraftMostlyEmpty,
  loadProductDraft,
  saveProductDraft,
} from "@/lib/productFormDraft";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const generateId = () => crypto.randomUUID();

const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

const emptyProduct: Omit<Product, "id" | "createdAt" | "updatedAt"> = {
  hospitalId: "",
  nome: "",
  categoria: "",
  referencia: "",
  tecido: "",
  tamanhos: [],
  cores: [],
  dimensoes: [{ id: generateId(), titulo: "", largura: "", altura: "", unidade: "cm" }],
  detalhes: [],
  imagemPrincipal: "",
  imagensDetalhe: [],
  pintura: { cor: "", tamanho: "", localizacao: "", imagem: "" },
  marcaCliente: { cor: "", tamanho: "", localizacao: "", imagem: "" },
  nomeCampo: { texto: "", cor: "", tamanho: "", localizacao: "" },
  timbrado: { ativo: false, imagem: "" },
  rastreavel: { ativo: false, imagem: "" },
};

/** Um pouco acima do pior caso de escrita no store (timeout 240s × 2 tentativas + pausa de retry). */
const PRODUCT_SUBMIT_GUARD_MS = 500_000;

const AUTOSAVE_DEBOUNCE_MS = 2_200;

/** Snapshot estável para comparar alterações (updated_at muda a cada gravação). */
function snapshotProductWithoutUpdatedAt(p: Product): string {
  const { updatedAt, ...rest } = p;
  return JSON.stringify(rest);
}

function readSaveErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (err && typeof err === "object" && "message" in err) return String((err as { message: unknown }).message);
  return "Tente novamente ou verifique sua conexão.";
}

const ProductForm = () => {
  const { hospitalId, id } = useParams<{ hospitalId: string; id: string }>();
  const navigate = useNavigate();
  const canAccess = useAuthStore((s) => s.canAccess);
  const { addProduct, updateProduct, getProduct, getHospital, availableColors, industries, fabricTypes } = useProductStore(
    useShallow((s) => ({
      addProduct: s.addProduct,
      updateProduct: s.updateProduct,
      getProduct: s.getProduct,
      getHospital: s.getHospital,
      availableColors: s.colors,
      industries: s.industries,
      fabricTypes: s.fabricTypes,
    })),
  );
  const isEditing = Boolean(id);

  const [form, setForm] = useState<Omit<Product, "id" | "createdAt" | "updatedAt">>(emptyProduct);
  const formRef = useRef(form);
  formRef.current = form;

  const novoProdutoInitRef = useRef<string | null>(null);
  const rascunhoQuotaAvisoRef = useRef(false);
  const [draftNotice, setDraftNotice] = useState<null | "restored" | "restored-no-images">(null);

  const detalheImagemInputRef = useRef<HTMLInputElement>(null);
  const [detalheImagemAlvoId, setDetalheImagemAlvoId] = useState<string | null>(null);
  const lastAutosaveSnapshotRef = useRef<string | null>(null);
  /** Evita gravar o formulário atual no produto errado se a rota mudar durante um pedido lento. */
  const currentEditProductIdRef = useRef<string | undefined>(id);
  useEffect(() => {
    currentEditProductIdRef.current = id;
  }, [id]);
  /** Serializa autosaves: vários `updateProduct` em paralelo com JSON grande costumam dar timeout. */
  const autosaveChainRef = useRef(Promise.resolve());
  useEffect(() => {
    autosaveChainRef.current = Promise.resolve();
  }, [id]);
  const autosaveErrorToastAtRef = useRef(0);
  const [autosaveVisibilityEpoch, setAutosaveVisibilityEpoch] = useState(0);
  const loadedEditProductKeyRef = useRef<string | null>(null);

  const isStoreLoading = useProductStore((s) => s.isLoading);
  const [newCor, setNewCor] = useState<{ nome: string; hex: string }>({ nome: "", hex: "#f97316" });
  const [newTamanho, setNewTamanho] = useState("");
  const [newDetalhe, setNewDetalhe] = useState("");
  const [editingDetalheId, setEditingDetalheId] = useState<string | null>(null);
  const [editDetalheDraft, setEditDetalheDraft] = useState("");
  const [expandedIndustryIds, setExpandedIndustryIds] = useState<string[]>([]);

  const toggleIndustryExpanded = (industryId: string) => {
    setExpandedIndustryIds((prev) =>
      prev.includes(industryId) ? prev.filter((id) => id !== industryId) : [...prev, industryId],
    );
  };

  useEffect(() => {
    lastAutosaveSnapshotRef.current = null;
  }, [id, isEditing, hospitalId]);

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === "visible") setAutosaveVisibilityEpoch((n) => n + 1);
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  useEffect(() => {
    loadedEditProductKeyRef.current = null;
  }, [id]);

  useEffect(() => {
    setEditingDetalheId(null);
    setEditDetalheDraft("");
  }, [id]);

  useEffect(() => {
    if (!hospitalId || !getHospital(hospitalId)) {
      navigate(getDefaultLandingPath(canAccess), { replace: true });
      return;
    }
    if (!isEditing) {
      const mark = `${hospitalId}:novo`;
      if (novoProdutoInitRef.current !== mark) {
        novoProdutoInitRef.current = mark;
        const draft = loadProductDraft(hospitalId);
        if (draft) {
          setForm({
            ...emptyProduct,
            ...draft.form,
            hospitalId,
            dimensoes: normalizeDimensoes((draft.form as { dimensoes?: unknown }).dimensoes),
          });
          setDraftNotice(draft.imagesOmitted ? "restored-no-images" : "restored");
          toast({
            title: "Rascunho recuperado",
            description: draft.imagesOmitted
              ? "Texto e opções foram restaurados. As imagens eram demasiado grandes para guardar no rascunho — volte a carregá-las."
              : "Pode continuar o cadastro de onde parou (incluindo após falha de rede ou atualização da página).",
          });
        } else {
          setForm({ ...emptyProduct, hospitalId });
          setDraftNotice(null);
        }
      }
      return;
    }

    novoProdutoInitRef.current = null;
    const store = useProductStore.getState();
    const existing = id ? store.getProduct(id) : undefined;
    if (!existing) {
      if (store.isLoading) return;
      navigate(`/hospital/${hospitalId}`, { replace: true });
      return;
    }
    if (existing.hospitalId !== hospitalId) {
      navigate(`/hospital/${existing.hospitalId}/produto/${id}`, { replace: true });
      return;
    }
    const loadKey = `${hospitalId}:${id}`;
    if (loadedEditProductKeyRef.current === loadKey) return;
    loadedEditProductKeyRef.current = loadKey;
    const { id: _pid, createdAt, updatedAt, ...rest } = existing;
    setForm(rest);
  }, [id, isEditing, getHospital, hospitalId, navigate, canAccess, isStoreLoading]);

  const updateField = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const onDropMain = useCallback(async (files: File[]) => {
    if (files[0]) {
      const b64 = await fileToBase64(files[0]);
      updateField("imagemPrincipal", b64);
    }
  }, []);

  const onDropDetail = useCallback(async (files: File[]) => {
    const details: ProductDetail[] = await Promise.all(
      files.map(async (f) => ({
        id: generateId(),
        titulo: f.name.replace(/\.[^.]+$/, ""),
        imagem: await fileToBase64(f),
        posicao: "",
      }))
    );
    setForm((prev) => ({ ...prev, imagensDetalhe: [...prev.imagensDetalhe, ...details] }));
  }, []);

  const { getRootProps: mainRootProps, getInputProps: mainInputProps } = useDropzone({
    onDrop: onDropMain,
    accept: { "image/*": [] },
    maxFiles: 1,
  });

  const { getRootProps: detailRootProps, getInputProps: detailInputProps } = useDropzone({
    onDrop: onDropDetail,
    accept: { "image/*": [] },
  });

  const onDropMarcaCliente = useCallback(async (files: File[]) => {
    if (files[0]) {
      const b64 = await fileToBase64(files[0]);
      updateField("marcaCliente", { ...form.marcaCliente, imagem: b64 });
    }
  }, [form.marcaCliente]);

  const { getRootProps: brandRootProps, getInputProps: brandInputProps } = useDropzone({
    onDrop: onDropMarcaCliente,
    accept: { "image/*": [] },
    maxFiles: 1,
  });

  const onDropPintura = useCallback(async (files: File[]) => {
    if (files[0]) {
      const b64 = await fileToBase64(files[0]);
      updateField("pintura", { ...form.pintura, imagem: b64 });
    }
  }, [form.pintura]);

  const { getRootProps: paintingRootProps, getInputProps: paintingInputProps } = useDropzone({
    onDrop: onDropPintura,
    accept: { "image/*": [] },
    maxFiles: 1,
  });

  const onDropTimbrado = useCallback(async (files: File[]) => {
    if (files[0]) {
      const b64 = await fileToBase64(files[0]);
      updateField("timbrado", { ...form.timbrado, imagem: b64 });
    }
  }, [form.timbrado]);

  const { getRootProps: timbradoRootProps, getInputProps: timbradoInputProps } = useDropzone({
    onDrop: onDropTimbrado,
    accept: { "image/*": [] },
    maxFiles: 1,
  });

  const onDropRastreavel = useCallback(async (files: File[]) => {
    if (files[0]) {
      const b64 = await fileToBase64(files[0]);
      updateField("rastreavel", { ...form.rastreavel, imagem: b64 });
    }
  }, [form.rastreavel]);

  const { getRootProps: rastreavelRootProps, getInputProps: rastreavelInputProps } = useDropzone({
    onDrop: onDropRastreavel,
    accept: { "image/*": [] },
    maxFiles: 1,
  });

  const addTamanho = () => {
    if (newTamanho.trim() && !form.tamanhos.includes(newTamanho.trim())) {
      updateField("tamanhos", [...form.tamanhos, newTamanho.trim()]);
      setNewTamanho("");
    }
  };

  const addCor = () => {
    if (newCor.nome.trim()) {
      updateField("cores", [...form.cores, { id: generateId(), ...newCor }]);
      setNewCor({ nome: "", hex: "#f97316" });
    }
  };

  const addDetalhe = () => {
    if (newDetalhe.trim()) {
      updateField("detalhes", [...form.detalhes, { id: generateId(), texto: newDetalhe.trim(), imagem: "" }]);
      setNewDetalhe("");
    }
  };

  const startEditDetalhe = (d: { id: string; texto: string }) => {
    setEditingDetalheId(d.id);
    setEditDetalheDraft(d.texto);
  };

  const cancelEditDetalhe = () => {
    setEditingDetalheId(null);
    setEditDetalheDraft("");
  };

  const commitEditDetalhe = () => {
    if (!editingDetalheId) return;
    const t = editDetalheDraft.trim();
    if (!t) {
      toast({
        title: "Texto vazio",
        description: "Escreva uma descrição ou cancele a edição.",
        variant: "destructive",
      });
      return;
    }
    updateField(
      "detalhes",
      form.detalhes.map((x) => (x.id === editingDetalheId ? { ...x, texto: t } : x)),
    );
    cancelEditDetalhe();
  };

  const openDetalheImagemPicker = (detalheId: string) => {
    setDetalheImagemAlvoId(detalheId);
    requestAnimationFrame(() => detalheImagemInputRef.current?.click());
  };

  const onDetalheImagemFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const alvo = detalheImagemAlvoId;
    e.target.value = "";
    setDetalheImagemAlvoId(null);
    if (!file || !alvo) return;
    try {
      const b64 = await fileToBase64(file);
      setForm((prev) => ({
        ...prev,
        detalhes: prev.detalhes.map((x) => (x.id === alvo ? { ...x, imagem: b64 } : x)),
      }));
    } catch {
      toast({ title: "Erro", description: "Não foi possível ler a imagem.", variant: "destructive" });
    }
  };

  const clearDetalheImagem = (detalheId: string) => {
    setForm((prev) => ({
      ...prev,
      detalhes: prev.detalhes.map((x) => (x.id === detalheId ? { ...x, imagem: "" } : x)),
    }));
  };

  const resetFormForNewProduct = useCallback(() => {
    setForm({ ...emptyProduct, hospitalId: hospitalId ?? "" });
    setNewTamanho("");
    setNewCor({ nome: "", hex: "#f97316" });
    setNewDetalhe("");
    setEditingDetalheId(null);
    setEditDetalheDraft("");
    setExpandedIndustryIds([]);
  }, [hospitalId]);

  useEffect(() => {
    if (isEditing || !hospitalId) return;
    const timer = window.setTimeout(() => {
      const current = formRef.current;
      if (isDraftMostlyEmpty(current)) {
        clearProductDraft(hospitalId);
        return;
      }
      const r = saveProductDraft(hospitalId, current);
      if (!r.ok && r.reason === "quota" && !rascunhoQuotaAvisoRef.current) {
        rascunhoQuotaAvisoRef.current = true;
        toast({
          title: "Rascunho incompleto",
          description:
            "Este browser não conseguiu guardar todas as imagens por falta de espaço. Tente imagens mais pequenas ou comprima os ficheiros antes de enviar.",
          variant: "destructive",
        });
      } else if (r.ok && r.imagesOmitted && !rascunhoQuotaAvisoRef.current) {
        rascunhoQuotaAvisoRef.current = true;
        toast({
          title: "Rascunho sem imagens",
          description:
            "O rascunho guardou apenas texto e opções. Reduza o tamanho das imagens para guardar tudo de uma vez neste dispositivo.",
        });
      }
    }, 650);
    return () => window.clearTimeout(timer);
  }, [form, isEditing, hospitalId]);

  /** Em edição: grava alterações no servidor com debounce (evita perda ao sair sem clicar em Salvar). */
  useEffect(() => {
    if (!isEditing || !id || !hospitalId) return;
    const store = useProductStore.getState();
    const existing = store.getProduct(id);
    if (!existing) return;

    const full: Product = {
      ...form,
      id,
      hospitalId,
      createdAt: existing.createdAt,
      updatedAt: existing.updatedAt,
    };
    let prepared: Product;
    try {
      prepared = prepareProductForPersistence(full);
    } catch {
      return;
    }
    const snap = snapshotProductWithoutUpdatedAt(prepared);
    if (lastAutosaveSnapshotRef.current === null) {
      lastAutosaveSnapshotRef.current = snap;
      return;
    }
    if (lastAutosaveSnapshotRef.current === snap) return;
    if (!form.nome.trim()) return;

    const targetProductId = id;
    const timer = window.setTimeout(() => {
      if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
      autosaveChainRef.current = autosaveChainRef.current.then(async () => {
        if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
        if (currentEditProductIdRef.current !== targetProductId) return;
        if (!formRef.current.nome.trim()) return;
        const st = useProductStore.getState();
        const ex = st.getProduct(targetProductId);
        if (!ex) return;
        const fullNow: Product = {
          ...formRef.current,
          id: targetProductId,
          hospitalId,
          createdAt: ex.createdAt,
          updatedAt: ex.updatedAt,
        };
        let prep: Product;
        try {
          prep = prepareProductForPersistence(fullNow);
        } catch {
          return;
        }
        const snapNow = snapshotProductWithoutUpdatedAt(prep);
        if (lastAutosaveSnapshotRef.current === snapNow) return;
        try {
          await st.updateProduct(prep);
          if (currentEditProductIdRef.current !== targetProductId) return;
          let verifySnap: string;
          try {
            verifySnap = snapshotProductWithoutUpdatedAt(
              prepareProductForPersistence({
                ...formRef.current,
                id: targetProductId,
                hospitalId,
                createdAt: ex.createdAt,
                updatedAt: ex.updatedAt,
              }),
            );
          } catch {
            return;
          }
          if (verifySnap !== snapNow) return;
          lastAutosaveSnapshotRef.current = snapNow;
        } catch (e) {
          const now = Date.now();
          if (now - autosaveErrorToastAtRef.current < 60_000) return;
          autosaveErrorToastAtRef.current = now;
          toast({
            title: "Erro ao guardar automaticamente",
            description: readSaveErrorMessage(e),
            variant: "destructive",
          });
        }
      });
    }, AUTOSAVE_DEBOUNCE_MS);

    return () => window.clearTimeout(timer);
  }, [form, isEditing, id, hospitalId, autosaveVisibilityEpoch]);

  useEffect(() => {
    if (isEditing || !hospitalId) return;
    const flush = () => {
      const hid = hospitalId;
      const current = formRef.current;
      if (!hid) return;
      if (isDraftMostlyEmpty(current)) clearProductDraft(hid);
      else saveProductDraft(hid, current);
    };
    window.addEventListener("pagehide", flush);
    return () => window.removeEventListener("pagehide", flush);
  }, [isEditing, hospitalId]);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleDiscardDraft = useCallback(() => {
    if (!hospitalId) return;
    clearProductDraft(hospitalId);
    resetFormForNewProduct();
    setDraftNotice(null);
    rascunhoQuotaAvisoRef.current = false;
    toast({ title: "Rascunho removido", description: "O formulário foi reposto para um produto novo vazio." });
  }, [hospitalId, resetFormForNewProduct]);

  const handleSubmit = async (options?: { cadastrarOutro?: boolean }) => {
    if (!form.nome.trim()) {
      toast({ title: "Erro", description: "Nome do produto é obrigatório.", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    const guardTimer = window.setTimeout(() => {
      setIsSubmitting(false);
      toast({
        title: "Tempo limite ao salvar",
        description: isEditing
          ? "A operação demorou demasiado. Verifique a rede, reduza o tamanho das imagens e tente novamente."
          : "A operação demorou demasiado. O que já preencheu foi mantido como rascunho neste browser — tente de novo (rede mais estável ou imagens mais pequenas).",
        variant: "destructive",
      });
    }, PRODUCT_SUBMIT_GUARD_MS);
    try {
      const now = new Date().toISOString();
      if (isEditing) {
        await updateProduct({
          ...form,
          hospitalId: hospitalId!,
          id: id!,
          createdAt: getProduct(id!)?.createdAt || now,
          updatedAt: now,
        });
        toast({ title: "Produto atualizado!" });
        navigate(`/hospital/${hospitalId}`);
      } else {
        await addProduct({
          ...form,
          hospitalId: hospitalId!,
          id: generateId(),
          createdAt: now,
          updatedAt: now,
        });
        clearProductDraft(hospitalId!);
        setDraftNotice(null);
        rascunhoQuotaAvisoRef.current = false;
        toast({ title: "Produto criado!" });
        if (options?.cadastrarOutro) {
          resetFormForNewProduct();
          navigate(`/hospital/${hospitalId}/produto/novo`, { replace: true });
        } else {
          navigate(`/hospital/${hospitalId}`);
        }
      }
    } catch (error) {
      toast({
        title: "Erro ao salvar produto",
        description: readSaveErrorMessage(error),
        variant: "destructive",
      });
    } finally {
      window.clearTimeout(guardTimer);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(`/hospital/${hospitalId}`)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-3xl font-bold tracking-tight">
          {isEditing ? "Editar Produto" : "Novo Produto"}
        </h1>
      </div>

      {!isEditing && hospitalId ? (
        <div className="space-y-3">
          {(draftNotice === "restored" || draftNotice === "restored-no-images") && (
            <Alert>
              <AlertTitle>Rascunho neste dispositivo</AlertTitle>
              <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p>
                  {draftNotice === "restored-no-images"
                    ? "Os campos de texto e opções foram recuperados; volte a adicionar imagens grandes se for necessário."
                    : "O preenchimento foi recuperado do armazenamento local do browser."}
                </p>
                <Button variant="outline" size="sm" type="button" className="shrink-0" onClick={handleDiscardDraft}>
                  Limpar rascunho e recomeçar
                </Button>
              </AlertDescription>
            </Alert>
          )}
          <p className="text-xs text-muted-foreground">
            Enquanto cria um produto novo, o formulário é guardado automaticamente neste browser (útil se a página
            recarregar ou se o envio falhar).
            {!isDraftMostlyEmpty(form) ? (
              <>
                {" "}
                <button
                  type="button"
                  className="underline underline-offset-2 text-foreground/80 hover:text-foreground"
                  onClick={handleDiscardDraft}
                >
                  Limpar rascunho e recomeçar
                </button>
              </>
            ) : null}
          </p>
        </div>
      ) : null}

      {/* Informações Básicas */}
      <Card>
        <CardHeader><CardTitle className="text-lg">Informações Básicas</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Nome do Produto *</Label>
            <Input value={form.nome} onChange={(e) => updateField("nome", e.target.value)} placeholder="Ex: Lençol Hospitalar" />
          </div>
          <div className="space-y-2">
            <Label>Referência</Label>
            <Input value={form.referencia} onChange={(e) => updateField("referencia", e.target.value)} placeholder="Ex: LH-001" />
          </div>
          <div className="space-y-2">
            <Label>Categoria</Label>
            <Input value={form.categoria} onChange={(e) => updateField("categoria", e.target.value)} placeholder="Ex: Rouparia Hospitalar" />
          </div>
          <div className="space-y-2">
            <Label>Tecido</Label>
            <Input value={form.tecido} onChange={(e) => updateField("tecido", e.target.value)} placeholder="Ex: 100% Algodão" />
          </div>
        </CardContent>
      </Card>

      {/* Dimensões */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Dimensões</CardTitle>
          <p className="text-sm text-muted-foreground">
            Adicione um bloco por parte a medir (ex.: corpo, bolso, barra, elástico, boca da peça). Cada bloco tem um
            título e largura, altura e unidade.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                updateField("dimensoes", [
                  ...form.dimensoes,
                  { id: generateId(), titulo: "", largura: "", altura: "", unidade: "cm" },
                ])
              }
            >
              <Plus className="mr-1 h-4 w-4" />
              Adicionar dimensão
            </Button>
          </div>
          {form.dimensoes.map((dim, index) => (
            <div key={dim.id} className="space-y-3 rounded-lg border border-border/80 bg-muted/15 p-4">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div className="min-w-0 flex-1 space-y-2">
                  <Label>Título do bloco {index + 1}</Label>
                  <Input
                    value={dim.titulo}
                    onChange={(e) =>
                      updateField(
                        "dimensoes",
                        form.dimensoes.map((d) => (d.id === dim.id ? { ...d, titulo: e.target.value } : d)),
                      )
                    }
                    placeholder="Ex.: Bolsos, Barra da calça, Elástico, Boca (esticada)…"
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="shrink-0"
                  disabled={form.dimensoes.length <= 1}
                  title={form.dimensoes.length <= 1 ? "Mantenha pelo menos um bloco de dimensões" : "Remover este bloco"}
                  onClick={() => updateField("dimensoes", form.dimensoes.filter((d) => d.id !== dim.id))}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label>Largura</Label>
                  <Input
                    value={dim.largura}
                    onChange={(e) =>
                      updateField(
                        "dimensoes",
                        form.dimensoes.map((d) => (d.id === dim.id ? { ...d, largura: e.target.value } : d)),
                      )
                    }
                    placeholder="150"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Altura</Label>
                  <Input
                    value={dim.altura}
                    onChange={(e) =>
                      updateField(
                        "dimensoes",
                        form.dimensoes.map((d) => (d.id === dim.id ? { ...d, altura: e.target.value } : d)),
                      )
                    }
                    placeholder="250"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Unidade</Label>
                  <Input
                    value={dim.unidade}
                    onChange={(e) =>
                      updateField(
                        "dimensoes",
                        form.dimensoes.map((d) => (d.id === dim.id ? { ...d, unidade: e.target.value } : d)),
                      )
                    }
                    placeholder="cm"
                  />
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Tamanhos */}
      <Card>
        <CardHeader><CardTitle className="text-lg">Tamanhos</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input value={newTamanho} onChange={(e) => setNewTamanho(e.target.value)} placeholder="Ex: P, M, G, GG" onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTamanho())} />
            <Button variant="outline" onClick={addTamanho}><Plus className="h-4 w-4" /></Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {form.tamanhos.map((t, i) => (
              <span key={i} className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-secondary text-secondary-foreground text-sm">
                {t}
                <button onClick={() => updateField("tamanhos", form.tamanhos.filter((_, idx) => idx !== i))} className="hover:text-destructive">
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Cores */}
      <Card>
        <CardHeader><CardTitle className="text-lg">Cores</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {/* Cores Sugeridas (Agrupadas) */}
          {industries.length > 0 && (
            <div className="space-y-4">
              <Label className="text-xs text-muted-foreground uppercase">Cores do Sistema (Clique para Adicionar)</Label>
              {industries.map(ind => {
                const indFabrics = fabricTypes.filter(f => f.industryId === ind.id);
                if (indFabrics.length === 0) return null;
                
                return (
                  <div key={ind.id} className="space-y-3 p-4 rounded-lg border bg-muted/10">
                    <button
                      type="button"
                      className="w-full flex items-center justify-between text-left"
                      onClick={() => toggleIndustryExpanded(ind.id)}
                    >
                      <h4 className="font-semibold text-sm text-primary flex items-center gap-2">
                        <Factory className="h-4 w-4" /> {ind.nome}
                      </h4>
                      {expandedIndustryIds.includes(ind.id) ? (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      )}
                    </button>
                    {expandedIndustryIds.includes(ind.id) ? (
                      indFabrics.map(fab => {
                        const fabColors = availableColors.filter(c => c.fabricTypeId === fab.id);
                        if (fabColors.length === 0) return null;
                        return (
                          <div key={fab.id} className="space-y-2 pl-4 border-l-2 border-primary/20">
                            <Label className="text-xs font-medium text-muted-foreground">{fab.nome}</Label>
                            <div className="flex flex-wrap gap-2">
                              {fabColors.map((c) => (
                                <button
                                  key={c.id}
                                  type="button"
                                  onClick={() => {
                                    if (!form.cores.some((x) => x.hex === c.hex)) {
                                      updateField("cores", [...form.cores, { id: generateId(), nome: `${c.nome} ${c.codigo ? `(${c.codigo})` : ''}`, hex: c.hex, fabricTypeId: c.fabricTypeId }]);
                                      toast({ title: `Cor ${c.nome} adicionada` });
                                    } else {
                                      toast({ title: "Cor já adicionada", variant: "default" });
                                    }
                                  }}
                                  className="group flex items-center gap-2 px-2.5 py-1.5 rounded-md border bg-card hover:bg-accent hover:border-primary/50 transition-all text-xs font-medium shadow-sm"
                                >
                                  <span style={{ color: getFabricMarkerColor(c.fabricTypeId) }}>{getFabricShapeSymbol(c.fabricTypeId)}</span>
                                  {c.nome}
                                  {c.codigo && <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded ml-1">{c.codigo}</span>}
                                </button>
                              ))}
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <p className="text-xs text-muted-foreground">Clique para expandir e visualizar as cores.</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <div className="flex gap-2 items-end pt-2 border-t">
            <div className="flex-1 space-y-1">
              <Label>Nome da Cor Manual</Label>
              <Input value={newCor.nome} onChange={(e) => setNewCor({ ...newCor, nome: e.target.value })} placeholder="Ex: Branco" />
            </div>
            <div className="space-y-1">
              <Label>Cor</Label>
              <input type="color" value={newCor.hex} onChange={(e) => setNewCor({ ...newCor, hex: e.target.value })} className="w-10 h-10 rounded cursor-pointer border" />
            </div>
            <Button variant="outline" onClick={addCor}><Plus className="h-4 w-4" /></Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {form.cores.map((c) => (
              <span key={c.id} className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary text-secondary-foreground text-sm border shadow-sm">
                <span style={{ color: getFabricMarkerColor(c.fabricTypeId) }}>{getFabricShapeSymbol(c.fabricTypeId)}</span>
                {c.nome}
                <button onClick={() => updateField("cores", form.cores.filter((x) => x.id !== c.id))} className="ml-1 p-0.5 rounded-full hover:bg-destructive hover:text-destructive-foreground transition-colors">
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Detalhes Técnicos */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Detalhes Técnicos</CardTitle>
          <p className="text-sm text-muted-foreground">
            Opcional: clique no círculo à esquerda de cada linha para adicionar uma pequena imagem de exemplo ao lado da
            descrição. Use o ícone de lápis para alterar o texto sem apagar o detalhe.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <input
            ref={detalheImagemInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => void onDetalheImagemFileChange(e)}
          />
          <div className="flex gap-2">
            <Input
              value={newDetalhe}
              onChange={(e) => setNewDetalhe(e.target.value)}
              placeholder="Ex: Bainha dupla de 1cm"
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addDetalhe())}
            />
            <Button variant="outline" onClick={addDetalhe}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <div className="space-y-2">
            {form.detalhes.map((d) => (
              <div
                key={d.id}
                className="flex items-center gap-3 rounded-lg bg-secondary px-3 py-2 text-sm"
              >
                <div className="relative shrink-0">
                  <button
                    type="button"
                    title={d.imagem ? "Alterar imagem de exemplo" : "Adicionar imagem de exemplo"}
                    onClick={() => openDetalheImagemPicker(d.id)}
                    className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-border bg-muted/80 ring-offset-background transition hover:border-primary/50 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {d.imagem ? (
                      <img src={d.imagem} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <ImageIcon className="h-4 w-4 text-muted-foreground" aria-hidden />
                    )}
                  </button>
                  {d.imagem ? (
                    <button
                      type="button"
                      title="Remover imagem"
                      onClick={(e) => {
                        e.stopPropagation();
                        clearDetalheImagem(d.id);
                      }}
                      className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  ) : null}
                </div>
                {editingDetalheId === d.id ? (
                  <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center">
                    <Input
                      value={editDetalheDraft}
                      onChange={(e) => setEditDetalheDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          commitEditDetalhe();
                        }
                        if (e.key === "Escape") {
                          e.preventDefault();
                          cancelEditDetalhe();
                        }
                      }}
                      className="flex-1"
                      autoFocus
                    />
                    <div className="flex shrink-0 gap-1">
                      <Button type="button" size="sm" variant="default" className="h-8 px-2" onClick={commitEditDetalhe} title="Guardar">
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button type="button" size="sm" variant="outline" className="h-8 px-2" onClick={cancelEditDetalhe} title="Cancelar">
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <span className="min-w-0 flex-1 leading-snug">{d.texto}</span>
                )}
                {editingDetalheId === d.id ? null : (
                  <button
                    type="button"
                    title="Editar descrição"
                    onClick={() => startEditDetalhe(d)}
                    className="shrink-0 rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                )}
                <button
                  type="button"
                  title="Remover detalhe"
                  onClick={() => {
                    if (editingDetalheId === d.id) cancelEditDetalhe();
                    updateField("detalhes", form.detalhes.filter((x) => x.id !== d.id));
                  }}
                  className="shrink-0 rounded-md p-1.5 text-muted-foreground hover:bg-destructive/15 hover:text-destructive"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Imagem Principal */}
      <Card>
        <CardHeader><CardTitle className="text-lg">Imagem Principal (Desenho Técnico)</CardTitle></CardHeader>
        <CardContent>
          {form.imagemPrincipal ? (
            <div className="relative inline-block">
              <img src={form.imagemPrincipal} alt="Principal" className="max-h-64 rounded-lg border" />
              <Button variant="destructive" size="icon" className="absolute top-2 right-2 h-7 w-7" onClick={() => updateField("imagemPrincipal", "")}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div {...mainRootProps()} className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors">
              <input {...mainInputProps()} />
              <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Arraste uma imagem ou clique para selecionar</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Imagens de Detalhe */}
      <Card>
        <CardHeader><CardTitle className="text-lg">Imagens de Detalhe</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div {...detailRootProps()} className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors">
            <input {...detailInputProps()} />
            <ImageIcon className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Arraste ou clique para adicionar imagens de detalhe</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {form.imagensDetalhe.map((d) => (
              <div key={d.id} className="relative group">
                <img src={d.imagem} alt={d.titulo} className="w-full h-32 object-contain rounded-lg border bg-muted" />
                <Input
                  value={d.titulo}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      imagensDetalhe: prev.imagensDetalhe.map((x) =>
                        x.id === d.id ? { ...x, titulo: e.target.value } : x
                      ),
                    }))
                  }
                  className="mt-1 text-xs h-8"
                  placeholder="Título"
                />
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => updateField("imagensDetalhe", form.imagensDetalhe.filter((x) => x.id !== d.id))}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Pintura, Marca do Cliente, Nome do Campo */}
      <Card>
        <CardHeader><CardTitle className="text-lg">Pintura</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Cor</Label>
            <Input value={form.pintura.cor} onChange={(e) => updateField("pintura", { ...form.pintura, cor: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Tamanho</Label>
            <Input value={form.pintura.tamanho} onChange={(e) => updateField("pintura", { ...form.pintura, tamanho: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Localização</Label>
            <Input value={form.pintura.localizacao} onChange={(e) => updateField("pintura", { ...form.pintura, localizacao: e.target.value })} />
          </div>
          <div className="space-y-2 md:col-span-3">
            <Label>Imagem da Pintura</Label>
            {form.pintura.imagem ? (
              <div className="relative inline-block">
                <img src={form.pintura.imagem} alt="Pintura do produto" className="max-h-40 rounded-lg border bg-muted" />
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2 h-7 w-7"
                  onClick={() =>
                    updateField("pintura", { ...form.pintura, imagem: "" })
                  }
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div
                {...paintingRootProps()}
                className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
              >
                <input {...paintingInputProps()} />
                <Upload className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Arraste uma imagem ou clique para anexar a pintura</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-lg">Marca do Cliente</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Cor</Label>
            <Input value={form.marcaCliente.cor} onChange={(e) => updateField("marcaCliente", { ...form.marcaCliente, cor: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Tamanho</Label>
            <Input value={form.marcaCliente.tamanho} onChange={(e) => updateField("marcaCliente", { ...form.marcaCliente, tamanho: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Localização</Label>
            <Input value={form.marcaCliente.localizacao} onChange={(e) => updateField("marcaCliente", { ...form.marcaCliente, localizacao: e.target.value })} />
          </div>
          <div className="space-y-2 md:col-span-3">
            <Label>Imagem da Marca</Label>
            {form.marcaCliente.imagem ? (
              <div className="relative inline-block">
                <img src={form.marcaCliente.imagem} alt="Marca do cliente" className="max-h-40 rounded-lg border bg-muted" />
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2 h-7 w-7"
                  onClick={() =>
                    updateField("marcaCliente", { ...form.marcaCliente, imagem: "" })
                  }
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div
                {...brandRootProps()}
                className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
              >
                <input {...brandInputProps()} />
                <Upload className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Arraste uma imagem ou clique para anexar a marca do cliente</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-lg">Nome do Campo</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2 md:col-span-3">
            <Label>Texto</Label>
            <Textarea value={form.nomeCampo.texto} onChange={(e) => updateField("nomeCampo", { ...form.nomeCampo, texto: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Cor</Label>
            <Input value={form.nomeCampo.cor} onChange={(e) => updateField("nomeCampo", { ...form.nomeCampo, cor: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Tamanho</Label>
            <Input value={form.nomeCampo.tamanho} onChange={(e) => updateField("nomeCampo", { ...form.nomeCampo, tamanho: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Localização</Label>
            <Input
              value={form.nomeCampo.localizacao}
              onChange={(e) => updateField("nomeCampo", { ...form.nomeCampo, localizacao: e.target.value })}
            />
          </div>
        </CardContent>
      </Card>

      {/* Timbrado */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="text-lg">Item Timbrado</CardTitle>
            <p className="text-sm text-muted-foreground">Este item possui marcação timbrada?</p>
          </div>
          <Switch 
            checked={form.timbrado.ativo} 
            onCheckedChange={(checked) => updateField("timbrado", { ...form.timbrado, ativo: checked })} 
          />
        </CardHeader>
        {form.timbrado.ativo && (
          <CardContent className="space-y-4 pt-4 border-t">
            <Label>Imagem do Timbrado</Label>
            {form.timbrado.imagem ? (
              <div className="relative inline-block">
                <img src={form.timbrado.imagem} alt="Timbrado" className="max-h-40 rounded-lg border bg-muted" />
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2 h-7 w-7"
                  onClick={() => updateField("timbrado", { ...form.timbrado, imagem: "" })}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div
                {...timbradoRootProps()}
                className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
              >
                <input {...timbradoInputProps()} />
                <Upload className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Arraste a imagem do timbrado ou clique para selecionar</p>
              </div>
            )}
          </CardContent>
        )}
      </Card>

      {/* Rastreável */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="text-lg">Item Rastreável</CardTitle>
            <p className="text-sm text-muted-foreground">Este item possui rastreamento ou código de barras?</p>
          </div>
          <Switch 
            checked={form.rastreavel.ativo} 
            onCheckedChange={(checked) => updateField("rastreavel", { ...form.rastreavel, ativo: checked })} 
          />
        </CardHeader>
        {form.rastreavel.ativo && (
          <CardContent className="space-y-4 pt-4 border-t">
            <Label>Imagem do Rastreamento/Etiqueta</Label>
            {form.rastreavel.imagem ? (
              <div className="relative inline-block">
                <img src={form.rastreavel.imagem} alt="Rastreamento" className="max-h-40 rounded-lg border bg-muted" />
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2 h-7 w-7"
                  onClick={() => updateField("rastreavel", { ...form.rastreavel, imagem: "" })}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div
                {...rastreavelRootProps()}
                className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
              >
                <input {...rastreavelInputProps()} />
                <Upload className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Arraste a imagem do rastreio ou clique para selecionar</p>
              </div>
            )}
          </CardContent>
        )}
      </Card>

      <div className="flex flex-wrap items-center justify-end gap-3 pb-8">
        <Button variant="outline" onClick={() => navigate(`/hospital/${hospitalId}`)} disabled={isSubmitting}>
          Cancelar
        </Button>
        {!isEditing ? (
          <Button
            type="button"
            variant="secondary"
            onClick={() => void handleSubmit({ cadastrarOutro: true })}
            disabled={isSubmitting}
          >
            Salvar e cadastrar outro
          </Button>
        ) : null}
        <Button type="button" onClick={() => void handleSubmit()} disabled={isSubmitting}>
          {isSubmitting ? "Salvando..." : isEditing ? "Salvar Alterações" : "Criar Produto"}
        </Button>
      </div>
    </div>
  );
};

export default ProductForm;
