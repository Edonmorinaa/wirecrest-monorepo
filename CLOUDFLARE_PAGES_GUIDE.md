# Cloudflare Pages Migration Guide

## Quick Answer: How Hard Is It?

**Difficulty: Medium** ⚠️

- **Easy parts**: Build configuration, Git integration
- **Hard parts**: Domain setup (may need to move DNS), Next.js edge compatibility, serverless functions migration

**Time estimate**: 2-4 hours (including testing)

## Comparison: Cloudflare Pages vs Vercel

### Cloudflare Pages Advantages ✅
- **Cost**: Free tier includes unlimited bandwidth (Vercel has limits)
- **Performance**: Global edge network, potentially faster
- **Pricing**: More cost-effective at scale
- **Features**: Integrated with Cloudflare ecosystem (workers, DNS, etc.)

### Cloudflare Pages Disadvantages ⚠️
- **Next.js Support**: Newer support, may have edge cases
- **Domain Setup**: Requires Cloudflare DNS or delegation
- **Next.js Features**: Some features may need different configuration
- **Ecosystem**: Less Next.js-specific tooling than Vercel

## Migration Steps (If You Want to Switch)

### 1. Sign Up & Connect Repository

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Navigate to **Pages** → **Create a project**
3. Connect your Git repository

### 2. Configure Build Settings

**Framework preset**: Next.js

**Build settings**:
```
Root directory: apps/dashboard
Build command: cd ../.. && yarn install && yarn turbo build --filter=@wirecrest/dashboard --force
Output directory: .next
Node version: 20
```

**Environment variables**: Same as Vercel (add all your env vars)

### 3. Domain Configuration (The Tricky Part)

#### Option A: Use Cloudflare DNS (Easiest)
1. Move your domain's nameservers to Cloudflare
2. Add `*.wirecrest.com` as a custom domain in Cloudflare Pages
3. Auto-configured DNS records

#### Option B: CNAME Setup (If keeping current DNS)
1. Add CNAME record in your current DNS:
   ```
   Type: CNAME
   Name: *
   Value: [Cloudflare Pages custom domain]
   ```
2. May not work with wildcard - might need individual subdomain records

⚠️ **Important**: Cloudflare Pages wildcard domains work best when using Cloudflare DNS.

### 4. Update Environment Variables

Same variables as Vercel:
```bash
NEXT_PUBLIC_ROOT_DOMAIN=wirecrest.com
NEXT_PUBLIC_MAIN_DOMAIN=wirecrest.com
NEXTAUTH_URL=https://wirecrest.com
# ... all other env vars
```

### 5. Handle Serverless Functions

Cloudflare Pages uses **Cloudflare Workers** instead of Vercel Functions.

**Differences**:
- Runtime: V8 isolates (not Node.js)
- API: Different from Vercel's API routes
- Limits: Different timeout and memory limits

**If you have API routes**, you may need to:
- Refactor to Cloudflare Workers format, OR
- Keep API routes on separate service (Vercel or your own server)

### 6. Test Deployment

1. Deploy to preview environment first
2. Test all routes (main domain, subdomains)
3. Test API routes
4. Test authentication flows
5. Test middleware routing

## Required Code Changes (If Any)

### Check Middleware Compatibility

Your `middleware.ts` should work, but verify:
- Cloudflare Pages runs on edge (Edge Runtime)
- Ensure middleware doesn't use Node.js-only APIs

### API Routes Review

Check if any API routes use Node.js-specific features:
- File system operations
- Native modules
- Certain Node.js APIs

These may need refactoring for Cloudflare Workers.

## Recommendation

**Fix Vercel first** because:
1. ✅ Your code is already optimized for Vercel
2. ✅ Next.js features work out-of-the-box
3. ✅ No domain migration needed
4. ✅ Less risk of breaking changes

**Consider Cloudflare Pages if**:
- You're hitting Vercel bandwidth/request limits
- You want to consolidate DNS/domain management with Cloudflare
- You're open to potential refactoring of API routes
- Cost is a significant concern

## Quick Decision Tree

**Choose Vercel (Fix Current Setup) if**:
- You want the fastest solution ✅
- You use Next.js-specific features
- You want minimal code changes
- Your current DNS setup works

**Choose Cloudflare Pages if**:
- You're cost-sensitive (high traffic)
- You already use Cloudflare services
- You're okay with potential refactoring
- You want to consolidate infrastructure

## My Recommendation: Fix Vercel

Your current issues are solvable:
1. Yarn 4 issue → Enable Corepack (see `VERCEL_BUILD_FIX.md`)
2. Build command → Fix syntax and paths
3. Time to fix: ~30 minutes

vs.

Cloudflare migration:
1. Domain DNS changes
2. Potential API route refactoring
3. Testing and troubleshooting
4. Time to migrate: 2-4 hours minimum

**Fix Vercel first, then migrate to Cloudflare later if needed!**

