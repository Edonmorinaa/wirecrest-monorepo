/**
 * Stripe Invoice Data Mapper
 * Maps Stripe invoice data to existing UI format to maintain compatibility
 */

import { StripeInvoice } from 'src/hooks/useInvoices';

// Map Stripe status to UI status
export function mapStripeStatusToUI(stripeStatus: string): 'paid' | 'pending' | 'overdue' | 'draft' {
  const statusMap: Record<string, 'paid' | 'pending' | 'overdue' | 'draft'> = {
    'draft': 'draft',
    'open': 'pending',
    'paid': 'paid',
    'void': 'draft',
    'uncollectible': 'overdue',
  };
  
  return statusMap[stripeStatus] || 'draft';
}

// Map UI status to Stripe status
export function mapUIStatusToStripe(uiStatus: string): 'draft' | 'open' | 'paid' | 'void' | 'uncollectible' {
  const statusMap: Record<string, 'draft' | 'open' | 'paid' | 'void' | 'uncollectible'> = {
    'draft': 'draft',
    'pending': 'open',
    'paid': 'paid',
    'overdue': 'uncollectible',
  };
  
  return statusMap[uiStatus] || 'draft';
}

// Transform Stripe invoice to UI format
export function transformStripeInvoiceToUI(stripeInvoice: StripeInvoice) {
  return {
    id: stripeInvoice.id,
    invoiceNumber: stripeInvoice.number || `INV-${stripeInvoice.id.slice(-8).toUpperCase()}`,
    status: mapStripeStatusToUI(stripeInvoice.status),
    createDate: new Date(stripeInvoice.created * 1000),
    dueDate: stripeInvoice.due_date ? new Date(stripeInvoice.due_date * 1000) : new Date(),
    totalAmount: stripeInvoice.total / 100, // Convert from cents
    subtotal: stripeInvoice.subtotal / 100,
    taxes: stripeInvoice.tax / 100,
    discount: 0, // Stripe doesn't have a direct discount field
    shipping: 0, // Stripe doesn't have a direct shipping field
    sent: stripeInvoice.status === 'open' || stripeInvoice.status === 'paid' ? 1 : 0,
    stripeInvoiceId: stripeInvoice.id,
    
    // Customer information (will be populated from team data)
    invoiceFrom: {
      id: 'company',
      name: 'Wirecrest',
      company: 'Wirecrest',
      email: 'billing@wirecrest.com',
      phoneNumber: '+1 (555) 123-4567',
      address: '123 Business St',
      zipCode: '12345',
      city: 'Business City',
      state: 'BC',
      country: 'US',
    },
    
    invoiceTo: {
      id: stripeInvoice.customer,
      name: stripeInvoice.customer_name || 'Customer',
      company: stripeInvoice.customer_name || 'Customer Company',
      email: stripeInvoice.customer_email || 'customer@example.com',
      phoneNumber: '+1 (555) 000-0000',
      address: 'Customer Address',
      zipCode: '00000',
      city: 'Customer City',
      state: 'CC',
      country: 'US',
    },
    
    // Transform line items
    items: stripeInvoice.line_items.map((item, index) => ({
      id: item.id || `item-${index}`,
      title: item.description || 'Service',
      description: item.description || 'Service description',
      service: item.description || 'Service',
      quantity: item.quantity || 1,
      price: item.amount / 100, // Convert from cents
      total: (item.amount * (item.quantity || 1)) / 100,
    })),
    
    // Additional Stripe-specific fields
    stripeData: {
      amount_due: stripeInvoice.amount_due / 100,
      amount_paid: stripeInvoice.amount_paid / 100,
      amount_remaining: stripeInvoice.amount_remaining / 100,
      currency: stripeInvoice.currency,
      hosted_invoice_url: stripeInvoice.hosted_invoice_url,
      invoice_pdf: stripeInvoice.invoice_pdf,
      collection_method: stripeInvoice.collection_method,
      metadata: stripeInvoice.metadata,
      automatic_tax: stripeInvoice.automatic_tax,
    },
  };
}

// Transform UI invoice data to Stripe format for creation/updates
export function transformUIToStripeInvoice(uiInvoice: any) {
  return {
    customer: uiInvoice.invoiceTo?.id || uiInvoice.customer,
    description: uiInvoice.description || 'Invoice',
    due_date: uiInvoice.dueDate ? Math.floor(uiInvoice.dueDate.getTime() / 1000) : undefined,
    collection_method: uiInvoice.collection_method || 'send_invoice',
    days_until_due: uiInvoice.days_until_due || 30,
    metadata: {
      ...uiInvoice.metadata,
      invoice_number: uiInvoice.invoiceNumber,
    },
    automatic_tax: uiInvoice.automatic_tax || { enabled: false },
    line_items: uiInvoice.items?.map((item: any) => ({
      description: item.title || item.description,
      quantity: item.quantity || 1,
      amount: Math.round(item.price * 100), // Convert to cents
      currency: 'usd',
      metadata: item.metadata || {},
    })) || [],
  };
}

// Get default invoice values for creation
export function getDefaultInvoiceValues() {
  return {
    invoiceNumber: `INV-${Date.now()}`,
    status: 'draft',
    createDate: new Date(),
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
    totalAmount: 0,
    subtotal: 0,
    taxes: 0,
    discount: 0,
    shipping: 0,
    sent: 0,
    items: [{
      id: 'item-1',
      title: 'Service',
      description: 'Service description',
      service: 'Service',
      quantity: 1,
      price: 0,
      total: 0,
    }],
    collection_method: 'send_invoice',
    days_until_due: 30,
    automatic_tax: { enabled: false },
  };
}
