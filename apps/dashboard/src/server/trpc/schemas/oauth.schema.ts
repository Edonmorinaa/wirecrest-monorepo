/**
 * Zod Schemas for OAuth (SSO) Router
 */

import { z } from 'zod';

/**
 * Schema for team slug parameter
 */
export const oauthSlugSchema = z.object({
  slug: z.string().min(1, 'Team slug is required'),
});

/**
 * Schema for SSO connection with client ID
 */
export const ssoConnectionSchema = z.object({
  slug: z.string().min(1, 'Team slug is required'),
  clientId: z.string().min(1, 'Client ID is required').optional(),
});

/**
 * Schema for creating SSO connection
 */
export const createSSOConnectionSchema = z.object({
  slug: z.string().min(1, 'Team slug is required'),
  connectionData: z.any(), // Dynamic data structure
});

/**
 * Schema for updating SSO connection
 */
export const updateSSOConnectionSchema = z.object({
  slug: z.string().min(1, 'Team slug is required'),
  clientId: z.string().min(1, 'Client ID is required'),
  connectionData: z.any(),
});

/**
 * Schema for deleting SSO connection
 */
export const deleteSSOConnectionSchema = z.object({
  slug: z.string().min(1, 'Team slug is required'),
  clientId: z.string().min(1, 'Client ID is required'),
});

