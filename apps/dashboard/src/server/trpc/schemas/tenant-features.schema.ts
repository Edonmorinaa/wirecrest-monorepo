/**
 * Zod Schemas for Tenant Features Router
 */

import { z } from 'zod';

/**
 * Schema for tenant ID parameter
 */
export const tenantFeatureIdSchema = z.object({
  tenantId: z.string().min(1, 'Tenant ID is required'),
});

/**
 * Schema for checking specific features
 */
export const checkFeaturesSchema = z.object({
  tenantId: z.string().min(1, 'Tenant ID is required'),
  featureKeys: z.array(z.string().min(1)).min(1, 'At least one feature key is required'),
});

/**
 * Schema for checking a single feature
 */
export const checkSingleFeatureSchema = z.object({
  tenantId: z.string().min(1, 'Tenant ID is required'),
  featureKey: z.string().min(1, 'Feature key is required'),
});

