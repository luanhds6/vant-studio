import { Navigate, useParams } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";
import { canDownloadCatalogPdf, getDefaultLandingPath } from "@/lib/routeAccess";

/** Permite a tela de catálogo/PDF a quem tem acesso ao módulo hospitais (inclui usuário comum com produtos). */
export function RequireGerarCatalogo({ children }: { children: React.ReactNode }) {
  const { hospitalId } = useParams();
  const canAccess = useAuthStore((s) => s.canAccess);

  if (!canDownloadCatalogPdf(canAccess)) {
    const to = hospitalId ? `/hospital/${hospitalId}` : getDefaultLandingPath(canAccess);
    return <Navigate to={to} replace />;
  }

  return <>{children}</>;
}
