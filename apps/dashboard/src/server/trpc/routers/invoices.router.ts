/**
 * Invoices Router
 * 
 * tRPC router for invoice management (Stripe):
 * - List, create, get, update, delete invoices
 * - Invoice management (finalize, pay, send, void, mark uncollectible)
 * - Line items management
 * - Bulk operations
 * 
 * All procedures require authentication and appropriate permissions.
 */

import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import {
  listInvoicesSchema,
  createInvoiceSchema,
  invoiceIdSchema,
  updateInvoiceSchema,
  payInvoiceSchema,
  lineItemSchema,
  calculateInvoiceSchema,
  bulkInvoiceOperationSchema,
} from '../schemas/invoices.schema';

// Import server actions for invoice operations
import {
  listInvoices as _listInvoices,
  createInvoice as _createInvoice,
  getInvoice as _getInvoice,
  updateInvoice as _updateInvoice,
  deleteInvoice as _deleteInvoice,
} from 'src/actions/invoices';

import {
  finalizeInvoice as _finalizeInvoice,
  payInvoice as _payInvoice,
  sendInvoice as _sendInvoice,
  voidInvoice as _voidInvoice,
  markInvoiceUncollectible as _markInvoiceUncollectible,
} from 'src/actions/invoice-management';

import {
  getInvoiceLineItems as _getInvoiceLineItems,
  addInvoiceLineItem as _addInvoiceLineItem,
  calculateInvoice as _calculateInvoice,
} from 'src/actions/invoice-line-items';

import {
  bulkInvoiceOperation as _bulkInvoiceOperation,
  bulkDeleteInvoices as _bulkDeleteInvoices,
  bulkSendInvoices as _bulkSendInvoices,
  bulkFinalizeInvoices as _bulkFinalizeInvoices,
  bulkVoidInvoices as _bulkVoidInvoices,
  bulkMarkUncollectible as _bulkMarkUncollectible,
} from 'src/actions/invoice-bulk';

/**
 * Invoices Router
 */
export const invoicesRouter = router({
  /**
   * List invoices
   */
  list: protectedProcedure.input(listInvoicesSchema).query(async ({ input }) => {
    try {
      const result = await _listInvoices(input);
      return result;
    } catch (error: any) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: error.message || 'Failed to list invoices',
      });
    }
  }),

  /**
   * Create invoice
   */
  create: protectedProcedure.input(createInvoiceSchema).mutation(async ({ input }) => {
    try {
      const result = await _createInvoice(input);
      return result;
    } catch (error: any) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: error.message || 'Failed to create invoice',
      });
    }
  }),

  /**
   * Get invoice by ID
   */
  get: protectedProcedure.input(invoiceIdSchema).query(async ({ input }) => {
    try {
      const result = await _getInvoice(input.id);
      return result;
    } catch (error: any) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: error.message || 'Failed to get invoice',
      });
    }
  }),

  /**
   * Update invoice
   */
  update: protectedProcedure.input(updateInvoiceSchema).mutation(async ({ input }) => {
    try {
      const { id, ...data } = input;
      const result = await _updateInvoice(id, data);
      return result;
    } catch (error: any) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: error.message || 'Failed to update invoice',
      });
    }
  }),

  /**
   * Delete invoice
   */
  delete: protectedProcedure.input(invoiceIdSchema).mutation(async ({ input }) => {
    try {
      const result = await _deleteInvoice(input.id);
      return result;
    } catch (error: any) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: error.message || 'Failed to delete invoice',
      });
    }
  }),

  /**
   * Finalize invoice
   */
  finalize: protectedProcedure.input(invoiceIdSchema).mutation(async ({ input }) => {
    try {
      const result = await _finalizeInvoice(input.id);
      return result;
    } catch (error: any) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: error.message || 'Failed to finalize invoice',
      });
    }
  }),

  /**
   * Pay invoice
   */
  pay: protectedProcedure.input(payInvoiceSchema).mutation(async ({ input }) => {
    try {
      const result = await _payInvoice(input.id, input.payment_method);
      return result;
    } catch (error: any) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: error.message || 'Failed to pay invoice',
      });
    }
  }),

  /**
   * Send invoice
   */
  send: protectedProcedure.input(invoiceIdSchema).mutation(async ({ input }) => {
    try {
      const result = await _sendInvoice(input.id);
      return result;
    } catch (error: any) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: error.message || 'Failed to send invoice',
      });
    }
  }),

  /**
   * Void invoice
   */
  void: protectedProcedure.input(invoiceIdSchema).mutation(async ({ input }) => {
    try {
      const result = await _voidInvoice(input.id);
      return result;
    } catch (error: any) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: error.message || 'Failed to void invoice',
      });
    }
  }),

  /**
   * Mark invoice as uncollectible
   */
  markUncollectible: protectedProcedure
    .input(invoiceIdSchema)
    .mutation(async ({ input }) => {
      try {
        const result = await _markInvoiceUncollectible(input.id);
        return result;
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Failed to mark invoice as uncollectible',
        });
      }
    }),

  /**
   * Get invoice line items
   */
  lineItems: protectedProcedure.input(invoiceIdSchema).query(async ({ input }) => {
    try {
      const result = await _getInvoiceLineItems(input.id);
      return result;
    } catch (error: any) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: error.message || 'Failed to get invoice line items',
      });
    }
  }),

  /**
   * Add invoice line item
   */
  addLineItem: protectedProcedure.input(lineItemSchema).mutation(async ({ input }) => {
    try {
      const result = await _addInvoiceLineItem(input.invoiceId, input.data);
      return result;
    } catch (error: any) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: error.message || 'Failed to add line item',
      });
    }
  }),

  /**
   * Calculate invoice
   */
  calculate: protectedProcedure
    .input(calculateInvoiceSchema)
    .mutation(async ({ input }) => {
      try {
        const result = await _calculateInvoice(input.invoiceId, input.data);
        return result;
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Failed to calculate invoice',
        });
      }
    }),

  /**
   * Bulk invoice operation
   */
  bulkOperation: protectedProcedure
    .input(bulkInvoiceOperationSchema)
    .mutation(async ({ input }) => {
      try {
        const result = await _bulkInvoiceOperation({
          invoiceIds: input.invoiceIds,
          operation: input.operation,
        });
        return result;
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Failed to perform bulk operation',
        });
      }
    }),

  /**
   * Bulk delete invoices
   */
  bulkDelete: protectedProcedure
    .input(z.object({ invoiceIds: z.array(z.string().min(1)).min(1) }))
    .mutation(async ({ input }) => {
      try {
        const result = await _bulkDeleteInvoices(input.invoiceIds);
        return result;
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Failed to bulk delete invoices',
        });
      }
    }),

  /**
   * Bulk send invoices
   */
  bulkSend: protectedProcedure
    .input(z.object({ invoiceIds: z.array(z.string().min(1)).min(1) }))
    .mutation(async ({ input }) => {
      try {
        const result = await _bulkSendInvoices(input.invoiceIds);
        return result;
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Failed to bulk send invoices',
        });
      }
    }),

  /**
   * Bulk finalize invoices
   */
  bulkFinalize: protectedProcedure
    .input(z.object({ invoiceIds: z.array(z.string().min(1)).min(1) }))
    .mutation(async ({ input }) => {
      try {
        const result = await _bulkFinalizeInvoices(input.invoiceIds);
        return result;
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Failed to bulk finalize invoices',
        });
      }
    }),

  /**
   * Bulk void invoices
   */
  bulkVoid: protectedProcedure
    .input(z.object({ invoiceIds: z.array(z.string().min(1)).min(1) }))
    .mutation(async ({ input }) => {
      try {
        const result = await _bulkVoidInvoices(input.invoiceIds);
        return result;
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Failed to bulk void invoices',
        });
      }
    }),

  /**
   * Bulk mark invoices as uncollectible
   */
  bulkMarkUncollectible: protectedProcedure
    .input(z.object({ invoiceIds: z.array(z.string().min(1)).min(1) }))
    .mutation(async ({ input }) => {
      try {
        const result = await _bulkMarkUncollectible(input.invoiceIds);
        return result;
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Failed to bulk mark invoices as uncollectible',
        });
      }
    }),
});

