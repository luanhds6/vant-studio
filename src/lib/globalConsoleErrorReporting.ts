import { sanitizeForLog } from "@/lib/security/sanitize";

/** Prefixo único para filtrar mensagens na consola do Chrome (F12 → Consola). */
export const VANT_CONSOLE_PREFIX = "[VantStudioCatalogo]";

/** @deprecated Use VANT_CONSOLE_PREFIX */
export const FLUX_CONSOLE_PREFIX = VANT_CONSOLE_PREFIX;

function logUnknown(label: string, reason: unknown): void {
  const safe = sanitizeForLog(reason);
  if (safe instanceof Object && "name" in safe && "message" in safe) {
    console.error(label, safe);
    const stack = (safe as { stack?: string }).stack;
    if (stack) console.error(`${VANT_CONSOLE_PREFIX} stack:\n`, stack);
    return;
  }
  try {
    console.error(label, safe, JSON.stringify(safe));
  } catch {
    console.error(label, safe);
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
      console.groupCollapsed(`${VANT_CONSOLE_PREFIX} window "error"`);
      console.error("message:", sanitizeForLog(event.message));
      console.error(
        "origem:",
        sanitizeForLog(event.filename),
        "linha:",
        event.lineno,
        "coluna:",
        event.colno,
      );
      logUnknown("error / reason:", event.error ?? event.message);
      console.groupEnd();
    },
    true,
  );

  window.addEventListener("unhandledrejection", (event: PromiseRejectionEvent) => {
    console.groupCollapsed(`${VANT_CONSOLE_PREFIX} unhandledrejection`);
    logUnknown("reason:", event.reason);
    console.groupEnd();
  });
}
