# Railway Deployment Guide for Scraper Service

## Problem: Railway Using Railpack Instead of Dockerfile

Railway's automatic detection (Railpack) tries to build the service as a Node.js app, which fails because it needs to use the Docker build process.

## Solution: Configure Railway to Use Dockerfile

### Option 1: Using railway.json (Recommended)

A `railway.json` file has been created in `apps/scraper/railway.json`. This tells Railway to use Docker instead of Railpack.

**Important Railway Dashboard Settings:**

1. **Root Directory**: Set to the **monorepo root** (empty or `/`)
   - NOT `apps/scraper`
   - The Dockerfile needs access to the entire monorepo

2. **Service Path/Watch Paths**: Configure in Railway dashboard
   - Go to your service settings
   - Under "Service" → "Settings" → "Build"
   - Set **Root Directory**: Leave empty or set to `/`
   - Set **Dockerfile Path**: `apps/scraper/Dockerfile`

### Option 2: Railway Dashboard Configuration (If railway.json doesn't work)

If the `railway.json` approach doesn't work, configure directly in Railway:

1. Go to your scraper service in Railway dashboard
2. Click **Settings** → **Build**
3. Set these values:
   - **Builder**: `Dockerfile`
   - **Dockerfile Path**: `apps/scraper/Dockerfile`
   - **Docker Build Context**: `/` (root directory)

4. Click **Settings** → **Deploy**
   - **Custom Start Command**: `node dist/server.js`
   - **Healthcheck Path**: `/health`
   - **Healthcheck Timeout**: `100`

### Option 3: Add Nixpacks Configuration

If Railway still uses Railpack, create a `nixpacks.toml` to disable it:

```toml
# apps/scraper/nixpacks.toml
[phases.setup]
nixPkgs = ["nodejs_18"]

[build]
cmds = ["echo 'Use Dockerfile instead'"]

[start]
cmd = "echo 'This service uses Dockerfile'"
```

Then in Railway dashboard, ensure "Builder" is set to "Dockerfile".

## Environment Variables

Configure these in Railway dashboard under **Variables**:

### Required Variables
```bash
DATABASE_URL=postgresql://user:pass@host:port/db
APIFY_TOKEN=your_apify_token
REDIS_URL=redis://host:port
STRIPE_SECRET_KEY=sk_live_...
NODE_ENV=production
PORT=3000  # Railway will inject this automatically
```

### Optional Variables
```bash
# Logging
LOG_LEVEL=info

# Performance
NODE_OPTIONS=--max-old-space-size=2048

# Monitoring
SENTRY_DSN=your_sentry_dsn
```

## Deployment Steps

### 1. Initial Setup

```bash
# Push railway.json to your repository
git add apps/scraper/railway.json
git commit -m "Add Railway configuration for scraper"
git push
```

### 2. Configure Railway Service

In Railway Dashboard:

1. **Create/Update Service**
   - If creating new: Connect to your GitHub repository
   - Select the repository branch (usually `main`)

2. **Set Build Configuration**
   - Root Directory: `/` (empty)
   - Dockerfile Path: `apps/scraper/Dockerfile`
   - Build Context: `/` (root)

3. **Set Environment Variables**
   - Add all required variables listed above

4. **Deploy Settings**
   - Start Command: `node dist/server.js`
   - Healthcheck Path: `/health`
   - Restart Policy: `ON_FAILURE`
   - Max Retries: `10`

### 3. Trigger Deployment

Railway will automatically deploy on:
- Git push to configured branch
- Manual redeploy from dashboard
- Environment variable changes

## Troubleshooting

### Issue: "No start command was found" (Current Issue)

**Cause**: Railway is using Railpack instead of Dockerfile.

**Solution**: 
1. Ensure `railway.json` is committed and pushed
2. In Railway dashboard, explicitly set Builder to "Dockerfile"
3. Verify "Dockerfile Path" is set to `apps/scraper/Dockerfile`
4. **Critical**: Ensure "Root Directory" is `/` or empty (NOT `apps/scraper`)

### Issue: "Cannot find module '@wirecrest/...'"

**Cause**: Build context is wrong, or workspace packages aren't being copied.

**Solution**:
1. Verify Root Directory is `/` (monorepo root)
2. Check Dockerfile has all workspace packages in deps stage
3. Ensure `.yarnrc.yml` and `turbo.json` are at root level

### Issue: "Prisma client is not generated"

**Cause**: Prisma generate step failed during build.

**Solution**:
1. Check `DATABASE_URL` is set in Railway environment variables
2. Verify `packages/db/prisma/schema.prisma` exists
3. Check build logs for Prisma generation errors

### Issue: Build succeeds but app crashes on start

**Cause**: Missing environment variables or wrong start command.

**Solution**:
1. Check all environment variables are set
2. Verify Start Command is `node dist/server.js`
3. Check Railway logs for actual error message

## Verifying Successful Deployment

### 1. Check Build Logs

Look for these successful steps:
```
✓ Dependencies installed
✓ Prisma client generated
✓ TypeScript compiled
✓ Docker image built
✓ Container started
```

### 2. Check Health Endpoint

Once deployed, test the health check:
```bash
curl https://your-service.railway.app/health
```

Should return:
```json
{"status":"ok"}
```

### 3. Monitor Logs

In Railway dashboard, check deploy logs for:
```
Server running on port 3000
✓ Database connected
✓ Redis connected
✓ Prisma initialized
```

## Railway Project Structure

Your Railway project should look like:

```
Railway Project: wirecrest
├── Service: dashboard (Next.js app)
├── Service: auth-service (Dockerfile)
├── Service: scraper (Dockerfile) ← You are here
├── Database: PostgreSQL
└── Database: Redis
```

## Additional Railway Settings

### Auto-Deploy
- Enable for automatic deployments on git push
- Settings → General → Auto-Deploy

### Preview Environments
- Enable for PR previews
- Settings → General → PR Previews

### Custom Domain
- Settings → Domains → Add Custom Domain
- Configure DNS as instructed by Railway

## Monorepo Considerations

Since this is a monorepo:

1. **Watch Paths**: Configure to redeploy only when scraper code changes
   ```json
   "watchPatterns": [
     "apps/scraper/**",
     "packages/**"
   ]
   ```

2. **Build Time**: Monorepo builds take longer
   - First build: 5-10 minutes
   - Subsequent builds: 2-5 minutes (with cache)

3. **Shared Packages**: Changes to `packages/*` will trigger rebuild
   - This is intentional
   - Ensures scraper uses latest package versions

## Cost Optimization

- Use Railway's automatic sleep feature for development
- Production: Consider upgrading to Pro plan for better performance
- Monitor resource usage in Railway metrics

## Support

If issues persist:
1. Check Railway build logs for specific errors
2. Review Railway's Docker deployment docs
3. Verify all files are committed to git
4. Try manual redeploy from Railway dashboard

