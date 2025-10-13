# Critical Security Fixes Required

**Priority: 🔴 MUST FIX BEFORE PRODUCTION**

## 1. Webhook Security Token

### Current Issue
Webhooks are NOT secured - anyone can POST to our webhook endpoint.

### Files to Update

#### A. Update ApifyScheduleService.ts
```typescript
// In buildWebhookConfig()
private buildWebhookConfig(platform: Platform): ApifyWebhookConfig[] {
  const webhookSecret = process.env.APIFY_WEBHOOK_SECRET;
  
  if (!webhookSecret) {
    throw new Error('APIFY_WEBHOOK_SECRET environment variable is required');
  }

  return [
    {
      eventTypes,
      requestUrl: `${this.webhookBaseUrl}/webhooks/apify?token=${webhookSecret}`,
      payloadTemplate: JSON.stringify({
        platform,
        eventType: '{{eventType}}',
        actorRunId: '{{resource.id}}',
        datasetId: '{{resource.defaultDatasetId}}',
        status: '{{resource.status}}',
      }),
    },
  ];
}
```

#### B. Update ApifyTaskService.ts
```typescript
// In buildWebhookConfig()
private buildWebhookConfig(platform: Platform): ApifyWebhookConfig[] {
  const webhookSecret = process.env.APIFY_WEBHOOK_SECRET;
  
  if (!webhookSecret) {
    throw new Error('APIFY_WEBHOOK_SECRET environment variable is required');
  }

  return [
    {
      eventTypes,
      requestUrl: `${this.webhookBaseUrl}/webhooks/apify?token=${webhookSecret}`,
      payloadTemplate: JSON.stringify({
        platform,
        eventType: '{{eventType}}',
        actorRunId: '{{resource.id}}',
        datasetId: '{{resource.defaultDatasetId}}',
        status: '{{resource.status}}',
      }),
    },
  ];
}
```

#### C. Update ApifyWebhookController.ts
```typescript
async handleWebhook(req: Request, res: Response): Promise<void> {
  try {
    // 🔒 SECURITY: Verify webhook token
    const { token } = req.query;
    const expectedToken = process.env.APIFY_WEBHOOK_SECRET;
    
    if (!expectedToken) {
      console.error('APIFY_WEBHOOK_SECRET not configured');
      res.status(500).json({ error: 'Server configuration error' });
      return;
    }
    
    if (token !== expectedToken) {
      console.warn('Invalid webhook token received');
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    const payload: ApifyWebhookPayload = req.body;

    // ... rest of implementation
  } catch (error: any) {
    console.error('Error processing Apify webhook:', error);
    res.status(500).json({ error: 'Failed to process webhook' });
  }
}
```

#### D. Update ENVIRONMENT_VARIABLES.md
Add new required variable:

```markdown
### APIFY_WEBHOOK_SECRET

**Required:** Yes  
**Type:** String  
**Description:** Secret token to secure Apify webhooks. This prevents unauthorized webhook calls.

**How to set:**
```bash
# Generate a secure random token
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Add to .env
APIFY_WEBHOOK_SECRET=your_generated_token_here
```

**Security Note:** 
- Use a cryptographically secure random token
- Never commit this to version control
- Rotate periodically (e.g., every 90 days)
```

---

## 2. Webhook Idempotency

### Current Issue
Webhooks can be called multiple times for the same run, causing duplicate processing.

### Fix for ApifyWebhookController.ts

```typescript
async handleWebhook(req: Request, res: Response): Promise<void> {
  try {
    // 🔒 SECURITY: Verify webhook token
    const { token } = req.query;
    const expectedToken = process.env.APIFY_WEBHOOK_SECRET;
    
    if (!expectedToken) {
      console.error('APIFY_WEBHOOK_SECRET not configured');
      res.status(500).json({ error: 'Server configuration error' });
      return;
    }
    
    if (token !== expectedToken) {
      console.warn('Invalid webhook token received');
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    const payload: ApifyWebhookPayload = req.body;

    console.log(`📨 Apify webhook received: ${payload.eventType}`);

    // 🔄 IDEMPOTENCY: Check if already processed successfully
    const existingLog = await prisma.apifyWebhookLog.findFirst({
      where: {
        apifyRunId: payload.eventData.actorRunId,
        processingStatus: 'success',
      },
    });

    if (existingLog) {
      console.log(`✅ Webhook already processed successfully for run: ${payload.eventData.actorRunId}`);
      res.json({ received: true, skipped: true, reason: 'already_processed' });
      return;
    }

    // Log webhook (only if not already successful)
    await prisma.apifyWebhookLog.create({
      data: {
        apifyRunId: payload.eventData.actorRunId,
        eventType: payload.eventType,
        payload: payload as any,
        processingStatus: 'pending',
      },
    });

    // ... rest of implementation
  } catch (error: any) {
    console.error('Error processing Apify webhook:', error);
    res.status(500).json({ error: 'Failed to process webhook' });
  }
}
```

---

## 3. Add Scoped API Tokens (HIGH PRIORITY)

### Why
Using a single full-access token is a security risk. If compromised, attacker has full account access.

### How to Create Scoped Tokens

1. Go to https://console.apify.com/settings/integrations
2. Click "Create token"
3. Toggle "Limit token permissions"
4. Configure permissions:

#### Option A: Single Scoped Token (Recommended for Most Cases)

**Account-level permissions:**
- ✅ Actors → Run (all actors)
- ✅ Schedules → Create, Read, Update, Delete
- ✅ Datasets → Read
- ✅ Key-Value Stores → Read

**Run Actor permission mode:**
- ✅ **Restricted access** (safer - actors can only access their own data)

**Create storages:**
- ✅ Datasets
- ✅ Key-Value Stores

#### Option B: Multiple Scoped Tokens (Maximum Security)

Create 3 separate tokens:

**1. Scheduler Token (`APIFY_TOKEN_SCHEDULER`):**
- Account-level: Schedules → Create, Read, Update, Delete
- Account-level: Actors → Run
- Run mode: Restricted access

**2. Runner Token (`APIFY_TOKEN_RUNNER`):**
- Account-level: Actors → Run
- Run mode: Restricted access

**3. Reader Token (`APIFY_TOKEN_READER`):**
- Account-level: Datasets → Read
- Account-level: Key-Value Stores → Read

### Implementation

#### Option A (Single Scoped Token):
```typescript
// Just replace APIFY_TOKEN with your scoped token
// No code changes needed!
```

#### Option B (Multiple Tokens):
```typescript
// In service constructors
export class ApifyScheduleService {
  constructor(
    apifyToken: string = process.env.APIFY_TOKEN_SCHEDULER || process.env.APIFY_TOKEN,
    webhookBaseUrl: string
  ) {
    // ...
  }
}

export class ApifyTaskService {
  constructor(
    apifyToken: string = process.env.APIFY_TOKEN_RUNNER || process.env.APIFY_TOKEN,
    webhookBaseUrl: string
  ) {
    // ...
  }
}

export class ApifyDataSyncService {
  constructor(
    apifyToken: string = process.env.APIFY_TOKEN_READER || process.env.APIFY_TOKEN
  ) {
    // ...
  }
}
```

---

## 4. Add Firewall IP Allowlist (If Applicable)

### If your scraper service is behind a firewall:

Add these Apify webhook IPs to your allowlist:

```
3.215.64.207
13.216.80.7
13.216.180.86
34.224.107.31
34.236.208.85
44.198.219.104
44.207.71.44
44.207.141.205
52.4.20.206
52.203.255.236
```

### Verification
```bash
# Test webhook connectivity
curl -X POST https://your-scraper-api.com/webhooks/apify?token=your_secret \
  -H "Content-Type: application/json" \
  -d '{"test": true}'
```

---

## Implementation Order

1. **Generate webhook secret** (5 minutes)
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

2. **Add to environment** (2 minutes)
   ```bash
   echo "APIFY_WEBHOOK_SECRET=your_generated_token" >> .env
   ```

3. **Update ApifyScheduleService.ts** (10 minutes)
   - Add webhook secret to URL

4. **Update ApifyTaskService.ts** (10 minutes)
   - Add webhook secret to URL

5. **Update ApifyWebhookController.ts** (15 minutes)
   - Add token verification
   - Add idempotency check

6. **Test locally** (15 minutes)
   ```bash
   # Test with valid token
   curl -X POST "http://localhost:3000/webhooks/apify?token=your_secret" \
     -H "Content-Type: application/json" \
     -d '{"eventType": "ACTOR.RUN.SUCCEEDED", "eventData": {"actorRunId": "test"}}'
   
   # Test with invalid token (should fail)
   curl -X POST "http://localhost:3000/webhooks/apify?token=wrong" \
     -H "Content-Type: application/json" \
     -d '{"eventType": "ACTOR.RUN.SUCCEEDED", "eventData": {"actorRunId": "test"}}'
   ```

7. **Create scoped token** (30 minutes)
   - Go to Apify Console
   - Create scoped token
   - Test all operations

8. **Deploy to staging** (variable)
   - Update environment variables
   - Deploy
   - Monitor for errors

9. **Test with real Apify run** (15 minutes)
   - Trigger a test actor run
   - Verify webhook is received
   - Check logs

---

## Total Time Estimate: 2-3 hours

---

## Verification Checklist

- [ ] Webhook secret generated
- [ ] Environment variable set
- [ ] ApifyScheduleService.ts updated
- [ ] ApifyTaskService.ts updated
- [ ] ApifyWebhookController.ts updated
- [ ] ENVIRONMENT_VARIABLES.md updated
- [ ] Local tests pass (valid token)
- [ ] Local tests fail (invalid token)
- [ ] Idempotency works (duplicate calls skipped)
- [ ] Scoped token created (optional but recommended)
- [ ] Deployed to staging
- [ ] Real Apify webhook received and processed
- [ ] No security warnings in logs

