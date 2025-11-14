/**
 * Zod Schemas for Tenants Router
 */

import { z } from 'zod';

/**
 * Schema for fetching tenants with filters
 */
export const getTenantsSchema = z.object({
  page: z.number().int().positive().optional().default(1),
  limit: z.number().int().positive().max(100).optional().default(25),
  search: z.string().optional(),
  status: z.string().optional(),
  platform: z.string().optional(),
  sortBy: z.string().optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

/**
 * Schema for tenant slug parameter
 */
export const tenantSlugSchema = z.object({
  slug: z.string().min(1, 'Tenant slug is required'),
});

/**
 * Schema for tenant ID parameter
 */
export const tenantIdSchema = z.object({
  tenantId: z.string().min(1, 'Tenant ID is required'),
});

/**
 * Schema for creating a tenant
 */
export const createTenantSchema = z.object({
  name: z.string().min(1, 'Tenant name is required'),
  slug: z.string().min(1, 'Tenant slug is required'),
});

/**
 * Schema for updating a tenant
 */
export const updateTenantSchema = z.object({
  tenantId: z.string().min(1, 'Tenant ID is required'),
  name: z.string().min(1).optional(),
  slug: z.string().min(1).optional(),
});

