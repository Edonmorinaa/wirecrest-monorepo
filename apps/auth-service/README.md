# Auth Service

Express-based authentication service for Wirecrest applications.

## 🏗️ Architecture

Following clean architecture principles with clear separation of concerns:

```
src/
├── controllers/     # HTTP request handling
├── services/        # Business logic
├── middleware/      # Cross-cutting concerns
├── routes/          # Route definitions
└── index.ts         # Application entry point
```

## 🚀 API Endpoints

### Public Endpoints (No Authentication Required)

- `POST /forgot-password` - Initiate password reset
- `POST /reset-password` - Reset password with token
- `POST /register` - User registration
- `POST /resend-verification` - Resend email verification
- `POST /unlock-account` - Account unlock request

### Protected Endpoints (Authentication Required)

- `POST /update-password` - Update user password
- `POST /sign-out` - Custom sign out with cleanup

## 🔐 Authentication

Uses NextAuth JWT tokens for authentication:

```typescript
// Request headers
Authorization: Bearer <nextauth-jwt-token>
```

## 📝 Request/Response Format

### Success Response
```json
{
  "success": true,
  "data": {
    "message": "Operation completed successfully"
  }
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "message": "Error description",
    "statusCode": 400,
    "code": "ERROR_CODE"
  }
}
```

## 🛠️ Development

```bash
# Install dependencies
yarn install

# Development mode
yarn dev

# Build
yarn build

# Start production
yarn start
```

## 🌐 Environment Variables

```bash
# Database
DATABASE_URL=postgresql://...

# NextAuth
NEXTAUTH_SECRET=your-secret-key
NEXTAUTH_URL=https://auth.domain.com

# CORS Origins
ALLOWED_ORIGINS=https://tenant.domain.com,https://www.domain.com
```

## 🚀 Deployment

### Railway Deployment

```bash
# Deploy to Railway
railway login
railway link
railway up
```

### Docker Deployment

```bash
# Build image
docker build -t auth-service .

# Run container
docker run -p 3000:3000 auth-service
```

## 🔧 Usage from Dashboard

```typescript
import { authApiClient } from '@wirecrest/auth';

// Forgot password
const result = await authApiClient.forgotPassword(email, recaptchaToken);

// Update password (requires authentication)
const result = await authApiClient.updatePassword(currentPassword, newPassword);
```

## 🏗️ Clean Architecture Benefits

- **Single Responsibility**: Each class has one reason to change
- **Open/Closed**: Open for extension, closed for modification
- **Dependency Inversion**: Depends on abstractions, not concretions
- **Testability**: Easy to unit test business logic
- **Maintainability**: Clear separation of concerns
