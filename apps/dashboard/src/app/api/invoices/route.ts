/**
 * Invoices API Route
 * GET /api/invoices - Get all Stripe invoices with filtering
 * POST /api/invoices - Create new Stripe invoices
 */

import Stripe from 'stripe';
import { Role } from '@prisma/client';
import { prisma } from '@wirecrest/db';
import { auth } from '@wirecrest/auth-next';
import { NextRequest, NextResponse } from 'next/server';
import { StripeService, InvoiceService } from '@wirecrest/billing';

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Invoice API: Starting request');
    const session = await auth();
    if (!session?.user) {
      console.log('❌ Invoice API: No session found');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('👤 Invoice API: User session found:', { 
      id: session.user.id, 
      superRole: session.user.superRole 
    });

    // Check if user has admin access
    if (session.user.superRole !== 'ADMIN' && session.user.superRole !== 'SUPPORT') {
      console.log('❌ Invoice API: Access denied for user role:', session.user.superRole);
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const customer = searchParams.get('customer');
    const limit = parseInt(searchParams.get('limit') || '100');
    const starting_after = searchParams.get('starting_after');

    console.log('🔧 Invoice API: Creating InvoiceService');
    const invoiceService = new InvoiceService();

    // For admin users, we can get all invoices without customer filter
    const invoiceParams = {
      // Only filter by customer if explicitly provided
      customer: customer || undefined,
      status: status as any || undefined,
      limit,
      starting_after: starting_after || undefined,
    };

    console.log('📋 Invoice API: Calling Stripe API with params:', invoiceParams);

    // List Stripe invoices
    const invoiceList = await invoiceService.listInvoices(invoiceParams);

    console.log('✅ Invoice API: Stripe API response:', {
      count: invoiceList.data.length,
      hasMore: invoiceList.has_more,
    });

    // Transform invoices for UI
    const transformedInvoices = invoiceList.data.map(invoice => 
      invoiceService.transformInvoiceForUI(invoice)
    );

    console.log('🔄 Invoice API: Transformed invoices:', transformedInvoices.length);

    return NextResponse.json({
      invoices: transformedInvoices,
      hasMore: invoiceList.has_more,
      nextStartingAfter: invoiceList.data[invoiceList.data.length - 1]?.id,
    });
  } catch (error) {
    console.error('Failed to fetch invoices:', error);
    return NextResponse.json(
      { error: 'Failed to fetch invoices' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has admin access
    if (session.user.superRole !== 'ADMIN' && session.user.superRole !== 'SUPPORT') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }


    const body = await request.json();
    const { 
      teamId,
      customer,
      serviceOption,
      quantity = 1,
      taxRateId,
      status = 'draft',
      metadata = {},
      items = [],
      invoiceFrom,
      invoiceTo,
    } = body;

    console.log('🔍 Invoice API POST: Creating invoice with data:', {
      teamId,
      customer,
      serviceOption: serviceOption?.label,
      quantity,
      status,
      itemsCount: items?.length || 0,
      items,
    });


    console.log('🔍 Looking up team:', teamId);
                // Get team and check if it has a Stripe customer ID
                const team = await prisma.team.findUnique({
                  where: { id: teamId },
                  select: { id: true, name: true, stripeCustomerId: true }
                });
        
                if (!team) {
                  console.log('❌ Team not found:', teamId);
                  return NextResponse.json(
                    { error: 'Team not found' },
                    { status: 404 }
                  );
                }

        console.log('✅ Team found:', { id: team.id, name: team.name, hasStripeCustomer: !!team.stripeCustomerId });

    const owner = await prisma.teamMember.findFirst({
      where: { teamId: team.id, role: Role.OWNER },
      include: { user: true },
    });

    if (!owner.user) {
      return NextResponse.json(
        { error: 'Team owner not found' },
        { status: 400 }
      );
    }

    // Determine customer ID - either provided directly or get/create from team
    let customerId = customer;
    
    if (!customerId && teamId) {
      try {

        if (team.stripeCustomerId) {
          customerId = team.stripeCustomerId;
          console.log('✅ Using existing Stripe customer:', customerId);
        } else {
          console.log('🔧 Creating new Stripe customer for team:', team.name);

          // Create Stripe customer for the team
          const stripeService = new StripeService();
          const stripeCustomer = await stripeService.createOrGetCustomer(
            team.id,
            owner.user.email,
            team.name
          );

          console.log('✅ Stripe customer created:', { id: stripeCustomer.id, name: stripeCustomer.name, email: stripeCustomer.email });

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
        return NextResponse.json(
          { error: `Failed to handle customer creation: ${error instanceof Error ? error.message : 'Unknown error'}` },
          { status: 500 }
        );
      }
    }

    if (!customerId) {
      console.log('❌ Customer ID is required');
      return NextResponse.json(
        { error: 'Customer ID is required' },
        { status: 400 }
      );
    }

    // Handle both serviceOption (legacy) and items array (new format)
    let lineItems: Stripe.InvoiceItemCreateParams[] = [];
    
    if (items && items.length > 0) {
      // New format: items array - use service price from Stripe
      const invoiceService = new InvoiceService();
      const stripeData = await invoiceService.getAllInvoiceData();
      
      lineItems = items.map((item): Stripe.InvoiceItemCreateParams => {
        // Find the service to get its price
        const selectedService = stripeData?.serviceOptions?.find(service => service.product.id === item.service);
        const servicePrice = selectedService?.price.unit_amount || 0;
        
        return {
          customer: customerId,
          description: item.description || item.title || 'Invoice Item',
          quantity: 1, // Fixed quantity of 1
          amount: servicePrice, // Already in cents from Stripe
          currency: 'usd',
          price: selectedService?.price.id, // Use the Stripe price ID
          tax_rates: taxRateId ? [taxRateId] : [],
          metadata: {},
        };
      });
    } else if (serviceOption && serviceOption.value && serviceOption.priceId) {
      // Legacy format: single service option
      lineItems = [{
        customer: customerId,
        description: serviceOption.description || serviceOption.label || 'Invoice Item',
        quantity,
        amount: Math.round(serviceOption.price * 100), // Convert to cents
        currency: serviceOption.currency || 'usd',
        price: serviceOption.priceId,
        tax_rates: taxRateId ? [taxRateId] : [],
        metadata: {
          title: serviceOption.label,
          description: serviceOption.description,
          service: serviceOption.product.id,
          price: serviceOption.price,
          currency: serviceOption.currency,
          priceId: serviceOption.priceId,
          productId: serviceOption.product.id,
        },
      }];
    } else {
      return NextResponse.json(
        { error: 'No invoice items provided. Please add at least one item to the invoice.' },
        { status: 400 }
      );
    }

    try {
      console.log('🔧 Creating Stripe invoice with customer:', customerId);
      
      // Verify customer has valid email before creating invoice
      const stripe = new StripeService();
      const stripeCustomer = await stripe.createOrGetCustomer(teamId, owner.user.email, team.name);
      
      if (!stripeCustomer.email) {
        return NextResponse.json(
          { error: 'Customer email is required to create invoices that are sent to customers. Please ensure the customer has a valid email address.' },
          { status: 400 }
        );
      }
      
      // Validate required fields before creating invoice
      if (!customerId) {
        return NextResponse.json(
          { error: 'Customer ID is required' },
          { status: 400 }
        );
      }

      if (!lineItems || lineItems.length === 0) {
        return NextResponse.json(
          { error: 'At least one line item is required' },
          { status: 400 }
        );
      }

      // Validate line items have required fields
      for (const item of lineItems) {
        if (!item.description || !item.amount || !item.currency) {
          return NextResponse.json(
            { error: 'All line items must have description, amount, and currency' },
            { status: 400 }
          );
        }
        
        // Validate amount is positive
        if (item.amount <= 0) {
          return NextResponse.json(
            { error: 'All line items must have a positive amount' },
            { status: 400 }
          );
        }
        
        // Validate quantity is positive
        if (item.quantity <= 0) {
          return NextResponse.json(
            { error: 'All line items must have a positive quantity' },
            { status: 400 }
          );
        }
      }
      
      console.log('🔧 Line items validation passed:', lineItems.length, 'items');

      // Create Stripe invoice using Stripe types directly
      const invoiceParams: Stripe.InvoiceCreateParams = {
        customer: customerId,
        description: items.length > 0 ? items[0].title : (serviceOption?.label || 'Invoice'),
        collection_method: 'send_invoice',
        metadata: {
          ...metadata,
          team_id: teamId || '',
          created_by: session.user.id,
          created_by_email: session.user.email,
          // Store invoice addresses in metadata for later retrieval
          ...(invoiceFrom && { invoiceFrom: JSON.stringify(invoiceFrom) }),
          ...(invoiceTo && { invoiceTo: JSON.stringify(invoiceTo) }),
        },
        automatic_tax: { enabled: false },
      };

      // Set due_date - use provided date or default to 30 days from now
      if (invoiceTo?.dueDate) {
        invoiceParams.due_date = Math.floor(new Date(invoiceTo.dueDate).getTime() / 1000);
      } else {
        // Default to 30 days from now
        const defaultDueDate = new Date();
        defaultDueDate.setDate(defaultDueDate.getDate() + 30);
        invoiceParams.due_date = Math.floor(defaultDueDate.getTime() / 1000);
      }

      console.log('🔧 Creating invoice with params:', {
        customer: invoiceParams.customer,
        description: invoiceParams.description,
        collection_method: invoiceParams.collection_method,
        due_date: invoiceParams.due_date,
        metadata: invoiceParams.metadata,
      });

      // Create invoice using InvoiceService
      const invoiceService = new InvoiceService();
      let invoice: Stripe.Invoice;
      
      try {
        invoice = await invoiceService.createInvoice(invoiceParams, lineItems);
        console.log('✅ Invoice created successfully:', { id: invoice.id, status: invoice.status });
      } catch (error) {
        console.error('❌ Error creating invoice:', error);
        return NextResponse.json(
          { error: `Failed to create invoice: ${error instanceof Error ? error.message : 'Unknown error'}` },
          { status: 500 }
        );
      }

      // Line items are already added by InvoiceService.createInvoice

      console.log('✅ Stripe invoice created:', { id: invoice.id, status: invoice.status });

      // Handle different statuses using InvoiceService
      let finalInvoice = invoice;
      
      if (status === 'paid') {
        // For paid invoices, we need to finalize and mark as paid
        try {
          // First finalize the invoice if it's a draft
          if (invoice.status === 'draft') {
            const finalizedInvoice = await invoiceService.finalizeInvoice(invoice.id);
            console.log('✅ Invoice finalized:', { id: finalizedInvoice.id, status: finalizedInvoice.status });
            
            // Mark as paid
            const paidInvoice = await invoiceService.payInvoice(invoice.id);
            console.log('✅ Invoice marked as paid:', { id: paidInvoice.id, status: paidInvoice.status });
            finalInvoice = paidInvoice;
          }
        } catch (error) {
          console.error('❌ Error processing paid invoice:', error);
          // Continue with the original invoice if payment processing fails
        }
      } else if (status === 'pending') {
        // For pending invoices, finalize but don't mark as paid
        try {
          if (invoice.status === 'draft') {
            const finalizedInvoice = await invoiceService.finalizeInvoice(invoice.id);
            console.log('✅ Invoice finalized for pending status:', { id: finalizedInvoice.id, status: finalizedInvoice.status });
            finalInvoice = finalizedInvoice;
          }
        } catch (error) {
          console.error('❌ Error finalizing invoice:', error);
        }
      }

      // Return the invoice directly (Stripe invoice object)
      return NextResponse.json(finalInvoice, { status: 201 });
    } catch (error) {
      console.error('❌ Error creating Stripe invoice:', error);
      return NextResponse.json(
        { error: `Failed to create invoice: ${error instanceof Error ? error.message : 'Unknown error'}` },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Failed to create invoice:', error);
    return NextResponse.json(
      { error: 'Failed to create invoice' },
      { status: 500 }
    );
  }
}