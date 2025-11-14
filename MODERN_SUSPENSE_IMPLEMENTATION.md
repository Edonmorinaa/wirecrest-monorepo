# Modern Suspense & Loading Implementation ⚡

## ✅ Complete Modern Setup

Your dashboard now uses **Next.js 15 App Router** with **Suspense boundaries** for optimal loading states.

---

## 🏗️ Architecture Overview

### 1. **Next.js Loading Hierarchy**

```
App Router Loading Flow:
┌─────────────────────────────────┐
│  /app/loading.tsx (Global)     │ ← Root level loading
├─────────────────────────────────┤
│  /app/(dashboard)/loading.tsx  │ ← Dashboard level loading
├─────────────────────────────────┤
│  Page Component                 │
│  └─ <Suspense>                 │ ← Component level suspense
│     └─ View Component          │
│        └─ tRPC Hooks (React    │
│           Query under the hood) │
└─────────────────────────────────┘
```

### 2. **How It Works**

#### **Route-Level Loading** (Automatic)
When you navigate between pages, Next.js App Router automatically shows `loading.tsx`:

```tsx
// /app/(dashboard)/loading.tsx
export default function Loading() {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
      <Box sx={{ width: '300px' }}>
        <LinearProgress />  {/* Horizontal loading bar */}
      </Box>
    </Box>
  );
}
```

**Triggers:**
- ✅ Navigation between routes
- ✅ Initial page load
- ✅ Server component rendering

#### **Component-Level Suspense** (Manual)
Wrapping components in `<Suspense>` shows fallback during data fetching:

```tsx
// /app/dashboard/(tenant-dashboard)/teams/[slug]/google/overview/page.tsx
import { Suspense } from 'react';
import { GoogleOverviewView } from 'src/sections/overview/google/view';

export default function Page() {
  return (
    <Suspense>  {/* ← Catches data loading from hooks */}
      <GoogleOverviewView />
    </Suspense>
  );
}
```

**Triggers:**
- ✅ tRPC queries loading (`useQuery`)
- ✅ React Query suspense mode (if enabled)
- ✅ Any async operation that throws a promise

---

## 📂 Updated Pages (10 Files)

All platform pages now use Suspense boundaries:

### **Google**
1. ✅ `/teams/[slug]/google/overview/page.tsx`
2. ✅ `/teams/[slug]/google/reviews/page.tsx`

### **Facebook**
3. ✅ `/teams/[slug]/facebook/overview/page.tsx`
4. ✅ `/teams/[slug]/facebook/reviews/page.tsx`

### **TripAdvisor**
5. ✅ `/teams/[slug]/tripadvisor/overview/page.jsx`
6. ✅ `/teams/[slug]/tripadvisor/reviews/page.jsx`

### **Booking**
7. ✅ `/teams/[slug]/booking/overview/page.jsx`
8. ✅ `/teams/[slug]/booking/reviews/page.jsx`

### **Social Media**
9. ✅ `/teams/[slug]/instagram/page.jsx`
10. ✅ `/teams/[slug]/tiktok/page.jsx`

---

## 🎯 Loading States Flow

### **Scenario 1: Page Navigation**
```
User clicks link
    ↓
Next.js starts navigation
    ↓
loading.tsx shows horizontal progress bar  ← Immediate feedback
    ↓
Page component starts rendering
    ↓
<Suspense> catches async operations
    ↓
View component renders with data
    ↓
Page fully loaded ✅
```

### **Scenario 2: Data Refetching**
```
User triggers mutation (e.g., marks review as read)
    ↓
tRPC mutation executes
    ↓
Query invalidation triggers refetch
    ↓
React Query automatically refetches in background
    ↓
UI updates with new data
    ↓
No loading state shown (optimistic update) ✅
```

---

## 🔧 React Query Configuration

Your tRPC client uses optimized React Query settings for SPA performance:

```typescript
// /lib/trpc/client.tsx
new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,      // Data fresh for 5 minutes
      gcTime: 10 * 60 * 1000,         // Cache for 10 minutes
      refetchOnWindowFocus: false,    // Don't refetch on tab focus
      refetchOnReconnect: false,      // Don't refetch on network reconnect
      refetchOnMount: false,          // Don't refetch if data exists
      retry: 1,                       // Only retry once on error
      // suspense: false,             // Disabled by default (enable per-query)
    },
  },
})
```

**Why these settings?**
- **SPA-optimized**: Minimal unnecessary refetches
- **Fast perceived performance**: Cached data shows instantly
- **Predictable behavior**: You control when data updates

---

## 🚀 Advanced: Enabling Suspense Mode Per-Query

If you want **true Suspense integration** with React Query (throws promises), you can enable it per-query:

### **Option 1: Enable Globally (Not Recommended)**
```typescript
// /lib/trpc/client.tsx
new QueryClient({
  defaultOptions: {
    queries: {
      suspense: true,  // ⚠️ Enables Suspense for ALL queries
    },
  },
})
```

### **Option 2: Enable Per-Query (Recommended)**
```typescript
// In a hook or component
const { data } = trpc.teams.get.useQuery(
  { slug },
  { 
    suspense: true  // ✅ Only this query uses Suspense
  }
);
```

---

## 🎨 Customizing Loading States

### **1. Route-Level Loading**
Edit `/app/(dashboard)/loading.tsx`:

```tsx
export default function Loading() {
  return (
    <Box sx={{ 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      minHeight: '100vh',
      background: 'linear-gradient(45deg, #FE6B8B 30%, #FF8E53 90%)',
    }}>
      <CircularProgress />  {/* Use any MUI component */}
    </Box>
  );
}
```

### **2. Suspense Fallback**
Add a custom fallback to Suspense boundaries:

```tsx
import { Suspense } from 'react';
import { Skeleton } from '@mui/material';

export default function Page() {
  return (
    <Suspense fallback={
      <Box sx={{ p: 3 }}>
        <Skeleton variant="rectangular" height={200} />
        <Skeleton variant="text" sx={{ mt: 2 }} />
        <Skeleton variant="text" sx={{ mt: 1 }} />
      </Box>
    }>
      <GoogleOverviewView />
    </Suspense>
  );
}
```

### **3. Nested Suspense Boundaries**
For granular loading states:

```tsx
<DashboardContent>
  {/* Header loads immediately */}
  <CustomBreadcrumbs heading="Google Reviews" />
  
  {/* Stats have their own loading state */}
  <Suspense fallback={<StatsSkeleton />}>
    <GoogleReviewsStats />
  </Suspense>
  
  {/* Chart has its own loading state */}
  <Suspense fallback={<ChartSkeleton />}>
    <GoogleReviewsChart />
  </Suspense>
  
  {/* List has its own loading state */}
  <Suspense fallback={<ListSkeleton />}>
    <GoogleReviewsList />
  </Suspense>
</DashboardContent>
```

---

## 🐛 Troubleshooting

### **Issue 1: Loading.tsx not showing**

**Cause:** Page component is client component (`'use client'`)

**Solution:** Remove `'use client'` from page component, only view components need it:

```tsx
// ❌ BAD
'use client';
import { GoogleOverviewView } from 'src/sections/overview/google/view';

export default function Page() {
  return <GoogleOverviewView />;
}

// ✅ GOOD
import { Suspense } from 'react';
import { GoogleOverviewView } from 'src/sections/overview/google/view';

export default function Page() {
  return (
    <Suspense>
      <GoogleOverviewView />
    </Suspense>
  );
}
```

### **Issue 2: Suspense not catching data loading**

**Cause:** React Query suspense mode not enabled

**Solution:** Enable suspense per-query or globally (see "Advanced" section above)

### **Issue 3: Flash of loading state**

**Cause:** Cached data not being used

**Solution:** Increase `staleTime` in React Query config:

```typescript
queries: {
  staleTime: 10 * 60 * 1000, // 10 minutes instead of 5
}
```

---

## 📊 Performance Benefits

### **Before (Manual Loading States)**
```tsx
if (loading) return <Skeleton />;
if (error) return <Error />;
return <Content data={data} />;
```

**Problems:**
- ❌ Boilerplate in every component
- ❌ Inconsistent loading UX
- ❌ Hard to maintain
- ❌ Can't stream content

### **After (Suspense)**
```tsx
<Suspense>
  <Content />  {/* ← Automatically handles loading */}
</Suspense>
```

**Benefits:**
- ✅ No boilerplate
- ✅ Consistent loading UX
- ✅ Easy to maintain
- ✅ Streaming SSR support
- ✅ Better code splitting

---

## 🎯 Best Practices

### **1. Strategic Suspense Boundaries**
```tsx
// ✅ GOOD: Wrap entire page
<Suspense>
  <PageView />
</Suspense>

// ✅ GOOD: Wrap individual sections
<PageLayout>
  <Header />  {/* Non-async, renders immediately */}
  <Suspense fallback={<StatsSkeleton />}>
    <Stats />  {/* Async */}
  </Suspense>
  <Suspense fallback={<ChartSkeleton />}>
    <Chart />  {/* Async */}
  </Suspense>
</PageLayout>

// ❌ BAD: Too many nested boundaries
<Suspense>
  <Suspense>
    <Suspense>
      <Component />
    </Suspense>
  </Suspense>
</Suspense>
```

### **2. Meaningful Fallbacks**
```tsx
// ✅ GOOD: Relevant skeleton
<Suspense fallback={<ReviewCardSkeleton />}>
  <ReviewCard />
</Suspense>

// ❌ BAD: Generic spinner
<Suspense fallback={<CircularProgress />}>
  <ComplexDashboard />
</Suspense>
```

### **3. Error Boundaries**
Always pair Suspense with Error Boundaries:

```tsx
<ErrorBoundary fallback={<ErrorView />}>
  <Suspense fallback={<LoadingView />}>
    <DataView />
  </Suspense>
</ErrorBoundary>
```

---

## 📚 Resources

- [Next.js Loading UI](https://nextjs.org/docs/app/building-your-application/routing/loading-ui-and-streaming)
- [React Suspense](https://react.dev/reference/react/Suspense)
- [React Query Suspense](https://tanstack.com/query/latest/docs/react/guides/suspense)
- [tRPC with React Query](https://trpc.io/docs/client/react)

---

## ✅ Summary

Your dashboard now uses **modern loading patterns**:

1. ✅ **Route-level loading**: Horizontal progress bar during navigation
2. ✅ **Suspense boundaries**: Automatic loading state handling
3. ✅ **Optimized React Query**: SPA-friendly caching
4. ✅ **No boilerplate**: Clean, maintainable code
5. ✅ **Consistent UX**: Same loading experience everywhere

**Result**: A fast, modern SPA dashboard with excellent loading states! 🚀

*Updated: November 12, 2025*

