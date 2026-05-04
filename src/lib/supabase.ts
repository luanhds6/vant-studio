import { createClient } from '@supabase/supabase-js';
import type { AuthError } from '@supabase/supabase-js';

const runtime = typeof window !== 'undefined' ? window.__VITE_ENV__ : undefined;
const supabaseUrl = runtime?.VITE_SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = runtime?.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables. Please check your .env file.');
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '');

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
