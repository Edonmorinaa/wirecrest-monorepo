# Admin API Documentation

**Complete guide to the scraper's admin API endpoints for manual control.**

---

## Authentication

⚠️ **IMPORTANT:** All admin endpoints should be protected by admin authentication middleware in production!

For now, these endpoints are publicly accessible for testing. Before deploying to production, add authentication middleware that verifies the request is coming from an authenticated admin user.

---

## Base URL

```
http://localhost:3001/api/admin
```

---

## Endpoints

### 1. List All Teams

Get a paginated list of all teams with their schedule status.

**Endpoint:** `GET /api/admin/teams`

**Query Parameters:**
- `page` (number, default: 1) - Page number
- `limit` (number, default: 50) - Results per page
- `hasSchedules` (boolean) - Filter by schedule presence
  - `true`: Only teams with schedules
  - `false`: Only teams without schedules
  - Omit: All teams

**Response:**
```json
{
  "success": true,
  "teams": [
    {
      "id": "team_xxx",
      "name": "Acme Corp",
      "stripeCustomerId": "cus_xxx",
      "subscription": {
        "status": "ACTIVE",
        "tier": "PROFESSIONAL"
      },
      "apifySchedules": [
        {
          "id": "sched_xxx",
          "platform": "google_reviews",
          "scheduleType": "reviews",
          "isActive": true
        }
      ],
      "_count": {
        "syncRecords": 42
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 150,
    "totalPages": 3
  }
}
```

**Example:**
```bash
curl http://localhost:3001/api/admin/teams?page=1&limit=20&hasSchedules=true
```

---

### 2. Get Team Status

Get detailed status information for a specific team.

**Endpoint:** `GET /api/admin/teams/:teamId/status`

**Response:**
```json
{
  "success": true,
  "team": {
    "id": "team_xxx",
    "name": "Acme Corp",
    "stripeCustomerId": "cus_xxx",
    "subscription": {
      "status": "ACTIVE",
      "tier": "PROFESSIONAL",
      "currentPeriodStart": "2025-01-01T00:00:00.000Z",
      "currentPeriodEnd": "2025-02-01T00:00:00.000Z"
    }
  },
  "schedules": {
    "total": 4,
    "active": 3,
    "details": [
      {
        "id": "sched_xxx",
        "apifyScheduleId": "apify_xxx",
        "platform": "google_reviews",
        "scheduleType": "reviews",
        "cronExpression": "0 */12 * * *",
        "nextRun": "2025-10-07T18:00:00.000Z",
        "isActive": true
      }
    ]
  },
  "businessProfiles": {
    "google": 10,
    "facebook": 5,
    "tripadvisor": 3,
    "booking": 2
  },
  "recentSyncs": [
    {
      "id": "sync_xxx",
      "platform": "google_reviews",
      "syncType": "recurring_reviews",
      "status": "completed",
      "startedAt": "2025-10-07T12:00:00.000Z",
      "completedAt": "2025-10-07T12:05:30.000Z",
      "reviewsProcessed": 120,
      "reviewsNew": 15,
      "reviewsDuplicate": 105
    }
  ],
  "features": {
    "enabledPlatforms": ["google_reviews", "facebook", "tripadvisor"],
    "maxLocations": 50,
    "reviewInterval": 12,
    "overviewInterval": 168
  }
}
```

**Example:**
```bash
curl http://localhost:3001/api/admin/teams/team_xxx/status
```

---

### 3. Manual Subscription Setup

Trigger a manual subscription setup for a team (initial fetch + schedule creation).

**Endpoint:** `POST /api/admin/teams/:teamId/setup`

**Body:**
```json
{
  "forceReset": false
}
```

**Parameters:**
- `forceReset` (boolean, default: false) - If true, delete existing schedules before creating new ones

**Response:**
```json
{
  "success": true,
  "message": "Subscription setup triggered",
  "teamId": "team_xxx",
  "forceReset": false,
  "result": {
    "initialFetches": [
      {
        "platform": "google_reviews",
        "status": "initiated",
        "apifyRunId": "run_xxx"
      }
    ],
    "schedulesCreated": [
      {
        "platform": "google_reviews",
        "scheduleType": "reviews",
        "apifyScheduleId": "schedule_xxx"
      }
    ]
  }
}
```

**Example:**
```bash
curl -X POST http://localhost:3001/api/admin/teams/team_xxx/setup \
  -H "Content-Type: application/json" \
  -d '{"forceReset": false}'
```

---

### 4. Manual Platform Sync

Trigger a manual sync for a specific platform.

**Endpoint:** `POST /api/admin/teams/:teamId/platforms/:platform/sync`

**Platforms:** `google_reviews`, `facebook`, `tripadvisor`, `booking`

**Body:**
```json
{
  "maxReviews": 100,
  "isInitial": false
}
```

**Parameters:**
- `maxReviews` (number, default: 100) - Max reviews to fetch
- `isInitial` (boolean, default: false) - Whether this is an initial fetch

**Response:**
```json
{
  "success": true,
  "message": "Platform sync triggered",
  "teamId": "team_xxx",
  "platform": "google_reviews",
  "identifiersCount": 10,
  "result": {
    "apifyRunId": "run_xxx",
    "status": "running",
    "startedAt": "2025-10-07T12:00:00.000Z",
    "estimatedCompletion": "2025-10-07T12:15:00.000Z"
  }
}
```

**Example:**
```bash
curl -X POST http://localhost:3001/api/admin/teams/team_xxx/platforms/google_reviews/sync \
  -H "Content-Type: application/json" \
  -d '{"maxReviews": 50, "isInitial": false}'
```

---

### 5. Refresh Schedules

Refresh schedules for a team (re-sync business identifiers).

**Endpoint:** `POST /api/admin/teams/:teamId/schedules/refresh`

**Response:**
```json
{
  "success": true,
  "message": "Schedules refreshed",
  "teamId": "team_xxx",
  "result": {
    "schedulesUpdated": 4,
    "identifiersUpdated": true
  }
}
```

**Example:**
```bash
curl -X POST http://localhost:3001/api/admin/teams/team_xxx/schedules/refresh
```

---

### 6. Pause All Schedules

Pause all schedules for a team.

**Endpoint:** `POST /api/admin/teams/:teamId/schedules/pause`

**Response:**
```json
{
  "success": true,
  "message": "Schedules paused",
  "teamId": "team_xxx",
  "result": {
    "schedulesPaused": 4
  }
}
```

**Example:**
```bash
curl -X POST http://localhost:3001/api/admin/teams/team_xxx/schedules/pause
```

---

### 7. Resume All Schedules

Resume all paused schedules for a team.

**Endpoint:** `POST /api/admin/teams/:teamId/schedules/resume`

**Response:**
```json
{
  "success": true,
  "message": "Schedules resumed",
  "teamId": "team_xxx",
  "totalSchedules": 4,
  "resumedCount": 4
}
```

**Example:**
```bash
curl -X POST http://localhost:3001/api/admin/teams/team_xxx/schedules/resume
```

---

### 8. Delete All Schedules

Delete all schedules for a team (both in Apify and database).

**Endpoint:** `DELETE /api/admin/teams/:teamId/schedules`

**Response:**
```json
{
  "success": true,
  "message": "Schedules deleted",
  "teamId": "team_xxx",
  "deletedCount": 4
}
```

**Example:**
```bash
curl -X DELETE http://localhost:3001/api/admin/teams/team_xxx/schedules
```

---

### 9. Trigger Specific Schedule

Manually trigger a specific schedule to run immediately.

**Endpoint:** `POST /api/admin/schedules/:scheduleId/trigger`

**Response:**
```json
{
  "success": true,
  "message": "Schedule triggered",
  "scheduleId": "sched_xxx",
  "platform": "google_reviews",
  "scheduleType": "reviews",
  "result": {
    "actorRunId": "run_xxx",
    "status": "running"
  }
}
```

**Example:**
```bash
curl -X POST http://localhost:3001/api/admin/schedules/sched_xxx/trigger
```

---

## Error Responses

All endpoints return consistent error responses:

```json
{
  "success": false,
  "error": "Error message here"
}
```

**Common HTTP Status Codes:**
- `200` - Success
- `400` - Bad Request (invalid parameters)
- `403` - Forbidden (platform not enabled)
- `404` - Not Found (team/schedule not found)
- `500` - Internal Server Error
- `503` - Service Unavailable (service not ready)

---

## Use Cases

### 1. Manual Onboarding
When a new team subscribes, trigger manual setup:

```bash
# 1. Check team status
curl http://localhost:3001/api/admin/teams/team_xxx/status

# 2. Trigger setup
curl -X POST http://localhost:3001/api/admin/teams/team_xxx/setup \
  -H "Content-Type: application/json" \
  -d '{"forceReset": false}'

# 3. Monitor status
curl http://localhost:3001/api/admin/teams/team_xxx/status
```

### 2. Fix Broken Schedules
If a team's schedules are broken, reset them:

```bash
# 1. Delete all schedules
curl -X DELETE http://localhost:3001/api/admin/teams/team_xxx/schedules

# 2. Re-create schedules
curl -X POST http://localhost:3001/api/admin/teams/team_xxx/setup \
  -H "Content-Type: application/json" \
  -d '{"forceReset": true}'
```

### 3. Manual Data Refresh
Trigger a manual sync for a specific platform:

```bash
curl -X POST http://localhost:3001/api/admin/teams/team_xxx/platforms/google_reviews/sync \
  -H "Content-Type: application/json" \
  -d '{"maxReviews": 200, "isInitial": false}'
```

### 4. Pause During Maintenance
Pause all schedules before maintenance:

```bash
curl -X POST http://localhost:3001/api/admin/teams/team_xxx/schedules/pause
```

Resume after maintenance:

```bash
curl -X POST http://localhost:3001/api/admin/teams/team_xxx/schedules/resume
```

---

## Integration with Dashboard

### Dashboard UI Components
The admin dashboard should use these endpoints to provide:

1. **Team List Page:**
   - Use `GET /api/admin/teams` with filters
   - Show schedule status and sync counts

2. **Team Detail Page:**
   - Use `GET /api/admin/teams/:teamId/status`
   - Display all schedules, recent syncs, features

3. **Manual Actions:**
   - "Setup" button → `POST /api/admin/teams/:teamId/setup`
   - "Sync Now" button → `POST /api/admin/teams/:teamId/platforms/:platform/sync`
   - "Refresh Schedules" → `POST /api/admin/teams/:teamId/schedules/refresh`
   - "Pause/Resume" → `POST /api/admin/teams/:teamId/schedules/pause|resume`

### Example React Hook
```typescript
import { useState } from 'react';

export function useAdminApi() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const triggerSetup = async (teamId: string, forceReset = false) => {
    setLoading(true);
    setError(null);
    
    try {
      const res = await fetch(`/api/admin/teams/${teamId}/setup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ forceReset }),
      });
      
      if (!res.ok) throw new Error('Setup failed');
      
      return await res.json();
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const triggerSync = async (teamId: string, platform: string, maxReviews = 100) => {
    setLoading(true);
    setError(null);
    
    try {
      const res = await fetch(`/api/admin/teams/${teamId}/platforms/${platform}/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ maxReviews, isInitial: false }),
      });
      
      if (!res.ok) throw new Error('Sync failed');
      
      return await res.json();
    } finally {
      setLoading(false);
    }
  };

  return { triggerSetup, triggerSync, loading, error };
}
```

---

## Security Considerations

### 1. Add Authentication Middleware

```typescript
// middleware/adminAuth.ts
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const user = req.user; // From session/JWT
  
  if (!user || !user.isAdmin) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  
  next();
}

// In server.ts
import { requireAdmin } from './middleware/adminAuth';

app.use('/api/admin', requireAdmin);
```

### 2. Add Rate Limiting

```typescript
import rateLimit from 'express-rate-limit';

const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many admin requests',
});

app.use('/api/admin', adminLimiter);
```

### 3. Add Audit Logging

```typescript
async function logAdminAction(action: string, userId: string, teamId: string, details: any) {
  await prisma.adminAuditLog.create({
    data: {
      action,
      userId,
      teamId,
      details,
      timestamp: new Date(),
      ipAddress: req.ip,
    },
  });
}
```

---

## Testing

### Automated Tests

```bash
# Run admin API tests
npm run test:admin
```

### Manual Testing Checklist

- [ ] List teams (with pagination)
- [ ] Get team status
- [ ] Trigger subscription setup
- [ ] Trigger platform sync
- [ ] Refresh schedules
- [ ] Pause schedules
- [ ] Resume schedules
- [ ] Delete schedules
- [ ] Trigger specific schedule
- [ ] Error handling (404, 403, 500)
- [ ] Concurrent requests
- [ ] Long-running operations

---

## Monitoring

### Key Metrics to Track
- Admin API request rate
- Average response time
- Error rate per endpoint
- Most used endpoints
- Teams managed per admin user

### Logging
All admin actions are logged with:
```
🔧 [ADMIN] Action description
teamId: team_xxx
result: {...}
```

Search logs with:
```bash
# View all admin actions
grep "\[ADMIN\]" logs/scraper.log

# View actions for specific team
grep "team_xxx" logs/scraper.log | grep "\[ADMIN\]"
```

---

## Troubleshooting

### "Service not ready" (503)
**Cause:** Services haven't initialized yet  
**Solution:** Wait a few seconds after server start

### "Schedule not found" (404)
**Cause:** Schedule was deleted or never created  
**Solution:** Use setup endpoint to recreate

### "Platform not enabled" (403)
**Cause:** Team's subscription doesn't include this platform  
**Solution:** Update subscription tier or enable feature

### "Failed to delete schedule"
**Cause:** Apify API error or network issue  
**Solution:** Retry or manually delete in Apify Console

---

## Future Enhancements

### Planned Features:
- [ ] Bulk operations (multiple teams at once)
- [ ] Schedule history and changelog
- [ ] Cost tracking per team
- [ ] Performance analytics
- [ ] Webhook replay functionality
- [ ] Real-time status updates (WebSocket)
- [ ] Export team data
- [ ] Clone team configuration

---

## Support

For issues or questions:
- Check logs: `grep "\[ADMIN\]" logs/scraper.log`
- Review team status: `GET /api/admin/teams/:teamId/status`
- Contact: support@wirecrest.com

