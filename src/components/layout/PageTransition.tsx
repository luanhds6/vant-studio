import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Outlet, useLocation } from "react-router-dom";

/**
 * Transição suave entre rotas (fade + leve deslocamento).
 * Respeita prefers-reduced-motion; ~220ms entrada / ~160ms saída.
 */
export function PageTransition() {
  const location = useLocation();
  const reduceMotion = useReducedMotion();
  const routeKey = `${location.pathname}${location.search}`;

  const enter = reduceMotion
    ? { duration: 0 }
    : { duration: 0.22, ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number] };

  const leave = reduceMotion
    ? { duration: 0 }
    : { duration: 0.16, ease: [0.4, 0, 1, 1] as [number, number, number, number] };

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={routeKey}
        role="presentation"
        className="w-full min-w-0"
        transition={enter}
        initial={reduceMotion ? false : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -6, transition: leave }}
      >
        <Outlet />
      </motion.div>
    </AnimatePresence>
  );
}
