# Build from repo root: docker-compose uses context . and dockerfile backend/Dockerfile
FROM node:20-alpine AS base
WORKDIR /app

FROM base AS deps
COPY package.json package-lock.json* ./
COPY backend/package.json ./backend/
COPY frontend/package.json ./frontend/
COPY shared/package.json ./shared/
RUN npm ci

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/package.json ./
COPY backend ./backend
COPY shared ./shared
WORKDIR /app/shared
RUN npm run build
WORKDIR /app/backend
RUN npm run build

FROM base AS runner
ENV NODE_ENV=production
WORKDIR /app/backend
COPY --from=builder /app/backend/dist ./dist
COPY --from=builder /app/backend/package.json ./
# Workspace deps are hoisted to root; copy root node_modules and shared for @gpu-cloud/shared resolution
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/shared ../shared
EXPOSE 4000
CMD ["node", "dist/index.js"]
