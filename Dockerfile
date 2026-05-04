# Estágio de build
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
# Use npm ci para instalações mais rápidas e consistentes em CI/CD
RUN npm ci
COPY . .
# Build de produção (variáveis sensíveis: defina no Easypanel em Build Args / env)
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

# Porta padrão do `vite preview` (no Easypanel, mapeie o serviço para esta porta ou use PORT abaixo)
EXPOSE 4173

# Escuta em todas as interfaces para o proxy reverso do Easypanel
CMD [ "npm", "run", "preview:prod", "--", "--host", "0.0.0.0", "--port", "4173" ]
