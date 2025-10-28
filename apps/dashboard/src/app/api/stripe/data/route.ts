import { NextResponse } from 'next/server';
import { auth } from '@wirecrest/auth-next';
import { InvoiceService } from '@wirecrest/billing/server';

// ----------------------------------------------------------------------

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const invoiceService = new InvoiceService();
    
    // Fetch all invoice-related data from Stripe using InvoiceService
    const data = await invoiceService.getAllInvoiceData();

    return NextResponse.json(data);
  } catch (error) {
    console.error('Failed to fetch Stripe data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch Stripe data' },
      { status: 500 }
    );
  }
}
