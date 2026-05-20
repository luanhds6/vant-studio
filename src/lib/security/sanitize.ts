/** Padrões que não devem aparecer em logs, toasts ou relatórios de erro no cliente. */
const JWT_PATTERN = /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g;
const BEARER_PATTERN = /Bearer\s+[A-Za-z0-9._-]+/gi;
const ANON_KEY_IN_QUERY = /(apikey|anon[_-]?key|service[_-]?role)=[^&\s]+/gi;

function maskSupabaseHost(url: string): string {
  try {
    const u = new URL(url);
    return `${u.protocol}//${u.hostname}/***`;
  } catch {
    return "[url-supabase-oculta]";
  }
}

/**
 * Remove ou ofusca credenciais e URLs sensíveis antes de exibir na consola ou em mensagens genéricas.
 */
export function sanitizeForLog(value: unknown): unknown {
  if (value == null) return value;

  if (typeof value === "string") {
    let s = value;
    s = s.replace(JWT_PATTERN, "[jwt-oculto]");
    s = s.replace(BEARER_PATTERN, "Bearer [oculto]");
    s = s.replace(ANON_KEY_IN_QUERY, "$1=[oculto]");
    if (/supabase\.co/i.test(s)) {
      s = s.replace(/https?:\/\/[^\s/]+\.supabase\.co[^\s]*/gi, (m) => maskSupabaseHost(m.split(/[?#]/)[0] ?? m));
    }
    return s;
  }

  if (value instanceof Error) {
    return {
      name: value.name,
      message: sanitizeForLog(value.message),
      stack: typeof value.stack === "string" ? sanitizeForLog(value.stack) : undefined,
    };
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeForLog(item));
  }

  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      const keyLower = k.toLowerCase();
      if (
        keyLower.includes("password") ||
        keyLower.includes("secret") ||
        keyLower.includes("service_role") ||
        keyLower === "apikey" ||
        keyLower.includes("anon_key") ||
        keyLower.includes("authorization")
      ) {
        out[k] = "[oculto]";
      } else {
        out[k] = sanitizeForLog(v);
      }
    }
    return out;
  }

  return value;
}

/** Mensagem segura para o utilizador (sem detalhes de infraestrutura). */
export function toSafeUserMessage(
  fallback: string,
  detail?: string | null,
): string {
  if (!detail || import.meta.env.PROD) return fallback;
  const safe = String(sanitizeForLog(detail));
  return safe.length > 200 ? fallback : safe;
}
