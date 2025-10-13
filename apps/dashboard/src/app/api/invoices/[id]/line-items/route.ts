/**
 * Invoice Line Items API Route
 * GET /api/invoices/[id]/line-items - Get line items for an invoice
 * POST /api/invoices/[id]/line-items - Add line item and recalculate total
 * PUT /api/invoices/[id]/line-items/[itemId] - Update line item
 * DELETE /api/invoices/[id]/line-items/[itemId] - Delete line item
 */

import { prisma } from '@wirecrest/db';
import { auth } from '@wirecrest/auth/server';
import { NextRequest, NextResponse } from 'next/server';
import { calculateInvoiceTotal } from '@/lib/invoice-utils';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const lineItems = await prisma.invoiceLineItem.findMany({
      where: { invoiceId: id },
    });

    return NextResponse.json(lineItems);
  } catch (error) {
    console.error('Failed to fetch line items:', error);
    return NextResponse.json(
      { error: 'Failed to fetch line items' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user || session.user.superRole !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { title, description, service, quantity, price } = body;

    if (!title || !quantity || !price) {
      return NextResponse.json(
        { error: 'Title, quantity, and price are required' },
        { status: 400 }
      );
    }

    const amount = quantity * price;

    const lineItem = await prisma.invoiceLineItem.create({
      data: {
        invoiceId: id,
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
      where: { id },
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
        where: { id },
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

    return NextResponse.json(lineItem, { status: 201 });
  } catch (error) {
    console.error('Failed to create line item:', error);
    return NextResponse.json(
      { error: 'Failed to create line item' },
      { status: 500 }
    );
  }
}
