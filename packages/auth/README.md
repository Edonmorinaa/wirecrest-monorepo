# @wirecrest/auth

Shared authentication package for Wirecrest applications.

## 🚀 Usage Across Apps

### 1. Dashboard App (tenant.domain.com)

```bash
# Add to apps/dashboard/package.json
"@wirecrest/auth": "workspace:*"
```

```tsx
// apps/dashboard/src/app/layout.tsx
import { NextAuthProvider } from '@wirecrest/auth';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <NextAuthProvider>
          {children}
        </NextAuthProvider>
      </body>
    </html>
  );
}
```

```tsx
// apps/dashboard/src/components/ProtectedRoute.tsx
import { AuthGuard, useAuth } from '@wirecrest/auth';

export function ProtectedRoute({ children }) {
  return (
    <AuthGuard fallback={<div>Please sign in</div>}>
      {children}
    </AuthGuard>
  );
}
```

### 2. Scraper App (api.domain.com)

```bash
# Add to apps/scraper/package.json
"@wirecrest/auth": "workspace:*"
```

```ts
// apps/scraper/src/middleware/auth.ts
import { prisma } from '@wirecrest/db';
import { verifyPassword } from '@wirecrest/auth';

export async function authenticateUser(token: string) {
  // Your authentication logic
  const user = await prisma.user.findUnique({
    where: { id: token }
  });
  
  return user;
}
```

### 3. Auth Service (auth.domain.com) - Express App

```bash
# Create new Express app
mkdir apps/auth-service
cd apps/auth-service
npm init -y
```

```json
// apps/auth-service/package.json
{
  "name": "@wirecrest/auth-service",
  "dependencies": {
    "@wirecrest/auth": "workspace:*",
    "@wirecrest/db": "workspace:*",
    "express": "^4.18.0",
    "cors": "^2.8.5",
    "cookie-parser": "^1.4.6"
  }
}
```

```ts
// apps/auth-service/src/index.ts
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { 
  forgotPassword, 
  resetPassword, 
  updatePassword,
  joinUser 
} from '@wirecrest/auth';

const app = express();

app.use(cors({
  origin: ['https://tenant.domain.com', 'https://www.domain.com'],
  credentials: true
}));

app.use(cookieParser());
app.use(express.json());

// Auth endpoints
app.post('/api/auth/forgot-password', async (req, res) => {
  try {
    const result = await forgotPassword(req.body);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/auth/reset-password', async (req, res) => {
  try {
    const result = await resetPassword(req.body);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.listen(3000, () => {
  console.log('Auth service running on port 3000');
});
```

## 🔧 Domain-Wide Cookie Setup

### 1. NextAuth Configuration

```ts
// apps/dashboard/src/lib/nextAuth.ts
import { NextAuthOptions } from 'next-auth';

export const authOptions: NextAuthOptions = {
  // ... your config
  cookies: {
    sessionToken: {
      name: `__Secure-next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: true,
        domain: '.domain.com' // Domain-wide cookies
      }
    }
  }
};
```

### 2. Express Auth Service

```ts
// apps/auth-service/src/middleware/cookies.ts
import { Response } from 'express';

export function setDomainCookie(res: Response, name: string, value: string) {
  res.cookie(name, value, {
    domain: '.domain.com',
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/'
  });
}
```

## 📦 Available Exports

### Hooks
- `useAuth()` - Core auth context
- `useUser()` - User data hook
- `useSuperRole()` - RBAC hook
- `useCustomSignOut()` - Custom signout

### Components
- `NextAuthProvider` - Auth provider
- `AuthGuard` - Authentication guard
- `UserGuard` - User data guard
- `AdminGuard` - Admin role guard

### Actions
- `forgotPassword()` - Password reset request
- `resetPassword()` - Password reset
- `updatePassword()` - Change password
- `joinUser()` - User registration
- `resendEmailVerification()` - Email verification

### Utils
- `hashPassword()` - Hash passwords
- `verifyPassword()` - Verify passwords
- `generateToken()` - Generate tokens
- `validateEmail()` - Email validation

### Types
- `User` - User interface
- `SuperRole` - Role enum
- `SuperResource` - Resource enum
- `SuperAction` - Action enum

## 🏗️ Architecture

```
auth.domain.com (Express)     → Handles all auth logic
├── /api/auth/login
├── /api/auth/logout  
├── /api/auth/session
└── /api/auth/refresh

tenant.domain.com (NextJS)   → Uses auth service
├── Calls auth.domain.com for auth
└── Stores domain-wide cookies

www.domain.com (NextJS)       → Landing page
└── Same auth service
```

## 🔐 RBAC System

```tsx
import { useSuperRole } from '@wirecrest/auth';

function AdminPanel() {
  const { isSuperAdmin, hasPermission, canManage } = useSuperRole();
  
  if (!isSuperAdmin) {
    return <div>Access denied</div>;
  }
  
  return <div>Admin panel</div>;
}
```

## 🚀 Deployment

### Railway Deployment

```yaml
# apps/auth-service/railway.json
{
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "npm start",
    "healthcheckPath": "/health"
  }
}
```

### Environment Variables

```bash
# All apps need these
DATABASE_URL=postgresql://...
NEXTAUTH_SECRET=your-secret
NEXTAUTH_URL=https://auth.domain.com

# Domain-wide cookies
COOKIE_DOMAIN=.domain.com
```
