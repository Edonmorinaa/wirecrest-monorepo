import { useState, useEffect, useCallback } from 'react';

import { getInvoice as getInvoiceAction, updateInvoice as updateInvoiceAction, deleteInvoice as deleteInvoiceAction } from '../actions';

interface InvoiceDetails {
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
}

export function useInvoiceDetails(invoiceId: string) {
  const [invoice, setInvoice] = useState<InvoiceDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchInvoiceDetails = useCallback(async () => {
    if (!invoiceId) return;

    try {
      setLoading(true);
      setError(null);

      const result = await getInvoiceAction(invoiceId);
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch invoice details');
      }

      const data = result.data;
      
      // Transform Stripe invoice to our InvoiceDetails format
      const transformedData = {
        id: data.id,
        invoiceNumber: data.number || data.id,
        status: data.status === 'open' ? 'pending' : data.status === 'void' ? 'overdue' : data.status,
        createDate: new Date(data.created * 1000),
        dueDate: data.due_date ? new Date(data.due_date * 1000) : new Date(),
        totalAmount: data.total / 100,
        subtotal: data.subtotal / 100,
        taxes: data.tax || 0,
        discount: 0,
        shipping: 0,
        sent: data.status_transitions?.finalized_at ? new Date(data.status_transitions.finalized_at * 1000) : null,
        stripeInvoiceId: data.id,
        invoiceFrom: data.metadata?.invoiceFrom ? JSON.parse(data.metadata.invoiceFrom) : null,
        invoiceTo: data.metadata?.invoiceTo ? JSON.parse(data.metadata.invoiceTo) : null,
        items: data.lines?.data?.map((line, index) => ({
          id: line.id || `item-${index}`,
          title: line.description || 'Invoice Item',
          description: line.description || '',
          service: line.price?.product || '',
          quantity: line.quantity || 1,
          price: line.amount / 100,
          total: (line.amount * (line.quantity || 1)) / 100,
        })) || [],
      };

      setInvoice(transformedData);
    } catch (err) {
      console.error('Failed to fetch invoice details:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch invoice details');
    } finally {
      setLoading(false);
    }
  }, [invoiceId]);

  const updateInvoice = useCallback(async (updateData: Partial<{
    status: InvoiceDetails['status'];
    dueDate: Date | string | null;
    amount: number;
    description: string;
  }>) => {
    try {
      // Convert dueDate to Unix timestamp if needed
      const dueDateUnix = updateData.dueDate ? Math.floor(new Date(updateData.dueDate).getTime() / 1000) : undefined;
      
      const updateParams = {
        ...(updateData.description && { description: updateData.description }),
        ...(dueDateUnix && { due_date: dueDateUnix }),
        ...(updateData.amount && { amount: Math.round(updateData.amount * 100) }), // Convert to cents
      };

      const result = await updateInvoiceAction(invoiceId, updateParams);

      if (!result.success) {
        throw new Error(result.error || 'Failed to update invoice');
      }

      // Update local state
      if (invoice) {
        setInvoice({
          ...invoice,
          ...updateData,
          ...(updateData.dueDate && { dueDate: new Date(updateData.dueDate) }),
        });
      }

      return true;
    } catch (err) {
      console.error('Failed to update invoice:', err);
      throw err;
    }
  }, [invoiceId, invoice]);

  const deleteInvoice = useCallback(async () => {
    try {
      const result = await deleteInvoiceAction(invoiceId);

      if (!result.success) {
        throw new Error(result.error || 'Failed to delete invoice');
      }

      return true;
    } catch (err) {
      console.error('Failed to delete invoice:', err);
      throw err;
    }
  }, [invoiceId]);

  useEffect(() => {
    fetchInvoiceDetails();
  }, [fetchInvoiceDetails]);

  return {
    invoice,
    loading,
    error,
    refetch: fetchInvoiceDetails,
    updateInvoice,
    deleteInvoice,
  };
}
