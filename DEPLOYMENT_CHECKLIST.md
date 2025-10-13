# Deployment Checklist - Complete Setup Guide

This checklist ensures all components of the Wirecrest platform are deployed correctly across Vercel and Railway.

## 📋 Pre-Deployment Checklist

### ✅ Required Services & Accounts

- [ ] **Vercel Account** - For dashboard deployment
- [ ] **Railway Account** - For auth-service and scraper deployment
- [ ] **Database** - PostgreSQL hosted (Supabase, Neon, PlanetScale, etc.)
- [ ] **Stripe Account** - With products configured
- [ ] **Supabase Project** - For real-time notifications
- [ ] **Custom Domain** - DNS access required

### ✅ Database Setup

- [ ] PostgreSQL database created and accessible
- [ ] Prisma migrations run: `cd packages/db && npx prisma migrate deploy`
- [ ] Prisma client generated: `npx prisma generate`
- [ ] Database connection string ready
- [ ] Connection pooling configured (recommended)

### ✅ Stripe Configuration

- [ ] Stripe account created
- [ ] Products created (Starter, Professional, Enterprise)
- [ ] Product IDs copied
- [ ] Webhook endpoint will be configured post-deployment
- [ ] API keys (secret and publishable) ready

### ✅ Supabase Configuration

- [ ] Supabase project created
- [ ] Real-time enabled for notifications
- [ ] Project URL and keys ready
- [ ] Database migrations applied (if using Supabase DB)

---

## 🚀 Deployment Steps

### Step 1: Deploy Dashboard to Vercel

**Location**: `apps/dashboard`

1. **Connect Repository**
   - [ ] Go to https://vercel.com/new
   - [ ] Import your Git repository
   - [ ] Select the repository

2. **Configure Project**
   - [ ] Set **Root Directory**: `apps/dashboard`
   - [ ] Set **Framework**: Next.js
   - [ ] Set **Build Command**: `cd ../.. && yarn build --filter=dashboard`
   - [ ] Set **Install Command**: `cd ../.. && yarn install`
   - [ ] Set **Node Version**: 20.x

3. **Add Environment Variables**
   
   Copy from `apps/dashboard/env.example` and fill in values:
   
   **Required**:
   - [ ] `DATABASE_URL`
   - [ ] `NEXTAUTH_SECRET`
   - [ ] `NEXTAUTH_URL`
   - [ ] `NEXT_PUBLIC_ROOT_DOMAIN`
   - [ ] `NODE_ENV=production`
   - [ ] `COOKIE_DOMAIN`
   
   **Stripe**:
   - [ ] `STRIPE_SECRET_KEY`
   - [ ] `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
   - [ ] `STRIPE_WEBHOOK_SECRET` (configure after deployment)
   - [ ] `STRIPE_STARTER_PRODUCT_ID`
   - [ ] `STRIPE_PROFESSIONAL_PRODUCT_ID`
   - [ ] `STRIPE_ENTERPRISE_PRODUCT_ID`
   
   **Supabase**:
   - [ ] `NEXT_PUBLIC_SUPABASE_URL`
   - [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - [ ] `SUPABASE_SERVICE_ROLE_KEY`
   
   **Microservices** (add after Railway deployment):
   - [ ] `AUTH_SERVICE_URL`
   - [ ] `NEXT_PUBLIC_SCRAPER_API_URL`

4. **Deploy**
   - [ ] Click "Deploy"
   - [ ] Wait for build to complete (~3-5 minutes)
   - [ ] Verify deployment is successful

5. **Configure Domain**
   - [ ] Add custom domain: `yourdomain.com`
   - [ ] Add wildcard domain: `*.yourdomain.com`
   - [ ] Update DNS records
   - [ ] Wait for SSL certificate provisioning
   - [ ] Verify all domains are accessible

6. **Post-Deployment Configuration**
   - [ ] Update `NEXTAUTH_URL` to production domain
   - [ ] Configure Stripe webhook: `https://yourdomain.com/api/stripe/webhook`
   - [ ] Add webhook signing secret to environment variables
   - [ ] Redeploy to apply new environment variables

---

### Step 2: Deploy Auth Service to Railway

**Location**: `apps/auth-service`

1. **Create New Project**
   - [ ] Go to https://railway.app/new
   - [ ] Click "Deploy from GitHub repo"
   - [ ] Select your repository
   - [ ] Choose "Configure" for deployment settings

2. **Configure Service**
   - [ ] Set **Root Directory**: `apps/auth-service`
   - [ ] Railway will auto-detect Node.js
   - [ ] Set **Start Command**: `npm start`

3. **Add Environment Variables**
   
   **Required**:
   - [ ] `DATABASE_URL` (same as dashboard)
   - [ ] `NEXTAUTH_SECRET` (same as dashboard)
   - [ ] `NEXTAUTH_URL=https://[your-railway-domain].up.railway.app`
   - [ ] `NODE_ENV=production`
   - [ ] `PORT=3000`
   
   **CORS Configuration**:
   - [ ] `ALLOWED_ORIGINS=https://yourdomain.com,https://*.yourdomain.com`

4. **Deploy**
   - [ ] Click "Deploy"
   - [ ] Wait for deployment to complete
   - [ ] Copy the Railway URL

5. **Update Dashboard**
   - [ ] Go back to Vercel dashboard environment variables
   - [ ] Add `AUTH_SERVICE_URL=[railway-url]`
   - [ ] Redeploy dashboard on Vercel

6. **Test Auth Service**
   - [ ] Visit `[railway-url]/health`
   - [ ] Should return status 200 OK

---

### Step 3: Deploy Scraper Service to Railway

**Location**: `apps/scraper`

1. **Create New Project**
   - [ ] Go to https://railway.app/new
   - [ ] Click "Deploy from GitHub repo"
   - [ ] Select your repository
   - [ ] Choose "Configure" for deployment settings

2. **Configure Service**
   - [ ] Set **Root Directory**: `apps/scraper`
   - [ ] Railway will auto-detect Node.js
   - [ ] Set **Start Command**: `npm start`

3. **Add Environment Variables**
   
   **Required**:
   - [ ] `DATABASE_URL` (same as dashboard)
   - [ ] `NODE_ENV=production`
   - [ ] `PORT=3001`
   
   **Apify Configuration**:
   - [ ] `APIFY_API_TOKEN`
   - [ ] `APIFY_WEBHOOK_SECRET`
   - [ ] `WEBHOOK_BASE_URL=[railway-url]`
   
   **Stripe**:
   - [ ] `STRIPE_SECRET_KEY`
   - [ ] `STRIPE_WEBHOOK_SECRET`
   
   **Optional**:
   - [ ] `REDIS_URL` (for job queuing)
   - [ ] `LOG_LEVEL=info`

4. **Deploy**
   - [ ] Click "Deploy"
   - [ ] Wait for deployment to complete
   - [ ] Copy the Railway URL

5. **Update Dashboard**
   - [ ] Go back to Vercel dashboard environment variables
   - [ ] Add `NEXT_PUBLIC_SCRAPER_API_URL=[railway-url]`
   - [ ] Redeploy dashboard on Vercel

6. **Configure Apify Webhook**
   - [ ] Go to Apify dashboard
   - [ ] Set webhook URL to `[railway-url]/api/webhook/apify`
   - [ ] Add webhook secret

---

## 🔐 OAuth Configuration

### Google OAuth

1. **Google Cloud Console**
   - [ ] Go to https://console.cloud.google.com/apis/credentials
   - [ ] Create OAuth 2.0 Client ID
   - [ ] Add authorized redirect URIs:
     - `https://yourdomain.com/api/auth/callback/google`
     - `https://*.yourdomain.com/api/auth/callback/google`
   - [ ] Copy Client ID and Secret

2. **Add to Vercel Environment Variables**
   - [ ] `GOOGLE_CLIENT_ID`
   - [ ] `GOOGLE_CLIENT_SECRET`
   - [ ] Redeploy

### GitHub OAuth

1. **GitHub Developer Settings**
   - [ ] Go to https://github.com/settings/developers
   - [ ] Create New OAuth App
   - [ ] Set callback URL: `https://yourdomain.com/api/auth/callback/github`
   - [ ] Copy Client ID and Secret

2. **Add to Vercel Environment Variables**
   - [ ] `GITHUB_CLIENT_ID`
   - [ ] `GITHUB_CLIENT_SECRET`
   - [ ] Redeploy

---

## 🧪 Testing & Verification

### Dashboard Testing

- [ ] Main domain accessible: `https://yourdomain.com`
- [ ] Admin subdomain works: `https://admin.yourdomain.com`
- [ ] Auth subdomain works: `https://auth.yourdomain.com`
- [ ] Team subdomain works: `https://[team-slug].yourdomain.com`
- [ ] Authentication flow works
- [ ] Team creation works
- [ ] Subscription checkout works

### Auth Service Testing

- [ ] Health check endpoint works
- [ ] Can authenticate from dashboard
- [ ] CORS headers are correct
- [ ] Password reset flow works

### Scraper Service Testing

- [ ] Health check endpoint works
- [ ] Can trigger scraping jobs from dashboard
- [ ] Apify webhooks are received
- [ ] Data is stored correctly in database

### End-to-End Testing

- [ ] User registration works
- [ ] Email verification works
- [ ] Login works across subdomains
- [ ] Create a team
- [ ] Access team subdomain
- [ ] Subscribe to a plan
- [ ] Webhook processes successfully
- [ ] Features are enabled based on subscription
- [ ] Scraping jobs can be triggered
- [ ] Notifications are delivered

---

## 🔧 Post-Deployment Configuration

### DNS Records

- [ ] A record: `@ → 76.76.21.21` (Vercel)
- [ ] A record: `* → 76.76.21.21` (Vercel)
- [ ] CNAME record: `www → cname.vercel-dns.com`
- [ ] All records propagated (check with `dig yourdomain.com`)

### SSL Certificates

- [ ] Main domain has SSL
- [ ] Wildcard domain has SSL
- [ ] All subdomains redirect to HTTPS
- [ ] HSTS headers are set

### Monitoring

- [ ] Vercel Analytics enabled
- [ ] Railway logs accessible
- [ ] Sentry error tracking configured (optional)
- [ ] Uptime monitoring setup (optional)

---

## 📊 Performance Optimization

### Vercel

- [ ] Edge functions enabled where applicable
- [ ] Image optimization configured
- [ ] Caching headers set
- [ ] CDN enabled (automatic with Vercel)

### Railway

- [ ] Correct region selected
- [ ] Resource limits configured
- [ ] Auto-scaling enabled

### Database

- [ ] Connection pooling enabled
- [ ] Indexes created for frequently queried fields
- [ ] Query performance monitored

---

## 🔒 Security Checklist

- [ ] All secrets are environment variables (not hardcoded)
- [ ] HTTPS enforced on all domains
- [ ] CORS configured correctly
- [ ] Webhook signatures validated
- [ ] Rate limiting implemented
- [ ] Security headers configured
- [ ] Database credentials secured
- [ ] API keys rotated regularly

---

## 🐛 Troubleshooting

### Dashboard Issues

**Build Fails**:
- Check build logs in Vercel
- Verify all dependencies are installed
- Ensure monorepo build command is correct

**Subdomain Not Working**:
- Verify wildcard domain is added
- Check DNS wildcard record
- Review middleware logs

**Environment Variables Not Loading**:
- Ensure variables are set for Production environment
- Redeploy after adding new variables
- Check for typos in variable names

### Auth Service Issues

**Cannot Connect**:
- Check Railway logs
- Verify service is running
- Test health endpoint

**CORS Errors**:
- Verify `ALLOWED_ORIGINS` includes all domains
- Check CORS headers in response

### Scraper Service Issues

**Webhooks Not Received**:
- Check webhook URL in Apify
- Verify webhook secret matches
- Review Railway logs

**Jobs Not Processing**:
- Check database connectivity
- Verify Apify API token
- Review error logs

---

## 📚 Documentation

- [ ] Dashboard deployment: `apps/dashboard/VERCEL_DEPLOYMENT.md`
- [ ] Auth service setup: `apps/auth-service/README.md`
- [ ] Scraper service setup: `apps/scraper/README.md`
- [ ] Multi-tenancy guide: `apps/dashboard/SUBDOMAIN_ROUTING.md`
- [ ] Environment variables: `apps/dashboard/env.example`

---

## ✅ Deployment Complete!

Once all items are checked:

1. **Announce Deployment**: Notify your team
2. **Monitor for Issues**: Watch logs for 24-48 hours
3. **User Acceptance Testing**: Have users test critical flows
4. **Document Issues**: Track any bugs or issues
5. **Plan Iterations**: Schedule follow-up improvements

---

**Last Updated**: 2025-01-13  
**Maintained By**: Wirecrest Engineering Team

