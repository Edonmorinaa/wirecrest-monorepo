# Vercel Wildcard Subdomain Setup Guide

This guide explains how to configure `*.wirecrest.com` wildcard subdomains for your monorepo dashboard on Vercel.

## 🌐 Overview

Your dashboard already supports multi-tenant subdomain routing:
- **Main domain**: `wirecrest.com` (landing page)
- **Auth subdomain**: `auth.wirecrest.com` (authentication)
- **Admin subdomain**: `admin.wirecrest.com` (super admin)
- **Team subdomains**: `[team-slug].wirecrest.com` (team-specific dashboards)

## 📋 Prerequisites

- ✅ You already have `wirecrest.com` configured on Vercel (another project)
- ✅ Your dashboard app supports subdomain routing (already implemented)
- ✅ Access to DNS management for `wirecrest.com`

## 🔧 Step 1: Add Wildcard Domain to Vercel Dashboard

1. **Go to your Vercel Dashboard**
   - Navigate to your dashboard project (the monorepo one)

2. **Open Project Settings**
   - Click on your project → **Settings** → **Domains**

3. **Add Wildcard Domain**
   - Click **"Add Domain"**
   - Enter: `*.wirecrest.com`
   - Click **"Add"**

4. **Vercel will show you DNS configuration instructions**
   - You'll need to add a wildcard DNS record (see Step 2)

## 🌍 Step 2: Configure DNS Records

You need to add a **wildcard A record** or **CNAME record** pointing to Vercel.

### Option A: CNAME (Recommended - Easier to manage)

Add the following DNS record in your DNS provider:

```
Type: CNAME
Name: *
Value: cname.vercel-dns.com
TTL: 3600 (or auto)
```

### Option B: A Record (If CNAME doesn't work)

Get Vercel's IP addresses and create A records:

1. **Get Vercel IPs** from Vercel dashboard (they may provide them)
2. Add A records:
   ```
   Type: A
   Name: *
   Value: [Vercel IP 1]
   TTL: 3600
   ```
   (Repeat for all Vercel IPs if multiple are provided)

⚠️ **Note**: If you already have a specific subdomain pointing elsewhere (e.g., `www.wirecrest.com`), you may need individual CNAME records for specific subdomains like:
- `auth.wirecrest.com` → `cname.vercel-dns.com`
- `admin.wirecrest.com` → `cname.vercel-dns.com`
- etc.

## ⚙️ Step 3: Configure Environment Variables

Add these environment variables in **Vercel Dashboard → Settings → Environment Variables**:

### Required Environment Variables

```bash
# Root domain (without port, for production)
NEXT_PUBLIC_ROOT_DOMAIN=wirecrest.com

# Main domain (used in subdomain config - can include port for dev)
NEXT_PUBLIC_MAIN_DOMAIN=wirecrest.com

# NextAuth configuration (update with your production domain)
NEXTAUTH_URL=https://wirecrest.com
```

### Cookie Domain (if using domain-wide cookies)

If you need cookies to work across all subdomains:

```bash
# Optional: For domain-wide cookies
COOKIE_DOMAIN=.wirecrest.com
```

## 🎯 Step 4: Update Vercel Project Configuration

### In Vercel Dashboard → Settings → General:

1. **Root Directory**: `apps/dashboard` (if not already set)
2. **Build Command**: `cd ../.. && yarn install && yarn turbo build --filter=@wirecrest/dashboard --force`
3. **Install Command**: `cd ../.. && yarn install`
4. **Output Directory**: `.next`
5. **Node.js Version**: `20.x`

## 🔍 Step 5: Update Middleware Configuration (if needed)

The middleware already handles wildcard subdomains, but verify these environment variables are set:

Your `src/middleware.ts` uses:
- `NEXT_PUBLIC_ROOT_DOMAIN` (defaults to `wirecrest.local:3032` for dev)

Your `src/lib/subdomain-config.ts` uses:
- `NEXT_PUBLIC_MAIN_DOMAIN` (defaults to `wirecrest.local:3032` for dev)

Both should be set to `wirecrest.com` in production.

## ✅ Step 6: Verify Configuration

### Test Your Subdomains

After DNS propagation (can take 5 minutes to 48 hours):

1. **Main domain**: `https://wirecrest.com`
   - Should show landing page

2. **Auth subdomain**: `https://auth.wirecrest.com`
   - Should redirect to `/auth/sign-in` or show auth pages

3. **Admin subdomain**: `https://admin.wirecrest.com`
   - Should show super admin dashboard (if authenticated)

4. **Team subdomain**: `https://[any-team-slug].wirecrest.com`
   - Should route to team dashboard

### Check Vercel Domain Configuration

1. Go to **Settings → Domains** in Vercel
2. Verify `*.wirecrest.com` shows as **"Valid Configuration"**
3. Check individual subdomains if added separately

## 🔐 Step 7: SSL Certificates

Vercel automatically provisions SSL certificates for all domains you add, including wildcard subdomains. This happens automatically once DNS is configured correctly.

You can verify SSL in:
- **Settings → Domains** → Check certificate status
- Should show **"Valid"** with a green checkmark

## 🚨 Troubleshooting

### Issue: Subdomain returns 404 or doesn't route correctly

**Solution**: 
- Verify DNS has propagated: `dig *.wirecrest.com` or use online DNS checker
- Check that `NEXT_PUBLIC_ROOT_DOMAIN` environment variable is set correctly
- Verify middleware is running (check Vercel function logs)

### проблем: Wildcard domain shows "Invalid Configuration" in Vercel

**Solution**:
- Verify DNS record is correct (CNAME or синтетика records)
- Check that DNS has propagated (can take time)
- Ensure the wildcard record (`*`) is set, not individual subdomains

### Issue: Cookies not working across subdomains

**Solution**:
- Set `COOKIE_DOMAIN=.wirecrest.com` (with leading dot)
- Check NextAuth configuration for cookie settings
- Verify `NEXTAUTH_URL` includes the correct domain

### Issue: Both projects conflict on wirecrest.com

**Solution**:
Since you have two Vercel projects:
- **Project 1** (existing): `wirecrest.com` - Add this domain to this project
- **Project 2** (dashboard): `*.wirecrest.com` - Add wildcard domain to this project

Vercel will route:
- Exact match `wirecrest.com` → Project 1
- Any subdomain `*.wirecrest.com` → Project 2

### Issue: Build fails or packages not found

**Solution**:
- Verify build command navigates to monorepo root: `cd ../..`
- Check that all workspace packages are being built via Turbo
- Ensure `rootDirectory` is set to `apps/dashboard`

## 📝 Quick Checklist

- [ ] Added `*.wirecrest.com` domain in Vercel Dashboard
- [ ] Configured DNS wildcard record (`*` → `cname.vercel-dns.com`)
- [ ] Set `NEXT_PUBLIC_ROOT_DOMAIN=wirecrest.com` environment variable
- [ ] Set `NEXT_PUBLIC_MAIN_DOMAIN=wirecrest.com` environment variable
- [ ] Updated `NEXTAUTH_URL` to production domain
- [ ] Configured root directory to `apps/dashboard` in Vercel
- [ ] Verified SSL certificate is valid
- [ ] Tested main domain: `https://wirecrest.com`
- [ ] Tested auth subdomain: `https://auth.wirecrest.com`
- [ ] Tested team subdomain: `https://test-team.wirecrest.com`

## 🎉 Expected Behavior

After setup:

- ✅ `wirecrest.com` → Shows your other project (existing Vercel project)
- ✅ `*.wirecrest.com` → Routes to your dashboard app (new monorepo project)
- ✅ `auth.wirecrest.com` → Authentication pages
- ✅ `admin.wirecrest.com` → Super admin dashboard
- ✅ `[team-slug].wirecrest.com` → Team-specific dashboards

## 📚 Additional Resources

- [Vercel Custom Domains Documentation](https://vercel.com/docs/concepts/projects/domains)
- [Vercel Wildcard Domains](https://vercel.com/docs/concepts/projects/domains/add-a-domain#wildcard-domains)
- [DNS Propagation Checker](https://dnschecker.org/)

