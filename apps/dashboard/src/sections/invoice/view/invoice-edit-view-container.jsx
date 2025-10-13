'use client';

import Box from '@mui/material/Box';

import { useInvoiceDetails } from 'src/hooks/useInvoiceDetails';

import { DashboardContent } from 'src/layouts/dashboard';

import { Iconify } from 'src/components/iconify';
import { LoadingScreen } from 'src/components/loading-screen';

import { InvoiceEditView } from './invoice-edit-view';

// ----------------------------------------------------------------------

export function InvoiceEditViewContainer({ invoiceId }) {
  const { invoice, loading, error } = useInvoiceDetails(invoiceId);

  // Show loading screen while fetching data
  if (loading) {
    return (
      <DashboardContent>
        <LoadingScreen />
      </DashboardContent>
    );
  }

  // Show error message if there was an error
  if (error) {
    return (
      <DashboardContent>
        <Box sx={{ p: 3, textAlign: 'center' }}>
          <Iconify icon="solar:danger-bold" sx={{ fontSize: 64, color: 'error.main', mb: 2 }} />
          <Box sx={{ typography: 'h6', mb: 1 }}>Error loading invoice</Box>
          <Box sx={{ typography: 'body2', color: 'text.secondary' }}>{error}</Box>
        </Box>
      </DashboardContent>
    );
  }

  // Show message if invoice not found
  if (!invoice) {
    return (
      <DashboardContent>
        <Box sx={{ p: 3, textAlign: 'center' }}>
          <Iconify icon="solar:file-remove-bold" sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
          <Box sx={{ typography: 'h6', mb: 1 }}>Invoice not found</Box>
          <Box sx={{ typography: 'body2', color: 'text.secondary' }}>
            The invoice you are looking for does not exist.
          </Box>
        </Box>
      </DashboardContent>
    );
  }

  return <InvoiceEditView invoice={invoice} />;
}
