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

function isExtensionError(error: any): boolean {
  if (!error) return false;
  const errorStr = String(error).toLowerCase();
  
  if (
    errorStr.includes("metamask") ||
    errorStr.includes("inpage.js") ||
    errorStr.includes("contentscript") ||
    errorStr.includes("chrome-extension://") ||
    errorStr.includes("extension-context") ||
    errorStr.includes("maxlistenersexceededwarning") ||
    errorStr.includes("objectmultiplex") ||
    errorStr.includes("liveness")
  ) {
    return true;
  }

  if (error instanceof Error) {
    const stack = error.stack?.toLowerCase() || "";
    const message = error.message?.toLowerCase() || "";
    if (
      stack.includes("chrome-extension://") ||
      stack.includes("moz-extension://") ||
      stack.includes("inpage.js") ||
      stack.includes("contentscript.js") ||
      message.includes("metamask") ||
      message.includes("maxlistenersexceededwarning") ||
      message.includes("objectmultiplex")
    ) {
      return true;
    }
  }

  try {
    const stringified = JSON.stringify(error).toLowerCase();
    if (
      stringified.includes("metamask") || 
      stringified.includes("chrome-extension") ||
      stringified.includes("objectmultiplex")
    ) {
      return true;
    }
  } catch {}

  return false;
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

  // Intercept and suppress console.warn / console.error from extension scripts
  const originalWarn = console.warn;
  const originalError = console.error;

  console.warn = (...args: any[]) => {
    const msg = args.map(a => String(a)).join(" ");
    if (isExtensionError(msg)) {
      return; // silence extension warning
    }
    originalWarn.apply(console, args);
  };

  console.error = (...args: any[]) => {
    const msg = args.map(a => String(a)).join(" ");
    if (isExtensionError(msg)) {
      return; // silence extension error
    }
    originalError.apply(console, args);
  };

  window.addEventListener(
    "error",
    (event: ErrorEvent) => {
      const file = event.filename || "";
      const msg = event.message || "";
      if (
        file.includes("chrome-extension://") ||
        file.includes("inpage.js") ||
        file.includes("contentscript.js") ||
        msg.toLowerCase().includes("metamask") ||
        isExtensionError(event.error)
      ) {
        event.preventDefault(); // Stop browser from logging it
        return;
      }

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
    if (isExtensionError(event.reason)) {
      event.preventDefault(); // Stop browser from logging the uncaught promise rejection
      return;
    }
    console.groupCollapsed(`${VANT_CONSOLE_PREFIX} unhandledrejection`);
    logUnknown("reason:", event.reason);
    console.groupEnd();
  });
}
