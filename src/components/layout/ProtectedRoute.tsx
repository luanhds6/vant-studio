import { Navigate, useLocation } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";
import { useProductStore } from "@/store/productStore";
import { MandatoryPasswordChangeModal } from "@/components/auth/MandatoryPasswordChangeModal";
import { AppLayout } from "./AppLayout";
import { PageTransition } from "./PageTransition";

function ProtectedDataLoading() {
  return (
    <div className="relative flex min-h-[50vh] flex-col items-center justify-center gap-4 px-4">
      <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      <p className="text-center text-sm text-muted-foreground">A sincronizar dados…</p>
    </div>
  );
}

export function ProtectedLayout() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const productsLoading = useProductStore((state) => state.isLoading);
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const inner = productsLoading ? <ProtectedDataLoading /> : <PageTransition />;

  return (
    <>
      <MandatoryPasswordChangeModal />
      <AppLayout>{inner}</AppLayout>
    </>
  );
}
