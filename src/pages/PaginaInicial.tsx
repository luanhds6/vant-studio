import { useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useProductStore } from "@/store/productStore";
import { useAuthStore } from "@/store/authStore";
import { canCadastrarHospitais, canDownloadCatalogPdf, canShowHospitaisExtrasFromHome } from "@/lib/routeAccess";
import { APP_NAME } from "@/brand";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  BookOpen,
  Building2,
  ChevronRight,
  Factory,
  Package,
  Palette,
} from "lucide-react";

function StatCard({
  label,
  value,
  icon: Icon,
  tint,
}: {
  label: string;
  value: number;
  icon: typeof Building2;
  tint: "orange" | "violet" | "emerald" | "sky";
}) {
  const rings = {
    orange: "from-orange-400/25 to-amber-400/10 text-orange-600 dark:text-orange-300",
    violet: "from-violet-400/25 to-purple-400/10 text-violet-600 dark:text-violet-300",
    emerald: "from-emerald-400/25 to-teal-400/10 text-emerald-600 dark:text-emerald-300",
    sky: "from-sky-400/25 to-blue-400/10 text-sky-600 dark:text-sky-300",
  }[tint];

  return (
    <Card className="group overflow-hidden transition duration-300 ease-out hover:-translate-y-0.5 hover:shadow-sm">
      <CardContent className="flex flex-col gap-1.5 p-2.5 sm:p-3">
        <div className={`flex h-6 w-6 items-center justify-center rounded-lg bg-gradient-to-br ${rings}`}>
          <Icon className="h-3 w-3" aria-hidden />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase leading-tight tracking-wide text-muted-foreground">{label}</p>
          <p className="font-['Space_Grotesk',sans-serif] text-xl font-bold leading-none tabular-nums text-foreground">
            {value}
          </p>
        </div>
        <div className="h-3.5 w-full opacity-50 transition group-hover:opacity-80" aria-hidden>
          <svg viewBox="0 0 120 32" className="h-full w-full text-primary/40" preserveAspectRatio="none">
            <path
              d="M0 24 L20 18 L40 22 L60 10 L80 14 L100 6 L120 12"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Página inicial: lista hospitais; com acesso ao módulo hospitais abre o catálogo/PDF; senão, o hub.
 */
const PaginaInicial = () => {
  const navigate = useNavigate();
  const canAccess = useAuthStore((s) => s.canAccess);
  const hospitals = useProductStore((s) => s.hospitals);
  const products = useProductStore((s) => s.products);
  const colors = useProductStore((s) => s.colors);

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

  const firstCatalogHospitalId = hospitals[0]?.id;

  return (
    <div className="mx-auto max-w-6xl -mt-1 space-y-6 pb-10">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <h1 className="font-['Space_Grotesk',sans-serif] text-2xl font-bold tracking-tight text-foreground md:text-3xl">
          Página inicial
        </h1>
        <div
          className="flex items-center gap-2 self-end sm:self-auto shrink-0 text-primary/90"
          aria-label={APP_NAME}
        >
          <span className="h-1 w-10 rounded-full bg-gradient-to-r from-primary to-orange-400" aria-hidden />
          <span className="text-xs font-semibold uppercase tracking-widest">{APP_NAME}</span>
        </div>
      </header>

      {hospitals.length === 0 ? (
        <Card className="border-dashed border-primary/25 bg-card/60">
          <CardContent className="flex flex-col items-center justify-center gap-5 py-20 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/15 to-orange-400/10">
              <Building2 className="h-8 w-8 text-primary" />
            </div>
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
        <>
          <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Hospitais" value={hospitals.length} icon={Building2} tint="orange" />
            <StatCard label="Produtos" value={products.length} icon={Package} tint="violet" />
            <StatCard
              label="Unidades com produto"
              value={hospitals.filter((h) => countByHospital(h.id) > 0).length}
              icon={Factory}
              tint="emerald"
            />
            <StatCard label="Cores cadastradas" value={colors.length} icon={Palette} tint="sky" />
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <div className="space-y-3 lg:col-span-2">
              <h3 className="font-['Space_Grotesk',sans-serif] text-lg font-semibold tracking-tight">Unidades</h3>
              <ul className="space-y-3">
                {hospitals.map((h) => (
                  <li key={h.id}>
                    <Card className="transition duration-300 ease-out hover:-translate-y-0.5 hover:shadow-md">
                      <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
                        <button
                          type="button"
                          className="min-w-0 flex-1 text-left transition hover:opacity-95"
                          onClick={() => openHospital(h.id)}
                        >
                          <div className="flex items-center gap-2 font-semibold text-foreground">
                            <Building2 className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                            <span className="truncate">{h.nome}</span>
                            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                          </div>
                          {h.cidade ? <p className="mt-1 text-sm text-muted-foreground">{h.cidade}</p> : null}
                          <p className="mt-1 text-xs text-muted-foreground">
                            {countByHospital(h.id)} produto{countByHospital(h.id) !== 1 ? "s" : ""}
                            {canCatalogo ? " · catálogo PDF" : " · hub da unidade"}
                          </p>
                        </button>
                        <div className="flex shrink-0 flex-wrap gap-2">
                          <Button variant="default" size="sm" onClick={() => openHospital(h.id)}>
                            <BookOpen className="mr-2 h-4 w-4" aria-hidden />
                            {canCatalogo ? "Gerar catálogo" : "Abrir"}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-4">
              <h3 className="font-['Space_Grotesk',sans-serif] text-lg font-semibold tracking-tight">Atalhos rápidos</h3>
              <div className="grid grid-cols-2 gap-3">
                {canCadastrar ? (
                  <Link
                    to="/hospitais"
                    className="flex flex-col gap-2 rounded-2xl border border-border/60 bg-card/80 p-4 shadow-sm transition duration-300 ease-out hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-md"
                  >
                    <Building2 className="h-5 w-5 text-primary" />
                    <span className="text-sm font-semibold">Novo hospital</span>
                  </Link>
                ) : null}
                {canAccess("novo_produto") || canAccess("produtos") ? (
                  <Link
                    to="/cadastro-produtos"
                    className="flex flex-col gap-2 rounded-2xl border border-border/60 bg-card/80 p-4 shadow-sm transition duration-300 ease-out hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-md"
                  >
                    <Package className="h-5 w-5 text-violet-600 dark:text-violet-300" />
                    <span className="text-sm font-semibold">Cadastro de produtos</span>
                  </Link>
                ) : null}
                {canCatalogo && firstCatalogHospitalId ? (
                  <Link
                    to={`/hospital/${firstCatalogHospitalId}/catalogo`}
                    className="flex flex-col gap-2 rounded-2xl border border-border/60 bg-card/80 p-4 shadow-sm transition duration-300 ease-out hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-md"
                  >
                    <BookOpen className="h-5 w-5 text-emerald-600 dark:text-emerald-300" />
                    <span className="text-sm font-semibold">Gerar catálogo</span>
                  </Link>
                ) : null}
                {canAccess("configuracoes") || canAccess("novo_produto") ? (
                  <Link
                    to="/cores"
                    className="flex flex-col gap-2 rounded-2xl border border-border/60 bg-card/80 p-4 shadow-sm transition duration-300 ease-out hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-md"
                  >
                    <Palette className="h-5 w-5 text-sky-600 dark:text-sky-300" />
                    <span className="text-sm font-semibold">Cores</span>
                  </Link>
                ) : null}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default PaginaInicial;
