# tRPC Testing Guide

## Testing Strategy for tRPC Implementation

This guide outlines how to test the tRPC implementation to ensure all routers, procedures, and migrations work correctly.

## 🎯 Testing Priorities

### 1. Authentication & Authorization (Critical)
- [ ] Test public procedures (no auth required)
- [ ] Test protected procedures (user auth required)
- [ ] Test admin procedures (admin role required)
- [ ] Test super admin procedures (super admin role required)
- [ ] Test team access validation

### 2. Core Router Functionality (High Priority)
- [ ] Teams router - CRUD operations
- [ ] Reviews router - Multi-platform reviews
- [ ] Billing router - Stripe integration
- [ ] Platforms router - All platform integrations
- [ ] Notifications router - Push notifications

### 3. Migrated Hooks (High Priority)
- [ ] useTeamsServerActions - Team operations
- [ ] useReviewsServerActions - Review operations
- [ ] Platform hooks - Google, Facebook, Instagram, TikTok, TripAdvisor, Booking

### 4. Edge Cases & Error Handling
- [ ] Invalid inputs (Zod validation)
- [ ] Missing/invalid team IDs
- [ ] Unauthorized access attempts
- [ ] Rate limiting
- [ ] Database errors

## 📝 Manual Testing Checklist

### Teams Router Testing

#### 1. List Teams (`trpc.teams.list`)
```typescript
// Test in browser console or React component:
const { data, isLoading } = trpc.teams.list.useQuery();
console.log('Teams:', data);
```

**Expected Results:**
- ✅ Returns array of teams user has access to
- ✅ Includes team members and counts
- ✅ Type-safe response
- ✅ Proper loading states

**Test Cases:**
- [ ] User with multiple teams
- [ ] User with single team
- [ ] User with no teams
- [ ] Super admin sees all teams

#### 2. Get Team (`trpc.teams.get`)
```typescript
const { data } = trpc.teams.get.useQuery({ slug: 'team-slug' });
```

**Test Cases:**
- [ ] Valid team slug (user is member)
- [ ] Valid team slug (user is NOT member) - should fail
- [ ] Invalid team slug - should return error
- [ ] Team with multiple members
- [ ] Team with pending invitations

#### 3. Create Team (`trpc.teams.create`)
```typescript
const createMutation = trpc.teams.create.useMutation();
await createMutation.mutateAsync({ name: 'Test Team' });
```

**Test Cases:**
- [ ] Valid team name
- [ ] Duplicate team name (should work with unique slug)
- [ ] Empty team name - should fail validation
- [ ] User becomes owner automatically
- [ ] Check cache invalidation

#### 4. Update Team (`trpc.teams.update`)
```typescript
const updateMutation = trpc.teams.update.useMutation();
await updateMutation.mutateAsync({
  slug: 'team-slug',
  name: 'New Name',
  domain: 'newdomain.com'
});
```

**Test Cases:**
- [ ] Update name only
- [ ] Update domain only
- [ ] Update both name and domain
- [ ] Non-owner tries to update - should fail
- [ ] Check cache invalidation

#### 5. Delete Team (`trpc.teams.delete`)
```typescript
const deleteMutation = trpc.teams.delete.useMutation();
await deleteMutation.mutateAsync({ slug: 'team-slug' });
```

**Test Cases:**
- [ ] Owner deletes team - should succeed
- [ ] Member tries to delete - should fail
- [ ] Non-member tries to delete - should fail
- [ ] Check cascade deletions
- [ ] Check cache invalidation

### Reviews Router Testing

#### 1. Get Google Reviews (`trpc.reviews.getGoogleReviews`)
```typescript
const { data } = trpc.reviews.getGoogleReviews.useQuery({
  slug: 'team-slug',
  filters: {
    rating: 5,
    hasResponse: false,
    page: 1,
    limit: 10
  }
});
```

**Test Cases:**
- [ ] Get all reviews (no filters)
- [ ] Filter by rating (1-5 stars)
- [ ] Filter by response status
- [ ] Filter by date range
- [ ] Pagination works correctly
- [ ] Sorting by date/rating

#### 2. Update Review Metadata (`trpc.reviews.updateGoogleMetadata`)
```typescript
const updateMutation = trpc.reviews.updateGoogleMetadata.useMutation();
await updateMutation.mutateAsync({
  slug: 'team-slug',
  reviewId: 'review-id',
  isRead: true,
  isImportant: true
});
```

**Test Cases:**
- [ ] Mark as read
- [ ] Mark as important
- [ ] Update both flags
- [ ] Non-team-member tries to update - should fail
- [ ] Check cache invalidation

### Platforms Router Testing

#### 1. Get Google Profile (`trpc.platforms.googleProfile`)
```typescript
const { data, isLoading } = trpc.platforms.googleProfile.useQuery({
  slug: 'team-slug'
});
```

**Test Cases:**
- [ ] Team with Google profile
- [ ] Team without Google profile
- [ ] Check all nested relations (reviews, overview, etc.)
- [ ] Loading states work correctly
- [ ] Error handling for API failures

#### 2. Trigger Instagram Snapshot (`trpc.platforms.triggerInstagramSnapshot`)
```typescript
const snapshotMutation = trpc.platforms.triggerInstagramSnapshot.useMutation();
await snapshotMutation.mutateAsync({ slug: 'team-slug' });
```

**Test Cases:**
- [ ] Successful snapshot trigger
- [ ] Team without Instagram profile - error handling
- [ ] Rate limiting (prevent multiple rapid triggers)
- [ ] Cache updates after snapshot

### Billing Router Testing

#### 1. Get Subscription Info (`trpc.billing.getSubscriptionInfo`)
```typescript
const { data } = trpc.billing.getSubscriptionInfo.useQuery({
  slug: 'team-slug'
});
```

**Test Cases:**
- [ ] Team with active subscription
- [ ] Team on trial
- [ ] Team with canceled subscription
- [ ] Team with no subscription
- [ ] Check feature entitlements

#### 2. Create Checkout Session (`trpc.billing.createCheckoutSession`)
```typescript
const checkoutMutation = trpc.billing.createCheckoutSession.useMutation();
const { url } = await checkoutMutation.mutateAsync({
  slug: 'team-slug',
  priceId: 'price_xxx',
  successUrl: '/success',
  cancelUrl: '/cancel'
});
```

**Test Cases:**
- [ ] Valid price ID
- [ ] Invalid price ID - error handling
- [ ] Returns valid Stripe checkout URL
- [ ] Subscription upgrade flow
- [ ] Subscription downgrade flow

### Authentication & Authorization Testing

#### 1. Public Procedures (No Auth)
```typescript
// Health check
const { data } = trpc.health.check.useQuery();
// Should work without authentication
```

**Test Cases:**
- [ ] Unauthenticated user can call public procedures
- [ ] Returns expected data
- [ ] No session required

#### 2. Protected Procedures (User Auth)
```typescript
// Get team (requires authentication)
const { data } = trpc.teams.get.useQuery({ slug: 'test-team' });
// Should fail if not authenticated
```

**Test Cases:**
- [ ] Authenticated user can access
- [ ] Unauthenticated user gets 401 UNAUTHORIZED
- [ ] Session validation works correctly

#### 3. Admin Procedures (Admin Role)
```typescript
// Get all tenants (requires admin role)
const { data } = trpc.tenants.list.useQuery();
```

**Test Cases:**
- [ ] Admin user can access
- [ ] Regular user gets 403 FORBIDDEN
- [ ] Super admin can access
- [ ] Role validation works correctly

#### 4. Super Admin Procedures
```typescript
// Get all teams (super admin only)
const { data } = trpc.superadmin.allTeams.useQuery();
```

**Test Cases:**
- [ ] Super admin can access
- [ ] Regular admin gets 403 FORBIDDEN
- [ ] Regular user gets 403 FORBIDDEN

#### 5. Team Access Validation
```typescript
// Get team details
const { data } = trpc.teams.get.useQuery({ slug: 'other-team' });
```

**Test Cases:**
- [ ] Team member can access their team
- [ ] Non-member cannot access other teams
- [ ] Owner has full access
- [ ] Member has limited access based on role

## 🧪 Integration Testing Scenarios

### Scenario 1: New User Onboarding
```
1. User signs up ✅
2. Create first team ✅
3. Team appears in list ✅
4. User is owner ✅
5. Invite team member ✅
6. Check invitation sent ✅
```

### Scenario 2: Review Management Flow
```
1. Get Google reviews ✅
2. Filter unread reviews ✅
3. Mark review as read ✅
4. Generate AI response ✅
5. Update review metadata ✅
6. Check cache updated ✅
```

### Scenario 3: Subscription Upgrade
```
1. Get current subscription ✅
2. Check feature access ✅
3. Create checkout session ✅
4. Complete payment (Stripe) ✅
5. Webhook updates subscription ✅
6. Cache invalidated ✅
7. New features accessible ✅
```

### Scenario 4: Platform Integration
```
1. Add Google place ID ✅
2. Trigger verification ✅
3. Profile created ✅
4. Reviews synced ✅
5. Data appears in UI ✅
6. Analytics updated ✅
```

## 🔍 Testing Tools & Setup

### Browser Console Testing
```typescript
// Access tRPC client in browser
const trpc = window.__NEXT_DATA__.props.pageProps.trpc;

// Or import in component
import { trpc } from 'src/lib/trpc/client';

// Test queries
const result = await trpc.teams.list.fetch();
console.log(result);

// Test mutations
const create = trpc.teams.create.useMutation();
await create.mutateAsync({ name: 'Test' });
```

### React Query DevTools
```typescript
// Add to layout for debugging
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

<TRPCReactProvider>
  {children}
  <ReactQueryDevtools initialIsOpen={false} />
</TRPCReactProvider>
```

### Network Tab Inspection
1. Open browser DevTools → Network tab
2. Filter by `/api/trpc`
3. Check request/response payloads
4. Verify proper batching
5. Check authentication headers

## 📊 Test Coverage Goals

### By Router
- [ ] Teams: 100% (15/15 procedures)
- [ ] Reviews: 100% (8/8 procedures)
- [ ] Billing: 100% (8/8 procedures)
- [ ] Platforms: 90% (14/16 procedures) - Skip Instagram/TikTok if no test accounts
- [ ] Notifications: 80% (10/13 procedures)
- [ ] Admin: 75% (requires admin account)
- [ ] Superadmin: 75% (requires super admin account)

### By Feature
- [ ] Authentication: 100%
- [ ] Authorization: 100%
- [ ] Input validation: 100%
- [ ] Error handling: 90%
- [ ] Cache invalidation: 100%
- [ ] Type safety: 100% (TypeScript compilation)

## ⚠️ Known Issues to Test

### Type Mismatches
- [ ] `billing.router.ts` - Session type
- [ ] `platforms.router.ts` - Function signatures
- [ ] `invoices.router.ts` - Parameter types
- [ ] `admin.router.ts` - Platform enum types

### Edge Cases
- [ ] Empty teams list
- [ ] Deleted team access
- [ ] Expired sessions
- [ ] Rate limiting
- [ ] Concurrent mutations

## ✅ Testing Completion Criteria

### Phase 1: Critical Paths (Must Pass)
- [x] All routers load without TypeScript errors
- [ ] Authentication middleware works correctly
- [ ] Protected procedures check auth
- [ ] Admin procedures check roles
- [ ] Team access validation works

### Phase 2: Core Functionality (Should Pass)
- [ ] All migrated hooks work correctly
- [ ] Cache invalidation triggers properly
- [ ] Error messages are user-friendly
- [ ] Loading states display correctly
- [ ] Optimistic updates work

### Phase 3: Edge Cases (Nice to Have)
- [ ] Handle network errors gracefully
- [ ] Retry logic works
- [ ] Timeout handling
- [ ] Concurrent request handling
- [ ] Memory leak prevention

## 🚀 Testing Workflow

### 1. Development Testing (Ongoing)
```bash
# Start dev server
npm run dev

# Open React Query DevTools
# Test each procedure manually
# Check Network tab for API calls
# Verify responses
```

### 2. Manual Testing Session (1-2 hours)
- Go through all checklist items
- Document any issues found
- Create bug reports for failures
- Verify fixes

### 3. User Acceptance Testing
- Have team members test migrated features
- Collect feedback
- Prioritize issues
- Fix critical bugs

### 4. Production Monitoring
- Monitor error rates
- Check performance metrics
- Review user reports
- Gradual rollout

## 📝 Testing Log Template

```markdown
## Test Session: [Date]

### Environment
- Browser: Chrome 120
- User Role: Owner
- Team: test-team-slug

### Tests Executed

#### trpc.teams.list
- Status: ✅ Pass
- Time: 245ms
- Notes: Returned 3 teams correctly

#### trpc.teams.create
- Status: ❌ Fail
- Error: Validation error on empty name
- Notes: Need to add better error message

### Issues Found
1. [High] Team creation fails silently
2. [Medium] Loading state flickers
3. [Low] Type error in console (non-blocking)

### Next Steps
- Fix validation error messages
- Investigate loading state issue
- Clean up console warnings
```

## 🎯 Success Metrics

- **Error Rate**: < 1% of requests
- **Response Time**: < 300ms average
- **Type Safety**: 100% coverage
- **Test Coverage**: > 80% of procedures tested
- **User Satisfaction**: No critical bugs reported
- **Performance**: No degradation vs server actions

## 📚 Resources

- [tRPC Testing Docs](https://trpc.io/docs/server/testing)
- [React Query Testing](https://tanstack.com/query/latest/docs/guides/testing)
- [Next.js Testing](https://nextjs.org/docs/testing)
- Project: `TRPC_IMPLEMENTATION_COMPLETE.md`
- Project: `TRPC_MIGRATION_PROGRESS.md`

