import { useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useProductStore } from "@/store/productStore";
import { useAuthStore } from "@/store/authStore";
import { canCadastrarHospitais, canDownloadCatalogPdf, canShowHospitaisExtrasFromHome } from "@/lib/routeAccess";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookOpen, Building2, ChevronRight } from "lucide-react";

/**
 * Página inicial: lista hospitais; com acesso ao módulo hospitais abre o catálogo/PDF; senão, o hub.
 * Cadastro/exclusão de unidades exige «Página inicial»; produtos em /hospitais → abrir hospital.
 */
const PaginaInicial = () => {
  const navigate = useNavigate();
  const canAccess = useAuthStore((s) => s.canAccess);
  const hospitals = useProductStore((s) => s.hospitals);
  const products = useProductStore((s) => s.products);

  const canCadastrar = canCadastrarHospitais(canAccess);
  const canHospitaisExtras = canShowHospitaisExtrasFromHome(canAccess);
  const canCatalogo = canDownloadCatalogPdf(canAccess);

  const openHospital = (id: string) => {
    if (canCatalogo) navigate(`/hospital/${id}/catalogo`);
    else navigate(`/hospital/${id}`);
  };

  const countByHospital = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of products) {
      map.set(p.hospitalId, (map.get(p.hospitalId) ?? 0) + 1);
    }
    return (hid: string) => map.get(hid) ?? 0;
  }, [products]);

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Página inicial</h1>
      </div>

      {hospitals.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center gap-4 py-16 text-center">
            <Building2 className="h-12 w-12 text-muted-foreground" />
            <p className="max-w-md text-muted-foreground">
              {canCadastrar
                ? "Ainda não há hospitais cadastrados. Cadastre-os na página de Hospitais para passarem a aparecer aqui."
                : "Ainda não há hospitais cadastrados. Peça a um usuário com permissão de Página inicial para cadastrar as unidades."}
            </p>
            {canCadastrar ? (
              <Button asChild>
                <Link to="/hospitais">Ir para cadastro de hospitais</Link>
              </Button>
            ) : canHospitaisExtras ? (
              <Button asChild variant="secondary">
                <Link to="/hospitais">Ver página Hospitais</Link>
              </Button>
            ) : null}
          </CardContent>
        </Card>
      ) : (
        <ul className="space-y-3">
          {hospitals.map((h) => (
            <li key={h.id}>
              <Card className="transition-shadow hover:shadow-md">
                <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <button
                    type="button"
                    className="min-w-0 flex-1 text-left"
                    onClick={() => openHospital(h.id)}
                  >
                    <div className="flex items-center gap-2 font-semibold text-foreground">
                      <Building2 className="h-4 w-4 shrink-0 text-primary" />
                      <span className="truncate">{h.nome}</span>
                      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                    </div>
                    {h.cidade ? <p className="mt-1 text-sm text-muted-foreground">{h.cidade}</p> : null}
                    <p className="mt-1 text-xs text-muted-foreground">
                      {countByHospital(h.id)} produto{countByHospital(h.id) !== 1 ? "s" : ""}
                      {canCatalogo ? " · abre a geração do catálogo (PDF)" : " · abre o hospital (produtos e ações permitidas)"}
                    </p>
                  </button>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    <Button variant="default" size="sm" onClick={() => openHospital(h.id)}>
                      <BookOpen className="mr-2 h-4 w-4" />
                      {canCatalogo ? "Gerar catálogo" : "Abrir hospital"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}

      {canHospitaisExtras && hospitals.length > 0 ? (
        <p className="text-center text-sm text-muted-foreground">
          <Link to="/hospitais" className="font-medium text-primary underline-offset-4 hover:underline">
            {canCadastrar ? "Cadastrar ou editar hospitais e produtos" : "Ir para Hospitais e produtos"}
          </Link>
        </p>
      ) : null}
    </div>
  );
};

export default PaginaInicial;
