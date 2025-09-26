# @wirecrest/email - Usage Examples

This document provides comprehensive examples of how to use the `@wirecrest/email` package in your applications.

## 🚀 **Basic Setup**

### **Environment Variables**

```bash
# .env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM=noreply@yourdomain.com

APP_NAME=Wirecrest
APP_URL=https://yourdomain.com
APP_LOGO_URL=https://yourdomain.com/logo.svg
```

### **Initialize SMTP Client**

```typescript
import { createSMTPClient } from '@wirecrest/email';

// Uses environment variables automatically
const smtpClient = createSMTPClient();
```

## 📧 **Email Functions**

### **1. Magic Link Authentication**

```typescript
import { createSMTPClient, sendMagicLink } from '@wirecrest/email';

const smtpClient = createSMTPClient();

export async function sendAuthMagicLink(email: string, callbackUrl: string) {
  try {
    await sendMagicLink(smtpClient, email, callbackUrl);
    console.log('Magic link sent successfully');
  } catch (error) {
    console.error('Failed to send magic link:', error);
    throw error;
  }
}

// Usage
await sendAuthMagicLink('user@example.com', 'https://app.com/auth/callback?token=abc123');
```

### **2. Password Reset**

```typescript
import { createSMTPClient, sendPasswordResetEmail } from '@wirecrest/email';

const smtpClient = createSMTPClient();

export async function sendPasswordReset(user: User, resetToken: string) {
  try {
    await sendPasswordResetEmail(smtpClient, user, resetToken);
    console.log('Password reset email sent');
  } catch (error) {
    console.error('Failed to send password reset:', error);
    throw error;
  }
}

// Usage
const user = { id: '1', name: 'John Doe', email: 'john@example.com' };
await sendPasswordReset(user, 'reset-token-123');
```

### **3. Email Verification**

```typescript
import { createSMTPClient, sendVerificationEmail } from '@wirecrest/email';

const smtpClient = createSMTPClient();

export async function sendEmailVerification(user: User, verificationToken: VerificationToken) {
  try {
    await sendVerificationEmail(smtpClient, user, verificationToken);
    console.log('Verification email sent');
  } catch (error) {
    console.error('Failed to send verification email:', error);
    throw error;
  }
}

// Usage
const user = { id: '1', name: 'John Doe', email: 'john@example.com' };
const token = { id: '1', token: 'verify-123', expires: new Date() };
await sendEmailVerification(user, token);
```

### **4. Welcome Email**

```typescript
import { createSMTPClient, sendWelcomeEmail } from '@wirecrest/email';

const smtpClient = createSMTPClient();

export async function sendWelcomeToNewUser(name: string, email: string, teamName: string) {
  try {
    await sendWelcomeEmail(smtpClient, name, email, teamName);
    console.log('Welcome email sent');
  } catch (error) {
    console.error('Failed to send welcome email:', error);
    throw error;
  }
}

// Usage
await sendWelcomeToNewUser('John Doe', 'john@example.com', 'Acme Corporation');
```

### **5. Team Invitations**

```typescript
import { createSMTPClient, sendTeamInviteEmail } from '@wirecrest/email';

const smtpClient = createSMTPClient();

export async function sendTeamInvitation(team: Team, invitation: Invitation) {
  try {
    await sendTeamInviteEmail(smtpClient, team, invitation);
    console.log('Team invitation sent');
  } catch (error) {
    console.error('Failed to send team invitation:', error);
    throw error;
  }
}

// Usage
const team = { id: '1', name: 'Acme Corp', slug: 'acme-corp' };
const invitation = { 
  id: '1', 
  email: 'newuser@example.com', 
  token: 'invite-123', 
  expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
};
await sendTeamInvitation(team, invitation);
```

### **6. Account Locked Notification**

```typescript
import { createSMTPClient, sendAccountLockedEmail } from '@wirecrest/email';

const smtpClient = createSMTPClient();

export async function notifyAccountLocked(email: string, unlockToken: string) {
  try {
    const unlockUrl = `https://app.com/auth/unlock?token=${unlockToken}`;
    await sendAccountLockedEmail(smtpClient, email, unlockUrl);
    console.log('Account locked notification sent');
  } catch (error) {
    console.error('Failed to send account locked notification:', error);
    throw error;
  }
}

// Usage
await notifyAccountLocked('user@example.com', 'unlock-token-123');
```

### **7. Test Email**

```typescript
import { createSMTPClient, sendTestEmail } from '@wirecrest/email';

const smtpClient = createSMTPClient();

export async function sendTestEmailToUser(name: string, testEmail: string) {
  try {
    await sendTestEmail(smtpClient, name, testEmail);
    console.log('Test email sent');
  } catch (error) {
    console.error('Failed to send test email:', error);
    throw error;
  }
}

// Usage
await sendTestEmailToUser('John Doe', 'test@example.com');
```

## 🎨 **Custom Email Templates**

### **Creating Custom Templates**

```typescript
// src/components/CustomEmail.tsx
import React from 'react';
import { Html, Head, Preview, Text, Button } from '@react-email/components';
import EmailLayout from '@wirecrest/email/EmailLayout';

interface CustomEmailProps {
  name: string;
  subject: string;
  actionUrl: string;
}

const CustomEmail = ({ name, subject, actionUrl }: CustomEmailProps) => {
  return (
    <Html>
      <Head />
      <Preview>{subject}</Preview>
      <EmailLayout>
        <Text>Hello {name},</Text>
        <Text>This is a custom email template.</Text>
        <Button href={actionUrl}>Take Action</Button>
      </EmailLayout>
    </Html>
  );
};

export default CustomEmail;
```

### **Using Custom Templates**

```typescript
import { render } from '@react-email/render';
import { sendEmail, createSMTPClient } from '@wirecrest/email';
import CustomEmail from './CustomEmail';

const smtpClient = createSMTPClient();

export async function sendCustomEmail(name: string, email: string, actionUrl: string) {
  const subject = 'Custom Email Subject';
  const html = await render(CustomEmail({ name, subject, actionUrl }));

  await sendEmail(smtpClient, {
    to: email,
    subject,
    html,
  });
}
```

## ⚙️ **Advanced Configuration**

### **Custom SMTP Configuration**

```typescript
import { SMTPClient } from '@wirecrest/email';

const smtpClient = new SMTPClient({
  host: 'smtp.custom-provider.com',
  port: 587,
  user: 'custom-user@domain.com',
  password: 'custom-password',
  from: 'noreply@customdomain.com',
});
```

### **App Configuration**

```typescript
import { updateAppConfig } from '@wirecrest/email';

// Update app settings
updateAppConfig({
  name: 'My Custom App',
  logoUrl: 'https://myapp.com/logo.svg',
  url: 'https://myapp.com',
});
```

## 🔧 **Integration Examples**

### **Next.js API Route**

```typescript
// pages/api/send-email.ts
import { createSMTPClient, sendMagicLink } from '@wirecrest/email';
import type { NextApiRequest, NextApiResponse } from 'next';

const smtpClient = createSMTPClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { email, callbackUrl } = req.body;

  try {
    await sendMagicLink(smtpClient, email, callbackUrl);
    res.status(200).json({ message: 'Email sent successfully' });
  } catch (error) {
    console.error('Email sending failed:', error);
    res.status(500).json({ message: 'Failed to send email' });
  }
}
```

### **Express.js Route**

```typescript
// routes/email.ts
import express from 'express';
import { createSMTPClient, sendPasswordResetEmail } from '@wirecrest/email';

const router = express.Router();
const smtpClient = createSMTPClient();

router.post('/password-reset', async (req, res) => {
  try {
    const { user, token } = req.body;
    await sendPasswordResetEmail(smtpClient, user, token);
    res.json({ message: 'Password reset email sent' });
  } catch (error) {
    console.error('Failed to send password reset email:', error);
    res.status(500).json({ message: 'Failed to send email' });
  }
});

export default router;
```

### **Server Action (Next.js)**

```typescript
// actions/email.ts
'use server';

import { createSMTPClient, sendWelcomeEmail } from '@wirecrest/email';

const smtpClient = createSMTPClient();

export async function sendWelcomeEmailAction(name: string, email: string, team: string) {
  try {
    await sendWelcomeEmail(smtpClient, name, email, team);
    return { success: true, message: 'Welcome email sent' };
  } catch (error) {
    console.error('Failed to send welcome email:', error);
    return { success: false, message: 'Failed to send email' };
  }
}
```

## 🎯 **Best Practices**

### **Error Handling**

```typescript
import { createSMTPClient, sendMagicLink } from '@wirecrest/email';

const smtpClient = createSMTPClient();

export async function sendEmailWithErrorHandling(email: string, url: string) {
  try {
    await sendMagicLink(smtpClient, email, url);
    return { success: true, message: 'Email sent successfully' };
  } catch (error) {
    console.error('Email sending failed:', error);
    
    // Handle specific error types
    if (error.code === 'ECONNREFUSED') {
      return { success: false, message: 'SMTP server unavailable' };
    }
    
    if (error.code === 'EAUTH') {
      return { success: false, message: 'SMTP authentication failed' };
    }
    
    return { success: false, message: 'Failed to send email' };
  }
}
```

### **Batch Email Sending**

```typescript
import { createSMTPClient, sendWelcomeEmail } from '@wirecrest/email';

const smtpClient = createSMTPClient();

export async function sendWelcomeEmailsToMultipleUsers(users: Array<{name: string, email: string, team: string}>) {
  const results = await Promise.allSettled(
    users.map(user => sendWelcomeEmail(smtpClient, user.name, user.email, user.team))
  );

  const successful = results.filter(result => result.status === 'fulfilled').length;
  const failed = results.filter(result => result.status === 'rejected').length;

  console.log(`Sent ${successful} emails successfully, ${failed} failed`);
  
  return { successful, failed };
}
```

## 🚀 **Deployment Considerations**

### **Environment-Specific Configuration**

```typescript
// config/email.ts
import { createSMTPClient } from '@wirecrest/email';

const getSMTPConfig = () => {
  if (process.env.NODE_ENV === 'production') {
    return createSMTPClient(); // Uses production SMTP settings
  }
  
  // Development/testing configuration
  return createSMTPClient();
};

export const smtpClient = getSMTPConfig();
```

### **Email Queue Integration**

```typescript
// For high-volume email sending, consider using a queue system
import { createSMTPClient, sendMagicLink } from '@wirecrest/email';
import Queue from 'bull';

const emailQueue = new Queue('email processing');
const smtpClient = createSMTPClient();

emailQueue.process('magic-link', async (job) => {
  const { email, url } = job.data;
  await sendMagicLink(smtpClient, email, url);
});

// Add email to queue
export async function queueMagicLink(email: string, url: string) {
  await emailQueue.add('magic-link', { email, url });
}
```

The `@wirecrest/email` package provides a complete email solution for all your applications! 🎉
