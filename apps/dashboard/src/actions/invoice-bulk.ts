/**
 * Bulk Invoice Operations Server Actions
 * Actions for performing bulk operations on multiple invoices
 */

'use server';

import { revalidatePath } from 'next/cache';
import { auth } from '@wirecrest/auth/server';
import { InvoiceService } from '@wirecrest/billing';

// Helper function to check admin access
async function checkAdminAccess() {
  const session = await auth();
  if (!session?.user) {
    throw new Error('Unauthorized');
  }

  if (session.user.superRole !== 'ADMIN' && session.user.superRole !== 'SUPPORT') {
    throw new Error('Access denied');
  }

  return session;
}

// Using simple interface for bulk operations (not a direct Stripe type)
export interface BulkInvoiceOperation {
  operation: string;
  invoiceIds: string[];
}

/**
 * Perform bulk operations on invoices
 */
export async function bulkInvoiceOperation(data: BulkInvoiceOperation) {
  try {
    await checkAdminAccess();

    const { operation, invoiceIds } = data;

    if (!operation || !Array.isArray(invoiceIds) || invoiceIds.length === 0) {
      return {
        success: false,
        error: 'Operation and invoice IDs are required',
      };
    }

    const invoiceService = new InvoiceService();
    let results: any = {};

    switch (operation) {
      case 'delete': {
        // Use InvoiceService to delete Stripe invoices (only works for draft invoices)
        let deletedCount = 0;
        const errors: string[] = [];
        
        for (const invoiceId of invoiceIds) {
          try {
            await invoiceService.deleteInvoice(invoiceId);
            deletedCount++;
          } catch (error) {
            console.error(`Failed to delete invoice ${invoiceId}:`, error);
            errors.push(`Failed to delete invoice ${invoiceId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        }
        results = { deleted: deletedCount, errors };
        break;
      }

      case 'send': {
        // Use InvoiceService to send Stripe invoices
        let sentCount = 0;
        const errors: string[] = [];
        
        for (const invoiceId of invoiceIds) {
          try {
            await invoiceService.sendInvoice(invoiceId);
            sentCount++;
          } catch (error) {
            console.error(`Failed to send invoice ${invoiceId}:`, error);
            errors.push(`Failed to send invoice ${invoiceId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        }
        results = { sent: sentCount, errors };
        break;
      }

      case 'finalize': {
        // Use InvoiceService to finalize Stripe invoices
        let finalizedCount = 0;
        const errors: string[] = [];
        
        for (const invoiceId of invoiceIds) {
          try {
            await invoiceService.finalizeInvoice(invoiceId);
            finalizedCount++;
          } catch (error) {
            console.error(`Failed to finalize invoice ${invoiceId}:`, error);
            errors.push(`Failed to finalize invoice ${invoiceId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        }
        results = { finalized: finalizedCount, errors };
        break;
      }

      case 'void': {
        // Use InvoiceService to void Stripe invoices
        let voidedCount = 0;
        const errors: string[] = [];
        
        for (const invoiceId of invoiceIds) {
          try {
            await invoiceService.voidInvoice(invoiceId);
            voidedCount++;
          } catch (error) {
            console.error(`Failed to void invoice ${invoiceId}:`, error);
            errors.push(`Failed to void invoice ${invoiceId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        }
        results = { voided: voidedCount, errors };
        break;
      }

      case 'markUncollectible': {
        // Use InvoiceService to mark invoices as uncollectible
        let uncollectibleCount = 0;
        const errors: string[] = [];
        
        for (const invoiceId of invoiceIds) {
          try {
            await invoiceService.markUncollectible(invoiceId);
            uncollectibleCount++;
          } catch (error) {
            console.error(`Failed to mark invoice ${invoiceId} as uncollectible:`, error);
            errors.push(`Failed to mark invoice ${invoiceId} as uncollectible: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        }
        results = { markedUncollectible: uncollectibleCount, errors };
        break;
      }

      default:
        return {
          success: false,
          error: 'Invalid operation',
        };
    }

    // Revalidate the invoices page
    revalidatePath('/dashboard/invoices');

    return {
      success: true,
      data: {
        operation,
        results,
        processedIds: invoiceIds,
      },
    };
  } catch (error) {
    console.error('Failed to perform bulk operation:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to perform bulk operation',
    };
  }
}

/**
 * Bulk delete invoices
 */
export async function bulkDeleteInvoices(invoiceIds: string[]) {
  return bulkInvoiceOperation({
    operation: 'delete',
    invoiceIds,
  });
}

/**
 * Bulk send invoices
 */
export async function bulkSendInvoices(invoiceIds: string[]) {
  return bulkInvoiceOperation({
    operation: 'send',
    invoiceIds,
  });
}

/**
 * Bulk finalize invoices
 */
export async function bulkFinalizeInvoices(invoiceIds: string[]) {
  return bulkInvoiceOperation({
    operation: 'finalize',
    invoiceIds,
  });
}

/**
 * Bulk void invoices
 */
export async function bulkVoidInvoices(invoiceIds: string[]) {
  return bulkInvoiceOperation({
    operation: 'void',
    invoiceIds,
  });
}

/**
 * Bulk mark invoices as uncollectible
 */
export async function bulkMarkUncollectible(invoiceIds: string[]) {
  return bulkInvoiceOperation({
    operation: 'markUncollectible',
    invoiceIds,
  });
}
