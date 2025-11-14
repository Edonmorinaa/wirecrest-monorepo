# Debug: Why Loading.tsx Isn't Showing 🔍

## ✅ What I Fixed

**The Problem:** `enabled: !!teamSlug` was preventing Suspense from triggering.

**When you use:**
```typescript
{
  enabled: false,  // ← Query doesn't run
  suspense: true,  // ← Suspense can't trigger if query doesn't run!
}
```

**Suspense won't trigger** because the query never starts fetching (and never throws a promise).

### **Changes Made:**

1. ✅ **Removed `enabled` from `useGoogleBusinessProfile`**
2. ✅ **Removed `enabled` from `useTeam`**

Now the queries will **always run** when the component mounts, which triggers Suspense properly.

---

## 🧪 How to Test It

### **Step 1: Clear Your Browser Cache**

**This is CRITICAL!** If data is cached, Suspense won't trigger.

```bash
# Open DevTools
# Go to: Application → Storage → Clear site data
# OR
# Hard refresh: Cmd+Shift+R (Mac) / Ctrl+Shift+F5 (Windows)
```

### **Step 2: Throttle Network Speed**

```bash
# Open DevTools
# Go to: Network tab
# Throttling dropdown → Select "Slow 3G"
```

### **Step 3: Test the Loading**

1. Navigate to: `/dashboard/teams/[slug]/google/overview`
2. **You should now see:**
   - Horizontal progress bar (from loading.tsx)
   - For several seconds (due to slow 3G)
3. Then the page content loads

---

## 🎯 Expected Behavior

### **Route Navigation:**
```
Click link
   ↓
loading.tsx shows (horizontal bar) ✅
   ↓
Page loads
```

### **Data Fetching (Suspense):**
```
Page component mounts
   ↓
<Suspense> detects queries with suspense: true
   ↓
loading.tsx shows (horizontal bar) ✅
   ↓
Queries fetch data
   ↓
Content renders
```

---

## ⚠️ Common Issues

### **Issue 1: Data is Cached**
**Symptom:** Loading doesn't show on subsequent visits

**Solution:**
- Clear cache and hard refresh
- Or wait for `staleTime` to expire (1 minute for Google, 5 minutes for Team)

### **Issue 2: Query Fails Silently**
**Symptom:** Loading shows, then blank page

**Solution:**
- Check browser console for errors
- Verify the team slug is valid
- Check that the tRPC procedure exists

### **Issue 3: MUI Theme Not Available**
**Symptom:** Blank white screen (this was your issue)

**Solution:**
- ✅ Already fixed - your loading.tsx uses MUI components which have theme available

---

## 🔧 Quick Test Script

Add this to your page to force a cache clear:

```typescript
// Temporary - for testing only
import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';

export default function Page() {
  const queryClient = useQueryClient();
  
  useEffect(() => {
    // Clear cache on mount (testing only!)
    queryClient.clear();
  }, [queryClient]);

  return (
    <Suspense>
      <GoogleOverviewView />
    </Suspense>
  );
}
```

---

## ✅ Verification Checklist

- [ ] Cleared browser cache
- [ ] Network throttled to "Slow 3G"
- [ ] Navigated to Google overview page
- [ ] Saw horizontal progress bar
- [ ] Page loaded after a few seconds
- [ ] Removed network throttle
- [ ] Tested again (should be instant if cached)

---

## 📊 What Should Happen

### **First Visit (No Cache):**
```
1. Click "Google Overview"
2. See horizontal loading bar (1-3 seconds on Slow 3G) ✅
3. Page appears
```

### **Second Visit (Cached - within staleTime):**
```
1. Click "Google Overview"
2. Page appears immediately (no loading) ✅
3. Because data is cached and still fresh
```

### **Third Visit (After staleTime expires):**
```
1. Click "Google Overview"
2. See cached data immediately
3. Background refetch happens (no loading shown)
4. Data updates if changed
```

---

## 🚀 If It's STILL Not Working...

### **Debug Steps:**

1. **Check if Suspense is actually enabled:**
```typescript
// In useGoogleBusinessProfile.ts
console.log('Query options:', {
  suspense: true,
  enabled: true, // Should be undefined or true
});
```

2. **Check if query is running:**
```typescript
// In useGoogleBusinessProfile.ts
console.log('Query state:', { isLoading, data, error });
```

3. **Add a manual suspense test:**
```typescript
// In page.tsx
<Suspense fallback={<div style={{padding: 100, background: 'red'}}>LOADING!</div>}>
  <GoogleOverviewView />
</Suspense>
```

If you see the red "LOADING!" text, Suspense IS working!

---

## 💡 Key Takeaway

**For Suspense to work with React Query/tRPC:**

1. ✅ `suspense: true` in query options
2. ✅ `enabled: true` (or undefined/not set)
3. ✅ `<Suspense>` boundary in parent
4. ✅ No cached data (for initial test)

**All 4 are now in place!** 🎉

*Updated: November 12, 2025*

