import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useProductStore } from "@/store/productStore";
import { useAuthStore } from "@/store/authStore";
import {
  canAccessModuloHospitais,
  canCadastrarHospitais,
  canAccessRouteHome,
  getDefaultLandingPath,
} from "@/lib/routeAccess";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Building2, ChevronRight, Plus, Trash2 } from "lucide-react";
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
import { toast } from "@/hooks/use-toast";

const generateId = () => crypto.randomUUID();

/**
 * Cadastro de hospitais: criar, listar e excluir unidades.
 * Produtos de cada hospital são cadastrados ao abrir o hospital (hub → novo produto).
 */
const HospitalsPage = () => {
  const navigate = useNavigate();
  const canAccess = useAuthStore((s) => s.canAccess);
  const canCadastrar = canCadastrarHospitais(canAccess);
  const canModulo = canAccessModuloHospitais(canAccess);
  const hospitals = useProductStore((s) => s.hospitals);
  const products = useProductStore((s) => s.products);
  const addHospital = useProductStore((s) => s.addHospital);
  const deleteHospital = useProductStore((s) => s.deleteHospital);
  const [nome, setNome] = useState("");
  const [cidade, setCidade] = useState("");

  const countByHospital = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of products) {
      map.set(p.hospitalId, (map.get(p.hospitalId) ?? 0) + 1);
    }
    return (hid: string) => map.get(hid) ?? 0;
  }, [products]);

  const handleAdd = async () => {
    if (!canCadastrar) return;
    const n = nome.trim();
    if (!n) {
      toast({ title: "Informe o nome do hospital", variant: "destructive" });
      return;
    }
    try {
      await addHospital({
        id: generateId(),
        nome: n,
        cidade: cidade.trim(),
        createdAt: new Date().toISOString(),
      });
      setNome("");
      setCidade("");
      toast({ title: "Hospital cadastrado" });
    } catch (error) {
      toast({ title: "Erro ao cadastrar hospital", variant: "destructive" });
    }
  };

  const goBack = () => {
    if (canAccessRouteHome(canAccess)) navigate("/");
    else navigate(getDefaultLandingPath(canAccess));
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <Button variant="ghost" size="sm" className="-ml-2" onClick={goBack}>
        <ArrowLeft className="mr-1 h-4 w-4" />
        {canAccessRouteHome(canAccess) ? "Página inicial" : "Voltar"}
      </Button>

      <div className="grid min-h-0 gap-6 lg:grid-cols-2 lg:items-start">
        {/* Coluna esquerda: título alinhado à direita da grade + formulário */}
        <div className="min-w-0 space-y-4 lg:sticky lg:top-4 lg:self-start">
          <h1 className="text-3xl font-bold tracking-tight">Hospitais</h1>
          {canCadastrar ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Novo hospital</CardTitle>
                <CardDescription>Nome obrigatório; cidade é opcional.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="h-nome">Nome do hospital *</Label>
                  <Input
                    id="h-nome"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    placeholder="Ex: Hospital Municipal São José"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="h-cidade">Cidade</Label>
                  <Input
                    id="h-cidade"
                    value={cidade}
                    onChange={(e) => setCidade(e.target.value)}
                    placeholder="Ex: Curitiba"
                  />
                </div>
                <div className="flex items-end">
                  <Button type="button" className="w-full sm:w-auto" onClick={handleAdd}>
                    <Plus className="mr-2 h-4 w-4" />
                    Cadastrar
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-dashed">
              <CardHeader>
                <CardTitle className="text-lg">Cadastro de unidades</CardTitle>
                <CardDescription>
                  Apenas usuários com permissão «Página inicial» podem incluir ou excluir hospitais. Você pode abrir
                  cada hospital para gerenciar produtos conforme suas outras permissões.
                </CardDescription>
              </CardHeader>
            </Card>
          )}
        </div>

        {/* Coluna direita: título na mesma linha visual que «Hospitais» + lista com rolagem */}
        <div className="flex min-h-0 min-w-0 flex-col gap-4">
          <h2 className="text-3xl font-bold tracking-tight">Hospitais cadastrados</h2>
          <div className="min-h-[220px] max-h-[calc(100vh-12rem)] overflow-y-auto rounded-lg border border-border bg-card/30 p-3 [scrollbar-width:thin]">
            {hospitals.length === 0 ? (
              <Card className="border-dashed border-none bg-transparent shadow-none">
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                  <Building2 className="mb-3 h-10 w-10 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    {canCadastrar
                      ? "Nenhum hospital ainda. Use o formulário de cadastro para incluir o primeiro hospital."
                      : "Nenhum hospital cadastrado. Peça a um administrador ou a quem tenha permissão de Página inicial para cadastrar as unidades."}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <ul className="space-y-3 pr-1">
                {hospitals.map((h) => (
                  <li key={h.id}>
                    <Card className="transition-shadow hover:shadow-md">
                      <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                        <button
                          type="button"
                          className="min-w-0 flex-1 text-left"
                          onClick={() => navigate(`/hospital/${h.id}`)}
                        >
                          <div className="flex items-center gap-2 font-semibold text-foreground">
                            <Building2 className="h-4 w-4 shrink-0 text-primary" />
                            <span className="truncate">{h.nome}</span>
                            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                          </div>
                          {h.cidade ? (
                            <p className="mt-1 text-sm text-muted-foreground">{h.cidade}</p>
                          ) : null}
                          <p className="mt-1 text-xs text-muted-foreground">
                            {countByHospital(h.id)} produto{countByHospital(h.id) !== 1 ? "s" : ""} — cadastre
                            produtos ao abrir o hospital
                          </p>
                        </button>
                        <div className="flex shrink-0 gap-2">
                          {canModulo ? (
                            <Button variant="secondary" size="sm" onClick={() => navigate(`/hospital/${h.id}`)}>
                              Abrir hospital
                            </Button>
                          ) : null}
                          {canCadastrar ? (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Excluir hospital?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Serão removidos também todos os produtos vinculados a «{h.nome}». Esta ação não pode
                                    ser desfeita.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={async () => {
                                      try {
                                        await deleteHospital(h.id);
                                        toast({ title: "Hospital removido" });
                                      } catch (error) {
                                        toast({ title: "Erro ao remover hospital", variant: "destructive" });
                                      }
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
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default HospitalsPage;
