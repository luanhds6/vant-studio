import { useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { BrowserRouter, Route, Routes, Navigate, useParams } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import PaginaInicial from "./pages/PaginaInicial";
import HospitalsPage from "./pages/HospitalsPage";
import HospitalHub from "./pages/HospitalHub";
import ProductForm from "./pages/ProductForm";
import ProductCadastroPage from "./pages/ProductCadastroPage";
import CatalogPreview from "./pages/CatalogPreview";
import SettingsPage from "./pages/Settings";
import ProfilePage from "./pages/Profile";
import ColorsPage from "./pages/ColorsPage";
import Login from "./pages/Login";
import { ProtectedLayout } from "./components/layout/ProtectedRoute";
import { LegacyProductRedirect } from "./components/routes/LegacyProductRedirect";
import { RequireGerarCatalogo } from "./components/routes/RequireGerarCatalogo";
import { useAuthStore } from "./store/authStore";
import { useProductStore } from "./store/productStore";
import { PermissionKey } from "./lib/permissions";
import { canAccessModuloHospitais, canAccessRouteHome, getDefaultLandingPath } from "./lib/routeAccess";

const queryClient = new QueryClient();

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
  return <SettingsPage />;
};

const App = () => {
  const { canAccess, initialize: initAuth, isLoading: authLoading } = useAuthStore();
  const { initialize: initProducts, isLoading: productsLoading } = useProductStore();

  useEffect(() => {
    initAuth();
    initProducts();
  }, [initAuth, initProducts]);

  const landingPath = getDefaultLandingPath(canAccess);

  if (authLoading || productsLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} storageKey="vant-ui-theme">
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <Routes>
              <Route path="/login" element={<Login />} />

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
                <Route path="/cores" element={<ColorsPage />} />
                <Route path="/perfil" element={<ProfilePage />} />
              </Route>

              <Route path="*" element={<Navigate to={landingPath} replace />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;
