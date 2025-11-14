/**
 * Zod Schemas for Webhooks Router
 */

import { z } from 'zod';

export const createWebhookSchema = z.object({
  slug: z.string().min(1, 'Team slug is required'),
  data: z.object({
    url: z.string().url('Valid webhook URL is required'),
    description: z.string().optional(),
    eventTypes: z.array(z.string()).optional(),
    secret: z.string().optional(),
    metadata: z.record(z.any()).optional(),
  }),
});

export const teamSlugWebhookSchema = z.object({
  slug: z.string().min(1, 'Team slug is required'),
});

export const getWebhookSchema = z.object({
  slug: z.string().min(1, 'Team slug is required'),
  endpointId: z.string().min(1, 'Endpoint ID is required'),
});

export const updateWebhookSchema = z.object({
  slug: z.string().min(1, 'Team slug is required'),
  endpointId: z.string().min(1, 'Endpoint ID is required'),
  data: z.object({
    url: z.string().url().optional(),
    description: z.string().optional(),
    eventTypes: z.array(z.string()).optional(),
    disabled: z.boolean().optional(),
  }),
});

export const deleteWebhookSchema = z.object({
  slug: z.string().min(1, 'Team slug is required'),
  endpointId: z.string().min(1, 'Endpoint ID is required'),
});

