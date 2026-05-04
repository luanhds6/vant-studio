#!/bin/sh
set -e
# Variáveis de ambiente do Easypanel (runtime) — o Vite não as vê no build, então injetamos aqui.
node -e "
const fs = require('fs');
const out = '/app/dist/env-config.js';
const env = {
  VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL || '',
  VITE_SUPABASE_ANON_KEY: process.env.VITE_SUPABASE_ANON_KEY || '',
};
fs.writeFileSync(out, 'window.__VITE_ENV__ = ' + JSON.stringify(env) + ';\\n', 'utf8');
"
exec "$@"
