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
    
    // Fetch tax rates from Stripe using InvoiceService
    const taxRates = await invoiceService.getTaxRates();

    return NextResponse.json({
      taxRates,
      hasMore: false, // InvoiceService handles pagination internally
    });
  } catch (error) {
    console.error('Failed to fetch Stripe tax rates:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tax rates' },
      { status: 500 }
    );
  }
}
