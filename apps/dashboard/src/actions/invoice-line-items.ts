/**
 * Invoice Line Items Server Actions
 * Actions for managing invoice line items and calculations
 */

'use server';

import { prisma } from '@wirecrest/db';
import { revalidatePath } from 'next/cache';
import { auth } from '@wirecrest/auth-next';

import { calculateInvoiceTotal } from '../lib/invoice-utils';

// Helper function to check admin access
async function checkAdminAccess() {
  const session = await auth();
  if (!session?.user) {
    throw new Error('Unauthorized');
  }

  if (session.user.superRole !== 'ADMIN') {
    throw new Error('Admin access required');
  }

  return session;
}

// Line item data for creating invoice items (custom interface as Stripe doesn't have exact match)
export interface LineItemData {
  title: string;
  description?: string;
  service?: string;
  quantity: number;
  price: number;
}

// Invoice calculation data (custom interface for calculation purposes)
export interface CalculateInvoiceData {
  subtotal: number;
  taxes: number;
  discount: number;
  shipping: number;
}

/**
 * Get line items for an invoice
 */
export async function getInvoiceLineItems(invoiceId: string) {
  try {
    await checkAdminAccess();

    const lineItems = await prisma.invoiceLineItem.findMany({
      where: { invoiceId },
    });

    return {
      success: true,
      data: lineItems,
    };
  } catch (error) {
    console.error('Failed to fetch line items:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch line items',
    };
  }
}

/**
 * Add a line item to an invoice
 */
export async function addInvoiceLineItem(invoiceId: string, data: LineItemData) {
  try {
    await checkAdminAccess();

    const { title, description, service, quantity, price } = data;

    if (!title || !quantity || !price) {
      return {
        success: false,
        error: 'Title, quantity, and price are required',
      };
    }

    const amount = quantity * price;

    const lineItem = await prisma.invoiceLineItem.create({
      data: {
        invoiceId,
        description: title,
        quantity,
        unitPrice: price.toString(),
        amount: amount.toString(),
        metadata: JSON.stringify({
          title,
          description,
          service,
        }),
      },
    });

    // Update invoice total with proper calculation including taxes, discount, shipping
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { lineItems: true },
    });

    if (invoice) {
      const subtotal = invoice.lineItems.reduce((sum, item) => sum + Number(item.amount), 0);
      
      // Get existing metadata for taxes, discount, shipping
      let metadata: any = {};
      try {
        if (invoice.metadata) {
          if (typeof invoice.metadata === 'string') {
            metadata = JSON.parse(invoice.metadata);
          } else if (typeof invoice.metadata === 'object') {
            metadata = invoice.metadata;
          }
        }
      } catch (e) {
        console.warn('Failed to parse invoice metadata:', e);
        metadata = {};
      }
      
      const taxes = metadata.taxes || 0;
      const discount = metadata.discount || 0;
      const shipping = metadata.shipping || 0;
      
      // Calculate new total using proper formula
      const { totalAmount } = calculateInvoiceTotal(subtotal, taxes, discount, shipping);
      
      // Update invoice with new totals and metadata
      await prisma.invoice.update({
        where: { id: invoiceId },
        data: { 
          amount: totalAmount.toString(),
          metadata: JSON.stringify({
            ...metadata,
            subtotal,
            totalAmount,
          }),
        },
      });
    }

    // Revalidate related pages
    revalidatePath('/dashboard/invoices');
    revalidatePath(`/dashboard/invoices/${invoiceId}`);

    return {
      success: true,
      data: lineItem,
    };
  } catch (error) {
    console.error('Failed to create line item:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create line item',
    };
  }
}

/**
 * Calculate invoice totals
 */
export async function calculateInvoice(invoiceId: string, data: CalculateInvoiceData) {
  try {
    await checkAdminAccess();

    const { subtotal, taxes, discount, shipping } = data;

    // Calculate new total using proper formula - FIXED: shipping is added, not subtracted
    const { totalAmount } = calculateInvoiceTotal(subtotal, taxes, discount, shipping);

    // Update invoice with new calculations
    const updatedInvoice = await prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        amount: totalAmount.toString(),
        metadata: JSON.stringify({
          subtotal,
          taxes,
          discount,
          shipping,
          totalAmount,
        }),
      },
      include: {
        lineItems: true,
      },
    });

    // Revalidate related pages
    revalidatePath('/dashboard/invoices');
    revalidatePath(`/dashboard/invoices/${invoiceId}`);

    return {
      success: true,
      data: {
        invoice: updatedInvoice,
        calculations: {
          subtotal,
          taxes,
          discount,
          shipping,
          totalAmount,
        },
      },
    };
  } catch (error) {
    console.error('Failed to calculate invoice:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to calculate invoice',
    };
  }
}
