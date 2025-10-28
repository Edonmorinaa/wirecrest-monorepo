/**
 * Invoice Management Server Actions
 * Actions for managing invoice states (finalize, pay, send, void, etc.)
 */

'use server';

import { revalidatePath } from 'next/cache';
import { auth } from '@wirecrest/auth-next';
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

/**
 * Finalize an invoice
 */
export async function finalizeInvoice(id: string) {
  try {
    await checkAdminAccess();

    const invoiceService = new InvoiceService();

    // Finalize Stripe invoice using InvoiceService
    const invoice = await invoiceService.finalizeInvoice(id);

    // Transform for UI
    const transformedInvoice = invoiceService.transformInvoiceForUI(invoice);

    // Revalidate the invoices page
    revalidatePath('/dashboard/invoices');
    revalidatePath(`/dashboard/invoices/${id}`);

    return {
      success: true,
      data: transformedInvoice,
    };
  } catch (error) {
    console.error('Failed to finalize invoice:', error);
    if (error instanceof Error && error.message.includes('No such invoice')) {
      return {
        success: false,
        error: 'Invoice not found',
      };
    }
    if (error instanceof Error && error.message.includes('only be finalized if it is a draft')) {
      return {
        success: false,
        error: 'Only draft invoices can be finalized',
      };
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to finalize invoice',
    };
  }
}

/**
 * Pay an invoice
 */
export async function payInvoice(id: string, payment_method?: string) {
  try {
    await checkAdminAccess();

    const invoiceService = new InvoiceService();

    // Pay Stripe invoice using InvoiceService
    const invoice = await invoiceService.payInvoice(id, payment_method);

    // Transform for UI
    const transformedInvoice = invoiceService.transformInvoiceForUI(invoice);

    // Revalidate the invoices page
    revalidatePath('/dashboard/invoices');
    revalidatePath(`/dashboard/invoices/${id}`);

    return {
      success: true,
      data: transformedInvoice,
    };
  } catch (error) {
    console.error('Failed to pay invoice:', error);
    if (error instanceof Error && error.message.includes('No such invoice')) {
      return {
        success: false,
        error: 'Invoice not found',
      };
    }
    if (error instanceof Error && error.message.includes('only be paid if it is open')) {
      return {
        success: false,
        error: 'Only open invoices can be paid',
      };
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to pay invoice',
    };
  }
}

/**
 * Send an invoice
 */
export async function sendInvoice(id: string) {
  try {
    await checkAdminAccess();

    const invoiceService = new InvoiceService();

    // Send Stripe invoice using InvoiceService
    const invoice = await invoiceService.sendInvoice(id);

    // Transform for UI
    const transformedInvoice = invoiceService.transformInvoiceForUI(invoice);

    // Revalidate the invoices page
    revalidatePath('/dashboard/invoices');
    revalidatePath(`/dashboard/invoices/${id}`);

    return {
      success: true,
      data: transformedInvoice,
    };
  } catch (error) {
    console.error('Failed to send invoice:', error);
    if (error instanceof Error && error.message.includes('No such invoice')) {
      return {
        success: false,
        error: 'Invoice not found',
      };
    }
    if (error instanceof Error && error.message.includes('only be sent if it is open')) {
      return {
        success: false,
        error: 'Only open invoices can be sent',
      };
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send invoice',
    };
  }
}

/**
 * Void an invoice
 */
export async function voidInvoice(id: string) {
  try {
    await checkAdminAccess();

    const invoiceService = new InvoiceService();

    // Void Stripe invoice using InvoiceService
    const invoice = await invoiceService.voidInvoice(id);

    // Transform for UI
    const transformedInvoice = invoiceService.transformInvoiceForUI(invoice);

    // Revalidate the invoices page
    revalidatePath('/dashboard/invoices');
    revalidatePath(`/dashboard/invoices/${id}`);

    return {
      success: true,
      data: transformedInvoice,
    };
  } catch (error) {
    console.error('Failed to void invoice:', error);
    if (error instanceof Error && error.message.includes('No such invoice')) {
      return {
        success: false,
        error: 'Invoice not found',
      };
    }
    if (error instanceof Error && error.message.includes('only be voided if it is open')) {
      return {
        success: false,
        error: 'Only open invoices can be voided',
      };
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to void invoice',
    };
  }
}

/**
 * Mark an invoice as uncollectible
 */
export async function markInvoiceUncollectible(id: string) {
  try {
    await checkAdminAccess();

    const invoiceService = new InvoiceService();

    // Mark Stripe invoice as uncollectible using InvoiceService
    const invoice = await invoiceService.markUncollectible(id);

    // Transform for UI
    const transformedInvoice = invoiceService.transformInvoiceForUI(invoice);

    // Revalidate the invoices page
    revalidatePath('/dashboard/invoices');
    revalidatePath(`/dashboard/invoices/${id}`);

    return {
      success: true,
      data: transformedInvoice,
    };
  } catch (error) {
    console.error('Failed to mark invoice as uncollectible:', error);
    if (error instanceof Error && error.message.includes('No such invoice')) {
      return {
        success: false,
        error: 'Invoice not found',
      };
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to mark invoice as uncollectible',
    };
  }
}
