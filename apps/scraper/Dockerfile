# Use Node.js 18 Alpine Linux as base image
FROM node:18-alpine

# Set working directory
WORKDIR /usr/src/app

# Copy package files first for better caching
COPY package*.json ./
COPY tsconfig.json ./

# Install all dependencies (including devDependencies needed for build)
RUN npm ci --silent

# Copy source code and build files
COPY src ./src
COPY declarations.d.ts ./

# Build the TypeScript application
RUN npm run build

# Remove devDependencies after build to reduce image size
RUN npm prune --production --silent && npm cache clean --force

# Create directory for model files if needed
RUN mkdir -p /usr/src/app/models

# Expose port (Railway will inject the PORT environment variable)
EXPOSE 3000

# Set environment variables with defaults for Railway
ENV NODE_ENV=production
ENV PORT=3000

# Note: Railway handles health checks externally, so we don't need a Docker HEALTHCHECK

# Start the application
CMD ["node", "dist/index.js"]