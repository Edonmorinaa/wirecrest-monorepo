/**
 * Share Invoice API Route
 * POST /api/invoices/[id]/share - Generate shareable link for invoice with access control
 */

import { prisma } from '@wirecrest/db';
import { auth } from '@wirecrest/auth/server';
import { NextRequest, NextResponse } from 'next/server';
import { getInvoiceWithAccess } from '@/lib/invoice-utils';

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

    // Use shared utility for access control and data fetching
    const result = await getInvoiceWithAccess(
      id,
      session.user.id,
      session.user.superRole
    );

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    const invoice = result.invoice;

    const body = await request.json();
    const { expiresIn = 30 } = body; // Default 30 days

    // Generate a secure token for the shareable link
    const shareToken = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + expiresIn * 24 * 60 * 60 * 1000);

    // Store the share token (you might want to create a separate table for this)
    // For now, we'll store it in the invoice metadata
    await prisma.invoice.update({
      where: { id },
      data: {
        metadata: {
          ...((invoice.metadata as any) || {}),
          shareToken,
          shareExpiresAt: expiresAt.toISOString(),
        },
      },
    });

    const shareUrl = `${process.env.NEXT_PUBLIC_HOST_URL || 'http://localhost:3000'}/invoice/shared/${shareToken}`;
    
    // Log the share action
    console.log('Invoice share link generated:', {
      invoiceId: id,
      shareToken,
      expiresAt,
      teamName: invoice.subscription?.team?.name,
    });

    return NextResponse.json({
      success: true,
      shareUrl,
      expiresAt,
      shareToken,
    });
  } catch (error) {
    console.error('Failed to generate share link:', error);
    return NextResponse.json(
      { error: 'Failed to generate share link' },
      { status: 500 }
    );
  }
}
