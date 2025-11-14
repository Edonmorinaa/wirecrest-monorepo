# tRPC Implementation Status

## Overview

This document tracks the progress of migrating the Next.js dashboard from REST API routes and server actions to tRPC v11.

**Target**: 
- 173 server action functions across 30 files
- 33 API route handlers in `/app/api`
- Complete type safety from client to server

## Phase 1: Foundation ✅ COMPLETE

- ✅ Installed tRPC v11, React Query, and SuperJSON dependencies
- ✅ Created core tRPC setup (trpc.ts, context.ts, root.ts)
- ✅ Created tRPC API handler at `/app/api/trpc/[trpc]/route.ts`
- ✅ Setup TRPCReactProvider and wrapped root layout
- ✅ Configured SuperJSON transformer
- ✅ Setup authentication middleware (public, protected, admin, superAdmin)

## Phase 2: Routers Created ✅ (5/17 Complete)

### ✅ Completed Routers

1. **teams.router.ts** ✅
   - 15 procedures covering all team management
   - Team CRUD, members, invitations, API keys
   - Schema: `teams.schema.ts`

2. **reviews.router.ts** ✅
   - 6 procedures for review management
   - Google, Facebook, TripAdvisor reviews
   - Review metadata updates
   - Schema: `reviews.schema.ts`

3. **billing.router.ts** ✅
   - 8 procedures for billing operations
   - Payment methods, subscriptions, invoices
   - Checkout and portal sessions
   - Schema: `billing.schema.ts`

4. **health.router.ts** ✅
   - 1 procedure for health checks
   - Database connectivity verification

5. **utils.router.ts** ✅
   - 5 procedures for utilities
   - Invitations, AI suggestions, SAML, workflows
   - Schema: `utils.schema.ts`

### 🚧 Remaining Routers (12 routers)

6. **admin.router.ts** ⏳
   - 14 procedures needed
   - Market identifiers, platform actions, AI responses
   - Source: `actions/admin.ts` (1556 lines)

7. **platforms.router.ts** ⏳
   - 16 procedures needed
   - Facebook, Instagram, Google, TikTok integrations
   - Source: `actions/platforms.ts`

8. **invoices.router.ts** ⏳
   - 19 procedures needed (merge multiple files)
   - Sources: `invoices.ts`, `invoice-management.ts`, `invoice-bulk.ts`, `invoice-line-items.ts`
   - Invoice CRUD, calculate, finalize, pay, void, share

9. **tenants.router.ts** ⏳
   - 6 procedures needed
   - Multi-tenancy management
   - Source: `actions/tenants.ts`

10. **tenant-features.router.ts** ⏳
    - 4 procedures needed
    - Feature flag management
    - Source: `actions/tenant-features.ts`

11. **tenant-quotas.router.ts** ⏳
    - Quota management procedures
    - Source: `actions/tenant-quotas.ts`

12. **oauth.router.ts** ⏳
    - 7 procedures needed
    - SSO connections, OAuth flows
    - Source: `actions/oauth.ts`

13. **dsync.router.ts** ⏳
    - 7 procedures needed
    - Directory sync providers and connections
    - Source: `actions/dsync.ts`

14. **webhooks.router.ts** ⏳
    - 6 procedures needed
    - Webhook management, Stripe webhooks
    - Source: `actions/webhooks.ts`

15. **notifications.router.ts** ⏳
    - 14 procedures needed (merge multiple files)
    - Sources: `notifications.ts`, `push-notifications.ts`
    - Push subscriptions, notifications CRUD

16. **ai.router.ts** ⏳
    - AI reply generation procedures
    - Source: extracted from `actions/admin.ts`

17. **superadmin.router.ts** ⏳
    - 6 procedures needed
    - Super admin team management
    - Source: `actions/superadmin.ts`

## Phase 3: Client Migration (Not Started)

### Tasks Remaining:

1. **Update React Components** ⏳
   - Replace server action calls with tRPC hooks
   - Convert `useQuery` and `useMutation` patterns
   - Estimated: 50-100 components affected

2. **Replace fetch/axios calls** ⏳
   - Find all `/api/*` fetch calls
   - Replace with tRPC client
   - Estimated: 30-50 locations

3. **Convert SWR Hooks** ⏳
   - Migrate chat.js, kanban.js, mail.js, etc.
   - Replace with tRPC useQuery
   - Estimated: 8 files

## Phase 4: Testing & Cleanup (Not Started)

1. **Testing** ⏳
   - Test all authentication flows
   - Verify role-based access control
   - Test team access validation
   - Integration testing for each router

2. **Cleanup** ⏳
   - Delete deprecated API route files (keep webhooks & auth)
   - Delete or deprecate server action files
   - Update imports across codebase
   - Remove unused axios configuration

## Progress Summary

- **Foundation**: 100% complete (4/4 tasks)
- **Routers**: 29% complete (5/17 routers)
- **Client Migration**: 0% complete (0/3 tasks)
- **Testing & Cleanup**: 0% complete (0/2 tasks)

**Overall Progress**: ~20% complete

## Next Steps (Priority Order)

1. Create remaining routers (12 more)
2. Update all Zod schemas for validation
3. Begin client-side migration
4. Comprehensive testing
5. Clean up deprecated code

## Files Created

### Core tRPC Files
- `src/server/trpc/context.ts`
- `src/server/trpc/trpc.ts`
- `src/server/trpc/root.ts`
- `src/app/api/trpc/[trpc]/route.ts`
- `src/lib/trpc/client.tsx`
- `src/lib/trpc/server.ts`

### Router Files
- `src/server/trpc/routers/teams.router.ts`
- `src/server/trpc/routers/reviews.router.ts`
- `src/server/trpc/routers/billing.router.ts`
- `src/server/trpc/routers/health.router.ts`
- `src/server/trpc/routers/utils.router.ts`

### Schema Files
- `src/server/trpc/schemas/teams.schema.ts`
- `src/server/trpc/schemas/reviews.schema.ts`
- `src/server/trpc/schemas/billing.schema.ts`
- `src/server/trpc/schemas/utils.schema.ts`

## Notes

- External scraper API calls remain unchanged (as per plan)
- Next-Auth integration working correctly
- SuperJSON transformer handling Date/Map/Set serialization
- All routers use proper error codes (TRPCError)
- Type inference working end-to-end

## Estimated Time to Complete

- Remaining routers: ~8-12 hours
- Client migration: ~6-8 hours
- Testing: ~4-6 hours
- Cleanup: ~2-3 hours

**Total remaining**: 20-29 hours of development work

