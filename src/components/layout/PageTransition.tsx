import { Outlet, useLocation } from "react-router-dom";

/**
 * Transição leve entre rotas (CSS apenas — sem biblioteca de animação).
 * Respeita prefers-reduced-motion via motion-safe.
 */
export function PageTransition() {
  const location = useLocation();
  const routeKey = `${location.pathname}${location.search}`;

  return (
    <div
      key={routeKey}
      role="presentation"
      className="w-full min-w-0 motion-safe:animate-vant-fade-up"
    >
      <Outlet />
    </div>
  );
}
