/**
 * Zod Schemas for Invoices Router
 */

import { z } from 'zod';

/**
 * Schema for listing invoices
 */
export const listInvoicesSchema = z.object({
  customer: z.string().optional(),
  subscription: z.string().optional(),
  status: z.enum(['draft', 'open', 'paid', 'uncollectible', 'void']).optional(),
  limit: z.number().int().positive().max(100).optional().default(10),
  starting_after: z.string().optional(),
  ending_before: z.string().optional(),
});

/**
 * Schema for creating invoice
 */
export const createInvoiceSchema = z.object({
  customer: z.string().min(1, 'Customer ID is required'),
  currency: z.string().min(3).max(3).optional().default('usd'),
  description: z.string().optional(),
  metadata: z.record(z.string()).optional(),
  auto_advance: z.boolean().optional(),
  collection_method: z.enum(['charge_automatically', 'send_invoice']).optional(),
  days_until_due: z.number().int().positive().optional(),
});

/**
 * Schema for invoice ID parameter
 */
export const invoiceIdSchema = z.object({
  id: z.string().min(1, 'Invoice ID is required'),
});

/**
 * Schema for updating invoice
 */
export const updateInvoiceSchema = z.object({
  id: z.string().min(1, 'Invoice ID is required'),
  description: z.string().optional(),
  metadata: z.record(z.string()).optional(),
  auto_advance: z.boolean().optional(),
  collection_method: z.enum(['charge_automatically', 'send_invoice']).optional(),
  days_until_due: z.number().int().positive().optional(),
});

/**
 * Schema for paying invoice
 */
export const payInvoiceSchema = z.object({
  id: z.string().min(1, 'Invoice ID is required'),
  payment_method: z.string().optional(),
});

/**
 * Schema for line item data
 */
export const lineItemSchema = z.object({
  invoiceId: z.string().min(1, 'Invoice ID is required'),
  data: z.object({
    quantity: z.number().int().positive(),
    price: z.string().optional(),
    price_data: z.object({
      currency: z.string().min(3).max(3),
      product: z.string().optional(),
      unit_amount: z.number().int().positive(),
      unit_amount_decimal: z.string().optional(),
    }).optional(),
    description: z.string().optional(),
  }),
});

/**
 * Schema for calculate invoice
 */
export const calculateInvoiceSchema = z.object({
  invoiceId: z.string().min(1, 'Invoice ID is required'),
  data: z.object({
    discounts: z.array(z.object({
      coupon: z.string().optional(),
      discount: z.string().optional(),
    })).optional(),
    subscription: z.string().optional(),
  }),
});

/**
 * Schema for bulk operations
 */
export const bulkInvoiceOperationSchema = z.object({
  invoiceIds: z.array(z.string().min(1)).min(1, 'At least one invoice ID is required'),
  operation: z.enum(['delete', 'send', 'finalize', 'void', 'mark_uncollectible']),
});

