/**
 * Invoice Server Actions
 * All invoice-related server actions for CRUD operations and management
 */

'use server';

import Stripe from 'stripe';
import { Role } from '@prisma/client';
import { prisma } from '@wirecrest/db';
import { revalidatePath } from 'next/cache';
import { auth } from '@wirecrest/auth/server';
import { StripeService, InvoiceService } from '@wirecrest/billing';

import { isValidEmail, getCustomerEmail, validateCustomerEmail } from '../lib/email-validation';

// Types for server actions - using Stripe types directly
export interface CreateInvoiceDataParams {
  teamId: string;
  data: Stripe.InvoiceCreateParams;
  taxRate: Stripe.TaxRate;
  metadata?: Stripe.MetadataParam;
  items: Stripe.InvoiceItemCreateParams[];
  invoiceFrom?: any;
  invoiceTo?: any;
}

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


export type ListInvoicesParams = {
    success: boolean;
    data?: {
        invoices: Stripe.Invoice[];
        hasMore: boolean;
        nextStartingAfter: string;
    };
    error?: string;
};
/**
 * List all invoices
 */
export async function listInvoices(params: Stripe.InvoiceListParams): Promise<ListInvoicesParams> {
  try {
    await checkAdminAccess();

    const invoiceService = new InvoiceService();

    // For admin users, we can get all invoices without customer filter
    const invoiceParams: Stripe.InvoiceListParams = {
      ...params,
      limit: params.limit || 100,
    };

    // List Stripe invoices
    const invoiceList = await invoiceService.listInvoices(invoiceParams);

    return {
      success: true,
      data: {
        invoices: invoiceList.data,
        hasMore: invoiceList.has_more,
        nextStartingAfter: invoiceList.data[invoiceList.data.length - 1]?.id,
      },
    };
  } catch (error) {
    console.error('Failed to fetch invoices:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch invoices',
    };
  }
}

/**
 * Create a new invoice
 */
export async function createInvoice(params: CreateInvoiceDataParams) {
  try {
    const session = await checkAdminAccess();

    const {
      teamId,
      data,
      invoiceFrom,
      invoiceTo,
    } = params;

    console.log('🔍 Looking up team:', teamId);
    
    // Get team and check if it has a Stripe customer ID
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      select: { id: true, name: true, stripeCustomerId: true }
    });

    if (!team) {
      console.log('❌ Team not found:', teamId);
      return {
        success: false,
        error: 'Team not found',
      };
    }

    console.log('✅ Team found:', { id: team.id, name: team.name, hasStripeCustomer: !!team.stripeCustomerId });

    const owner = await prisma.teamMember.findFirst({
      where: { teamId: team.id, role: Role.OWNER },
      include: { user: true },
    });

    if (!owner?.user) {
      return {
        success: false,
        error: 'Team owner not found',
      };
    }

    // Determine customer ID - either provided directly or get/create from team
    let customerId = team.stripeCustomerId;
    
    try {
        if (team.stripeCustomerId) {
          customerId = team.stripeCustomerId;
          console.log('✅ Using existing Stripe customer:', customerId);
        } else {
          console.log('🔧 Creating new Stripe customer for team:', team.name);
          console.log('🔧 Owner email:', owner.user.email);

          // Get the best available email using fallback strategy
          const customerEmail = getCustomerEmail({
            teamOwnerEmail: owner.user.email,
            invoiceToEmail: invoiceTo?.email,
            sessionUserEmail: session.user.email,
          });
          
          console.log('🔍 Email fallback strategy:', {
            teamOwnerEmail: owner.user.email,
            invoiceToEmail: invoiceTo?.email,
            sessionUserEmail: session.user.email,
            selectedEmail: customerEmail,
            teamOwnerEmailValid: isValidEmail(owner.user.email || ''),
            invoiceToEmailValid: isValidEmail(invoiceTo?.email || ''),
            sessionUserEmailValid: isValidEmail(session.user.email || ''),
          });
          
          const emailValidation = validateCustomerEmail(customerEmail);
          if (!emailValidation.isValid) {
            console.log('❌ Email validation failed:', emailValidation.error);
            return {
              success: false,
              error: emailValidation.error,
            };
          }

          // Create Stripe customer for the team
          console.log('🔧 Creating Stripe customer with email:', customerEmail);
          const stripeService = new StripeService();
          const stripeCustomer = await stripeService.createOrGetCustomer(
            team.id,
            customerEmail,
            team.name
          );

          console.log('✅ Stripe customer created:', { 
            id: stripeCustomer.id, 
            name: stripeCustomer.name, 
            email: stripeCustomer.email,
            hasEmail: !!stripeCustomer.email 
          });

          // Update team with Stripe customer ID
          await prisma.team.update({
            where: { id: teamId },
            data: { stripeCustomerId: stripeCustomer.id }
          });

          customerId = stripeCustomer.id;
          console.log('✅ Updated team with Stripe customer ID:', { teamId, customerId });
        }
      } catch (error) {
        console.error('❌ Error handling team customer creation:', error);
        return {
          success: false,
          error: `Failed to handle customer creation: ${error instanceof Error ? error.message : 'Unknown error'}`,
        };
      }

    if (!customerId) {
      console.log('❌ Customer ID is required');
      return {
        success: false,
        error: 'Customer ID is required',
      };
    }

    // Verify customer has valid email before creating invoice
    const stripeClient = StripeService.getStripeInstance();
    const stripeCustomer = await stripeClient.customers.retrieve(customerId) as Stripe.Customer;
    
    console.log('🔍 Customer email verification:', {
      customerId,
      hasEmail: !!stripeCustomer.email,
      email: stripeCustomer.email,
      customerName: stripeCustomer.name
    });
    
    if (!stripeCustomer.email) {
      // Try to update the customer with a valid email
      console.log('🔧 Customer missing email, attempting to update...');
      
      // Get the best available email using fallback strategy
      const customerEmail = getCustomerEmail({
        teamOwnerEmail: owner?.user?.email,
        invoiceToEmail: invoiceTo?.email,
        sessionUserEmail: session.user.email,
      });
      
      if (customerEmail) {
        try {
          const updatedCustomer = await stripeClient.customers.update(customerId, {
            email: customerEmail,
          });
          console.log('✅ Customer email updated:', { 
            id: updatedCustomer.id, 
            email: updatedCustomer.email 
          });
        } catch (error) {
          console.error('❌ Failed to update customer email:', error);
          return {
            success: false,
            error: 'Failed to update customer email. Please ensure the customer has a valid email address.',
          };
        }
      } else {
        return {
          success: false,
          error: 'Customer email is required to create invoices that are sent to customers. Please ensure the customer has a valid email address.',
        };
      }
    }

    // Update the data object with the actual customer ID
    const invoiceData = {
      ...data,
      customer: customerId,
    };

    // Create invoice using InvoiceService
    const invoiceService = new InvoiceService();
    let invoice: Stripe.Invoice;
    
    // Update line items with the correct customer ID
    const lineItems = params.items.map(item => ({
      ...item,
      customer: customerId,
    }));

    try {
      invoice = await invoiceService.createInvoice(invoiceData, lineItems);
      console.log('✅ Invoice created successfully:', { id: invoice.id, status: invoice.status });
    } catch (error) {
      console.error('❌ Error creating invoice:', error);
      return {
        success: false,
        error: `Failed to create invoice: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }

    console.log('✅ Stripe invoice created:', { id: invoice.id, status: invoice.status });

    // Revalidate the invoices page
    revalidatePath('/dashboard/invoices');

    return {
      success: true,
      data: invoice,
    };
  } catch (error) {
    console.error('Failed to create invoice:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create invoice',
    };
  }
}

/**
 * Get a specific invoice
 */
export async function getInvoice(id: string) {
  try {
    await checkAdminAccess();

    const invoiceService = new InvoiceService();

    // Get Stripe invoice
    const invoice = await invoiceService.getInvoice(id);

    // Transform for UI
    const transformedInvoice = invoiceService.transformInvoiceForUI(invoice);

    return {
      success: true,
      data: transformedInvoice,
    };
  } catch (error) {
    console.error('Failed to fetch invoice:', error);
    if (error instanceof Error && error.message.includes('No such invoice')) {
      return {
        success: false,
        error: 'Invoice not found',
      };
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch invoice',
    };
  }
}

/**
 * Update an invoice
 */
export async function updateInvoice(id: string, data: Stripe.InvoiceUpdateParams) {
  try {
    const session = await checkAdminAccess();

    const invoiceService = new InvoiceService();

    // Update Stripe invoice using InvoiceService
    const updateParams: Stripe.InvoiceUpdateParams = {
      ...data,
      metadata: {
        ...data.metadata,
        updated_by: session.user.id,
        updated_by_email: session.user.email,
      },
    };

    const invoice = await invoiceService.updateInvoice(id, updateParams);

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
    console.error('Failed to update invoice:', error);
    if (error instanceof Error && error.message.includes('No such invoice')) {
      return {
        success: false,
        error: 'Invoice not found',
      };
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update invoice',
    };
  }
}

/**
 * Delete an invoice
 */
export async function deleteInvoice(id: string) {
  try {
    await checkAdminAccess();

    const invoiceService = new InvoiceService();

    // Delete Stripe invoice (only works for draft invoices)
    await invoiceService.deleteInvoice(id);

    // Revalidate the invoices page
    revalidatePath('/dashboard/invoices');

    return {
      success: true,
    };
  } catch (error) {
    console.error('Failed to delete invoice:', error);
    if (error instanceof Error && error.message.includes('No such invoice')) {
      return {
        success: false,
        error: 'Invoice not found',
      };
    }
    if (error instanceof Error && error.message.includes('only be deleted if it is a draft')) {
      return {
        success: false,
        error: 'Only draft invoices can be deleted',
      };
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete invoice',
    };
  }
}
