# Multi-stage build for optimized production image
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
# Check https://github.com/nodejs/docker-node/tree/b4117f9333da4138b03a546ec926ef50a31506c3#nodealpine to understand why libc6-compat might be needed.
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy workspace configuration files
COPY package.json yarn.lock turbo.json ./
COPY yarn.lock* ./

# Copy workspace packages that auth-service depends on
COPY packages/auth ./packages/auth
COPY packages/db ./packages/db

# Copy auth-service package.json
COPY apps/auth-service/package.json ./apps/auth-service/

# Install dependencies
RUN yarn install --frozen-lockfile --production=false

# Build stage
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages ./packages
COPY apps/auth-service ./apps/auth-service
COPY package.json yarn.lock turbo.json ./

# Build the auth-service
WORKDIR /app/apps/auth-service
RUN yarn build

# Production stage
FROM base AS runner
WORKDIR /app

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 authservice

# Copy built application
COPY --from=builder --chown=authservice:nodejs /app/apps/auth-service/dist ./dist
COPY --from=builder --chown=authservice:nodejs /app/apps/auth-service/package.json ./package.json

# Copy only production dependencies
COPY --from=deps --chown=authservice:nodejs /app/node_modules ./node_modules

# Switch to non-root user
USER authservice

# Expose port (Railway will override this)
EXPOSE 3000

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Start the application
CMD ["node", "dist/index.js"]
