// Em dev, o Vite usa o .env. No Docker, docker-entrypoint.sh sobrescreve dist/env-config.js com as variáveis do painel.
window.__VITE_ENV__ = window.__VITE_ENV__ || {};
