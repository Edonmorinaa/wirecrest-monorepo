/**
 * Send Invoice API Route
 * POST /api/invoices/[id]/send - Send a Stripe invoice to customer
 */

import { auth } from '@wirecrest/auth/server';
import { InvoiceService } from '@wirecrest/billing';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(
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

    // Send Stripe invoice using InvoiceService
    const invoice = await invoiceService.sendInvoice(id);

    // Transform for UI
    const transformedInvoice = invoiceService.transformInvoiceForUI(invoice);

    return NextResponse.json(transformedInvoice);
  } catch (error) {
    console.error('Failed to send invoice:', error);
    if (error instanceof Error && error.message.includes('No such invoice')) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }
    if (error instanceof Error && error.message.includes('only be sent if it is open')) {
      return NextResponse.json(
        { error: 'Only open invoices can be sent' },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to send invoice' },
      { status: 500 }
    );
  }
}