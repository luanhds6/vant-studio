import { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useProductStore } from "@/store/productStore";
import { Product, ProductColor, ProductDetail } from "@/types/Product";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useDropzone } from "react-dropzone";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft, Plus, X, Upload, Image as ImageIcon } from "lucide-react";

const generateId = () => crypto.randomUUID();

const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

const emptyProduct: Omit<Product, "id" | "createdAt" | "updatedAt"> = {
  nome: "",
  categoria: "",
  referencia: "",
  tecido: "",
  tamanhos: [],
  cores: [],
  dimensoes: { largura: "", altura: "", unidade: "cm" },
  detalhes: [],
  imagemPrincipal: "",
  imagensDetalhe: [],
  pintura: { cor: "", tamanho: "", localizacao: "", imagem: "" },
  marcaCliente: { cor: "", tamanho: "", localizacao: "", imagem: "" },
  nomeCampo: { texto: "", cor: "", tamanho: "", localizacao: "" },
};

const ProductForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addProduct, updateProduct, getProduct } = useProductStore();
  const isEditing = !!id;

  const [form, setForm] = useState<Omit<Product, "id" | "createdAt" | "updatedAt">>(emptyProduct);
  const [newTamanho, setNewTamanho] = useState("");
  const [newCor, setNewCor] = useState<{ nome: string; hex: string }>({ nome: "", hex: "#f97316" });
  const [newDetalhe, setNewDetalhe] = useState("");

  useEffect(() => {
    if (isEditing) {
      const existing = getProduct(id);
      if (existing) {
        const { id: _, createdAt, updatedAt, ...rest } = existing;
        setForm(rest);
      } else {
        navigate("/");
      }
    }
  }, [id, isEditing, getProduct, navigate]);

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
      updateField("detalhes", [...form.detalhes, { id: generateId(), texto: newDetalhe.trim() }]);
      setNewDetalhe("");
    }
  };

  const handleSubmit = () => {
    if (!form.nome.trim()) {
      toast({ title: "Erro", description: "Nome do produto é obrigatório.", variant: "destructive" });
      return;
    }

    const now = new Date().toISOString();
    if (isEditing) {
      updateProduct({ ...form, id: id!, createdAt: getProduct(id!)?.createdAt || now, updatedAt: now });
      toast({ title: "Produto atualizado!" });
    } else {
      addProduct({ ...form, id: generateId(), createdAt: now, updatedAt: now });
      toast({ title: "Produto criado!" });
    }
    navigate("/");
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-3xl font-bold tracking-tight">
          {isEditing ? "Editar Produto" : "Novo Produto"}
        </h1>
      </div>

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
        <CardHeader><CardTitle className="text-lg">Dimensões</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Largura</Label>
            <Input value={form.dimensoes.largura} onChange={(e) => updateField("dimensoes", { ...form.dimensoes, largura: e.target.value })} placeholder="150" />
          </div>
          <div className="space-y-2">
            <Label>Altura</Label>
            <Input value={form.dimensoes.altura} onChange={(e) => updateField("dimensoes", { ...form.dimensoes, altura: e.target.value })} placeholder="250" />
          </div>
          <div className="space-y-2">
            <Label>Unidade</Label>
            <Input value={form.dimensoes.unidade} onChange={(e) => updateField("dimensoes", { ...form.dimensoes, unidade: e.target.value })} placeholder="cm" />
          </div>
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
        <CardContent className="space-y-3">
          <div className="flex gap-2 items-end">
            <div className="flex-1 space-y-1">
              <Label>Nome da Cor</Label>
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
              <span key={c.id} className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary text-secondary-foreground text-sm">
                <div className="w-4 h-4 rounded-full border" style={{ backgroundColor: c.hex }} />
                {c.nome}
                <button onClick={() => updateField("cores", form.cores.filter((x) => x.id !== c.id))} className="hover:text-destructive">
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Detalhes Técnicos */}
      <Card>
        <CardHeader><CardTitle className="text-lg">Detalhes Técnicos</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input value={newDetalhe} onChange={(e) => setNewDetalhe(e.target.value)} placeholder="Ex: Bainha dupla de 1cm" onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addDetalhe())} />
            <Button variant="outline" onClick={addDetalhe}><Plus className="h-4 w-4" /></Button>
          </div>
          <div className="space-y-2">
            {form.detalhes.map((d) => (
              <div key={d.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-secondary text-sm">
                <span>{d.texto}</span>
                <button onClick={() => updateField("detalhes", form.detalhes.filter((x) => x.id !== d.id))} className="hover:text-destructive">
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
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2 md:col-span-2">
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
        </CardContent>
      </Card>

      <div className="flex gap-3 justify-end pb-8">
        <Button variant="outline" onClick={() => navigate("/")}>Cancelar</Button>
        <Button onClick={handleSubmit}>{isEditing ? "Salvar Alterações" : "Criar Produto"}</Button>
      </div>
    </div>
  );
};

export default ProductForm;
