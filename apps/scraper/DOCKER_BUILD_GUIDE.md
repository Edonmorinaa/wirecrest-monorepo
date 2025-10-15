# Docker Build Guide for Scraper Service

This guide explains how to build and run the scraper service using Docker with Turborepo monorepo support.

## Prerequisites

- Docker installed on your system
- Access to the monorepo root directory
- Environment variables configured (see below)

## Building the Docker Image

**IMPORTANT**: The Docker build must be executed from the **monorepo root directory**, not from the `apps/scraper` directory.

### Build Command

```bash
# From the monorepo root (/Users/edonmorina/Desktop/WORK/PERSONAL/wirecrest-new)
docker build -f apps/scraper/Dockerfile -t wirecrest-scraper:latest .
```

### Why Build from Root?

The Dockerfile requires access to:
- Workspace dependencies (`packages/core`, `packages/db`, `packages/billing`, `packages/notifications`)
- Root `package.json`, `yarn.lock`, `turbo.json`, and `.yarnrc.yml`
- Turborepo build pipeline

## Running the Container

### Local Development

```bash
docker run -p 3000:3000 \
  -e DATABASE_URL="your_database_url" \
  -e APIFY_TOKEN="your_apify_token" \
  -e REDIS_URL="your_redis_url" \
  -e STRIPE_SECRET_KEY="your_stripe_key" \
  wirecrest-scraper:latest
```

### Using Environment File

```bash
docker run -p 3000:3000 --env-file apps/scraper/.env wirecrest-scraper:latest
```

## Required Environment Variables

The scraper service requires the following environment variables:

- `DATABASE_URL` - PostgreSQL connection string
- `APIFY_TOKEN` - Apify API token for web scraping
- `REDIS_URL` - Redis connection URL (for BullMQ job queue)
- `STRIPE_SECRET_KEY` - Stripe API secret key
- `PORT` - Port to run the service on (defaults to 3000)
- `NODE_ENV` - Set to `production` in Docker

## Health Check

The container includes a health check endpoint:

```bash
curl http://localhost:3000/health
```

The health check runs automatically every 30 seconds within the container.

## Docker Image Architecture

The Dockerfile uses a multi-stage build process:

1. **Base Stage**: Sets up Node.js 18 Alpine with Yarn configuration
2. **Dependencies Stage**: Installs all workspace dependencies
3. **Builder Stage**: Generates Prisma client and builds using Turborepo
4. **Runner Stage**: Creates minimal production image with only runtime dependencies

### Security Features

- Runs as non-root user (`scraperservice`)
- Uses Alpine Linux for minimal attack surface
- Production-optimized with only necessary dependencies

## Troubleshooting

### Build Fails: "Cannot find module"

**Solution**: Ensure you're building from the monorepo root directory, not from `apps/scraper`.

### Prisma Client Errors

**Solution**: The Dockerfile automatically generates the Prisma client during build. Ensure your `packages/db/prisma/schema.prisma` is up to date.

### Yarn Install Fails

**Solution**: 
- Clear Docker build cache: `docker build --no-cache -f apps/scraper/Dockerfile -t wirecrest-scraper:latest .`
- Ensure `yarn.lock` is committed and up to date

### Permission Errors in Container

**Solution**: The container runs as user `scraperservice` (UID 1001). Ensure any mounted volumes have appropriate permissions.

## Deployment

### Railway

Railway automatically detects the Dockerfile. Ensure:
1. Set the correct build context to the repository root
2. Configure environment variables in Railway dashboard
3. Railway will use the PORT environment variable automatically

### Docker Compose

Example `docker-compose.yml` for local testing:

```yaml
version: '3.8'
services:
  scraper:
    build:
      context: .
      dockerfile: apps/scraper/Dockerfile
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - APIFY_TOKEN=${APIFY_TOKEN}
      - REDIS_URL=${REDIS_URL}
      - STRIPE_SECRET_KEY=${STRIPE_SECRET_KEY}
      - NODE_ENV=production
    restart: unless-stopped
```

Run with:
```bash
# From monorepo root
docker-compose up -d
```

## Performance Optimization

The Dockerfile includes several optimizations:

- Layer caching for faster rebuilds
- Separate dependency installation stage
- Minimal production image (Node.js + compiled code only)
- Prisma client generated during build (not runtime)
- Turborepo build cache utilization

## Additional Notes

- The entry point is `dist/server.js` (not `dist/index.js`)
- Health checks are configured for container orchestration
- Model files directory (`/app/models`) is pre-created for NLP models
- All workspace packages are available at runtime in `/app/packages`

