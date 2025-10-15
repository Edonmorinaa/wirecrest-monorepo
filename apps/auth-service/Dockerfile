# ==============================
# Base image
# ==============================
FROM node:18-alpine AS base
WORKDIR /app
RUN apk add --no-cache libc6-compat bash
RUN corepack enable
RUN yarn config set nodeLinker node-modules

# ==============================
# Dependencies
# ==============================
FROM base AS deps
COPY package.json yarn.lock turbo.json ./
COPY .yarnrc.yml ./
COPY packages/*/package.json ./packages/*/package.json
COPY apps/auth-service/package.json ./apps/auth-service/package.json
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
RUN npx prisma generate

# Build only auth-service and its dependencies using Turbo
WORKDIR /app
RUN npx turbo run build --filter=auth-service

# ==============================
# Production stage
# ==============================
FROM node:18-alpine AS runner
WORKDIR /app
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 authservice

# Copy built app and runtime deps
COPY --from=builder /app/apps/auth-service/dist ./dist
COPY --from=builder /app/apps/auth-service/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules

# Copy workspace packages for runtime
COPY --from=builder /app/packages ./packages

USER authservice
EXPOSE 3000
ENV NODE_ENV=production
ENV PORT=3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', res => process.exit(res.statusCode === 200 ? 0 : 1))"

CMD ["node", "dist/index.js"]
