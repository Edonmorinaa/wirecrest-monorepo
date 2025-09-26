import { z } from 'zod';

export const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
  recaptchaToken: z.string().min(1, 'Recaptcha token is required'),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export const updatePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters'),
});

export const userJoinSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  team: z.string().optional(),
});

export const resendEmailTokenSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export const resendLinkRequestSchema = z.object({
  email: z.string().email('Invalid email address'),
  expiredToken: z.string().min(1, 'Expired token is required'),
});

export function validateWithSchema<T>(schema: z.ZodSchema<T>, data: unknown): T {
  return schema.parse(data);
}
