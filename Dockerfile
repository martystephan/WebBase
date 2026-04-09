# syntax=docker/dockerfile:1.7

# ─── Build stage ────────────────────────────────────────────────────────────
# Installs all deps (incl. dev) and builds the Vite frontend into dist/.
FROM node:22-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# ─── Runtime stage ──────────────────────────────────────────────────────────
# Production-only deps + the built frontend + the server source.
# The server is run via tsx (now a runtime dep) and serves dist/ directly.
FROM node:22-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=5174

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=builder /app/dist ./dist
COPY server ./server

EXPOSE 5174

# Tiny healthcheck — hits the API and expects a 4xx (no body) or 2xx response.
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget -q --spider http://127.0.0.1:${PORT}/ || exit 1

CMD ["npm", "start"]
