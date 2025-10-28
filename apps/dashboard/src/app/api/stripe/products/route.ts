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
    
    // Fetch products from Stripe using InvoiceService
    const products = await invoiceService.getProducts();

    return NextResponse.json({
      products,
      hasMore: false, // InvoiceService handles pagination internally
    });
  } catch (error) {
    console.error('Failed to fetch Stripe products:', error);
    return NextResponse.json(
      { error: 'Failed to fetch products' },
      { status: 500 }
    );
  }
}
