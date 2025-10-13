/**
 * Invoice Calculation API Route
 * POST /api/invoices/[id]/calculate - Recalculate invoice totals with proper formula
 */

import { prisma } from '@wirecrest/db';
import { auth } from '@wirecrest/auth/server';
import { NextRequest, NextResponse } from 'next/server';
import { calculateInvoiceTotal } from '@/lib/invoice-utils';

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
    const { subtotal, taxes, discount, shipping } = body;

    // Calculate new total using proper formula - FIXED: shipping is added, not subtracted
    const { totalAmount } = calculateInvoiceTotal(subtotal, taxes, discount, shipping);

    // Update invoice with new calculations
    const updatedInvoice = await prisma.invoice.update({
      where: { id },
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

    return NextResponse.json({
      success: true,
      invoice: updatedInvoice,
      calculations: {
        subtotal,
        taxes,
        discount,
        shipping,
        totalAmount,
      },
    });
  } catch (error) {
    console.error('Failed to calculate invoice:', error);
    return NextResponse.json(
      { error: 'Failed to calculate invoice' },
      { status: 500 }
    );
  }
}
