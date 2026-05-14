/** Prefixo único para filtrar mensagens na consola do Chrome (F12 → Consola). */
export const FLUX_CONSOLE_PREFIX = "[FluxCatalog]";

function logUnknown(label: string, reason: unknown): void {
  if (reason instanceof Error) {
    console.error(label, reason);
    if (reason.stack) console.error(`${FLUX_CONSOLE_PREFIX} stack:\n`, reason.stack);
    return;
  }
  try {
    console.error(label, reason, JSON.stringify(reason));
  } catch {
    console.error(label, reason);
  }
}

let installed = false;

/**
 * Regista erros globais na consola do browser:
 * - exceções não tratadas (`window` "error")
 * - Promises rejeitadas sem `.catch` (`unhandledrejection`)
 *
 * Idempotente: chamadas repetidas são ignoradas.
 */
export function installGlobalConsoleErrorReporting(): void {
  if (typeof window === "undefined" || installed) return;
  installed = true;

  window.addEventListener(
    "error",
    (event: ErrorEvent) => {
      console.groupCollapsed(`${FLUX_CONSOLE_PREFIX} window "error"`);
      console.error("message:", event.message);
      console.error("origem:", event.filename, "linha:", event.lineno, "coluna:", event.colno);
      logUnknown("error / reason:", event.error ?? event.message);
      console.groupEnd();
    },
    true,
  );

  window.addEventListener("unhandledrejection", (event: PromiseRejectionEvent) => {
    console.groupCollapsed(`${FLUX_CONSOLE_PREFIX} unhandledrejection`);
    logUnknown("reason:", event.reason);
    console.groupEnd();
  });
}
