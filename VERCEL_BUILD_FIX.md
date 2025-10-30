# Fix Vercel Build Errors - Yarn 4 Workspace Issue

## Problem

Vercel is using Yarn 1 instead of Yarn 4, which doesn't support the `workspace:` protocol used in your monorepo.

## Solution: Enable Yarn 4 via Corepack

### Step 1: Update Build Command in Vercel Dashboard

Go to **Settings → General** and set:

**Build Command:**
```bash
corepack enable && corepack prepare yarn@4.0.2 --activate && cd ../.. && yarn install && cd ./packages/db && yarn prisma generate && cd ../.. && yarn turbo build --filter=@wirecrest/dashboard --force
```

**Install Command:**
```bash
corepack enable && corepack prepare yarn@4.0.2 --activate && cd ../.. && yarn install
```

**Alternative (Simpler) Build Command:**
If the above is too long, use Turbo to handle Prisma generation:
```bash
corepack enable && corepack prepare yarn@4.0.2 --activate && cd ../.. && yarn install && yarn turbo build --filter=@wirecrest/dashboard --force
```

But first, ensure your `apps/dashboard/package.json` build script handles Prisma:
```json
"build": "prisma generate --schema=../../packages/db/prisma/schema.prisma && next build"
```

### Step 2: Add Environment Variables

In **Settings → Environment Variables**, add:

```bash
ENABLE_EXPERIMENTAL_COREPACK=1
NODE_VERSION=20
```

### Step 3: Update Root Directory

Ensure **Root Directory** is set to: `apps/dashboard`

## Alternative Solution: Use Install Command to Enable Corepack

If the build command approach doesn't work, create a `.vercelrc` or use a build script:

**Install Command:**
```bash
corepack enable && corepack prepare yarn@4.0.2 --activate && cd ../.. && yarn install
```

**Build Command:**
```bash
cd ../.. && yarn turbo build --filter=@wirecrest/dashboard --force
```

## Why This Works

1. `corepack enable` - Enables Corepack (Node.js package manager manager)
2. `corepack prepare yarn@4.0.2 --activate` - Downloads and activates Yarn 4.0.2
3. `cd ../..` - Moves to monorepo root (from `apps/dashboard`)
4. `yarn install` - Installs all workspace dependencies with Yarn 4
5. Turbo handles the build order automatically (packages before apps)

## Verification

After deployment, check the build logs:
- Should see: "Corepack enabled"
- Should see: "Yarn version 4.0.2"
- Should NOT see: "Yarn version 1.x.x"
- Should see workspace packages being built before dashboard

## If Still Having Issues

### Option A: Add .nvmrc or packageManager
Create `.nvmrc` in root:
```
20
```

Ensure `package.json` has:
```json
"packageManager": "yarn@4.0.2"
```

### Option B: Use a Build Script
Create `scripts/vercel-build.sh` in root:

```bash
#!/bin/bash
set -e

corepack enable
corepack prepare yarn@4.0.2 --activate

# Install dependencies
yarn install

# Generate Prisma client
cd ./packages/db
yarn prisma generate
cd ../..

# Build dashboard
yarn turbo build --filter=@wirecrest/dashboard --force
```

Then use build command:
```bash
chmod +x scripts/vercel-build.sh && ./scripts/vercel-build.sh
```

