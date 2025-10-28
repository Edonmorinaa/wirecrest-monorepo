import { NextResponse } from 'next/server';
import { auth } from '@wirecrest/auth-next';
import { InvoiceService } from '@wirecrest/billing';

// ----------------------------------------------------------------------

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const invoiceService = new InvoiceService();
    
    // Fetch prices from Stripe using InvoiceService
    const prices = await invoiceService.getPrices();

    return NextResponse.json({
      prices,
      hasMore: false, // InvoiceService handles pagination internally
    });
  } catch (error) {
    console.error('Failed to fetch Stripe prices:', error);
    return NextResponse.json(
      { error: 'Failed to fetch prices' },
      { status: 500 }
    );
  }
}
