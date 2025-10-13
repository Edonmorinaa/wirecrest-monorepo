# Scraper Service - Railway Deployment Guide

This guide covers deploying the scraper service to Railway.

## 📋 Prerequisites

- Railway account (https://railway.app)
- GitHub repository access
- Database URL (PostgreSQL)
- Apify account with API token
- Stripe account (for webhook handling)

## 🚀 Deployment Steps

### 1. Create Railway Project

1. Go to https://railway.app/new
2. Click **"Deploy from GitHub repo"**
3. Select your repository
4. Choose **"Configure"** instead of deploying immediately

### 2. Configure Service Settings

**Root Directory**: `apps/scraper`

Railway will auto-detect:
- Framework: Node.js
- Build Command: `npm run build` or `yarn build`
- Start Command: `npm start` or `yarn start`

If not auto-detected, configure manually:

```json
{
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "cd ../.. && yarn install && yarn workspace scraper build"
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

# Apify Configuration
APIFY_API_TOKEN=apify_api_your_apify_token_here
APIFY_WEBHOOK_SECRET=your_webhook_secret_here
WEBHOOK_BASE_URL=https://[your-service].up.railway.app

# Stripe Configuration
STRIPE_SECRET_KEY=your_stripe_secret_key_here
STRIPE_WEBHOOK_SECRET=your_webhook_secret_here

# Node Environment
NODE_ENV=production
PORT=3001
```

#### Optional Variables

```bash
# Redis (for job queuing)
REDIS_URL=redis://default:xxxxx@xxxxx.upstash.io:6379

# Logging
LOG_LEVEL=info

# Application Settings
MAX_CONCURRENT_JOBS=5
JOB_TIMEOUT_MS=300000
RETRY_ATTEMPTS=3
RETRY_DELAY_MS=5000
```

### 4. Deploy

1. Click **"Deploy"**
2. Watch the build logs
3. Wait for deployment to complete (usually 2-4 minutes)

### 5. Get Service URL

Once deployed:
1. Click on your service
2. Go to **"Settings"** tab
3. Find **"Domains"** section
4. Copy the Railway-provided URL (e.g., `https://scraper-production-xxxx.up.railway.app`)

### 6. Custom Domain (Optional)

To use a custom domain like `scraper.yourdomain.com`:

1. In Railway, go to **"Settings"** → **"Domains"**
2. Click **"Add Domain"**
3. Enter `scraper.yourdomain.com`
4. Add the CNAME record to your DNS:
   ```
   Type: CNAME
   Name: scraper
   Value: [railway-provided-value]
   ```
5. Wait for DNS propagation and SSL provisioning

### 7. Configure Apify Webhook

1. Go to [Apify Console](https://console.apify.com/)
2. Navigate to **"Settings"** → **"Webhooks"**
3. Create a new webhook:
   - **Webhook URL**: `https://[your-railway-url].up.railway.app/api/webhook/apify`
   - **Events**: Select relevant events (run.succeeded, run.failed, etc.)
   - **Secret**: Use the same value as `APIFY_WEBHOOK_SECRET`
4. Save the webhook

### 8. Update Dashboard Environment Variables

1. Go to your Vercel project
2. Navigate to **"Settings"** → **"Environment Variables"**
3. Add or update:
   ```bash
   NEXT_PUBLIC_SCRAPER_API_URL=https://[your-railway-url].up.railway.app
   ```
   Or if using custom domain:
   ```bash
   NEXT_PUBLIC_SCRAPER_API_URL=https://scraper.yourdomain.com
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
  "timestamp": "2025-01-13T12:00:00.000Z",
  "version": "1.0.0"
}
```

### Test Scraping Job Creation

```bash
curl -X POST https://[your-railway-url].up.railway.app/api/scraping/jobs \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{
    "teamId": "team-123",
    "platform": "instagram",
    "profileUrl": "https://instagram.com/example"
  }'
```

### Test Webhook Endpoint

```bash
curl -X POST https://[your-railway-url].up.railway.app/api/webhook/apify \
  -H "Content-Type: application/json" \
  -H "X-Apify-Webhook-Secret: your-webhook-secret" \
  -d '{
    "test": true,
    "eventType": "run.succeeded"
  }'
```

### Test Stripe Webhook

```bash
# Use Stripe CLI to test webhooks
stripe listen --forward-to https://[your-railway-url].up.railway.app/api/webhook/stripe

stripe trigger customer.subscription.created
```

## 📊 Monitoring

### View Logs

1. Go to your Railway project
2. Click on the scraper service
3. Navigate to **"Deployments"** tab
4. Click on the active deployment
5. View real-time logs

### Metrics

Railway provides built-in metrics:
- CPU usage
- Memory usage
- Network traffic
- Request rate
- Job queue length (if using Redis)

Access via the **"Metrics"** tab.

### Job Monitoring

Monitor scraping jobs:

```bash
curl https://[your-railway-url].up.railway.app/api/scraping/jobs/stats \
  -H "Authorization: Bearer YOUR_API_KEY"
```

## 🔧 Configuration

### Railway.json (Optional)

Create `apps/scraper/railway.json`:

```json
{
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "cd ../.. && yarn install && yarn workspace scraper build"
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

Create `apps/scraper/nixpacks.toml`:

```toml
[phases.setup]
nixPkgs = ["nodejs-20_x", "yarn"]

[phases.install]
cmds = ["cd ../.. && yarn install"]

[phases.build]
cmds = ["cd ../.. && yarn workspace scraper build"]

[start]
cmd = "node dist/index.js"
```

## 🔄 Redis Setup (Optional but Recommended)

For job queuing and caching:

### Option 1: Railway Redis

1. In your Railway project, click **"New"** → **"Database"** → **"Redis"**
2. Railway will provision a Redis instance
3. Copy the connection URL
4. Add to environment variables as `REDIS_URL`

### Option 2: Upstash Redis

1. Go to https://console.upstash.com/
2. Create a new Redis database
3. Copy the Redis URL
4. Add to environment variables:
   ```bash
   REDIS_URL=redis://default:xxxxx@xxxxx.upstash.io:6379
   # Or use REST API
   UPSTASH_REDIS_REST_URL=https://xxxxx.upstash.io
   UPSTASH_REDIS_REST_TOKEN=xxxxxxxxxxxxx
   ```

## 🐛 Troubleshooting

### Build Fails

**Error**: Cannot find module '@wirecrest/db'

**Solution**: Ensure build command includes monorepo root:
```bash
cd ../.. && yarn install && yarn workspace scraper build
```

### Apify Webhook Not Received

**Check**:
1. Verify webhook URL is correct
2. Check `APIFY_WEBHOOK_SECRET` matches
3. Review Railway logs for incoming requests
4. Test webhook endpoint manually

**Debug**:
```bash
# Check webhook logs in Apify Console
# View Railway deployment logs
# Verify signature validation is working
```

### Scraping Jobs Failing

**Check**:
1. Verify Apify API token is valid
2. Check Apify account has sufficient credits
3. Review job error logs
4. Verify database connectivity

**Debug**:
```bash
# View Apify run logs
# Check Railway logs for errors
# Verify job payload is correct
```

### Database Connection Pool Exhausted

**Error**: Too many database connections

**Solution**:
1. Enable connection pooling in Prisma
2. Use PgBouncer or Supabase Pooler
3. Reduce `MAX_CONCURRENT_JOBS`
4. Implement proper connection cleanup

### Memory Issues

**Error**: Out of memory (OOM)

**Solution**:
1. Increase Railway memory allocation
2. Optimize job processing (batch processing)
3. Implement memory-efficient data handling
4. Add pagination for large datasets

### Stripe Webhook Signature Validation Fails

**Check**:
1. Verify `STRIPE_WEBHOOK_SECRET` is correct
2. Ensure raw body is used for signature validation
3. Check webhook endpoint in Stripe dashboard

## 🔒 Security Best Practices

- ✅ Validate all webhook signatures (Apify, Stripe)
- ✅ Use API keys for authentication
- ✅ Rate limit public endpoints
- ✅ Sanitize all inputs
- ✅ Use HTTPS only (automatic with Railway)
- ✅ Store secrets as environment variables
- ✅ Rotate API keys regularly
- ✅ Monitor for unusual activity
- ✅ Implement request logging

## 🚀 Scaling

### Horizontal Scaling

Configure in **"Settings"** → **"Resources"**:

- **Replicas**: 1-10
- Load balancing is automatic
- Session affinity can be configured

### Vertical Scaling

- **Memory**: 512MB - 8GB (recommended: 2GB)
- **CPU**: Shared - Dedicated (recommended: 2 vCPU)

### Job Queue Scaling

If using Redis for job queuing:
- Implement worker pool pattern
- Use Bull or BullMQ for advanced queue management
- Scale workers independently

### Rate Limiting

Implement rate limiting to prevent abuse:

```typescript
// In your scraper service
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', limiter);
```

## 💰 Cost Optimization

- Monitor Apify credit usage
- Implement caching to reduce API calls
- Use appropriate Railway plan
- Set job timeouts to prevent runaway processes
- Batch similar jobs together
- Use Redis for deduplication

## 📈 Performance Tips

1. **Connection Pooling**: Use database connection pooling
2. **Caching**: Cache frequently accessed data in Redis
3. **Batch Processing**: Process multiple jobs in batches
4. **Async Processing**: Use job queues for long-running tasks
5. **Monitoring**: Set up alerts for slow jobs
6. **Indexing**: Ensure database tables are properly indexed

## 📚 Additional Resources

- Railway Documentation: https://docs.railway.app
- Apify Documentation: https://docs.apify.com
- Scraper Service API: See `apps/scraper/README.md`
- Environment Variables: See `apps/scraper/ENVIRONMENT_VARIABLES.md`
- Deployment Checklist: See root `DEPLOYMENT_CHECKLIST.md`

---

**Last Updated**: 2025-01-13  
**Maintained By**: Wirecrest Engineering Team

