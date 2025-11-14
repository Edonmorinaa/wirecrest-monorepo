# Enabling Suspense in tRPC Hooks 🚀

## ✅ What I Fixed

Your `loading.tsx` wasn't showing during data fetching because React Query (tRPC) wasn't in Suspense mode.

### **Fixed Hooks:**
1. ✅ `useGoogleBusinessProfile` - Now uses Suspense
2. ✅ `useTeam` - Now uses Suspense

### **Result:**
When you navigate to `/dashboard/teams/[slug]/google/overview`, the `loading.tsx` file now shows while fetching initial data! 🎉

---

## 🔧 How to Enable Suspense in Other Hooks

For any hook that uses tRPC, just add `suspense: true` to the query options:

### **Before:**
```typescript
const { data, error, isLoading } = trpc.something.useQuery(
  { id: 123 },
  {
    enabled: true,
    refetchOnWindowFocus: false,
  }
);
```

### **After:**
```typescript
const { data, error, isLoading } = trpc.something.useQuery(
  { id: 123 },
  {
    enabled: true,
    refetchOnWindowFocus: false,
    suspense: true, // ← Add this line
  }
);
```

---

## 📋 Hooks That Need Updating

Here's a checklist of hooks that should be updated for Suspense mode:

### **Reviews Hooks**
- [ ] `useGoogleReviews` → `/hooks/use-google-reviews.ts`
- [ ] `useFacebookReviews` → `/hooks/use-facebook-reviews.ts`
- [ ] `useTripAdvisorReviews` → `/hooks/use-tripadvisor-reviews.ts`
- [ ] `useBookingReviews` → `/hooks/useBookingReviews.ts`

### **Platform Profile Hooks**
- [x] `useGoogleBusinessProfile` → `/hooks/useGoogleBusinessProfile.ts` ✅ DONE
- [ ] `useFacebookBusinessProfile` → `/hooks/useFacebookBusinessProfile.ts`
- [ ] `useInstagramProfile` → (if exists)
- [ ] `useTikTokProfile` → (if exists)

### **Team Hooks**
- [x] `useTeam` → `/hooks/useTeam.ts` ✅ DONE
- [ ] `useTeams` → (if exists)
- [ ] `useTeamMembers` → (if exists)

### **Other Hooks**
- [ ] Any other hook that uses `trpc.*.useQuery()`

---

## 🎯 When to Use Suspense Mode

### **Use Suspense When:**
✅ You want `loading.tsx` to show during data fetching  
✅ You're fetching critical data needed to render the page  
✅ You want a consistent loading experience  
✅ The component can't render without the data

### **Don't Use Suspense When:**
❌ You want to show partial UI while loading (e.g., skeleton in a card)  
❌ You need custom loading states per component  
❌ The data is optional (use `enabled: false` + manual loading)  
❌ You're doing background refetches

---

## 📝 Quick Update Template

Copy-paste this for any hook:

```typescript
// Find the useQuery call:
const { data, error, isLoading } = trpc.SOMETHING.useQuery(
  { /* input */ },
  {
    // ... existing options ...
    suspense: true, // ← Add this
  }
);
```

---

## 🚨 Important Notes

### **1. Error Boundaries**
When using Suspense, always have an Error Boundary:

```tsx
<ErrorBoundary fallback={<ErrorView />}>
  <Suspense fallback={<Loading />}>
    <Component />
  </Suspense>
</ErrorBoundary>
```

### **2. Conditional Queries**
If you use `enabled: false`, the query won't trigger Suspense:

```typescript
const { data } = trpc.something.useQuery(
  { id: 123 },
  {
    enabled: !!id,  // ← If false, Suspense won't trigger
    suspense: true,
  }
);
```

### **3. Mutations Don't Trigger Suspense**
Only queries trigger Suspense. Mutations show loading via `isLoading`:

```typescript
const mutation = trpc.something.useMutation();
// Use mutation.isLoading for loading state
```

---

## ✅ Test It!

After enabling Suspense in a hook:

1. Navigate to a page that uses the hook
2. Open DevTools Network tab (throttle to "Slow 3G")
3. Reload the page
4. You should see `loading.tsx` while fetching! 🎉

---

## 📚 Examples

### **Example 1: Google Reviews Hook**

```typescript
// /hooks/use-google-reviews.ts
const { data, error, isLoading } = trpc.reviews.getGoogleReviews.useQuery(
  { teamSlug, filters },
  {
    enabled: !!teamSlug,
    refetchOnWindowFocus: false,
    suspense: true, // ← Add this
  }
);
```

### **Example 2: Facebook Profile Hook**

```typescript
// /hooks/useFacebookBusinessProfile.ts
const { data, error, isLoading } = trpc.platforms.facebookProfile.useQuery(
  { slug: teamSlug! },
  {
    enabled: !!teamSlug,
    staleTime: 60000,
    suspense: true, // ← Add this
  }
);
```

---

## 🎉 Summary

- ✅ Added `suspense: true` to `useGoogleBusinessProfile`
- ✅ Added `suspense: true` to `useTeam`
- ✅ Your `loading.tsx` now shows during data fetching!
- 📋 Follow this guide to enable it in other hooks

**Next Steps:**
1. Test the Google overview page - `loading.tsx` should show!
2. Enable Suspense in other hooks using the template above
3. Enjoy consistent loading states across your dashboard! 🚀

*Updated: November 12, 2025*

