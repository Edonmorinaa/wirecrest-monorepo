import { useState, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Table from '@mui/material/Table';
import Stack from '@mui/material/Stack';
import Divider from '@mui/material/Divider';
import TableRow from '@mui/material/TableRow';
import TableHead from '@mui/material/TableHead';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import Typography from '@mui/material/Typography';

import { useInvoiceDetails } from 'src/hooks/useInvoiceDetails';

import { fDate } from 'src/utils/format-time';
import { fCurrency } from 'src/utils/format-number';

import { INVOICE_STATUS_OPTIONS } from 'src/_mock';

import { Label } from 'src/components/label';
import { toast } from 'src/components/snackbar';
import { Scrollbar } from 'src/components/scrollbar';

import { InvoiceToolbar } from './invoice-toolbar';
import { InvoiceTotalSummary } from './invoice-total-summary';

// ----------------------------------------------------------------------

export function InvoiceDetails({ invoice }) {
  const [currentStatus, setCurrentStatus] = useState(invoice?.status);
  const { updateInvoice } = useInvoiceDetails(invoice?.id || '');

  const handleChangeStatus = useCallback(async (event) => {
    const newStatus = event.target.value;
    const oldStatus = currentStatus;
    
    try {
      // Optimistically update the UI
      setCurrentStatus(newStatus);
      
      // Update via API
      await updateInvoice({ status: newStatus });
      
      toast.success(`Invoice status updated to ${newStatus}`);
    } catch (error) {
      // Revert on error
      setCurrentStatus(oldStatus);
      console.error('Failed to update invoice status:', error);
      toast.error('Failed to update invoice status');
    }
  }, [currentStatus, updateInvoice]);

  const renderFooter = () => (
    <Box
      sx={{
        py: 3,
        gap: 2,
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
      }}
    >
      <div>
        <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
          NOTES
        </Typography>
        <Typography variant="body2">
          We appreciate your business. Should you need us to add VAT or extra notes let us know!
        </Typography>
      </div>

      <Box sx={{ flexGrow: { md: 1 }, textAlign: { md: 'right' } }}>
        <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
          Have a question?
        </Typography>
        <Typography variant="body2">support@wirecrest.com</Typography>
      </Box>
    </Box>
  );

  const renderList = () => (
    <Scrollbar sx={{ mt: 5 }}>
      <Table sx={{ minWidth: 960 }}>
        <TableHead>
          <TableRow>
            <TableCell width={40}>#</TableCell>
            <TableCell sx={{ typography: 'subtitle2' }}>Description</TableCell>
            <TableCell>Qty</TableCell>
            <TableCell align="right">Unit price</TableCell>
            <TableCell align="right">Total</TableCell>
          </TableRow>
        </TableHead>

        <TableBody>
          {(invoice?.lines?.data || []).map((row, index) => (
            <TableRow key={index}>
              <TableCell>{index + 1}</TableCell>

              <TableCell>
                <Box sx={{ maxWidth: 560 }}>
                  <Typography variant="subtitle2">{row.description}</Typography>

                  <Typography variant="body2" sx={{ color: 'text.secondary' }} noWrap>
                    {row.description}
                  </Typography>
                </Box>
              </TableCell>

              <TableCell>{row.quantity}</TableCell>
              <TableCell align="right">{fCurrency(row.amount / 100)}</TableCell>
              <TableCell align="right">{fCurrency((row.amount * row.quantity) / 100)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Scrollbar>
  );

  return (
    <>
      <InvoiceToolbar
        invoice={invoice}
        currentStatus={currentStatus || ''}
        onChangeStatus={handleChangeStatus}
        statusOptions={INVOICE_STATUS_OPTIONS}
      />

      <Card sx={{ pt: 5, px: 5 }}>
        <Box
          sx={{
            rowGap: 5,
            display: 'grid',
            alignItems: 'center',
            gridTemplateColumns: { xs: 'repeat(1, 1fr)', sm: 'repeat(2, 1fr)' },
          }}
        >
          <Box
            component="img"
            alt="Invoice logo"
            src="/logo/logo-single.svg"
            sx={{ width: 48, height: 48 }}
          />

          <Stack spacing={1} sx={{ alignItems: { xs: 'flex-start', md: 'flex-end' } }}>
            <Label
              variant="soft"
              color={
                (currentStatus === 'paid' && 'success') ||
                (currentStatus === 'pending' && 'warning') ||
                (currentStatus === 'overdue' && 'error') ||
                'default'
              }
            >
              {currentStatus}
            </Label>

            <Typography variant="h6">{invoice?.number || invoice?.id}</Typography>
          </Stack>

          <Stack sx={{ typography: 'body2' }}>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Invoice from
            </Typography>
            {invoice?.metadata?.invoiceFrom ? JSON.parse(invoice.metadata.invoiceFrom).name : 'Company Name'}
            <br />
            {invoice?.metadata?.invoiceFrom ? JSON.parse(invoice.metadata.invoiceFrom).fullAddress : 'Company Address'}
            <br />
            Phone: {invoice?.metadata?.invoiceFrom ? JSON.parse(invoice.metadata.invoiceFrom).phoneNumber : 'N/A'}
            <br />
          </Stack>

          <Stack sx={{ typography: 'body2' }}>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Invoice to
            </Typography>
            {invoice?.metadata?.invoiceTo ? JSON.parse(invoice.metadata.invoiceTo).name : invoice?.customer_name || 'Customer Name'}
            <br />
            {invoice?.metadata?.invoiceTo ? JSON.parse(invoice.metadata.invoiceTo).fullAddress : 'Customer Address'}
            <br />
            Phone: {invoice?.metadata?.invoiceTo ? JSON.parse(invoice.metadata.invoiceTo).phoneNumber : 'N/A'}
            <br />
          </Stack>

          <Stack sx={{ typography: 'body2' }}>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Date create
            </Typography>
            {fDate(new Date(invoice?.created * 1000))}
          </Stack>

          <Stack sx={{ typography: 'body2' }}>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Due date
            </Typography>
            {fDate(new Date(invoice?.due_date * 1000))}
          </Stack>
        </Box>

        {renderList()}

        <Divider sx={{ borderStyle: 'dashed' }} />

        <InvoiceTotalSummary
          taxes={invoice?.tax / 100}
          subtotal={invoice?.subtotal / 100}
          discount={0}
          shipping={0}
          totalAmount={invoice?.total / 100}
        />

        <Divider sx={{ mt: 5, borderStyle: 'dashed' }} />

        {renderFooter()}
      </Card>
    </>
  );
}
