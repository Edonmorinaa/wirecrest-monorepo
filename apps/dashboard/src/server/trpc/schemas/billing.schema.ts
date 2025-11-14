/**
 * Zod Schemas for Billing Router
 * 
 * Validation schemas for all billing-related operations
 */

import { z } from 'zod';

/**
 * Schema for team ID parameter
 */
export const teamIdSchema = z.object({
  teamId: z.string().min(1, 'Team ID is required'),
});

/**
 * Schema for creating customer portal session
 */
export const createCustomerPortalSchema = z.object({
  teamId: z.string().min(1, 'Team ID is required'),
  returnUrl: z.string().url('Valid return URL is required'),
  options: z.object({
    flowType: z.enum(['subscription_cancel', 'subscription_update', 'payment_method_update']).optional(),
    locale: z.string().optional(),
    retentionCouponId: z.string().optional(),
  }).optional(),
});

/**
 * Schema for creating checkout session
 */
export const createCheckoutSchema = z.object({
  teamId: z.string().min(1, 'Team ID is required'),
  priceId: z.string().min(1, 'Price ID is required'),
  successUrl: z.string().url('Valid success URL is required'),
  cancelUrl: z.string().url('Valid cancel URL is required'),
});

/**
 * Schema for handling plan upgrade
 */
export const handlePlanUpgradeSchema = z.object({
  teamId: z.string().min(1, 'Team ID is required'),
  plan: z.object({
    product: z.any(), // Stripe.Product type
    price: z.any(),   // Stripe.Price type
    features: z.array(z.string()),
  }),
});

