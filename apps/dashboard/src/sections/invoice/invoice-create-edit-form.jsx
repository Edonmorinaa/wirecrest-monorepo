import * as z from 'zod';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useBoolean } from 'minimal-shared/hooks';
import { DEFAULT_APP_CONFIG } from '@wirecrest/core';
import { zodResolver } from '@hookform/resolvers/zod';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';

import { useInvoices } from 'src/hooks/useInvoices';

import { today, fIsAfter } from 'src/utils/format-time';

import { DashboardContent } from 'src/layouts/dashboard';
import { useStripeDataContext } from 'src/contexts/StripeDataContext';

import { toast } from 'src/components/snackbar';
import { Form, schemaUtils } from 'src/components/hook-form';

import { InvoiceCreateEditAddress } from './invoice-create-edit-address';
import { InvoiceCreateEditDetails } from './invoice-create-edit-details';
import { InvoiceCreateEditStatusDate } from './invoice-create-edit-status-date';

// ----------------------------------------------------------------------

export const InvoiceCreateSchema = z
  .object({
    invoiceTo: schemaUtils.nullableInput(z.custom(), {
      error: 'Invoice to is required!',
    }),
    createDate: schemaUtils.date({ error: { required: 'Create date is required!' } }),
    dueDate: schemaUtils.date({ error: { required: 'Due date is required!' } }),
    items: z.array(
      z.object({
        title: z.string().min(1, { error: 'Title is required!' }),
        service: z.string().min(1, { error: 'Service is required!' }),
        description: z.string(),
        total: z.number(),
      })
    ),
    taxRateId: z.string().optional(),
    // Not required
    taxes: z.number(),
    status: z.string(),
    subtotal: z.number(),
    totalAmount: z.number(),
    invoiceNumber: z.string(),
    invoiceFrom: z.custom().nullable(),
  })
  .refine((val) => !fIsAfter(val.createDate, val.dueDate), {
    error: 'Due date cannot be earlier than create date!',
    path: ['dueDate'],
  })
  .refine((data) => data.items.length > 0, {
    message: 'At least one item is required!',
    path: ['items'],
  });

// ----------------------------------------------------------------------

export function InvoiceCreateEditForm({ currentInvoice }) {
  const router = useRouter();

  const loadingSave = useBoolean();
  const loadingSend = useBoolean();
  
  const { createInvoice, updateInvoiceStatus } = useInvoices();
  const { data: stripeData, loading: stripeLoading, error: stripeError } = useStripeDataContext();

  const defaultValues = {
    invoiceNumber: 'INV-1990',
    createDate: today(),
    dueDate: null,
    service: '',
    taxRateId: '',
    taxes: 0,
    status: 'draft',
    // Use appConfig from @wirecrest/core for invoiceFrom defaults
    invoiceFrom: {
      id: DEFAULT_APP_CONFIG.companyId,
      name: DEFAULT_APP_CONFIG.companyName,
      company: DEFAULT_APP_CONFIG.companyName,
      email: DEFAULT_APP_CONFIG.billingEmail,
      phoneNumber: DEFAULT_APP_CONFIG.companyPhone,
      address: DEFAULT_APP_CONFIG.companyAddress,
      zipCode: DEFAULT_APP_CONFIG.companyZip,
      city: DEFAULT_APP_CONFIG.companyCity,
      state: DEFAULT_APP_CONFIG.companyState,
      country: DEFAULT_APP_CONFIG.companyCountry,
      fullAddress: DEFAULT_APP_CONFIG.companyFullAddress,
    },
    invoiceTo: null,
    subtotal: 0,
    totalAmount: 0,
    items: [],
  };

  // Ensure currentInvoice has all required fields
  const formValues = currentInvoice ? {
    ...defaultValues,
    ...currentInvoice,
    // Ensure items array is not empty
    items: currentInvoice.items && currentInvoice.items.length > 0 ? currentInvoice.items : [],
    // Ensure dates are properly formatted
    createDate: currentInvoice.createDate ? new Date(currentInvoice.createDate) : defaultValues.createDate,
    dueDate: currentInvoice.dueDate ? new Date(currentInvoice.dueDate) : defaultValues.dueDate,
  } : defaultValues;

  const methods = useForm({
    mode: 'all',
    resolver: zodResolver(InvoiceCreateSchema),
    defaultValues,
    values: formValues,
  });

  // Calculate total amount when items or tax rate changes
  useEffect(() => {
    const subscription = methods.watch((value, { name }) => {
      if (name === 'items' || name === 'taxRateId' || name?.startsWith('items.')) {
        const items = value.items || [];
        const selectedTaxRate = stripeData?.taxRates?.find(rate => rate.id === value.taxRateId);
        
        // Calculate subtotal from items using service prices
        const subtotal = items.reduce((sum, item) => {
          const selectedService = stripeData?.serviceOptions?.find(service => service.value === item.service);
          return sum + (selectedService?.price || 0);
        }, 0);
        
        // Calculate tax amount
        const taxAmount = selectedTaxRate ? (subtotal * (selectedTaxRate.percentage > 1 ? selectedTaxRate.percentage / 100 : selectedTaxRate.percentage)) : 0;
        
        // Calculate total amount
        const totalAmount = subtotal + taxAmount;
        
        methods.setValue('subtotal', subtotal);
        methods.setValue('taxes', taxAmount);
        methods.setValue('totalAmount', totalAmount);
      }
    });
    
    return () => subscription.unsubscribe();
  }, [methods, stripeData]);

  // Show loading state while Stripe data is being fetched
  if (stripeLoading) {
    return (
      <DashboardContent>
        <Box sx={{ p: 3, textAlign: 'center' }}>
          <CircularProgress />
          <Typography variant="body2" sx={{ mt: 2 }}>
            Loading invoice form and Stripe data...
          </Typography>
        </Box>
      </DashboardContent>
    );
  }

  // Show error state if Stripe data failed to load
  if (stripeError) {
    return (
      <DashboardContent>
        <Box sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="h6" color="error" sx={{ mb: 2 }}>
            Failed to load Stripe data
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {stripeError}
          </Typography>
          <Button
            variant="contained"
            onClick={() => window.location.reload()}
          >
            Retry
          </Button>
        </Box>
      </DashboardContent>
    );
  }

  // Debug: Log the current invoice data
  console.log('Current invoice data:', currentInvoice);
  console.log('Form values being used:', formValues);
  
  // Debug: Log form errors
  const { formState: { errors } } = methods;
  console.log('Form validation errors:', errors);

  const {
    reset,
    handleSubmit,
  } = methods;

  const handleSaveAsDraft = handleSubmit(async (data) => {
    loadingSave.onTrue();

    try {
      console.log('Form data being submitted:', data);
      
      if (currentInvoice) {
        // Update existing invoice
        await updateInvoiceStatus(currentInvoice.id, 'draft', data.dueDate);
        toast.success('Invoice updated successfully!');
      } else {
        // Create new invoice
        if (!data.invoiceTo?.id) {
          throw new Error('Please select a customer for the invoice');
        }
        
        if (!data.items || data.items.length === 0) {
          throw new Error('Please add at least one item to the invoice');
        }
        
        const invoiceData = {
          teamId: data.invoiceTo.id,
          data: {
            // Customer will be set by the server action after creating/getting the Stripe customer
            description: data.items[0]?.title || 'Invoice',
            collection_method: 'send_invoice',
            due_date: data.dueDate ? Math.floor(new Date(data.dueDate).getTime() / 1000) : Math.floor((new Date().getTime() + 30 * 24 * 60 * 60 * 1000) / 1000), // 30 days from now
            metadata: {
              team_id: data.invoiceTo.id,
              invoiceFrom: JSON.stringify(data.invoiceFrom),
              invoiceTo: JSON.stringify(data.invoiceTo),
            },
            automatic_tax: { enabled: false },
          },
          taxRate: {}, // Will be handled by server action
          items: data.items?.map(item => ({
            // Customer will be set by the server action
            description: item.title || item.description || 'Invoice Item',
            quantity: 1,
            amount: Math.round((item.total || 0) * 100), // Convert to cents
            currency: 'usd',
            metadata: {},
          })) || [],
          invoiceFrom: data.invoiceFrom,
          invoiceTo: data.invoiceTo,
        };
        
        await createInvoice(invoiceData);
        toast.success('Invoice created successfully!');
      }
      
      reset();
      loadingSave.onFalse();
      router.push(paths.dashboard.invoice.root);
    } catch (error) {
      console.error('Failed to save invoice:', error);
      
      // Provide more specific error messages
      if (error.message?.includes('404')) {
        toast.error('Selected team not found. Please select a different team.');
      } else if (error.message?.includes('400')) {
        toast.error('Invalid invoice data. Please check all required fields.');
      } else if (error.message?.includes('403')) {
        toast.error('You do not have permission to create invoices.');
      } else {
        toast.error(error.message || 'Failed to save invoice');
      }
      
      loadingSave.onFalse();
    }
  });

  const handleCreateAndSend = handleSubmit(async (data) => {
    loadingSend.onTrue();

    try {
      if (currentInvoice) {
        // Update existing invoice to pending status
        await updateInvoiceStatus(currentInvoice.id, 'pending', data.dueDate);
        toast.success('Invoice sent successfully!');
      } else {
        // Create new invoice and mark as pending
        if (!data.invoiceTo?.id) {
          throw new Error('Please select a customer for the invoice');
        }
        
        if (!data.items || data.items.length === 0) {
          throw new Error('Please add at least one item to the invoice');
        }
        
        const invoiceData = {
          teamId: data.invoiceTo.id,
          data: {
            // Customer will be set by the server action after creating/getting the Stripe customer
            description: data.items[0]?.title || 'Invoice',
            collection_method: 'send_invoice',
            due_date: data.dueDate ? Math.floor(new Date(data.dueDate).getTime() / 1000) : Math.floor((new Date().getTime() + 30 * 24 * 60 * 60 * 1000) / 1000), // 30 days from now
            metadata: {
              team_id: data.invoiceTo.id,
              invoiceFrom: JSON.stringify(data.invoiceFrom),
              invoiceTo: JSON.stringify(data.invoiceTo),
            },
            automatic_tax: { enabled: false },
          },
          taxRate: {}, // Will be handled by server action
          items: data.items?.map(item => ({
            // Customer will be set by the server action
            description: item.title || item.description || 'Invoice Item',
            quantity: 1,
            amount: Math.round((item.total || 0) * 100), // Convert to cents
            currency: 'usd',
            metadata: {},
          })) || [],
          invoiceFrom: data.invoiceFrom,
          invoiceTo: data.invoiceTo,
        };
        
        const invoiceId = await createInvoice(invoiceData);
        await updateInvoiceStatus(invoiceId, 'pending', data.dueDate);
        toast.success('Invoice created and sent successfully!');
      }
      
      reset();
      loadingSend.onFalse();
      router.push(paths.dashboard.invoice.root);
    } catch (error) {
      console.error('Failed to send invoice:', error);
      
      // Provide more specific error messages
      if (error.message?.includes('404')) {
        toast.error('Selected team not found. Please select a different team.');
      } else if (error.message?.includes('400')) {
        toast.error('Invalid invoice data. Please check all required fields.');
      } else if (error.message?.includes('403')) {
        toast.error('You do not have permission to create invoices.');
      } else {
        toast.error(error.message || 'Failed to send invoice');
      }
      
      loadingSend.onFalse();
    }
  });


  return (
    <DashboardContent>
      <Form methods={methods} onSubmit={handleSaveAsDraft}>
          <Card sx={{ p: 3 }}>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {/* Invoice Address Section */}
              <InvoiceCreateEditAddress />

              {/* Invoice Status and Date Section */}
              <InvoiceCreateEditStatusDate />

              {/* Invoice Details Section (Table-like) */}
              <InvoiceCreateEditDetails />

              {/* Action Buttons */}
              <Box sx={{ display: 'flex', gap: 2, mt: 3 }}>
                <Button
                  variant="outlined"
                  onClick={() => router.push(paths.dashboard.invoice.root)}
                  fullWidth
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="contained"
                  disabled={loadingSave.value}
                  fullWidth
                >
                  {loadingSave.value ? <CircularProgress size={20} /> : 'Save as Draft'}
                </Button>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={handleCreateAndSend}
                  disabled={loadingSend.value}
                  fullWidth
                >
                  {loadingSend.value ? <CircularProgress size={20} /> : 'Create & Send'}
                </Button>
              </Box>
            </Box>
          </Card>
      </Form>
    </DashboardContent>
  );
}
