# Scraper Dockerfile Update Summary

## Changes Made

The scraper Dockerfile has been updated to match the auth-service pattern with the following improvements:

### ✅ Multi-Stage Build Architecture
- **Base Stage**: Node.js 18 Alpine with Yarn 4 configuration
- **Dependencies Stage**: Installs workspace dependencies efficiently
- **Builder Stage**: Compiles TypeScript using Turborepo
- **Runner Stage**: Minimal production image

### ✅ Monorepo/Turborepo Support
- Properly configured for Yarn workspaces
- Uses Turborepo's `--filter=scraper` for optimized builds
- Includes all required workspace packages:
  - `@wirecrest/core`
  - `@wirecrest/db` 
  - `@wirecrest/billing`
  - `@wirecrest/notifications`

### ✅ Security Enhancements
- Runs as non-root user (`scraperservice` with UID 1001)
- Uses Alpine Linux for minimal attack surface
- Follows Docker security best practices

### ✅ Production Optimizations
- Layer caching for faster rebuilds
- Prisma client generation during build (not runtime)
- Workspace packages available at runtime
- Health check endpoint configured

### ✅ Configuration Updates
- Entry point: `dist/server.js` (matching package.json)
- Port: 3000 (configurable via ENV)
- Health check: Every 30s on `/health` endpoint
- Model directory pre-created at `/app/models`

## Build Instructions

**CRITICAL**: Build from monorepo root, not from `apps/scraper`:

```bash
# From /Users/edonmorina/Desktop/WORK/PERSONAL/wirecrest-new
docker build -f apps/scraper/Dockerfile -t wirecrest-scraper:latest .
```

## ⚠️ Known Issues to Address

### 1. Missing `@wirecrest/feature-flags` Package

The scraper imports from `@wirecrest/feature-flags` but this package doesn't exist in the monorepo:

**Files affected:**
- `src/services/FeatureFlagService.ts` (lines 3-9)
- `src/core/services/BackendOrchestrator.ts` (line 11)

**Imports:**
```typescript
import { 
  createSimpleFeatureChecker,
  createStripeEntitlementsService,
  SimpleFeatureChecker,
  StripeEntitlementsService,
  FeatureKey,
  Feature
} from '@wirecrest/feature-flags';
```

**Resolution needed:**
1. Either create the `@wirecrest/feature-flags` package, OR
2. Move this functionality to `@wirecrest/billing` and update imports, OR
3. Remove these imports if no longer needed

**Current state:** The Dockerfile will build successfully up to the TypeScript compilation, then fail with "Cannot find module '@wirecrest/feature-flags'".

### 2. Workspace Dependencies

All required packages are now included in the Dockerfile. If you add new workspace dependencies to scraper, remember to:
1. Add to `apps/scraper/package.json`
2. Add the package's `package.json` to the deps stage in the Dockerfile (line 16-20)

## Testing the Build

Once the `@wirecrest/feature-flags` issue is resolved:

```bash
# Test build (from monorepo root)
docker build -f apps/scraper/Dockerfile -t wirecrest-scraper:test .

# Test run
docker run -p 3000:3000 --env-file apps/scraper/.env wirecrest-scraper:test

# Test health check
curl http://localhost:3000/health
```

## Migration from Old Dockerfile

### Old Approach (npm-based, single stage)
- Used `npm ci` for installation
- Single-stage build (less efficient)
- Copied from `/usr/src/app`
- Entry: `dist/index.js`
- No workspace support

### New Approach (Yarn 4 + Turborepo, multi-stage)
- Uses Yarn workspaces with monorepo
- Multi-stage build (smaller final image)
- Turborepo for optimized builds
- Entry: `dist/server.js`
- Full workspace package support
- Prisma client pre-generated

## Additional Resources

See `DOCKER_BUILD_GUIDE.md` for:
- Detailed build instructions
- Environment variable configuration
- Deployment guides (Railway, Docker Compose)
- Troubleshooting tips
- Performance optimization notes

