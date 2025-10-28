/**
 * Bulk Invoice Operations API Route
 * POST /api/invoices/bulk - Perform bulk operations on invoices
 */

import { auth } from '@wirecrest/auth-next';
import { InvoiceService } from '@wirecrest/billing';
import { NextRequest, NextResponse } from 'next/server';

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
    const { operation, invoiceIds } = body;

    if (!operation || !Array.isArray(invoiceIds) || invoiceIds.length === 0) {
      return NextResponse.json(
        { error: 'Operation and invoice IDs are required' },
        { status: 400 }
      );
    }

    const invoiceService = new InvoiceService();
    let results: any = {};

    switch (operation) {
      case 'delete': {
        // Use InvoiceService to delete Stripe invoices (only works for draft invoices)
        let deletedCount = 0;
        for (const invoiceId of invoiceIds) {
          try {
            await invoiceService.deleteInvoice(invoiceId);
            deletedCount++;
          } catch (error) {
            console.error(`Failed to delete invoice ${invoiceId}:`, error);
          }
        }
        results = { deleted: deletedCount };
        break;
      }

      case 'send': {
        // Use InvoiceService to send Stripe invoices
        let sentCount = 0;
        for (const invoiceId of invoiceIds) {
          try {
            await invoiceService.sendInvoice(invoiceId);
            sentCount++;
          } catch (error) {
            console.error(`Failed to send invoice ${invoiceId}:`, error);
          }
        }
        results = { sent: sentCount };
        break;
      }

      case 'finalize': {
        // Use InvoiceService to finalize Stripe invoices
        let finalizedCount = 0;
        for (const invoiceId of invoiceIds) {
          try {
            await invoiceService.finalizeInvoice(invoiceId);
            finalizedCount++;
          } catch (error) {
            console.error(`Failed to finalize invoice ${invoiceId}:`, error);
          }
        }
        results = { finalized: finalizedCount };
        break;
      }

      case 'void': {
        // Use InvoiceService to void Stripe invoices
        let voidedCount = 0;
        for (const invoiceId of invoiceIds) {
          try {
            await invoiceService.voidInvoice(invoiceId);
            voidedCount++;
          } catch (error) {
            console.error(`Failed to void invoice ${invoiceId}:`, error);
          }
        }
        results = { voided: voidedCount };
        break;
      }

      case 'markUncollectible': {
        // Use InvoiceService to mark invoices as uncollectible
        let uncollectibleCount = 0;
        for (const invoiceId of invoiceIds) {
          try {
            await invoiceService.markUncollectible(invoiceId);
            uncollectibleCount++;
          } catch (error) {
            console.error(`Failed to mark invoice ${invoiceId} as uncollectible:`, error);
          }
        }
        results = { markedUncollectible: uncollectibleCount };
        break;
      }

      default:
        return NextResponse.json(
          { error: 'Invalid operation' },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      operation,
      results,
      processedIds: invoiceIds,
    });
  } catch (error) {
    console.error('Failed to perform bulk operation:', error);
    return NextResponse.json(
      { error: 'Failed to perform bulk operation' },
      { status: 500 }
    );
  }
}
