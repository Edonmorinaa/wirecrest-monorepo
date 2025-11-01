# 🔧 Vercel Build Fix - Yarn 4 Support

## ❌ The Problem

Vercel uses Yarn 1.x by default, which doesn't understand `workspace:^` protocol used by Yarn 4.

**Error:**
```
error Couldn't find package "@wirecrest/db@workspace:^" on the "npm" registry.
```

## ✅ The Solution

Two approaches - use **Option 1** (recommended):

---

## 🚀 Option 1: Commit `.npmrc` (Recommended)

### Step 1: Removed `.npmrc` from gitignore

Changed `.gitignore` to allow `.npmrc` to be committed.

### Step 2: Created `.npmrc`

File: `/.npmrc`

```
enable-corepack=true
```

This tells Vercel to use Corepack, which reads `packageManager` from `package.json`.

### Step 3: Commit and Push

```bash
git add .npmrc .gitignore
git commit -m "Enable Corepack for Vercel deployment"
git push
```

---

## 🚀 Option 2: Environment Variable (Alternative)

If you don't want to commit `.npmrc`, add this in **Vercel Dashboard**:

**Settings** → **Environment Variables** → **Add**

```
Name:  ENABLE_EXPERIMENTAL_COREPACK
Value: 1
```

Then redeploy.

### Redeploy on Vercel

The next deployment will:
1. See `.npmrc` with `enable-corepack=true`
2. Enable Corepack
3. Read `packageManager: yarn@4.0.2` from package.json
4. Use Yarn 4 instead of Yarn 1
5. Understand `workspace:^` protocol
6. Build successfully! ✅

---

## 🎯 Alternative: Environment Variable

If `.npmrc` doesn't work, add this in **Vercel Dashboard** → **Settings** → **Environment Variables**:

```
ENABLE_EXPERIMENTAL_COREPACK=1
```

---

## ✅ Expected Build Output

After fix, you'll see:

```
yarn install v4.0.2
✓ Resolution step
✓ Fetch step
✓ Link step
✓ @wirecrest/db: Build completed
✓ @wirecrest/auth-core: Build completed
...
```

---

**Status**: Fixed with `.npmrc`  
**Action**: Commit `.npmrc` and push to trigger new build
