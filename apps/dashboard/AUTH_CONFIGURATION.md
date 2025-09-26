# Authentication Configuration Guide

## 🔧 **Required Environment Variables**

Add these environment variables to your `.env.local` file:

```bash
# Database (existing)
DATABASE_URL=postgresql://username:password@localhost:5432/wirecrest

# NextAuth Configuration (existing)
NEXTAUTH_SECRET=your-nextauth-secret-key-here
NEXTAUTH_URL=https://tenant.domain.com

# Auth Service Configuration (NEW - REQUIRED)
AUTH_SERVICE_URL=https://auth.domain.com

# Application Configuration (existing)
APP_URL=https://tenant.domain.com
NODE_ENV=development
```

## 🚀 **Setup Steps**

### **1. Dashboard Configuration**
```bash
# Add to apps/dashboard/.env.local
AUTH_SERVICE_URL=https://auth.domain.com
```

### **2. Auth Service Configuration**
```bash
# Add to apps/auth-service/.env
DATABASE_URL=postgresql://username:password@localhost:5432/wirecrest
NEXTAUTH_SECRET=your-nextauth-secret-key-here
NEXTAUTH_URL=https://auth.domain.com
ALLOWED_ORIGINS=https://tenant.domain.com,https://www.domain.com
```

### **3. Domain Configuration**
```bash
# DNS Setup
*.domain.com -> Your hosting provider
auth.domain.com -> Auth service (Railway)
tenant.domain.com -> Dashboard app
www.domain.com -> Landing page
```

## 🔐 **Security Notes**

- Use the same `NEXTAUTH_SECRET` across all services
- Ensure `AUTH_SERVICE_URL` is accessible from dashboard
- Configure CORS properly in auth-service
- Use HTTPS in production

## 🧪 **Testing**

1. Start auth-service: `cd apps/auth-service && yarn dev`
2. Start dashboard: `cd apps/dashboard && yarn dev`
3. Test auth flows in browser
4. Check auth-service health: `curl http://localhost:3000/health`
