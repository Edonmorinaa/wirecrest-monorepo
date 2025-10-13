import { useRef, useMemo, useState, useEffect, useCallback } from 'react';

import {
  type CreateInvoiceData,
  payInvoice as payInvoiceAction,
  sendInvoice as sendInvoiceAction,
  voidInvoice as voidInvoiceAction,
  listInvoices as listInvoicesAction,
  createInvoice as createInvoiceAction,
  updateInvoice as updateInvoiceAction,
  deleteInvoice as deleteInvoiceAction,
  finalizeInvoice as finalizeInvoiceAction,
  bulkInvoiceOperation as bulkInvoiceOperationAction,
} from '../actions';

export interface StripeInvoice {
  id: string;
  number: string;
  status: 'draft' | 'open' | 'paid' | 'void' | 'uncollectible';
  amount_due: number;
  amount_paid: number;
  amount_remaining: number;
  subtotal: number;
  total: number;
  tax: number;
  currency: string;
  created: number;
  due_date: number | null;
  paid_at: number | null;
  customer: string;
  customer_email: string | null;
  customer_name: string | null;
  description: string | null;
  hosted_invoice_url: string | null;
  invoice_pdf: string | null;
  collection_method: 'charge_automatically' | 'send_invoice';
  metadata: Record<string, string>;
  line_items: Array<{
    id: string;
    description: string;
    quantity: number;
    amount: number;
    currency: string;
    price?: string;
    tax_rates?: string[];
    metadata?: Record<string, string>;
  }>;
  automatic_tax: {
    enabled: boolean;
  };
}

interface UseInvoicesOptions {
  search?: string;
  startDate?: Date;
  endDate?: Date;
  service?: string[];
  status?: string;
}

// UI-compatible invoice interface (matches existing components)
interface UIInvoice {
  id: string;
  invoiceNumber: string;
  status: 'paid' | 'pending' | 'overdue' | 'draft';
  createDate: Date;
  dueDate: Date;
  totalAmount: number;
  subtotal: number;
  taxes: number;
  discount: number;
  shipping: number;
  sent: number;
  stripeInvoiceId?: string;
  invoiceFrom: {
    id: string;
    name: string;
    company: string;
    email: string;
    phoneNumber: string;
    address: string;
    zipCode: string;
    city: string;
    state: string;
    country: string;
  };
  invoiceTo: {
    id: string;
    name: string;
    company: string;
    email: string;
    phoneNumber: string;
    address: string;
    zipCode: string;
    city: string;
    state: string;
    country: string;
  };
  items: Array<{
    id: string;
    title: string;
    description: string;
    service: string;
    quantity: number;
    price: number;
    total: number;
  }>;
  stripeData?: {
    amount_due: number;
    amount_paid: number;
    amount_remaining: number;
    currency: string;
    hosted_invoice_url: string | null;
    invoice_pdf: string | null;
    collection_method: 'charge_automatically' | 'send_invoice';
    metadata: Record<string, string>;
    automatic_tax: { enabled: boolean };
  };
}

interface UseInvoicesResult {
  invoices: StripeInvoice[];
  allInvoices: StripeInvoice[];
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  createInvoice: (invoiceData: any) => Promise<StripeInvoice>;
  updateInvoice: (id: string, invoiceData: any) => Promise<StripeInvoice>;
  updateInvoiceStatus: (id: string, status: string, dueDate?: Date) => Promise<StripeInvoice>;
  deleteInvoice: (id: string) => Promise<void>;
  finalizeInvoice: (id: string) => Promise<StripeInvoice>;
  sendInvoice: (id: string) => Promise<StripeInvoice>;
  payInvoice: (id: string, paymentMethod?: string) => Promise<StripeInvoice>;
  voidInvoice: (id: string) => Promise<StripeInvoice>;
  bulkOperation: (operation: string, invoiceIds: string[]) => Promise<void>;
}

// Helper function to convert Stripe.Invoice to StripeInvoice
const convertStripeInvoice = (invoice: any): StripeInvoice => ({
  ...invoice,
  paid_at: invoice.status_transitions?.paid_at || null,
  line_items: invoice.lines?.data || [],
});

export function useInvoices(options: UseInvoicesOptions = {}): UseInvoicesResult {
  const [allStripeInvoices, setAllStripeInvoices] = useState<StripeInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isLoadingRef = useRef(false);

  // Use raw Stripe invoices directly
  const allInvoices = useMemo(() => allStripeInvoices, [allStripeInvoices]);

  // Client-side filtering for status
  const invoices = useMemo(() => {
    if (!options.status || options.status === 'all') {
      return allInvoices;
    }
    return allInvoices.filter(invoice => invoice.status === options.status);
  }, [allInvoices, options.status]);

  const fetchAllInvoices = useCallback(async (forceRefresh = false) => {
    if (isLoadingRef.current && !forceRefresh) return;

    // Add timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      console.error('⏰ useInvoices: Request timeout after 30 seconds');
      setError('Request timeout - please check your connection and try again');
      setLoading(false);
      setRefreshing(false);
    }, 30000);

    try {
      console.log('🔄 useInvoices: Starting fetchAllInvoices', { forceRefresh, loading: isLoadingRef.current });
      isLoadingRef.current = true;
      if (forceRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      // Build Stripe list parameters
      const listParams: any = {
        limit: 100,
      };

      if (options.status && options.status !== 'all') {
        listParams.status = options.status;
      }

      console.log('🌐 useInvoices: Calling listInvoices server action with params:', listParams);

      const result = await listInvoicesAction(listParams);

      console.log('📡 useInvoices: Server action result:', result);

      if (!result.success) {
        const errorMessage = result.error || 'Failed to fetch invoices';
        console.error('❌ useInvoices: Server action error:', errorMessage);
        throw new Error(errorMessage);
      }

      const data = result.data;
      console.log('✅ useInvoices: Received data:', { 
        invoiceCount: data?.invoices?.length || 0,
        hasMore: data?.hasMore,
        nextStartingAfter: data?.nextStartingAfter 
      });
      
      // Validate and set the invoices
      if (data?.invoices && Array.isArray(data.invoices)) {
        console.log('🔄 useInvoices: Setting invoices:', data.invoices.length);
        // Convert Stripe.Invoice to StripeInvoice format
        const convertedInvoices = data.invoices.map(convertStripeInvoice);
        setAllStripeInvoices(convertedInvoices);
      } else {
        console.warn('⚠️ useInvoices: No invoices array in response, setting empty array');
        setAllStripeInvoices([]);
      }
    } catch (err) {
      console.error('❌ useInvoices: Failed to fetch invoices:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch invoices');
    } finally {
      console.log('🏁 useInvoices: Fetch completed, setting loading to false');
      clearTimeout(timeoutId);
      isLoadingRef.current = false;
      setLoading(false);
      setRefreshing(false);
    }
  }, [options.status]);

  useEffect(() => {
    fetchAllInvoices();
  }, []); // Remove fetchAllInvoices dependency to prevent infinite loop

  const createInvoice = useCallback(async (invoiceData: {
    teamId?: string;
    customer?: string;
    serviceOption?: any;
    quantity?: number;
    amount?: number;
    description?: string;
    dueDate?: string;
    items?: any[];
    subtotal?: number;
    taxes?: number;
    discount?: number;
    shipping?: number;
    totalAmount?: number;
    collection_method?: string;
    days_until_due?: number;
    taxRateId?: string;
    status?: string;
    metadata?: Record<string, string>;
    invoiceFrom?: any;
    invoiceTo?: any;
  }): Promise<StripeInvoice> => {
    try {
      console.log('🔍 useInvoices: Creating invoice with data:', invoiceData);
      
      if (!invoiceData.teamId) {
        throw new Error('Team ID is required to create an invoice');
      }

      // Build the server action parameters
      const createParams: CreateInvoiceData = {
        teamId: invoiceData.teamId,
        data: {
          customer: invoiceData.customer,
          description: invoiceData.description || 'Invoice',
          collection_method: 'send_invoice',
          metadata: invoiceData.metadata || {},
          automatic_tax: { enabled: false },
        },
        taxRate: {} as any, // This will be handled by the server action
        items: invoiceData.items?.map(item => ({
          customer: invoiceData.customer || '',
          description: item.title || item.description || 'Invoice Item',
          quantity: item.quantity || 1,
          amount: Math.round((item.price || 0) * 100), // Convert to cents
          currency: 'usd',
          metadata: {},
        })) || [],
        invoiceFrom: invoiceData.invoiceFrom,
        invoiceTo: invoiceData.invoiceTo,
      };

      // Set due date if provided
      if (invoiceData.dueDate) {
        createParams.data.due_date = Math.floor(new Date(invoiceData.dueDate).getTime() / 1000);
      } else {
        // Default to 30 days from now
        const defaultDueDate = new Date();
        defaultDueDate.setDate(defaultDueDate.getDate() + 30);
        createParams.data.due_date = Math.floor(defaultDueDate.getTime() / 1000);
      }
      
      const result = await createInvoiceAction(createParams);

      if (!result.success) {
        const errorMessage = result.error || 'Failed to create invoice';
        throw new Error(errorMessage);
      }

      const newStripeInvoice = result.data;
      console.log('✅ useInvoices: Invoice created successfully:', newStripeInvoice);
      
      // Convert to StripeInvoice format
      const convertedInvoice = convertStripeInvoice(newStripeInvoice);
      
      // Add to local state
      setAllStripeInvoices(prev => [convertedInvoice, ...prev]);
      
      return convertedInvoice;
    } catch (err) {
      console.error('❌ useInvoices: Failed to create invoice:', err);
      throw err;
    }
  }, []);

  const updateInvoice = useCallback(async (id: string, invoiceData: any): Promise<StripeInvoice> => {
    try {
      const result = await updateInvoiceAction(id, invoiceData);

      if (!result.success) {
        const errorMessage = result.error || 'Failed to update invoice';
        throw new Error(errorMessage);
      }

      const updatedStripeInvoice = convertStripeInvoice(result.data);
      
      // Update local state
      setAllStripeInvoices(prev => 
        prev.map(invoice => invoice.id === id ? updatedStripeInvoice : invoice)
      );
      
      return updatedStripeInvoice;
    } catch (err) {
      console.error('Failed to update invoice:', err);
      throw err;
    }
  }, []);

  const deleteInvoice = useCallback(async (id: string): Promise<void> => {
    try {
      const result = await deleteInvoiceAction(id);

      if (!result.success) {
        const errorMessage = result.error || 'Failed to delete invoice';
        throw new Error(errorMessage);
      }

      // Remove from local state
      setAllStripeInvoices(prev => prev.filter(invoice => invoice.id !== id));
    } catch (err) {
      console.error('Failed to delete invoice:', err);
      throw err;
    }
  }, []);

  const finalizeInvoice = useCallback(async (id: string): Promise<StripeInvoice> => {
    try {
      const result = await finalizeInvoiceAction(id);

      if (!result.success) {
        const errorMessage = result.error || 'Failed to finalize invoice';
        throw new Error(errorMessage);
      }

      const finalizedStripeInvoice = convertStripeInvoice(result.data);
      
      // Update local state
      setAllStripeInvoices(prev => 
        prev.map(invoice => invoice.id === id ? finalizedStripeInvoice : invoice)
      );
      
      return finalizedStripeInvoice;
    } catch (err) {
      console.error('Failed to finalize invoice:', err);
      throw err;
    }
  }, []);

  const sendInvoice = useCallback(async (id: string): Promise<StripeInvoice> => {
    try {
      const result = await sendInvoiceAction(id);

      if (!result.success) {
        const errorMessage = result.error || 'Failed to send invoice';
        throw new Error(errorMessage);
      }

      const sentStripeInvoice = convertStripeInvoice(result.data);
      
      // Update local state
      setAllStripeInvoices(prev => 
        prev.map(invoice => invoice.id === id ? sentStripeInvoice : invoice)
      );
      
      return sentStripeInvoice;
    } catch (err) {
      console.error('Failed to send invoice:', err);
      throw err;
    }
  }, []);

  const payInvoice = useCallback(async (id: string, paymentMethod?: string): Promise<StripeInvoice> => {
    try {
      const result = await payInvoiceAction(id, paymentMethod);

      if (!result.success) {
        const errorMessage = result.error || 'Failed to pay invoice';
        throw new Error(errorMessage);
      }

      const paidStripeInvoice = convertStripeInvoice(result.data);
      
      // Update local state
      setAllStripeInvoices(prev => 
        prev.map(invoice => invoice.id === id ? paidStripeInvoice : invoice)
      );
      
      return paidStripeInvoice;
    } catch (err) {
      console.error('Failed to pay invoice:', err);
      throw err;
    }
  }, []);

  const voidInvoice = useCallback(async (id: string): Promise<StripeInvoice> => {
    try {
      const result = await voidInvoiceAction(id);

      if (!result.success) {
        const errorMessage = result.error || 'Failed to void invoice';
        throw new Error(errorMessage);
      }

      const voidedStripeInvoice = convertStripeInvoice(result.data);
      
      // Update local state
      setAllStripeInvoices(prev => 
        prev.map(invoice => invoice.id === id ? voidedStripeInvoice : invoice)
      );
      
      return voidedStripeInvoice;
    } catch (err) {
      console.error('Failed to void invoice:', err);
      throw err;
    }
  }, []);

  const updateInvoiceStatus = useCallback(async (id: string, status: string, dueDate?: Date): Promise<StripeInvoice> => {
    try {
      let result: any;
      
      switch (status) {
        case 'pending':
          result = await finalizeInvoiceAction(id);
          break;
        case 'paid':
          result = await payInvoiceAction(id);
          break;
        case 'overdue':
          result = await voidInvoiceAction(id); // Use void as fallback
          break;
        case 'draft':
        default:
          // For draft status, we might need to update the invoice
          return await updateInvoice(id, { dueDate });
      }

      if (!result.success) {
        const errorMessage = result.error || `Failed to update invoice status to ${status}`;
        throw new Error(errorMessage);
      }

      const updatedStripeInvoice = convertStripeInvoice(result.data);
      
      // Update local state
      setAllStripeInvoices(prev => 
        prev.map(invoice => invoice.id === id ? updatedStripeInvoice : invoice)
      );
      
      return updatedStripeInvoice;
    } catch (err) {
      console.error('Failed to update invoice status:', err);
      throw err;
    }
  }, [updateInvoice]);

  const bulkOperation = useCallback(async (operation: string, invoiceIds: string[]): Promise<void> => {
    try {
      const result = await bulkInvoiceOperationAction({
        operation,
        invoiceIds,
      });

      if (!result.success) {
        const errorMessage = result.error || 'Failed to perform bulk operation';
        throw new Error(errorMessage);
      }

      // Refresh data after bulk operation
      await fetchAllInvoices(true);
    } catch (err) {
      console.error('Failed to perform bulk operation:', err);
      throw err;
    }
  }, [fetchAllInvoices]);

  return {
    invoices,
    allInvoices,
    loading,
    refreshing,
    error,
    createInvoice,
    updateInvoice,
    updateInvoiceStatus,
    deleteInvoice,
    finalizeInvoice,
    sendInvoice,
    payInvoice,
    voidInvoice,
    bulkOperation,
  };
}