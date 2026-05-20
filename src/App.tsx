import { lazy, Suspense, useEffect, useLayoutEffect, useMemo } from "react";
import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { VANT_CONSOLE_PREFIX } from "@/lib/globalConsoleErrorReporting";
import { ThemeProvider } from "next-themes";
import { BrowserRouter, Route, Routes, Navigate, useParams } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Login from "./pages/Login";
import { ProtectedLayout } from "./components/layout/ProtectedRoute";
import { LegacyProductRedirect } from "./components/routes/LegacyProductRedirect";
import { RequireGerarCatalogo } from "./components/routes/RequireGerarCatalogo";
import { useAuthStore } from "./store/authStore";
import { useProductStore } from "./store/productStore";
import { PermissionKey } from "./lib/permissions";
import { canAccessModuloHospitais, canAccessRouteHome, getDefaultLandingPath } from "./lib/routeAccess";

const PaginaInicial = lazy(() => import("./pages/PaginaInicial"));
const HospitalsPage = lazy(() => import("./pages/HospitalsPage"));
const HospitalHub = lazy(() => import("./pages/HospitalHub"));
const ProductForm = lazy(() => import("./pages/ProductForm"));
const CatalogPreview = lazy(() => import("./pages/CatalogPreview"));
const SettingsPage = lazy(() => import("./pages/Settings"));
const ProfilePage = lazy(() => import("./pages/Profile"));
const FabricColorsPage = lazy(() => import("./pages/FabricColorsPage"));
const ProductCadastroPage = lazy(() => import("./pages/ProductCadastroPage"));
const ContractsPage = lazy(() => import("./pages/ContractsPage"));
const ContractSignPage = lazy(() => import("./pages/ContractSignPage"));

function RouteFallback() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center p-8" role="status" aria-label="A carregar">
      <div className="h-9 w-9 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
  );
}

const queryCache = new QueryCache({
  onError: (error, query) => {
    console.groupCollapsed(`${VANT_CONSOLE_PREFIX} React Query — query`);
    console.error("queryKey:", query.queryKey);
    console.error(error);
    if (error instanceof Error && error.stack) console.error(error.stack);
    console.groupEnd();
  },
});

const mutationCache = new MutationCache({
  onError: (error, _variables, _context, mutation) => {
    console.groupCollapsed(`${VANT_CONSOLE_PREFIX} React Query — mutation`);
    console.error("mutationKey:", mutation.options.mutationKey);
    console.error(error);
    if (error instanceof Error && error.stack) console.error(error.stack);
    console.groupEnd();
  },
});

const queryClient = new QueryClient({
  queryCache,
  mutationCache,
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
    },
  },
});

const RequirePermission = ({
  permission,
  fallback,
  children,
}: {
  permission: PermissionKey;
  fallback?: string;
  children: React.ReactNode;
}) => {
  const canAccess = useAuthStore((state) => state.canAccess);
  const to = fallback ?? getDefaultLandingPath(canAccess);
  if (!canAccess(permission)) return <Navigate to={to} replace />;
  return <>{children}</>;
};

const RedirectCadastroProdutosFromHospital = () => {
  const { hospitalId } = useParams();
  const to = hospitalId
    ? `/cadastro-produtos?hospital=${encodeURIComponent(hospitalId)}`
    : "/cadastro-produtos";
  return <Navigate to={to} replace />;
};

/** Cadastro com busca/QR: criar (novo produto) ou editar (produtos). */
const RequireNovoOuProdutos = ({ children }: { children: React.ReactNode }) => {
  const canAccess = useAuthStore((s) => s.canAccess);
  const to = getDefaultLandingPath(canAccess);
  if (!canAccess("novo_produto") && !canAccess("produtos")) {
    return <Navigate to={to} replace />;
  }
  return <>{children}</>;
};

const SettingsRouteGate = () => {
  const canAccess = useAuthStore((s) => s.canAccess);
  const landingPath = getDefaultLandingPath(canAccess);
  if (!canAccess("configuracoes") && !canAccess("usuarios")) {
    return <Navigate to={landingPath} replace />;
  }
  return (
    <Suspense fallback={<RouteFallback />}>
      <SettingsPage />
    </Suspense>
  );
};

const App = () => {
  const canAccess = useAuthStore((s) => s.canAccess);
  const currentUser = useAuthStore((s) => s.currentUser);
  const initAuth = useAuthStore((s) => s.initialize);
  const authLoading = useAuthStore((s) => s.isLoading);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const initProducts = useProductStore((s) => s.initialize);
  const resetProductSession = useProductStore((s) => s.resetSession);

  useEffect(() => {
    void initAuth();
  }, [initAuth]);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      resetProductSession();
    }
  }, [authLoading, isAuthenticated, resetProductSession]);

  useLayoutEffect(() => {
    if (authLoading || !isAuthenticated) return;
    useProductStore.setState({ isLoading: true });
    void initProducts();
  }, [authLoading, isAuthenticated, initProducts]);

  const landingPath = useMemo(
    () => getDefaultLandingPath(canAccess),
    [canAccess, currentUser],
  );

  if (authLoading) {
    return (
      <div className="relative flex h-screen w-screen items-center justify-center overflow-hidden bg-gradient-to-br from-sky-50 via-violet-50/80 to-orange-50/90 dark:from-slate-950 dark:via-violet-950/40 dark:to-slate-950">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,hsl(210_90%_88%/0.35),transparent_50%)] dark:bg-[radial-gradient(circle_at_30%_20%,hsl(260_40%_30%/0.25),transparent_50%)]" />
        <div className="relative flex w-full max-w-sm flex-col gap-4 rounded-2xl border border-white/60 bg-white/92 p-8 shadow-xl shadow-slate-200/50 dark:border-white/10 dark:bg-slate-900/85 dark:shadow-black/40 md:bg-white/70 md:backdrop-blur-xl md:dark:bg-slate-900/60">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <div className="space-y-2">
            <div className="h-3 w-3/4 animate-pulse rounded-lg bg-muted/80" />
            <div className="h-3 w-1/2 animate-pulse rounded-lg bg-muted/60" />
            <div className="h-3 w-[82%] animate-pulse rounded-lg bg-muted/50" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} storageKey="vant-ui-theme">
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <Suspense fallback={<RouteFallback />}>
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/contrato/assinar/:id" element={<ContractSignPage />} />

                <Route element={<ProtectedLayout />}>
                  <Route
                    path="/"
                    element={
                      canAccessRouteHome(canAccess) ? (
                        <PaginaInicial />
                      ) : (
                        <Navigate to={landingPath} replace />
                      )
                    }
                  />
                  <Route
                    path="/hospitais"
                    element={
                      canAccessModuloHospitais(canAccess) ? (
                        <HospitalsPage />
                      ) : (
                        <Navigate to={landingPath} replace />
                      )
                    }
                  />
                  <Route
                    path="/hospital/:hospitalId"
                    element={
                      canAccessModuloHospitais(canAccess) ? (
                        <HospitalHub />
                      ) : (
                        <Navigate to={landingPath} replace />
                      )
                    }
                  />

                  <Route
                    path="/cadastro-produtos"
                    element={
                      <RequireNovoOuProdutos>
                        <ProductCadastroPage />
                      </RequireNovoOuProdutos>
                    }
                  />
                  <Route
                    path="/hospital/:hospitalId/cadastro-produtos"
                    element={
                      <RequireNovoOuProdutos>
                        <RedirectCadastroProdutosFromHospital />
                      </RequireNovoOuProdutos>
                    }
                  />
                  <Route
                    path="/hospital/:hospitalId/produto/novo"
                    element={
                      <RequirePermission permission="novo_produto" fallback={landingPath}>
                        <ProductForm />
                      </RequirePermission>
                    }
                  />
                  <Route
                    path="/hospital/:hospitalId/produto/:id"
                    element={
                      <RequirePermission permission="produtos" fallback={landingPath}>
                        <ProductForm />
                      </RequirePermission>
                    }
                  />

                  <Route
                    path="/hospital/:hospitalId/catalogo"
                    element={
                      <RequireGerarCatalogo>
                        <CatalogPreview />
                      </RequireGerarCatalogo>
                    }
                  />

                  <Route path="/catalogo" element={<Navigate to="/" replace />} />
                  <Route path="/produto/novo" element={<Navigate to="/" replace />} />
                  <Route path="/produto/:id" element={<LegacyProductRedirect />} />

                  <Route path="/config" element={<SettingsRouteGate />} />
                  <Route path="/cores" element={<FabricColorsPage />} />
                  <Route path="/perfil" element={<ProfilePage />} />
                  
                  <Route 
                    path="/contratos" 
                    element={
                      <RequirePermission permission="configuracoes" fallback={landingPath}>
                        <ContractsPage />
                      </RequirePermission>
                    } 
                  />
                </Route>

                <Route path="*" element={<Navigate to={landingPath} replace />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;
