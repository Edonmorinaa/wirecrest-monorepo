# ==============================
# Base image
# ==============================
FROM node:18-alpine AS base
WORKDIR /app

# Install minimal system dependencies
RUN apk add --no-cache libc6-compat bash

# Enable Corepack for Yarn 3
RUN corepack enable
RUN yarn config set nodeLinker node-modules

# ==============================
# Dependencies stage
# ==============================
FROM base AS deps

# Copy monorepo root files
COPY package.json yarn.lock turbo.json ./
COPY .yarnrc.yml ./

# Copy packages and apps needed for auth-service
COPY packages/auth ./packages/auth
COPY packages/db ./packages/db
COPY apps/auth-service/package.json ./apps/auth-service/

# Install dependencies (workspace-aware)
RUN yarn install --check-cache

# ==============================
# Build stage
# ==============================
FROM base AS builder

# Copy node_modules from deps; workspace-aware
COPY --from=deps /app/node_modules ./node_modules

# Copy source code
COPY packages ./packages
COPY apps/auth-service ./apps/auth-service
COPY package.json yarn.lock turbo.json ./
COPY .yarnrc.yml ./

# Generate Prisma client in db package
WORKDIR /app/packages/db
RUN npx prisma generate

# Build auth-service
WORKDIR /app/apps/auth-service
RUN yarn build

# ==============================
# Production stage
# ==============================
FROM node:18-alpine AS runner
WORKDIR /app

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 authservice

# Copy built app
COPY --from=builder --chown=authservice:nodejs /app/apps/auth-service/dist ./dist
COPY --from=builder --chown=authservice:nodejs /app/apps/auth-service/package.json ./package.json

# Copy production dependencies (includes Prisma client)
COPY --from=deps --chown=authservice:nodejs /app/node_modules ./node_modules

# Optionally copy Prisma schema if needed at runtime
COPY --from=builder --chown=authservice:nodejs /app/packages/db/prisma ./prisma

# Switch to non-root user
USER authservice

# Expose port
EXPOSE 3000
ENV NODE_ENV=production
ENV PORT=3000

# Optional healthcheck
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', res => process.exit(res.statusCode === 200 ? 0 : 1))"

# Start app
CMD ["node", "dist/index.js"]
