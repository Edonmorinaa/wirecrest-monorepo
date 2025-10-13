# Slug to TeamId Pattern for PageGate

## ✅ The Pattern

Use this pattern for all dashboard pages that use `[slug]` in the route:

```tsx
import { Feature } from '@wirecrest/feature-flags';
import { PageGate } from '@/components/gates/PageGate';
import { getTenantBySlug } from '@/actions/tenants';
import { notFound } from 'next/navigation';
import { YourViewComponent } from 'src/sections/...';

// Server Component (no 'use client')
export default async function Page({ params }: { params: { slug: string } }) {
  const { slug } = params;
  
  // Fetch tenant by slug
  const tenant = await getTenantBySlug(slug);
  
  // Handle case where tenant is not found
  if (!tenant) {
    notFound();
  }

  return (
    <PageGate feature={Feature.YourFeature} teamId={tenant.id}>
      <YourViewComponent />
    </PageGate>
  );
}
```

## 📋 Apply to All Pages

### Google Pages

```tsx
// app/dashboard/teams/[slug]/google/overview/page.tsx
<PageGate feature={Feature.Google.Overview} teamId={tenant.id}>
  <GoogleOverviewView />
</PageGate>

// app/dashboard/teams/[slug]/google/reviews/page.tsx
<PageGate feature={Feature.Google.Reviews} teamId={tenant.id}>
  <GoogleReviewsView />
</PageGate>
```

### Facebook Pages

```tsx
// app/dashboard/teams/[slug]/facebook/overview/page.tsx
<PageGate feature={Feature.Facebook.Overview} teamId={tenant.id}>
  <FacebookOverviewView />
</PageGate>

// app/dashboard/teams/[slug]/facebook/reviews/page.tsx
<PageGate feature={Feature.Facebook.Reviews} teamId={tenant.id}>
  <FacebookReviewsView />
</PageGate>
```

### TripAdvisor Pages

```tsx
// app/dashboard/teams/[slug]/tripadvisor/overview/page.tsx
<PageGate feature={Feature.TripAdvisor.Overview} teamId={tenant.id}>
  <TripAdvisorOverviewView />
</PageGate>

// app/dashboard/teams/[slug]/tripadvisor/reviews/page.tsx
<PageGate feature={Feature.TripAdvisor.Reviews} teamId={tenant.id}>
  <TripAdvisorReviewsView />
</PageGate>
```

### Booking Pages

```tsx
// app/dashboard/teams/[slug]/booking/overview/page.tsx
<PageGate feature={Feature.Booking.Overview} teamId={tenant.id}>
  <BookingOverviewView />
</PageGate>

// app/dashboard/teams/[slug]/booking/reviews/page.tsx
<PageGate feature={Feature.Booking.Reviews} teamId={tenant.id}>
  <BookingReviewsView />
</PageGate>
```

### Instagram Pages

```tsx
// app/dashboard/teams/[slug]/instagram/overview/page.tsx
<PageGate feature={Feature.Instagram.Overview} teamId={tenant.id}>
  <InstagramOverviewView />
</PageGate>

// app/dashboard/teams/[slug]/instagram/analytics/page.tsx
<PageGate feature={Feature.Instagram.Analytics} teamId={tenant.id}>
  <InstagramAnalyticsView />
</PageGate>
```

### TikTok Pages

```tsx
// app/dashboard/teams/[slug]/tiktok/overview/page.tsx
<PageGate feature={Feature.TikTok.Overview} teamId={tenant.id}>
  <TikTokOverviewView />
</PageGate>

// app/dashboard/teams/[slug]/tiktok/analytics/page.tsx
<PageGate feature={Feature.TikTok.Analytics} teamId={tenant.id}>
  <TikTokAnalyticsView />
</PageGate>
```

### Dashboard Home (No Specific Feature)

```tsx
// app/dashboard/teams/[slug]/page.tsx
<PageGate teamId={tenant.id}>
  <DashboardHomeView />
</PageGate>
```

## 🔑 Key Points

1. **Remove 'use client'** - Server components can use async/await
2. **Use async function** - Required to await getTenantBySlug
3. **Handle null case** - Call notFound() if tenant doesn't exist
4. **Pass tenant.id** - Not the slug, pass the actual team ID

## ⚠️ Common Mistakes to Avoid

### ❌ Wrong: Using 'use client' with await

```tsx
'use client'; // DON'T DO THIS

export default async function Page() { // Can't use async with 'use client'
  const tenant = await getTenantBySlug(slug); // Won't work
}
```

### ❌ Wrong: Not handling null case

```tsx
const tenant = await getTenantBySlug(slug);
// Missing null check!
return <PageGate teamId={tenant.id}> // Will crash if tenant is null
```

### ❌ Wrong: Passing slug instead of ID

```tsx
<PageGate teamId={slug}> // WRONG - pass tenant.id not slug
```

### ✅ Correct: Server component with null check

```tsx
export default async function Page({ params }) {
  const { slug } = params;
  const tenant = await getTenantBySlug(slug);
  
  if (!tenant) {
    notFound();
  }

  return <PageGate teamId={tenant.id}>...</PageGate>;
}
```

## 🚀 Quick Migration Script

For each page file:

1. Remove `'use client'` directive
2. Remove `useParams()` hook
3. Add `async` to function
4. Get params from function parameter
5. Add `getTenantBySlug` import
6. Add `notFound` import
7. Fetch tenant and handle null case
8. Pass `tenant.id` to PageGate

## 📝 Example: Before and After

### Before

```tsx
'use client';

import { useParams } from 'next/navigation';
import { PageGate } from '@/components/gates/PageGate';
import { Feature } from '@wirecrest/feature-flags';

export default function Page() {
  const params = useParams();
  const { slug } = params;

  return (
    <PageGate feature={Feature.Google.Overview} teamId={slug}>
      <GoogleOverviewView />
    </PageGate>
  );
}
```

### After

```tsx
import { Feature } from '@wirecrest/feature-flags';
import { PageGate } from '@/components/gates/PageGate';
import { getTenantBySlug } from '@/actions/tenants';
import { notFound } from 'next/navigation';
import { GoogleOverviewView } from 'src/sections/overview/google/view';

export default async function Page({ params }: { params: { slug: string } }) {
  const { slug } = params;
  const tenant = await getTenantBySlug(slug);
  
  if (!tenant) {
    notFound();
  }

  return (
    <PageGate feature={Feature.Google.Overview} teamId={tenant.id}>
      <GoogleOverviewView />
    </PageGate>
  );
}
```

## 🎯 Benefits of This Pattern

- ✅ **Type-safe** - TypeScript knows the structure
- ✅ **SEO-friendly** - Server-side rendering
- ✅ **Faster** - No client-side data fetching
- ✅ **Consistent** - Same pattern everywhere
- ✅ **Error handling** - Proper 404 for invalid slugs
- ✅ **Cacheable** - Next.js can cache server components

## 🔧 getTenantBySlug Implementation

Already implemented in `src/actions/tenants.ts`:

```typescript
export async function getTenantBySlug(slug: string) {
  try {
    const team = await prisma.team.findUnique({
      where: { slug },
      select: {
        id: true,
        name: true,
        slug: true,
        createdAt: true,
        updatedAt: true,
      }
    });

    return team;
  } catch (error) {
    console.error('Error fetching tenant by slug:', error);
    return null;
  }
}
```

- ✅ No permission check (accessible to team members)
- ✅ Returns null if not found
- ✅ Minimal data fetching for performance
- ✅ Error handled gracefully

