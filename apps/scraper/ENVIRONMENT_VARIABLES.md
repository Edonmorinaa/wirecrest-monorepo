# Environment Variables

This document lists all required and optional environment variables for the scraper service.

---

## 🔐 **Required Variables**

### Apify Configuration

```bash
# Your Apify API token
# Get from: https://console.apify.com/account/integrations
APIFY_API_TOKEN=apify_api_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Webhook secret for securing Apify webhooks (REQUIRED)
# Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# 🔴 CRITICAL: Must be set for webhook security
APIFY_WEBHOOK_SECRET=a1b2c3d4e5f67890abcdef1234567890abcdef1234567890abcdef1234567890

# Webhook base URL where Apify will send events
# Production: https://scraper-api.your-domain.com
# Development: Use ngrok or similar tunnel
WEBHOOK_BASE_URL=https://your-scraper-api.com
```

### Stripe Configuration

```bash
# Stripe secret key
# Get from: https://dashboard.stripe.com/apikeys
STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Stripe webhook secret for signature verification
# Get from: Stripe Dashboard -> Developers -> Webhooks
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### Database

```bash
# PostgreSQL connection string
DATABASE_URL=postgresql://user:password@localhost:5432/wirecrest
```

---

## ⚙️ **Optional Variables**

### Redis (for job queuing)

```bash
# Redis URL
REDIS_URL=redis://localhost:6379
```

### Application Settings

```bash
# Node environment (development, production, test)
NODE_ENV=production

# Port for the scraper service
PORT=3001

# Log level (error, warn, info, debug)
LOG_LEVEL=info
```

---

## 📋 **Dashboard Environment Variables**

The dashboard also needs to know about the scraper service:

```bash
# In apps/dashboard/.env
NEXT_PUBLIC_SCRAPER_API_URL=https://scraper-api.your-domain.com
```

---

## 🚀 **Production Setup**

### 1. Create `.env` file

```bash
cd apps/scraper
cp ENVIRONMENT_VARIABLES.md .env
# Edit .env with your actual values
```

### 2. Generate Apify Token

1. Go to https://console.apify.com/account/integrations
2. Create new API token
3. Copy token to `APIFY_API_TOKEN`

### 3. Setup Apify Webhooks

Webhooks are automatically configured when schedules are created by the `ApifyScheduleService`.

**Webhook URL:**
```
https://your-scraper-api.com/api/webhooks/apify
```

**Events:**
- `ACTOR.RUN.SUCCEEDED`
- `ACTOR.RUN.FAILED`
- `ACTOR.RUN.ABORTED`

### 4. Setup Stripe Webhooks

1. Go to https://dashboard.stripe.com/webhooks
2. Click "+ Add endpoint"
3. Enter endpoint URL: `https://your-scraper-api.com/webhooks/stripe`
4. Select events:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
5. Copy webhook signing secret to `STRIPE_WEBHOOK_SECRET`

### 5. Database Setup

```bash
# Navigate to db package
cd packages/db

# Run migrations
npx prisma migrate deploy

# Generate Prisma client
npx prisma generate
```

---

## 🧪 **Development Setup**

### Using Ngrok for Local Development

Apify and Stripe webhooks need publicly accessible URLs. Use ngrok:

```bash
# Install ngrok
brew install ngrok

# Start ngrok tunnel
ngrok http 3001

# Copy the HTTPS URL (e.g., https://abc123.ngrok.io)
# Add to .env:
WEBHOOK_BASE_URL=https://abc123.ngrok.io
```

### Test Mode Keys

For development, use Stripe test mode keys:

```bash
STRIPE_SECRET_KEY=sk_test_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_test_xxxxx
```

---

## ✅ **Verification Checklist**

Before deploying, verify:

- [ ] `APIFY_API_TOKEN` is valid and has necessary permissions
- [ ] `WEBHOOK_BASE_URL` is publicly accessible
- [ ] `STRIPE_SECRET_KEY` matches your Stripe account
- [ ] `STRIPE_WEBHOOK_SECRET` is configured in Stripe dashboard
- [ ] `DATABASE_URL` connects successfully
- [ ] Prisma migrations are applied
- [ ] Dashboard has `NEXT_PUBLIC_SCRAPER_API_URL` set

---

## 🔒 **Security Best Practices**

1. **Never commit `.env` files** to version control
2. **Use different keys** for development and production
3. **Rotate API keys** regularly
4. **Use secrets management** in production (AWS Secrets Manager, etc.)
5. **Restrict API key** permissions to minimum required

---

## 📚 **References**

- [Apify API Tokens](https://docs.apify.com/platform/integrations/api#api-token)
- [Apify Webhooks](https://docs.apify.com/platform/integrations/webhooks)
- [Stripe API Keys](https://stripe.com/docs/keys)
- [Stripe Webhooks](https://stripe.com/docs/webhooks)
- [Prisma Environment Variables](https://www.prisma.io/docs/guides/development-environment/environment-variables)

