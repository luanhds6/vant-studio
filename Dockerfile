# Estágio de build
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
# Use npm ci para instalações mais rápidas e consistentes em CI/CD
RUN npm ci
COPY . .
# Supabase: use variáveis de ambiente em *runtime* no Easypanel (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY).
# docker-entrypoint.sh gera dist/env-config.js antes do preview — não depende de build args.
RUN npm run build:prod

# Estágio de produção
FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
# Copie os artefatos de build do estágio anterior
COPY --from=builder /app/dist ./dist

# Arquivos de config necessários para o vite preview no runtime
COPY vite.config.ts tsconfig.json ./

COPY package*.json ./
# Instale dependências incluindo devDependencies (vite) para o preview
RUN npm ci --include=dev

COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN sed -i 's/\r$//' /docker-entrypoint.sh && chmod +x /docker-entrypoint.sh

# Easypanel (e similares) costumam injetar PORT; o proxy precisa apontar para a MESMA porta.
# Se não definir PORT no painel, usa 4173.
ENV PORT=4173
EXPOSE 4173

# Escuta em 0.0.0.0 — obrigatório atrás de proxy; porta via PORT ou 4173.
ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["sh", "-c", "exec npm run preview:prod -- --host 0.0.0.0 --port ${PORT:-4173}"]
