/**
 * Individual Invoice API Route
 * GET /api/invoices/[id] - Get a specific Stripe invoice
 * PUT /api/invoices/[id] - Update a Stripe invoice
 * DELETE /api/invoices/[id] - Delete a draft Stripe invoice
 */

import Stripe from 'stripe';
import { auth } from '@wirecrest/auth/server';
import { InvoiceService } from '@wirecrest/billing';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has admin access
    if (session.user.superRole !== 'ADMIN' && session.user.superRole !== 'SUPPORT') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const { id } = await params;
    const invoiceService = new InvoiceService();

    // Get Stripe invoice
    const invoice = await invoiceService.getInvoice(id);

    // Transform for UI
    const transformedInvoice = invoiceService.transformInvoiceForUI(invoice);

    return NextResponse.json(transformedInvoice);
  } catch (error) {
    console.error('Failed to fetch invoice:', error);
    if (error instanceof Error && error.message.includes('No such invoice')) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }
    return NextResponse.json(
      { error: 'Failed to fetch invoice' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has admin access
    if (session.user.superRole !== 'ADMIN' && session.user.superRole !== 'SUPPORT') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const {
      description,
      due_date,
      collection_method,
      days_until_due,
      metadata,
      automatic_tax,
    } = body;

    const invoiceService = new InvoiceService();

    // Update Stripe invoice using InvoiceService
    const updateParams: Stripe.InvoiceUpdateParams = {
      description,
      due_date,
      collection_method,
      days_until_due,
      metadata: {
        ...metadata,
        updated_by: session.user.id,
        updated_by_email: session.user.email,
      },
      automatic_tax,
    };

    const invoice = await invoiceService.updateInvoice(id, updateParams);

    // Transform for UI
    const transformedInvoice = invoiceService.transformInvoiceForUI(invoice);

    return NextResponse.json(transformedInvoice);
  } catch (error) {
    console.error('Failed to update invoice:', error);
    if (error instanceof Error && error.message.includes('No such invoice')) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }
    return NextResponse.json(
      { error: 'Failed to update invoice' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has admin access
    if (session.user.superRole !== 'ADMIN' && session.user.superRole !== 'SUPPORT') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const { id } = await params;
    const invoiceService = new InvoiceService();

    // Delete Stripe invoice (only works for draft invoices)
    await invoiceService.deleteInvoice(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete invoice:', error);
    if (error instanceof Error && error.message.includes('No such invoice')) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }
    if (error instanceof Error && error.message.includes('only be deleted if it is a draft')) {
      return NextResponse.json(
        { error: 'Only draft invoices can be deleted' },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to delete invoice' },
      { status: 500 }
    );
  }
}