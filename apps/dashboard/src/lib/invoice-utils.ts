/**
 * Shared utilities for invoice operations
 * Ensures consistency across all invoice endpoints
 */

import Decimal from 'decimal.js';
import { prisma } from '@wirecrest/db';
import { StripeService } from '@wirecrest/billing';

/**
 * Validate team access for invoice operations
 */
export async function validateTeamAccess(
  userId: string, 
  teamId: string, 
  userSuperRole?: string
): Promise<boolean> {
  // Admin and Support have access to all teams
  if (userSuperRole === 'ADMIN' || userSuperRole === 'SUPPORT') {
    return true;
  }

  // Check if user is a member of the team
  const teamMember = await prisma.teamMember.findFirst({
    where: { 
      userId, 
      teamId 
    }
  });

  return !!teamMember;
}

/**
 * Calculate invoice total with proper formula
 * Formula: subtotal + taxes + shipping - discount
 */
export function calculateInvoiceTotal(
  subtotal: number,
  taxesPercent: number,
  discount: number,
  shipping: number
): {
  taxAmount: number;
  totalAmount: number;
} {
  const subtotalDecimal = new Decimal(subtotal);
  const taxAmountDecimal = subtotalDecimal.mul(taxesPercent).div(100);
  const discountDecimal = new Decimal(discount);
  const shippingDecimal = new Decimal(shipping);

  const totalAmountDecimal = subtotalDecimal
    .add(taxAmountDecimal)
    .add(shippingDecimal)  // FIXED: shipping is added, not subtracted
    .sub(discountDecimal);

  return {
    taxAmount: taxAmountDecimal.toNumber(),
    totalAmount: totalAmountDecimal.toNumber(),
  };
}

/**
 * Calculate line items subtotal
 */
export function calculateLineItemsSubtotal(items: Array<{ quantity: number; price: number }>): number {
  return items.reduce((sum, item) => {
    const itemTotal = new Decimal(item.quantity).mul(item.price);
    return new Decimal(sum).add(itemTotal).toNumber();
  }, 0);
}

/**
 * Validate invoice status transition
 */
export function validateStatusTransition(
  currentStatus: string, 
  newStatus: string
): { valid: boolean; error?: string } {
  const validTransitions: Record<string, string[]> = {
    'DRAFT': ['OPEN', 'VOID'],
    'OPEN': ['DRAFT', 'PAID', 'VOID', 'UNCOLLECTIBLE'], // Allow going back to draft
    'PAID': ['VOID'], // Paid invoices can only be voided
    'VOID': [], // Void is final
    'UNCOLLECTIBLE': ['OPEN', 'DRAFT'], // Can be reopened or go to draft
  };

  const allowedTransitions = validTransitions[currentStatus] || [];
  
  if (!allowedTransitions.includes(newStatus)) {
    return {
      valid: false,
      error: `Invalid status transition from ${currentStatus} to ${newStatus}`,
    };
  }

  return { valid: true };
}

/**
 * Get invoice with proper access control
 */
export async function getInvoiceWithAccess(
  invoiceId: string,
  userId: string,
  userSuperRole?: string
) {
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: {
      subscription: {
        include: {
          team: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
      },
      lineItems: true,
    },
  });

  if (!invoice) {
    return { error: 'Invoice not found', status: 404 };
  }

  // Check access permissions
  const teamId = invoice.subscription?.team?.id;
  if (!teamId) {
    return { error: 'Invoice has no associated team', status: 500 };
  }

  const hasAccess = await validateTeamAccess(userId, teamId, userSuperRole);
  if (!hasAccess) {
    return { error: 'Access denied', status: 403 };
  }

  return { invoice };
}

/**
 * Transform database invoice to UI format
 */
export function transformInvoiceForUI(invoice: any) {
  const team = invoice.subscription?.team;
  const isOverdue = invoice.status === 'OPEN' && invoice.dueDate && new Date() > invoice.dueDate;
  
  // Parse metadata for additional invoice data - handle both object and string formats
  let metadata = {};
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
  
  // Determine UI status with better logic
  let uiStatus = 'draft';
  if (invoice.status === 'PAID') {
    uiStatus = 'paid';
  } else if (invoice.status === 'OPEN') {
    uiStatus = isOverdue ? 'overdue' : 'pending';
  } else if (invoice.status === 'VOID') {
    uiStatus = 'void';
  } else if (invoice.status === 'UNCOLLECTIBLE') {
    uiStatus = 'uncollectible';
  }

  // Extract financial data from metadata
  const subtotal = metadata.subtotal || Number(invoice.amount);
  const taxes = metadata.taxes || 0;
  const discount = metadata.discount || 0;
  const shipping = metadata.shipping || 0;
  const totalAmount = metadata.totalAmount || Number(invoice.amount);

  return {
    id: invoice.id,
    invoiceNumber: invoice.number || `INV-${invoice.id.slice(-6)}`,
    status: uiStatus,
    createDate: invoice.createdAt,
    dueDate: invoice.dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    totalAmount,
    subtotal,
    taxes,
    discount,
    shipping,
    sent: invoice.status === 'OPEN' || invoice.status === 'PAID' ? 1 : 0,
    stripeInvoiceId: invoice.stripeInvoiceId,
    
    // Company data (your business information)
    invoiceFrom: {
      id: 'wirecrest-company',
      name: 'Wirecrest Inc.',
      company: 'Wirecrest Inc.',
      email: 'billing@wirecrest.com',
      phoneNumber: '+1-555-0123',
      address: '123 Business Ave, Suite 100',
      zipCode: '12345',
      city: 'San Francisco',
      state: 'CA',
      country: 'USA',
      fullAddress: '123 Business Ave, Suite 100, San Francisco, CA 12345, USA',
    },
    
    // Customer data from team
    invoiceTo: {
      id: team?.id || 'unknown',
      name: team?.name || 'Unknown Customer',
      company: team?.name || 'Unknown Company',
      email: team?.email || 'unknown@example.com',
      phoneNumber: team?.phoneNumber || 'N/A',
      address: team?.address || 'N/A',
      zipCode: team?.zipCode || 'N/A',
      city: team?.city || 'N/A',
      state: team?.state || 'N/A',
      country: team?.country || 'N/A',
      fullAddress: team?.address 
        ? `${team.address}, ${team.city}, ${team.state} ${team.zipCode}, ${team.country}`
        : 'Address not provided',
    },
    
    // Line items with proper transformation
    items: invoice.lineItems?.map(item => {
      let itemMetadata = {};
      try {
        if (item.metadata) {
          if (typeof item.metadata === 'string') {
            itemMetadata = JSON.parse(item.metadata);
          } else if (typeof item.metadata === 'object') {
            itemMetadata = item.metadata;
          }
        }
      } catch (e) {
        console.warn('Failed to parse line item metadata:', e);
        itemMetadata = {};
      }
      
      return {
        id: item.id,
        title: itemMetadata.title || item.description,
        description: itemMetadata.description || item.description,
        service: itemMetadata.service || 'Service',
        quantity: item.quantity,
        price: Number(item.unitPrice),
        total: Number(item.amount),
      };
    }) || [],
  };
}

/**
 * Create or sync invoice with Stripe
 */
export async function syncInvoiceWithStripe(invoiceId: string): Promise<void> {
  try {
    const stripeService = new StripeService();
    
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        subscription: {
          include: {
            team: true,
          },
        },
        lineItems: true,
      },
    });

    if (!invoice) {
      throw new Error('Invoice not found');
    }

    // Skip if already synced with Stripe
    if (invoice.stripeInvoiceId) {
      return;
    }

    // Create customer if needed
    if (!invoice.subscription?.stripeCustomerId) {
      const team = invoice.subscription?.team;
      if (!team) {
        throw new Error('Team not found for invoice');
      }

      // Get team owner for customer creation
      const teamOwner = await prisma.teamMember.findFirst({
        where: { teamId: team.id, role: 'OWNER' },
        include: { user: true },
      });

      if (!teamOwner?.user) {
        throw new Error('Team owner not found');
      }

      await stripeService.createOrGetCustomer(
        team.id,
        teamOwner.user.email,
        teamOwner.user.name || team.name
      );
    }

    // TODO: Create Stripe invoice
    // This would involve creating a draft invoice in Stripe
    // and updating our local record with the Stripe invoice ID
    
  } catch (error) {
    console.error('Failed to sync invoice with Stripe:', error);
    // Don't throw error to prevent blocking local operations
  }
}
