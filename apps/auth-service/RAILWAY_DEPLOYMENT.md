# Auth Service - Railway Deployment Guide

This guide covers deploying the authentication service to Railway.

## 📋 Prerequisites

- Railway account (https://railway.app)
- GitHub repository access
- Database URL (PostgreSQL)
- NextAuth secret (must match dashboard)

## 🚀 Deployment Steps

### 1. Create Railway Project

1. Go to https://railway.app/new
2. Click **"Deploy from GitHub repo"**
3. Select your repository
4. Choose **"Configure"** instead of deploying immediately

### 2. Configure Service Settings

**Root Directory**: `apps/auth-service`

Railway will auto-detect:
- Framework: Node.js
- Build Command: `npm run build` or `yarn build`
- Start Command: `npm start` or `yarn start`

If not auto-detected, add these manually:

```json
{
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "cd ../.. && yarn install && yarn workspace @wirecrest/auth-service build"
  },
  "deploy": {
    "startCommand": "node dist/index.js",
    "healthcheckPath": "/health",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

### 3. Add Environment Variables

Click on **"Variables"** tab and add:

#### Required Variables

```bash
# Database
DATABASE_URL=postgresql://user:password@host:5432/dbname

# NextAuth (must match dashboard)
NEXTAUTH_SECRET=your-super-secret-key-here-min-32-chars
NEXTAUTH_URL=https://[your-service].up.railway.app

# Node Environment
NODE_ENV=production
PORT=3000

# CORS Configuration
ALLOWED_ORIGINS=https://yourdomain.com,https://*.yourdomain.com
```

#### Optional Variables

```bash
# Logging
LOG_LEVEL=info

# Session
SESSION_MAX_AGE=2592000

# Cookie Domain (for multi-tenancy)
COOKIE_DOMAIN=.yourdomain.com
```

### 4. Deploy

1. Click **"Deploy"**
2. Watch the build logs
3. Wait for deployment to complete (usually 2-3 minutes)

### 5. Get Service URL

Once deployed:
1. Click on your service
2. Go to **"Settings"** tab
3. Find **"Domains"** section
4. Copy the Railway-provided URL (e.g., `https://auth-service-production-xxxx.up.railway.app`)

### 6. Custom Domain (Optional)

To use a custom domain like `auth.yourdomain.com`:

1. In Railway, go to **"Settings"** → **"Domains"**
2. Click **"Add Domain"**
3. Enter `auth.yourdomain.com`
4. Add the CNAME record to your DNS:
   ```
   Type: CNAME
   Name: auth
   Value: [railway-provided-value]
   ```
5. Wait for DNS propagation and SSL provisioning

### 7. Update Dashboard Environment Variables

1. Go to your Vercel project
2. Navigate to **"Settings"** → **"Environment Variables"**
3. Add or update:
   ```bash
   AUTH_SERVICE_URL=https://[your-railway-url].up.railway.app
   ```
   Or if using custom domain:
   ```bash
   AUTH_SERVICE_URL=https://auth.yourdomain.com
   ```
4. Redeploy your dashboard

## 🧪 Testing

### Health Check

```bash
curl https://[your-railway-url].up.railway.app/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2025-01-13T12:00:00.000Z"
}
```

### Test Authentication Endpoint

```bash
curl -X POST https://[your-railway-url].up.railway.app/api/auth/signin \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "password123"}'
```

### Test CORS Headers

```bash
curl -I -X OPTIONS https://[your-railway-url].up.railway.app/api/auth/signin \
  -H "Origin: https://yourdomain.com" \
  -H "Access-Control-Request-Method: POST"
```

Should include CORS headers:
```
Access-Control-Allow-Origin: https://yourdomain.com
Access-Control-Allow-Methods: GET,DELETE,PATCH,POST,PUT,OPTIONS
Access-Control-Allow-Credentials: true
```

## 📊 Monitoring

### View Logs

1. Go to your Railway project
2. Click on the auth-service
3. Navigate to **"Deployments"** tab
4. Click on the active deployment
5. View real-time logs

### Metrics

Railway provides built-in metrics:
- CPU usage
- Memory usage
- Network traffic
- Request rate

Access via the **"Metrics"** tab.

## 🔧 Configuration

### Railway.json (Optional)

Create `apps/auth-service/railway.json` for advanced configuration:

```json
{
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "cd ../.. && yarn install && yarn workspace @wirecrest/auth-service build"
  },
  "deploy": {
    "startCommand": "node dist/index.js",
    "healthcheckPath": "/health",
    "healthcheckTimeout": 30,
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

### Nixpacks Configuration

Create `apps/auth-service/nixpacks.toml`:

```toml
[phases.setup]
nixPkgs = ["nodejs-20_x", "yarn"]

[phases.install]
cmds = ["cd ../.. && yarn install"]

[phases.build]
cmds = ["cd ../.. && yarn workspace @wirecrest/auth-service build"]

[start]
cmd = "node dist/index.js"
```

## 🐛 Troubleshooting

### Build Fails

**Error**: Cannot find module '@wirecrest/db'

**Solution**: Ensure build command includes monorepo root:
```bash
cd ../.. && yarn install && yarn workspace @wirecrest/auth-service build
```

### Service Crashes on Startup

**Check**:
1. Review deployment logs
2. Verify `DATABASE_URL` is accessible
3. Check `PORT` environment variable
4. Ensure all required environment variables are set

### CORS Errors

**Error**: CORS policy blocking requests

**Solution**:
1. Verify `ALLOWED_ORIGINS` includes dashboard domain
2. Ensure wildcard domains are properly formatted
3. Check middleware CORS configuration

### Database Connection Issues

**Error**: Cannot connect to database

**Solution**:
1. Verify `DATABASE_URL` is correct
2. Check database is accessible from Railway's network
3. Whitelist Railway's IP ranges if using firewall
4. Use connection pooling (recommended)

### Environment Variables Not Loading

**Solution**:
1. Restart the service after adding variables
2. Verify variable names have no typos
3. Check variables are set for production environment

## 🔒 Security Best Practices

- ✅ Use same `NEXTAUTH_SECRET` as dashboard
- ✅ Enable HTTPS only (automatic with Railway)
- ✅ Set restrictive CORS origins
- ✅ Use strong database credentials
- ✅ Rotate secrets regularly
- ✅ Enable Railway's built-in DDoS protection
- ✅ Monitor logs for suspicious activity

## 🚀 Scaling

Railway auto-scales based on:
- CPU usage
- Memory usage
- Request volume

Configure scaling in **"Settings"** → **"Resources"**:

- **Memory**: 512MB - 2GB (recommended: 1GB)
- **CPU**: Shared - Dedicated
- **Replicas**: 1-10 (horizontal scaling)

## 💰 Cost Optimization

- Use shared CPU for development
- Enable auto-sleep for low-traffic periods
- Monitor resource usage
- Set appropriate memory limits
- Use connection pooling to reduce database costs

## 📚 Additional Resources

- Railway Documentation: https://docs.railway.app
- Auth Service API: See `apps/auth-service/README.md`
- Deployment Checklist: See root `DEPLOYMENT_CHECKLIST.md`

---

**Last Updated**: 2025-01-13  
**Maintained By**: Wirecrest Engineering Team

