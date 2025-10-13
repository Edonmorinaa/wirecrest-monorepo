# Environment Variables Template

Copy these variables to your `.env` or `.env.local` file in the root of your project.

## Required for Database + Realtime Notifications

```bash
# Database Connection
DATABASE_URL=postgresql://user:password@localhost:5432/database_name

# Supabase (for realtime sync via postgres_changes)
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.xxxxxxxxxx...
```

## Required for Push Notifications

```bash
# VAPID Keys (for Web Push API)
# Generate these with: npx web-push generate-vapid-keys
VAPID_PUBLIC_KEY=BCxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
VAPID_PRIVATE_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
VAPID_SUBJECT=mailto:support@yourdomain.com
```

## Optional Configuration

```bash
# Notification expiration (in days)
NOTIFICATION_DEFAULT_EXPIRY_DAYS=30
```

---

## How to Get These Values

### Database URL

Your PostgreSQL connection string. Format:
```
postgresql://USERNAME:PASSWORD@HOST:PORT/DATABASE
```

### Supabase Credentials

1. Go to your Supabase project dashboard
2. Navigate to **Settings** → **API**
3. Copy:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### VAPID Keys

Generate new VAPID keys:

```bash
npx web-push generate-vapid-keys
```

This will output:
```
=======================================

Public Key:
BCxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

Private Key:
xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

=======================================
```

Copy these values to:
- `VAPID_PUBLIC_KEY` - The public key
- `VAPID_PRIVATE_KEY` - The private key
- `VAPID_SUBJECT` - Your support email (e.g., `mailto:support@yourdomain.com`)

---

## Quick Setup

1. Copy this template to your project root as `.env` or `.env.local`

2. Replace placeholder values with real values

3. Generate VAPID keys:
   ```bash
   npx web-push generate-vapid-keys
   ```

4. Restart your development server:
   ```bash
   npm run dev
   ```

5. Enable Supabase Realtime:
   - Go to: https://supabase.com/dashboard/project/_/database/replication
   - Enable replication for the `Notification` table
   - Enable INSERT, UPDATE, DELETE events

6. Test your setup:
   ```bash
   cd packages/notifications
   npx tsx scripts/diagnose-system.ts
   ```

---

## Production Environment

Make sure all these variables are also set in your production environment (Vercel, Railway, etc.):

- ✅ `DATABASE_URL`
- ✅ `NEXT_PUBLIC_SUPABASE_URL`
- ✅ `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- ✅ `VAPID_PUBLIC_KEY`
- ✅ `VAPID_PRIVATE_KEY`
- ✅ `VAPID_SUBJECT`

**Important:** Use production values (not development) in production environment.

