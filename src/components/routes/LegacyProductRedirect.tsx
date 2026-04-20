import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useProductStore } from "@/store/productStore";
import { useAuthStore } from "@/store/authStore";
import { getDefaultLandingPath } from "@/lib/routeAccess";

/** Redireciona `/produto/:id` antigo para a rota com hospital */
export function LegacyProductRedirect() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const getProduct = useProductStore((s) => s.getProduct);

  useEffect(() => {
    const landing = () => getDefaultLandingPath(useAuthStore.getState().canAccess);
    if (!id) {
      navigate(landing(), { replace: true });
      return;
    }
    const p = getProduct(id);
    if (p) navigate(`/hospital/${p.hospitalId}/produto/${id}`, { replace: true });
    else navigate(landing(), { replace: true });
  }, [id, getProduct, navigate]);

  return null;
}
