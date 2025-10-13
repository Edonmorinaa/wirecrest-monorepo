# Vercel Deployment Guide - Multi-Tenant Dashboard

This guide provides complete instructions for deploying the Wirecrest dashboard application on Vercel with full multi-tenancy support.

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Project Structure](#project-structure)
3. [Domain Configuration](#domain-configuration)
4. [Vercel Project Setup](#vercel-project-setup)
5. [Environment Variables](#environment-variables)
6. [Deploy to Production](#deploy-to-production)
7. [Post-Deployment Configuration](#post-deployment-configuration)
8. [Troubleshooting](#troubleshooting)
9. [Railway Services Setup](#railway-services-setup)

---

## Prerequisites

Before deploying, ensure you have:

- ✅ A Vercel account (https://vercel.com)
- ✅ Your custom domain ready (e.g., `yourdomain.com`)
- ✅ Database hosted and accessible (PostgreSQL)
- ✅ Stripe account configured with products
- ✅ Supabase project created (for real-time notifications)
- ✅ Railway account for auth-service and scraper (optional but recommended)

---

## Project Structure

This is a monorepo with the following structure:

```
wirecrest-new/
├── apps/
│   ├── dashboard/          ← Deploy to Vercel
│   ├── auth-service/       ← Deploy to Railway
│   └── scraper/            ← Deploy to Railway
├── packages/
│   ├── auth/
│   ├── billing/
│   ├── core/
│   ├── db/
│   ├── email/
│   └── notifications/
├── package.json
├── turbo.json
└── yarn.lock
```

**Important**: Only the `dashboard` app will be deployed to Vercel. The other services should be deployed separately to Railway.

---

## Domain Configuration

### 1. DNS Setup

Configure your DNS provider to point to Vercel:

#### Main Domain
```
Type: A
Name: @
Value: 76.76.21.21
```

#### Wildcard Subdomain (Required for Multi-Tenancy)
```
Type: A
Name: *
Value: 76.76.21.21
```

Or use CNAME:
```
Type: CNAME
Name: *
Value: cname.vercel-dns.com
```

### 2. Reserved Subdomains

The following subdomains are used by the system:

- `auth.yourdomain.com` - Authentication (handled via middleware rewrite)
- `admin.yourdomain.com` - Super admin panel (handled via middleware rewrite)
- `www.yourdomain.com` - Main website (redirects to root domain)

### 3. Team Subdomains

Each team/tenant gets their own subdomain:
- `team-slug-1.yourdomain.com` → Routes to `/dashboard/teams/team-slug-1`
- `team-slug-2.yourdomain.com` → Routes to `/dashboard/teams/team-slug-2`

---

## Vercel Project Setup

### Step 1: Connect Repository

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click **"Add New Project"**
3. Import your Git repository
4. Select the repository containing your monorepo

### Step 2: Configure Build Settings

**Framework Preset**: Next.js

**Root Directory**: `apps/dashboard`

**Build Command**:
```bash
cd ../.. && yarn build --filter=dashboard
```

**Install Command**:
```bash
cd ../.. && yarn install
```

**Output Directory**: `.next` (default)

**Node Version**: `20.x`

### Step 3: Add Domain

1. Go to **Settings** → **Domains**
2. Add your custom domain: `yourdomain.com`
3. Add wildcard domain: `*.yourdomain.com`
4. Follow DNS verification instructions
5. Enable "Automatic HTTPS"

---

## Environment Variables

Add these environment variables in Vercel dashboard under **Settings** → **Environment Variables**.

### Required Variables

#### Database
```bash
DATABASE_URL=postgresql://user:password@host:5432/dbname
```

#### NextAuth
```bash
NEXTAUTH_SECRET=your-super-secret-key-here-min-32-chars
NEXTAUTH_URL=https://yourdomain.com
```

#### Application
```bash
NEXT_PUBLIC_ROOT_DOMAIN=yourdomain.com
NODE_ENV=production
COOKIE_DOMAIN=.yourdomain.com
```

#### Microservices
```bash
# Auth Service (Railway)
AUTH_SERVICE_URL=https://auth-service-production-xxxx.up.railway.app

# Scraper Service (Railway)
NEXT_PUBLIC_SCRAPER_API_URL=https://scraper-service-production-xxxx.up.railway.app
```

#### Stripe
```bash
STRIPE_SECRET_KEY=sk_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
STRIPE_STARTER_PRODUCT_ID=prod_xxxxxxxxxxxxx
STRIPE_PROFESSIONAL_PRODUCT_ID=prod_xxxxxxxxxxxxx
STRIPE_ENTERPRISE_PRODUCT_ID=prod_xxxxxxxxxxxxx
```

#### Supabase
```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxxxxxxxxxxxxxxxxxxxxxxxx
SUPABASE_SERVICE_ROLE_KEY=eyJxxxxxxxxxxxxxxxxxxxxxxxxx
```

### Optional but Recommended

#### OAuth Providers
```bash
GOOGLE_CLIENT_ID=xxxxxxxxxxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxxxxxxxxxxxxxxxxxx
GITHUB_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxx
GITHUB_CLIENT_SECRET=xxxxxxxxxxxxxxxxxxxxx
```

#### Email Service
```bash
EMAIL_SERVER_HOST=smtp.gmail.com
EMAIL_SERVER_PORT=587
EMAIL_SERVER_USER=your-email@gmail.com
EMAIL_SERVER_PASSWORD=your-app-password
EMAIL_FROM=noreply@yourdomain.com
```

#### Redis (Upstash)
```bash
UPSTASH_REDIS_REST_URL=https://xxxxxxxxxxxxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=xxxxxxxxxxxxxxxxxxxxx
```

#### Analytics
```bash
NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX
SENTRY_DSN=https://xxxxxxxxxxxxx@sentry.io/0000000
```

### Build-Time Variables

```bash
NEXT_TELEMETRY_DISABLED=1
SKIP_ENV_VALIDATION=1
```

**💡 Tip**: You can copy all environment variables from `apps/dashboard/env.example` and fill in your actual values.

---

## Deploy to Production

### Option 1: Deploy via Git

1. Push your code to the main branch:
```bash
git add .
git commit -m "Configure Vercel deployment"
git push origin main
```

2. Vercel will automatically detect the push and deploy

### Option 2: Deploy via Vercel CLI

1. Install Vercel CLI:
```bash
npm i -g vercel
```

2. Login to Vercel:
```bash
vercel login
```

3. Deploy:
```bash
cd apps/dashboard
vercel --prod
```

### Deployment Process

Vercel will:
1. Clone your repository
2. Install dependencies with Yarn
3. Build all workspace packages (`@wirecrest/*`)
4. Build the Next.js application
5. Deploy to production
6. Assign SSL certificates to all domains

**Expected Build Time**: 3-5 minutes

---

## Post-Deployment Configuration

### 1. Verify Domain Setup

Check that all domains are working:

```bash
# Main domain
curl -I https://yourdomain.com

# Admin subdomain (should rewrite to /dashboard/superadmin)
curl -I https://admin.yourdomain.com

# Auth subdomain (should rewrite to /auth/*)
curl -I https://auth.yourdomain.com

# Team subdomain (should rewrite to /dashboard/teams/demo)
curl -I https://demo.yourdomain.com
```

### 2. Configure Stripe Webhooks

1. Go to [Stripe Dashboard](https://dashboard.stripe.com/webhooks)
2. Create a new webhook endpoint: `https://yourdomain.com/api/stripe/webhook`
3. Select events to listen to:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
4. Copy the webhook signing secret
5. Add it to Vercel environment variables as `STRIPE_WEBHOOK_SECRET`
6. Redeploy the application

### 3. Configure OAuth Redirect URIs

#### Google OAuth
1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Edit your OAuth 2.0 Client
3. Add authorized redirect URIs:
   ```
   https://yourdomain.com/api/auth/callback/google
   https://*.yourdomain.com/api/auth/callback/google
   ```

#### GitHub OAuth
1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Edit your OAuth App
3. Set **Authorization callback URL**:
   ```
   https://yourdomain.com/api/auth/callback/github
   ```

### 4. Test Multi-Tenancy

1. Create a test team in your database
2. Access the team subdomain: `https://test-team.yourdomain.com`
3. Verify it routes to the correct team dashboard
4. Test authentication flow across subdomains

### 5. Configure CORS for Railway Services

Update your Railway services to allow CORS from Vercel:

**Auth Service:**
```bash
ALLOWED_ORIGINS=https://yourdomain.com,https://*.yourdomain.com
```

**Scraper Service:**
```bash
ALLOWED_ORIGINS=https://yourdomain.com,https://*.yourdomain.com
```

---

## Railway Services Setup

Since auth-service and scraper are deployed separately on Railway, follow these steps:

### Auth Service Deployment

1. Go to [Railway Dashboard](https://railway.app)
2. Create a new project
3. Connect your GitHub repository
4. Set root directory: `apps/auth-service`
5. Add environment variables:
   ```bash
   DATABASE_URL=postgresql://...
   NEXTAUTH_SECRET=same-as-dashboard
   NEXTAUTH_URL=https://auth-service-production-xxxx.up.railway.app
   ALLOWED_ORIGINS=https://yourdomain.com,https://*.yourdomain.com
   ```
6. Deploy the service
7. Copy the Railway URL and add it to Vercel as `AUTH_SERVICE_URL`

### Scraper Service Deployment

1. Create another Railway project
2. Connect your GitHub repository
3. Set root directory: `apps/scraper`
4. Add environment variables:
   ```bash
   DATABASE_URL=postgresql://...
   STRIPE_SECRET_KEY=sk_live_...
   STRIPE_WEBHOOK_SECRET=whsec_...
   APIFY_API_TOKEN=apify_api_...
   APIFY_WEBHOOK_SECRET=...
   NODE_ENV=production
   PORT=3001
   ```
5. Deploy the service
6. Copy the Railway URL and add it to Vercel as `NEXT_PUBLIC_SCRAPER_API_URL`

---

## Troubleshooting

### Build Failures

**Issue**: Build fails with "Cannot find module '@wirecrest/...'"

**Solution**: Ensure `installCommand` and `buildCommand` are set correctly in `vercel.json` to build from monorepo root.

---

### Subdomain Not Working

**Issue**: Team subdomains return 404

**Solution**:
1. Verify wildcard domain is added in Vercel
2. Check DNS wildcard record is configured
3. Verify middleware is running (check Vercel Function logs)
4. Ensure `NEXT_PUBLIC_ROOT_DOMAIN` is set correctly (without protocol or port)

---

### Environment Variables Not Loading

**Issue**: Environment variables are undefined in production

**Solution**:
1. Ensure variables are set for **Production** environment in Vercel
2. Redeploy after adding new variables
3. Variables starting with `NEXT_PUBLIC_` are exposed to the browser
4. Check variable names don't have typos

---

### Database Connection Issues

**Issue**: Cannot connect to database

**Solution**:
1. Verify `DATABASE_URL` is accessible from Vercel's servers
2. Whitelist Vercel's IP ranges in your database firewall
3. Use connection pooling (e.g., Supabase, PlanetScale, Neon)
4. Check SSL mode in connection string

---

### Stripe Webhook Failures

**Issue**: Webhook events not processing

**Solution**:
1. Verify webhook endpoint: `https://yourdomain.com/api/stripe/webhook`
2. Check `STRIPE_WEBHOOK_SECRET` matches Stripe dashboard
3. View webhook logs in Stripe dashboard
4. Check Vercel function logs for errors
5. Ensure webhook handler is deployed

---

### Auth Flow Issues

**Issue**: Authentication not working across subdomains

**Solution**:
1. Set `COOKIE_DOMAIN=.yourdomain.com` (with leading dot)
2. Ensure all subdomains use HTTPS
3. Check `NEXTAUTH_URL` is set to main domain
4. Verify middleware redirects are working
5. Clear browser cookies and test again

---

### Middleware Not Executing

**Issue**: Middleware rewrites/redirects not working

**Solution**:
1. Check `middleware.ts` matcher pattern
2. Verify middleware is in `src/` or root directory
3. Check Vercel function logs for errors
4. Ensure middleware exports `config` with correct matcher
5. Redeploy if middleware was recently updated

---

## Performance Optimization

### Enable Edge Runtime (Optional)

For faster response times, you can enable Edge Runtime for API routes:

```typescript
// app/api/route.ts
export const runtime = 'edge';
```

### Configure Caching

Add caching headers in `vercel.json`:

```json
{
  "headers": [
    {
      "source": "/static/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    }
  ]
}
```

### Enable Image Optimization

Next.js Image component is automatically optimized on Vercel.

---

## Monitoring & Logging

### Vercel Analytics

Enable analytics in your project settings to track:
- Page views
- Performance metrics
- Web vitals

### Function Logs

View real-time logs:
1. Go to your project in Vercel
2. Click on a deployment
3. Click "Functions" tab
4. View logs for each serverless function

### Error Tracking

Integrate Sentry for production error tracking:

```bash
SENTRY_DSN=https://xxxxxxxxxxxxx@sentry.io/0000000
```

---

## Scaling Considerations

### Vercel Limits

- **Free Plan**: 100GB bandwidth, 100 serverless function hours
- **Pro Plan**: 1TB bandwidth, 1000 serverless function hours
- **Enterprise**: Custom limits

### Database Scaling

Ensure your database can handle:
- Concurrent connections from Vercel functions
- Multiple team queries simultaneously
- Consider connection pooling (PgBouncer, Supabase Pooler)

### Redis Caching

Use Redis for:
- Session storage
- Rate limiting
- Feature flag caching
- API response caching

---

## Security Checklist

- ✅ All secrets stored as environment variables
- ✅ HTTPS enabled for all domains
- ✅ CORS configured correctly
- ✅ Webhook signatures validated
- ✅ SQL injection prevention (Prisma)
- ✅ XSS protection headers configured
- ✅ Rate limiting implemented
- ✅ Authentication guards on protected routes

---

## Support & Resources

- **Vercel Documentation**: https://vercel.com/docs
- **Next.js Documentation**: https://nextjs.org/docs
- **Vercel Support**: https://vercel.com/support
- **Community Discord**: https://discord.gg/vercel

---

## Quick Reference

### Deploy Command
```bash
vercel --prod
```

### Check Deployment Status
```bash
vercel ls
```

### View Logs
```bash
vercel logs [deployment-url]
```

### Remove Deployment
```bash
vercel rm [deployment-name]
```

---

**Last Updated**: 2025-01-13
**Maintained By**: Wirecrest Engineering Team

