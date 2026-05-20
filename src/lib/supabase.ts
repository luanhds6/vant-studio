import { createClient } from '@supabase/supabase-js';
import type { AuthError } from '@supabase/supabase-js';
import { getPublicSupabaseConfig, isSupabaseConfigured } from '@/lib/security/env';

const { url: supabaseUrl, anonKey: supabaseAnonKey } = getPublicSupabaseConfig();

if (!isSupabaseConfigured()) {
  console.error(
    'Variáveis Supabase em falta. Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no .env ou no painel de deploy.',
  );
}

/** Alinhado ao timeout de escrita de produtos na store; aborta o fetch para não ficar «pendurado» sem rejeitar. */
const SUPABASE_FETCH_TIMEOUT_MS = 200_000;

function createFetchWithDeadline(baseFetch: typeof fetch, timeoutMs: number): typeof fetch {
  return (input: RequestInfo | URL, init?: RequestInit) => {
    const as = AbortSignal as typeof AbortSignal & {
      timeout?: (ms: number) => AbortSignal;
      any?: (signals: AbortSignal[]) => AbortSignal;
    };

    if (typeof as.timeout === "function") {
      const deadline = as.timeout(timeoutMs);
      const merged =
        init?.signal && typeof as.any === "function"
          ? as.any([init.signal, deadline])
          : init?.signal ?? deadline;
      return baseFetch(input, { ...init, signal: merged });
    }

    const ctrl = new AbortController();
    const tid = setTimeout(() => ctrl.abort(), timeoutMs);
    if (!init?.signal) {
      return baseFetch(input, { ...init, signal: ctrl.signal }).finally(() => clearTimeout(tid));
    }
    return baseFetch(input, init).finally(() => clearTimeout(tid));
  };
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
  },
  global: {
    fetch: createFetchWithDeadline(globalThis.fetch.bind(globalThis), SUPABASE_FETCH_TIMEOUT_MS),
  },
});

/** Erros típicos quando o refresh token no storage já não existe no servidor (troca de projeto, sessão revogada, etc.). */
export function isInvalidStoredSessionError(
  error: AuthError | Error | null | undefined
): boolean {
  if (!error) return false;
  const msg = (error.message || '').toLowerCase();
  const status = 'status' in error ? (error as AuthError).status : undefined;
  if (status === 400 || status === 401) return true;
  return (
    msg.includes('refresh token') ||
    msg.includes('invalid refresh') ||
    msg.includes('jwt expired') ||
    msg.includes('invalid jwt')
  );
}

/**
 * Remove tokens persistidos inválidos e sincroniza o cliente, para evitar /token?grant_type=refresh_token em loop (400).
 */
export async function clearInvalidSupabaseSession(): Promise<void> {
  if (typeof window !== 'undefined' && window.localStorage) {
    for (const key of Object.keys(window.localStorage)) {
      if (/^sb-.+-auth-token/.test(key)) {
        window.localStorage.removeItem(key);
      }
    }
  }
  try {
    await supabase.auth.signOut({ scope: 'local' });
  } catch {
    /* ignore */
  }
}

/**
 * Garante sessão válida antes de invocar Edge Functions.
 * O cliente (`fetchWithAuth`) envia automaticamente `apikey` + `Authorization: Bearer <access_token>`.
 */
export async function getSessionAccessTokenOrThrow(
  message = 'Sessão expirada. Entre novamente.'
): Promise<string> {
  let {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) {
    const { data, error } = await supabase.auth.refreshSession();
    if (error || !data.session?.access_token) {
      throw new Error(message);
    }
    session = data.session;
  }
  return session.access_token;
}
