/**
 * Configuração pública do Supabase (URL + anon key).
 * A anon key é exposta no browser por design; a proteção real é RLS + Edge Functions com service role no servidor.
 */

export interface PublicSupabaseConfig {
  url: string;
  anonKey: string;
}

function readRuntimeEnv(): Record<string, string | undefined> | undefined {
  if (typeof window === "undefined") return undefined;
  return window.__VITE_ENV__;
}

function assertNoServiceRoleInClient(): void {
  const forbiddenKeys = [
    "VITE_SUPABASE_SERVICE_ROLE_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
    "SERVICE_ROLE_KEY",
  ];
  for (const key of forbiddenKeys) {
    const val = (import.meta.env as Record<string, string | undefined>)[key];
    if (val && String(val).trim().length > 0) {
      throw new Error(
        "Chave de serviço (service_role) detectada no cliente. Remova-a do .env — use apenas nas Edge Functions.",
      );
    }
  }
}

export function getPublicSupabaseConfig(): PublicSupabaseConfig {
  assertNoServiceRoleInClient();
  const runtime = readRuntimeEnv();
  const url = (runtime?.VITE_SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL || "").trim();
  const anonKey = (
    runtime?.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY || ""
  ).trim();
  return { url, anonKey };
}

export function isSupabaseConfigured(): boolean {
  const { url, anonKey } = getPublicSupabaseConfig();
  return Boolean(url && anonKey);
}
