# Deployment Quick Start Guide

Get your Wirecrest platform deployed in under 30 minutes.

## 🎯 Overview

- **Dashboard**: Vercel (Next.js app with multi-tenancy)
- **Auth Service**: Railway (Express microservice)
- **Scraper Service**: Railway (Node.js microservice)
- **Database**: Your PostgreSQL provider (Supabase, Neon, PlanetScale, etc.)

## ⚡ Quick Deploy

### Prerequisites (5 minutes)

1. **Accounts Created**
   - [ ] Vercel account
   - [ ] Railway account (or create during deployment)
   - [ ] Database ready with connection string
   - [ ] Domain name with DNS access

2. **Essential Credentials Ready**
   - [ ] Database URL
   - [ ] Stripe API keys
   - [ ] Supabase project URL and keys

### Step 1: Deploy Dashboard to Vercel (10 minutes)

```bash
# 1. Push your code to GitHub (if not already)
git add .
git commit -m "Ready for deployment"
git push origin main

# 2. Go to Vercel
# Visit: https://vercel.com/new
# Import your repository
# Set Root Directory: apps/dashboard

# 3. Configure Build Settings
# Build Command: cd ../.. && yarn build --filter=dashboard
# Install Command: cd ../.. && yarn install
# Output Directory: .next

# 4. Add Environment Variables (minimum required)
DATABASE_URL=postgresql://...
NEXTAUTH_SECRET=your-secret-here
NEXTAUTH_URL=https://yourdomain.com
NEXT_PUBLIC_ROOT_DOMAIN=yourdomain.com
STRIPE_SECRET_KEY=sk_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_SUPABASE_URL=https://...
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...

# 5. Deploy
# Click "Deploy" and wait 3-5 minutes
```

**After deployment**:
1. Add your domain: `yourdomain.com`
2. Add wildcard: `*.yourdomain.com`
3. Update DNS records

### Step 2: Deploy Auth Service to Railway (5 minutes)

```bash
# 1. Go to Railway
# Visit: https://railway.app/new

# 2. Deploy from GitHub
# Select your repo
# Set Root Directory: apps/auth-service

# 3. Add Environment Variables
DATABASE_URL=postgresql://...
NEXTAUTH_SECRET=same-as-dashboard
NEXTAUTH_URL=https://[railway-url].up.railway.app
ALLOWED_ORIGINS=https://yourdomain.com,https://*.yourdomain.com
NODE_ENV=production
PORT=3000

# 4. Deploy
# Click "Deploy" and wait 2-3 minutes

# 5. Copy Railway URL
# Go back to Vercel and add:
AUTH_SERVICE_URL=https://[railway-url].up.railway.app
# Then redeploy dashboard
```

### Step 3: Deploy Scraper Service to Railway (5 minutes)

```bash
# 1. Create another Railway project
# Visit: https://railway.app/new

# 2. Deploy from GitHub
# Select your repo
# Set Root Directory: apps/scraper

# 3. Add Environment Variables
DATABASE_URL=postgresql://...
APIFY_API_TOKEN=apify_api_...
APIFY_WEBHOOK_SECRET=...
STRIPE_SECRET_KEY=sk_...
NODE_ENV=production
PORT=3001

# 4. Deploy
# Click "Deploy" and wait 2-4 minutes

# 5. Copy Railway URL
# Go back to Vercel and add:
NEXT_PUBLIC_SCRAPER_API_URL=https://[railway-url].up.railway.app
# Then redeploy dashboard
```

### Step 4: Configure Webhooks (5 minutes)

#### Stripe Webhook
1. Go to: https://dashboard.stripe.com/webhooks
2. Add endpoint: `https://yourdomain.com/api/stripe/webhook`
3. Select events: `customer.subscription.*`, `invoice.payment_*`
4. Copy webhook secret
5. Update Vercel env: `STRIPE_WEBHOOK_SECRET`
6. Redeploy dashboard

#### Apify Webhook
1. Go to: https://console.apify.com/account/integrations
2. Add webhook: `https://[scraper-railway-url].up.railway.app/api/webhook/apify`
3. Use same secret as `APIFY_WEBHOOK_SECRET`

## ✅ Verification (5 minutes)

### Test Dashboard
```bash
# Main domain
curl -I https://yourdomain.com
# Should return 200

# Admin subdomain
curl -I https://admin.yourdomain.com
# Should return 200

# Auth subdomain  
curl -I https://auth.yourdomain.com
# Should return 200

# Team subdomain (create test team first)
curl -I https://test-team.yourdomain.com
# Should return 200
```

### Test Auth Service
```bash
curl https://[auth-railway-url].up.railway.app/health
# Should return: {"status":"ok"}
```

### Test Scraper Service
```bash
curl https://[scraper-railway-url].up.railway.app/health
# Should return: {"status":"ok"}
```

## 🔧 Post-Deployment

1. **Configure OAuth** (if using)
   - Google: Add redirect URI in Google Console
   - GitHub: Add callback URL in GitHub Settings

2. **Test End-to-End**
   - Create a user account
   - Create a team
   - Subscribe to a plan
   - Verify features are enabled

3. **Monitor**
   - Check Vercel deployment logs
   - Check Railway deployment logs
   - Monitor error tracking (if Sentry configured)

## 📚 Detailed Guides

For comprehensive instructions, see:

- **Dashboard Deployment**: [`apps/dashboard/VERCEL_DEPLOYMENT.md`](./apps/dashboard/VERCEL_DEPLOYMENT.md)
- **Auth Service Deployment**: [`apps/auth-service/RAILWAY_DEPLOYMENT.md`](./apps/auth-service/RAILWAY_DEPLOYMENT.md)
- **Scraper Service Deployment**: [`apps/scraper/RAILWAY_DEPLOYMENT.md`](./apps/scraper/RAILWAY_DEPLOYMENT.md)
- **Complete Checklist**: [`DEPLOYMENT_CHECKLIST.md`](./DEPLOYMENT_CHECKLIST.md)

## 🆘 Common Issues

### "Cannot find module @wirecrest/..."
**Solution**: Ensure build commands include monorepo root (`cd ../..`)

### Subdomain returns 404
**Solution**: 
- Add wildcard domain in Vercel: `*.yourdomain.com`
- Update DNS with wildcard record

### Environment variables not loading
**Solution**: 
- Redeploy after adding new variables
- Check variable names match exactly

### Database connection fails
**Solution**: 
- Verify DATABASE_URL is accessible
- Use connection pooling
- Check database firewall rules

### CORS errors
**Solution**: 
- Ensure `ALLOWED_ORIGINS` includes all domains
- Verify CORS middleware is configured

## 💡 Tips

1. **Use the same `NEXTAUTH_SECRET`** across all services
2. **Enable connection pooling** for database
3. **Set up monitoring** early (Sentry, Vercel Analytics)
4. **Test thoroughly** in staging before production
5. **Document** your specific configuration

## 📞 Support

- **Vercel**: https://vercel.com/support
- **Railway**: https://railway.app/help
- **Documentation**: See individual deployment guides

---

## Environment Variables Quick Copy

### Dashboard (Vercel)
```bash
# Database
DATABASE_URL=

# NextAuth
NEXTAUTH_SECRET=
NEXTAUTH_URL=
NEXT_PUBLIC_ROOT_DOMAIN=
COOKIE_DOMAIN=

# Microservices
AUTH_SERVICE_URL=
NEXT_PUBLIC_SCRAPER_API_URL=

# Stripe
STRIPE_SECRET_KEY=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_STARTER_PRODUCT_ID=
STRIPE_PROFESSIONAL_PRODUCT_ID=
STRIPE_ENTERPRISE_PRODUCT_ID=

# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Build
NODE_ENV=production
NEXT_TELEMETRY_DISABLED=1
```

### Auth Service (Railway)
```bash
DATABASE_URL=
NEXTAUTH_SECRET=
NEXTAUTH_URL=
ALLOWED_ORIGINS=
NODE_ENV=production
PORT=3000
COOKIE_DOMAIN=
```

### Scraper Service (Railway)
```bash
DATABASE_URL=
APIFY_API_TOKEN=
APIFY_WEBHOOK_SECRET=
WEBHOOK_BASE_URL=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NODE_ENV=production
PORT=3001
LOG_LEVEL=info
```

---

**Last Updated**: 2025-01-13  
**Deployment Time**: ~30 minutes  
**Maintained By**: Wirecrest Engineering Team

