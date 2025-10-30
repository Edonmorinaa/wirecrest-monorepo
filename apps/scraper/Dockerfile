# ==============================
# Base image
# ==============================
FROM node:18-alpine AS base
WORKDIR /app
RUN apk add --no-cache libc6-compat bash openssl curl
RUN corepack enable
RUN yarn config set nodeLinker node-modules

# ==============================
# Dependencies
# ==============================
FROM base AS deps
COPY package.json yarn.lock turbo.json ./
COPY .yarnrc.yml ./
# Copy workspace manifest to allow Yarn to resolve workspaces
COPY packages ./packages
COPY apps/scraper/package.json ./apps/scraper/package.json
RUN yarn install --check-cache

# ==============================
# Build stage
# ==============================
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY packages ./packages
COPY apps ./apps
COPY package.json yarn.lock turbo.json ./
COPY .yarnrc.yml ./

# Generate Prisma client first
WORKDIR /app/packages/db
ARG DATABASE_URL
ENV DATABASE_URL=${DATABASE_URL:-"postgresql://placeholder:placeholder@placeholder:5432/placeholder"}
RUN npx prisma generate

# Build only scraper and its dependencies using Turbo
WORKDIR /app
RUN npx turbo run build --filter=scraper

# ==============================
# Production stage
# ==============================
FROM node:18-alpine AS runner
WORKDIR /app
RUN apk add --no-cache curl && addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 scraperservice

# Create directory for model files if needed
RUN mkdir -p /app/models

# Copy built app and runtime deps
COPY --from=builder /app/apps/scraper/dist ./dist
COPY --from=builder /app/apps/scraper/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules

# Copy workspace packages for runtime
COPY --from=builder /app/packages ./packages

USER scraperservice
EXPOSE 8080
ENV NODE_ENV=production
ENV PORT=8080

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -fsS "http://localhost:${PORT}/health" || exit 1

CMD ["node", "dist/server.js"]