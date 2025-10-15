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

# Build only auth-service and its dependencies
RUN npx turbo run build --filter=apps/auth-service...

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

# Copy built packages
COPY --from=builder /app/packages/db/dist ./packages/db/dist
COPY --from=builder /app/packages/db/prisma ./packages/db/prisma
COPY --from=builder /app/packages/db/package.json ./packages/db/package.json
COPY --from=builder /app/packages/auth/dist ./packages/auth/dist
COPY --from=builder /app/packages/auth/package.json ./packages/auth/package.json

USER authservice
EXPOSE 3000
ENV NODE_ENV=production
ENV PORT=3000
CMD ["node", "dist/index.js"]
