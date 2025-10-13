import dynamic from 'next/dynamic';
import { useBoolean } from 'minimal-shared/hooks';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Tooltip from '@mui/material/Tooltip';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import DialogActions from '@mui/material/DialogActions';

import { RouterLink } from 'src/routes/components';

import { useInvoices } from 'src/hooks/useInvoices';

import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

const InvoicePDFDownload = dynamic(
  () => import('./invoice-pdf').then((mod) => mod.InvoicePDFDownload),
  { ssr: false }
);

const InvoicePDFViewer = dynamic(
  () => import('./invoice-pdf').then((mod) => mod.InvoicePDFViewer),
  { ssr: false }
);

export function InvoiceToolbar({ invoice, currentStatus, statusOptions, onChangeStatus }) {
  const { value: open, onFalse: onClose, onTrue: onOpen } = useBoolean();
  const { sendInvoice, shareInvoice } = useInvoices();

  const handleSendInvoice = async () => {
    try {
      toast.loading('Sending invoice...', { id: 'send-invoice' });
      
      const result = await sendInvoice(invoice.id, {
        subject: `Invoice ${invoice.invoiceNumber || invoice.id}`,
        content: 'Please find your invoice attached.',
      });
      
      toast.success(`Invoice ${result.invoiceNumber || ''} sent to ${result.sentTo}`, { 
        id: 'send-invoice' 
      });
    } catch (error) {
      console.error('Send invoice error:', error);
      toast.error(error?.message || 'Failed to send invoice', { 
        id: 'send-invoice' 
      });
    }
  };

  const handleShareInvoice = async () => {
    try {
      toast.loading('Generating share link...', { id: 'share-invoice' });
      
      const result = await shareInvoice(invoice.id, 30); // 30 days expiry
      await navigator.clipboard.writeText(result.shareUrl);
      
      toast.success('Share link copied to clipboard! Link expires in 30 days.', { 
        id: 'share-invoice' 
      });
    } catch (error) {
      console.error('Share invoice error:', error);
      toast.error(error?.message || 'Failed to generate share link', { 
        id: 'share-invoice' 
      });
    }
  };

  const handlePrintInvoice = () => {
    // Create a new window with the invoice content
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Invoice ${invoice?.invoiceNumber || invoice?.id}</title>
            <style>
              @media print {
                body { margin: 0; padding: 20px; font-family: Arial, sans-serif; }
                .no-print { display: none !important; }
              }
            </style>
          </head>
          <body>
            <div id="invoice-content">
              <!-- PDF content will be loaded here -->
              <p>Preparing invoice for printing...</p>
            </div>
            <script>
              window.onload = function() {
                window.print();
                window.close();
              };
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    } else {
      // Fallback to regular print
      window.print();
    }
  };

  const renderDownloadButton = () =>
    invoice ? <InvoicePDFDownload invoice={invoice} currentStatus={currentStatus} /> : null;

  const renderDetailsDialog = () => (
    <Dialog fullScreen open={open}>
      <Box sx={{ height: 1, display: 'flex', flexDirection: 'column' }}>
        <DialogActions sx={{ p: 1.5 }}>
          <Button color="inherit" variant="contained" onClick={onClose}>
            Close
          </Button>
        </DialogActions>
        <Box sx={{ flexGrow: 1, height: 1, overflow: 'hidden' }}>
          {invoice && <InvoicePDFViewer invoice={invoice} currentStatus={currentStatus} />}
        </Box>
      </Box>
    </Dialog>
  );

  return (
    <>
      <Box
        sx={{
          gap: 3,
          display: 'flex',
          mb: { xs: 3, md: 5 },
          flexDirection: { xs: 'column', sm: 'row' },
          alignItems: { xs: 'flex-end', sm: 'center' },
        }}
      >
        <Box
          sx={{
            gap: 1,
            width: 1,
            flexGrow: 1,
            display: 'flex',
          }}
        >
          <Tooltip title="Edit">
            <IconButton
              component={RouterLink}
              href={`/dashboard/superadmin/invoice/${invoice?.id}/edit`}
            >
              <Iconify icon="solar:pen-bold" />
            </IconButton>
          </Tooltip>

          <Tooltip title="View">
            <IconButton onClick={onOpen}>
              <Iconify icon="solar:eye-bold" />
            </IconButton>
          </Tooltip>

          {renderDownloadButton()}

          <Tooltip title="Print">
            <IconButton onClick={handlePrintInvoice}>
              <Iconify icon="solar:printer-minimalistic-bold" />
            </IconButton>
          </Tooltip>

          <Tooltip title="Send">
            <IconButton onClick={handleSendInvoice}>
              <Iconify icon="custom:send-fill" />
            </IconButton>
          </Tooltip>

          <Tooltip title="Share">
            <IconButton onClick={handleShareInvoice}>
              <Iconify icon="solar:share-bold" />
            </IconButton>
          </Tooltip>
        </Box>

        <TextField
          fullWidth
          select
          label="Status"
          value={currentStatus}
          onChange={onChangeStatus}
          sx={{ maxWidth: 160 }}
          slotProps={{
            htmlInput: { id: 'status-select' },
            inputLabel: { htmlFor: 'status-select' },
          }}
        >
          {statusOptions.map((option) => (
            <MenuItem key={option.value} value={option.value}>
              {option.label}
            </MenuItem>
          ))}
        </TextField>
      </Box>

      {renderDetailsDialog()}
    </>
  );
}
