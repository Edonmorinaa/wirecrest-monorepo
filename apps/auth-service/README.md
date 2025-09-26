# Wirecrest Auth Service

<div align="center">
  <img src="../dashboard/public/logo/logo-single.svg" alt="Wirecrest Auth Service" width="80" height="80">
  
  **Enterprise Authentication & Authorization Microservice**
  
  ![Node.js](https://img.shields.io/badge/Node.js-20.x-43853D?style=for-the-badge&logo=node.js&logoColor=white)
  ![TypeScript](https://img.shields.io/badge/TypeScript-5.x-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
  ![Express](https://img.shields.io/badge/Express-4.x-000000?style=for-the-badge&logo=express&logoColor=white)
  ![JWT](https://img.shields.io/badge/JWT-000000?style=for-the-badge&logo=jsonwebtokens&logoColor=white)
</div>

## 🎯 **Overview**

The Wirecrest Auth Service is a dedicated microservice that handles authentication, authorization, and user management for the Wirecrest platform. Built with Node.js and TypeScript, it provides secure, scalable, and enterprise-grade identity management capabilities with support for multiple authentication providers and advanced security features.

### **Key Features**

- 🔐 **Multi-Provider Authentication**: Support for OAuth, SAML, and custom providers
- 🎫 **JWT-Based Sessions**: Secure, stateless authentication tokens
- 👥 **Role-Based Access Control**: Granular permission management
- 🏢 **Multi-Tenant Support**: Team-based user isolation and management
- 🔄 **Session Management**: Advanced session handling and refresh tokens
- 🛡️ **Security Hardening**: Rate limiting, brute force protection, and audit logging
- 📱 **API-First Design**: RESTful endpoints for all authentication operations

## 🏗️ **Architecture**

### **Service Design**

The Auth Service follows a clean architecture pattern with clear separation of concerns:

```
Authentication Flow:
Client → Middleware → Controller → Service → Repository → Database
                                      ↓
                              External Providers (OAuth, SAML)
```

### **Security Layers**

1. **Transport Security**: HTTPS with TLS 1.3
2. **Input Validation**: Comprehensive request validation
3. **Rate Limiting**: Protection against abuse and attacks
4. **Token Security**: JWT with short expiry and refresh tokens
5. **Audit Logging**: Complete authentication event tracking

### **Multi-Tenant Architecture**

- **Team Isolation**: Complete data separation between teams
- **Role Hierarchy**: Global and team-specific role management
- **Permission System**: Fine-grained access control
- **Context Switching**: Secure team context management

## 🚀 **Quick Start**

### **Prerequisites**

- **Node.js** >= 20.0.0
- **TypeScript** >= 5.0.0
- **PostgreSQL** >= 14.0.0
- **Redis** (optional, for session storage)

### **Installation**

1. **Navigate to auth service directory**
   ```bash
   cd apps/auth-service
   ```

2. **Install dependencies**
   ```bash
   yarn install
   ```

3. **Environment configuration**
   ```bash
   # Copy environment template
   cp .env.example .env
   
   # Configure your environment variables
   ```

4. **Database setup**
   ```bash
   # Generate Prisma client
   yarn prisma generate
   
   # Run migrations
   yarn prisma migrate deploy
   ```

5. **Start development server**
   ```bash
   yarn dev
   ```

The auth service will be available at `http://localhost:3033`

## ⚙️ **Environment Variables**

### **Required Variables**

```bash
# Database Configuration
DATABASE_URL="postgresql://user:password@localhost:5432/wirecrest"

# Application Configuration
NODE_ENV="development"
PORT=3033
API_VERSION="v1"

# JWT Configuration
JWT_SECRET="your-super-secret-jwt-key-here"
JWT_EXPIRES_IN="1h"
JWT_REFRESH_EXPIRES_IN="7d"

# Security
BCRYPT_ROUNDS=12
RATE_LIMIT_WINDOW="15"      # minutes
RATE_LIMIT_MAX_REQUESTS="100"
```

### **OAuth Provider Configuration**

```bash
# Google OAuth
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
GOOGLE_REDIRECT_URI="http://localhost:3033/auth/google/callback"

# Microsoft OAuth
MICROSOFT_CLIENT_ID="your-microsoft-client-id"
MICROSOFT_CLIENT_SECRET="your-microsoft-client-secret"
MICROSOFT_REDIRECT_URI="http://localhost:3033/auth/microsoft/callback"

# GitHub OAuth
GITHUB_CLIENT_ID="your-github-client-id"
GITHUB_CLIENT_SECRET="your-github-client-secret"
GITHUB_REDIRECT_URI="http://localhost:3033/auth/github/callback"
```

### **Optional Variables**

```bash
# Redis Session Store
REDIS_URL="redis://localhost:6379"
SESSION_SECRET="your-session-secret"
SESSION_TTL="3600"  # seconds

# Email Configuration
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"
EMAIL_FROM="noreply@wirecrest.com"

# Security Features
ENABLE_2FA="true"
ENABLE_AUDIT_LOG="true"
ENABLE_BRUTE_FORCE_PROTECTION="true"
MAX_LOGIN_ATTEMPTS="5"
LOCKOUT_DURATION="300"  # seconds

# Monitoring
LOG_LEVEL="info"
ENABLE_METRICS="true"
HEALTH_CHECK_INTERVAL="30"  # seconds
```

## 📁 **Project Structure**

```
apps/auth-service/
├── src/
│   ├── controllers/                # Request handlers
│   │   ├── auth.controller.ts      # Authentication endpoints
│   │   ├── user.controller.ts      # User management
│   │   ├── team.controller.ts      # Team operations
│   │   └── session.controller.ts   # Session management
│   ├── services/                   # Business logic
│   │   ├── auth.service.ts         # Authentication logic
│   │   ├── user.service.ts         # User operations
│   │   ├── team.service.ts         # Team management
│   │   ├── token.service.ts        # JWT token handling
│   │   ├── email.service.ts        # Email notifications
│   │   └── audit.service.ts        # Audit logging
│   ├── middleware/                 # Express middleware
│   │   ├── auth.middleware.ts      # Authentication verification
│   │   ├── validation.middleware.ts # Input validation
│   │   ├── rateLimit.middleware.ts # Rate limiting
│   │   ├── audit.middleware.ts     # Audit logging
│   │   └── error.middleware.ts     # Error handling
│   ├── routes/                     # API routes
│   │   ├── auth.routes.ts          # Authentication routes
│   │   ├── user.routes.ts          # User routes
│   │   ├── team.routes.ts          # Team routes
│   │   └── admin.routes.ts         # Admin routes
│   ├── providers/                  # OAuth providers
│   │   ├── google.provider.ts      # Google OAuth
│   │   ├── microsoft.provider.ts   # Microsoft OAuth
│   │   ├── github.provider.ts      # GitHub OAuth
│   │   └── saml.provider.ts        # SAML provider
│   ├── types/                      # TypeScript definitions
│   │   ├── auth.types.ts           # Authentication types
│   │   ├── user.types.ts           # User types
│   │   ├── team.types.ts           # Team types
│   │   └── api.types.ts            # API types
│   ├── utils/                      # Utility functions
│   │   ├── validators.ts           # Input validators
│   │   ├── crypto.ts               # Cryptographic utilities
│   │   ├── logger.ts               # Logging utilities
│   │   └── helpers.ts              # General helpers
│   ├── config/                     # Configuration
│   │   ├── database.ts             # Database configuration
│   │   ├── redis.ts                # Redis configuration
│   │   ├── oauth.ts                # OAuth configuration
│   │   └── security.ts             # Security settings
│   └── index.ts                    # Application entry point
├── tests/                          # Test suites
│   ├── unit/                       # Unit tests
│   ├── integration/                # Integration tests
│   └── e2e/                        # End-to-end tests
├── docs/                           # Documentation
│   ├── api/                        # API documentation
│   └── security/                   # Security documentation
├── scripts/                        # Utility scripts
│   ├── setup.ts                    # Environment setup
│   └── migrate.ts                  # Database migrations
├── Dockerfile                      # Container configuration
├── package.json                    # Dependencies and scripts
└── tsconfig.json                   # TypeScript configuration
```

## 🔧 **Available Scripts**

```bash
# Development
yarn dev                    # Start development server with hot reload
yarn dev:debug             # Start with Node.js debugger
yarn watch                  # Watch mode with automatic restart

# Building
yarn build                  # Compile TypeScript to JavaScript
yarn start                  # Start production server

# Database
yarn prisma:generate        # Generate Prisma client
yarn prisma:migrate         # Run database migrations
yarn prisma:studio          # Open Prisma Studio
yarn prisma:reset           # Reset database and reseed

# Testing
yarn test                   # Run all tests
yarn test:unit              # Run unit tests only
yarn test:integration       # Run integration tests only
yarn test:e2e              # Run end-to-end tests
yarn test:coverage         # Generate test coverage report

# Code Quality
yarn lint                   # Run ESLint
yarn lint:fix              # Fix ESLint errors automatically
yarn type-check            # Run TypeScript type checking
yarn format                # Format code with Prettier

# Security
yarn audit                  # Check for security vulnerabilities
yarn audit:fix             # Fix security vulnerabilities
yarn check:deps            # Check dependency security

# Utilities
yarn clean                  # Clean build artifacts
yarn logs                  # View application logs
yarn health                # Check service health
```

## 🌐 **API Endpoints**

### **Authentication**

```http
POST   /api/v1/auth/register        # User registration
POST   /api/v1/auth/login           # User login
POST   /api/v1/auth/logout          # User logout
POST   /api/v1/auth/refresh         # Refresh access token
POST   /api/v1/auth/forgot-password # Request password reset
POST   /api/v1/auth/reset-password  # Reset password
POST   /api/v1/auth/verify-email    # Verify email address
POST   /api/v1/auth/resend-verification # Resend verification email
```

### **OAuth Authentication**

```http
GET    /api/v1/auth/google          # Google OAuth login
GET    /api/v1/auth/google/callback # Google OAuth callback
GET    /api/v1/auth/microsoft       # Microsoft OAuth login
GET    /api/v1/auth/microsoft/callback # Microsoft OAuth callback
GET    /api/v1/auth/github          # GitHub OAuth login
GET    /api/v1/auth/github/callback # GitHub OAuth callback
```

### **User Management**

```http
GET    /api/v1/users/me             # Get current user profile
PUT    /api/v1/users/me             # Update user profile
DELETE /api/v1/users/me             # Delete user account
POST   /api/v1/users/me/change-password # Change password
POST   /api/v1/users/me/enable-2fa  # Enable two-factor authentication
POST   /api/v1/users/me/disable-2fa # Disable two-factor authentication
GET    /api/v1/users/me/sessions    # Get active sessions
DELETE /api/v1/users/me/sessions/:id # Revoke session
```

### **Team Management**

```http
GET    /api/v1/teams                # Get user's teams
GET    /api/v1/teams/:id            # Get team details
POST   /api/v1/teams                # Create new team
PUT    /api/v1/teams/:id            # Update team
DELETE /api/v1/teams/:id            # Delete team
GET    /api/v1/teams/:id/members    # Get team members
POST   /api/v1/teams/:id/members    # Invite team member
PUT    /api/v1/teams/:id/members/:userId # Update member role
DELETE /api/v1/teams/:id/members/:userId # Remove team member
```

### **Admin Operations**

```http
GET    /api/v1/admin/users          # Get all users (admin only)
GET    /api/v1/admin/teams          # Get all teams (admin only)
GET    /api/v1/admin/sessions       # Get all sessions (admin only)
GET    /api/v1/admin/audit-logs     # Get audit logs (admin only)
POST   /api/v1/admin/users/:id/suspend # Suspend user (admin only)
POST   /api/v1/admin/users/:id/activate # Activate user (admin only)
```

### **Health & Monitoring**

```http
GET    /health                      # Health check endpoint
GET    /metrics                     # Performance metrics
GET    /status                      # Service status
```

## 🔐 **Authentication Flow**

### **Standard Login Flow**

1. **User Registration/Login**: User provides credentials
2. **Validation**: Input validation and sanitization
3. **Authentication**: Verify credentials against database
4. **Token Generation**: Create JWT access and refresh tokens
5. **Response**: Return tokens and user information
6. **Token Usage**: Include access token in subsequent requests

### **OAuth Flow**

1. **Initiate OAuth**: Redirect to OAuth provider
2. **User Authorization**: User authorizes application
3. **Callback Handling**: Receive authorization code
4. **Token Exchange**: Exchange code for access token
5. **Profile Retrieval**: Fetch user profile from provider
6. **Account Linking**: Create or link user account
7. **JWT Generation**: Create application JWT tokens

### **Token Refresh Flow**

1. **Token Expiry**: Access token expires
2. **Refresh Request**: Client sends refresh token
3. **Validation**: Verify refresh token validity
4. **New Tokens**: Generate new access and refresh tokens
5. **Response**: Return new tokens to client

## 👥 **User Roles & Permissions**

### **Global Roles**

#### **Super Admin**
- **Permissions**: Full platform access, user management, system configuration
- **Scope**: All teams and users
- **Features**: Admin dashboard, user suspension, system metrics

#### **User**
- **Permissions**: Basic authentication, profile management
- **Scope**: Own profile and assigned teams
- **Features**: Profile updates, team membership

### **Team Roles**

#### **Team Admin**
- **Permissions**: Full team management, member management, team settings
- **Scope**: Specific team and its data
- **Features**: Invite members, assign roles, configure team settings

#### **Team Manager**
- **Permissions**: Team data access, limited member management
- **Scope**: Specific team data and operations
- **Features**: View team data, manage team content

#### **Team Member**
- **Permissions**: Basic team access, view team data
- **Scope**: Read-only team access
- **Features**: View dashboards, basic team interactions

### **Permission System**

```typescript
// Permission structure
interface Permission {
  resource: string;      // users, teams, analytics, etc.
  action: string;        // create, read, update, delete
  scope: string;         // global, team, own
  conditions?: object;   // Additional conditions
}

// Example permissions
const permissions = [
  { resource: "users", action: "read", scope: "own" },
  { resource: "teams", action: "manage", scope: "team" },
  { resource: "analytics", action: "read", scope: "team" }
];
```

## 🛡️ **Security Features**

### **Authentication Security**

- **Password Hashing**: bcrypt with configurable rounds
- **JWT Security**: Short-lived access tokens with refresh tokens
- **Session Management**: Secure session handling with Redis
- **Brute Force Protection**: Account lockout after failed attempts
- **Rate Limiting**: Request throttling per IP and user

### **Authorization Security**

- **Role-Based Access**: Granular permission system
- **Context Validation**: Team context verification
- **Resource Protection**: Access control on all endpoints
- **Audit Logging**: Complete activity tracking

### **Data Security**

- **Input Validation**: Comprehensive request validation
- **SQL Injection Prevention**: Parameterized queries with Prisma
- **XSS Protection**: Input sanitization and output encoding
- **CSRF Protection**: Cross-site request forgery prevention

### **Transport Security**

- **HTTPS Enforcement**: TLS 1.3 encryption
- **HSTS Headers**: HTTP Strict Transport Security
- **Secure Cookies**: HttpOnly and Secure cookie flags
- **CORS Configuration**: Proper cross-origin resource sharing

## 📊 **Monitoring & Logging**

### **Health Monitoring**

- **Health Checks**: Service availability monitoring
- **Performance Metrics**: Response time and throughput tracking
- **Error Tracking**: Comprehensive error monitoring
- **Uptime Monitoring**: Service availability tracking

### **Audit Logging**

```typescript
// Audit log structure
interface AuditLog {
  userId: string;
  action: string;
  resource: string;
  timestamp: Date;
  ipAddress: string;
  userAgent: string;
  success: boolean;
  details?: object;
}
```

### **Security Monitoring**

- **Failed Login Attempts**: Track and alert on suspicious activity
- **Token Usage**: Monitor token generation and usage patterns
- **Permission Changes**: Log role and permission modifications
- **Suspicious Activity**: Detect and alert on anomalous behavior

## 🧪 **Testing**

### **Testing Strategy**

- **Unit Tests**: Service and utility function testing
- **Integration Tests**: API endpoint and database testing
- **Security Tests**: Authentication and authorization testing
- **Performance Tests**: Load and stress testing

### **Test Coverage**

- **Authentication Flows**: All authentication scenarios
- **Authorization Logic**: Permission and role testing
- **Security Features**: Rate limiting, validation, etc.
- **Error Handling**: Comprehensive error scenario testing

## 🚀 **Deployment**

### **Docker Deployment**

```bash
# Build Docker image
docker build -t wirecrest-auth-service .

# Run container
docker run -p 3033:3033 \
  -e DATABASE_URL="your-database-url" \
  -e JWT_SECRET="your-jwt-secret" \
  -e NODE_ENV="production" \
  wirecrest-auth-service
```

### **Production Configuration**

```bash
# Production environment variables
NODE_ENV="production"
JWT_SECRET="your-production-jwt-secret"
BCRYPT_ROUNDS=14
RATE_LIMIT_MAX_REQUESTS="50"
ENABLE_AUDIT_LOG="true"
ENABLE_2FA="true"
```

### **Load Balancing**

The service is designed to be stateless and can be horizontally scaled:

- **Session Storage**: Redis for shared session storage
- **Database Connections**: Connection pooling for efficiency
- **Health Checks**: Load balancer health endpoint support

## 📚 **API Documentation**

Comprehensive API documentation is available at:

- **Development**: http://localhost:3033/docs
- **Swagger UI**: Interactive API explorer
- **Postman Collection**: Pre-configured API requests
- **Authentication Guide**: Step-by-step integration guide

## 🤝 **Contributing**

See the main repository [Contributing Guide](../../CONTRIBUTING.md) for development guidelines.

### **Auth Service Guidelines**

1. **Security First**: All changes must maintain security standards
2. **Test Coverage**: Include comprehensive tests for new features
3. **Documentation**: Update API documentation for changes
4. **Backward Compatibility**: Maintain API backward compatibility
5. **Audit Logging**: Include audit logs for sensitive operations

## 📄 **License**

This project is part of the Wirecrest platform and is licensed under the MIT License.

---

<div align="center">
  <p>🔐 Built with security, scalability, and enterprise needs in mind</p>
  <p>
    <a href="../../README.md">← Back to Main Repository</a>
  </p>
</div>