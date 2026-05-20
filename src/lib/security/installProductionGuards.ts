import { sanitizeForLog } from "@/lib/security/sanitize";

/**
 * Em produção, evita vazar tokens/URLs completas na consola do browser.
 */
export function installProductionConsoleGuards(): void {
  if (!import.meta.env.PROD || typeof console === "undefined") return;

  const wrap =
    (method: "error" | "warn" | "log") =>
    (...args: unknown[]) => {
      const sanitized = args.map((a) => sanitizeForLog(a));
      console[method](...sanitized);
    };

  console.error = wrap("error");
  console.warn = wrap("warn");
  console.log = wrap("log");
}
