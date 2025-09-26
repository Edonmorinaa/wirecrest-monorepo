# @wirecrest/email

Server-side email functionality package for Wirecrest applications. This package provides a complete email solution with SMTP configuration, React email templates, and server-side email sending functions.

## 🚀 **Features**

- **SMTP Configuration**: Flexible SMTP client with environment variable support
- **React Email Templates**: Beautiful, responsive email templates using @react-email
- **Server-side Functions**: Ready-to-use email sending functions
- **TypeScript Support**: Full type safety for all email operations
- **Template System**: Modular email templates with consistent branding

## 📦 **Installation**

```bash
yarn add @wirecrest/email
```

## 🔧 **Environment Variables**

```bash
# SMTP Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM=noreply@yourdomain.com

# App Configuration
APP_NAME=Wirecrest
APP_URL=https://yourdomain.com
APP_LOGO_URL=https://yourdomain.com/logo.svg
```

## 🎯 **Quick Start**

### **1. Basic Setup**

```typescript
import { createSMTPClient, sendMagicLink } from '@wirecrest/email';

// Create SMTP client (uses environment variables)
const smtpClient = createSMTPClient();

// Send magic link email
await sendMagicLink(smtpClient, 'user@example.com', 'https://app.com/auth/callback');
```

### **2. Custom SMTP Configuration**

```typescript
import { SMTPClient } from '@wirecrest/email';

const smtpClient = new SMTPClient({
  host: 'smtp.gmail.com',
  port: 587,
  user: 'your-email@gmail.com',
  password: 'your-app-password',
  from: 'noreply@yourdomain.com',
});
```

## 📧 **Email Functions**

### **Authentication Emails**

```typescript
import { 
  sendMagicLink, 
  sendPasswordResetEmail, 
  sendVerificationEmail 
} from '@wirecrest/email';

// Magic link for passwordless login
await sendMagicLink(smtpClient, 'user@example.com', 'https://app.com/auth/callback');

// Password reset
await sendPasswordResetEmail(smtpClient, user, resetToken);

// Email verification
await sendVerificationEmail(smtpClient, user, verificationToken);
```

### **User Management Emails**

```typescript
import { 
  sendWelcomeEmail, 
  sendTeamInviteEmail, 
  sendAccountLockedEmail 
} from '@wirecrest/email';

// Welcome new users
await sendWelcomeEmail(smtpClient, 'John Doe', 'john@example.com', 'Acme Corp');

// Team invitations
await sendTeamInviteEmail(smtpClient, team, invitation);

// Account locked notification
await sendAccountLockedEmail(smtpClient, 'user@example.com', unlockUrl);
```

### **Test Emails**

```typescript
import { sendTestEmail } from '@wirecrest/email';

// Send test email
await sendTestEmail(smtpClient, 'John Doe', 'test@example.com');
```

## 🎨 **Email Templates**

All email templates are built with React and @react-email components:

- **MagicLink**: Passwordless authentication
- **ResetPassword**: Password reset emails
- **VerificationEmail**: Email verification
- **WelcomeEmail**: New user welcome
- **TeamInvite**: Team invitation emails
- **AccountLocked**: Account lockout notifications
- **TestEmail**: System test emails

### **Custom Templates**

```typescript
import { render } from '@react-email/render';
import { sendEmail } from '@wirecrest/email';
import MyCustomTemplate from './MyCustomTemplate';

const html = await render(MyCustomTemplate({ name: 'John' }));

await sendEmail(smtpClient, {
  to: 'user@example.com',
  subject: 'Custom Email',
  html,
});
```

## ⚙️ **Configuration**

### **App Configuration**

```typescript
import { updateAppConfig } from '@wirecrest/email';

// Update app settings
updateAppConfig({
  name: 'My App',
  logoUrl: 'https://myapp.com/logo.svg',
  url: 'https://myapp.com',
});
```

### **SMTP Client Options**

```typescript
import { SMTPClient } from '@wirecrest/email';

const smtpClient = new SMTPClient({
  host: 'smtp.gmail.com',
  port: 587,
  user: 'your-email@gmail.com',
  password: 'your-app-password',
  from: 'noreply@yourdomain.com',
});

// Get current configuration
const config = smtpClient.getConfig();
```

## 🏗️ **Architecture**

```
@wirecrest/email/
├── src/
│   ├── components/          # React email templates
│   │   ├── EmailLayout.tsx
│   │   ├── MagicLink.tsx
│   │   ├── ResetPassword.tsx
│   │   └── ...
│   ├── lib/                 # Core functionality
│   │   ├── smtp.ts          # SMTP client
│   │   ├── app.ts           # App configuration
│   │   ├── sendEmail.ts     # Core email function
│   │   └── send*.ts         # Specific email functions
│   ├── types/               # TypeScript types
│   │   └── email.ts
│   └── index.ts             # Main exports
```

## 🔐 **Security Features**

- **Environment Variables**: Secure configuration management
- **SMTP Authentication**: Secure email sending
- **Template Validation**: Type-safe email templates
- **Error Handling**: Graceful failure handling

## 🚀 **Usage in Apps**

### **Dashboard App**

```typescript
// apps/dashboard/src/lib/email.ts
import { createSMTPClient, sendMagicLink } from '@wirecrest/email';

const smtpClient = createSMTPClient();

export const sendAuthEmail = async (email: string, url: string) => {
  return await sendMagicLink(smtpClient, email, url);
};
```

### **Auth Service**

```typescript
// apps/auth-service/src/lib/email.ts
import { createSMTPClient, sendPasswordResetEmail } from '@wirecrest/email';

const smtpClient = createSMTPClient();

export const sendPasswordReset = async (user: User, token: string) => {
  return await sendPasswordResetEmail(smtpClient, user, token);
};
```

## 🎯 **Benefits**

- **Centralized Email Logic**: Single source of truth for all email functionality
- **Template Consistency**: Unified email design across all apps
- **Type Safety**: Full TypeScript support for all email operations
- **Server-side Only**: Secure, server-side email sending
- **Modular Design**: Easy to extend with custom templates
- **Environment Agnostic**: Works in any Node.js environment

## 📝 **Migration from Dashboard**

This package consolidates all email functionality from the dashboard:

- ✅ SMTP configuration
- ✅ Email templates
- ✅ Sending functions
- ✅ Type definitions
- ✅ App configuration

All existing email functionality is preserved and enhanced with better type safety and modularity.

The `@wirecrest/email` package provides complete email functionality for all Wirecrest applications! 🎉
