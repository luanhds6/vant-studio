/// <reference types="vite/client" />

declare const __APP_VERSION__: string;

/** Preenchido em produção (Docker) via dist/env-config.js a partir das env do host. */
interface Window {
  __VITE_ENV__?: {
    VITE_SUPABASE_URL?: string;
    VITE_SUPABASE_ANON_KEY?: string;
  };
}
