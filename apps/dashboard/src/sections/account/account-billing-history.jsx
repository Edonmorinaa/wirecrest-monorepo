import { useState, useCallback } from 'react';
import { useBoolean } from 'minimal-shared/hooks';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import CardHeader from '@mui/material/CardHeader';
import Typography from '@mui/material/Typography';
import ListItemText from '@mui/material/ListItemText';

import { fDate } from 'src/utils/format-time';
import { fCurrency } from 'src/utils/format-number';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

export function AccountBillingHistory({ invoices, onRefresh, sx, ...other }) {
  const showMore = useBoolean();
  const [error, setError] = useState(null);

  const handleDownloadInvoice = useCallback(async (invoice) => {
    if (invoice.pdfUrl) {
      window.open(invoice.pdfUrl, '_blank');
    } else {
      setError('PDF not available for this invoice');
    }
  }, []);

  const getStatusColor = (status) => {
    switch (status) {
      case 'paid': return 'success';
      case 'open': return 'warning';
      case 'void': return 'error';
      case 'uncollectible': return 'error';
      default: return 'default';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'paid': return 'Paid';
      case 'open': return 'Open';
      case 'void': return 'Void';
      case 'uncollectible': return 'Uncollectible';
      default: return status;
    }
  };


  return (
    <Card sx={sx} {...other}>
      <CardHeader title="Invoice history" />

      {error && (
        <Alert severity="error" sx={{ mx: 3, mb: 2 }}>
          {error}
        </Alert>
      )}

      <Box
        sx={{
          px: 3,
          pt: 3,
          gap: 1.5,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {invoices.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="body2" color="text.secondary">
              No invoices found
            </Typography>
            <Typography variant="caption" color="text.disabled">
              Invoices will appear here once you have a paid subscription
            </Typography>
          </Box>
        ) : (
          <>
            {(showMore.value ? invoices : invoices.slice(0, 8)).map((invoice) => (
              <Box key={invoice.id} sx={{ display: 'flex', alignItems: 'center', py: 1 }}>
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                        {invoice.invoiceNumber || `Invoice ${invoice.id.slice(-8)}`}
                      </Typography>
                      <Chip
                        label={getStatusLabel(invoice.status)}
                        color={getStatusColor(invoice.status)}
                        size="small"
                      />
                    </Box>
                  }
                  secondary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                      <Typography variant="caption" color="text.disabled">
                        {fDate(invoice.createdAt)}
                      </Typography>
                      {invoice.dueDate && (
                        <>
                          <Typography variant="caption" color="text.disabled">
                            •
                          </Typography>
                          <Typography variant="caption" color="text.disabled">
                            Due {fDate(invoice.dueDate)}
                          </Typography>
                        </>
                      )}
                    </Box>
                  }
                />

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, ml: 'auto' }}>
                  <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                    {fCurrency(invoice.price)}
                  </Typography>

                  {invoice.pdfUrl && (
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => handleDownloadInvoice(invoice)}
                      startIcon={<Iconify icon="eva:download-fill" width={16} />}
                    >
                      PDF
                    </Button>
                  )}
                </Box>
              </Box>
            ))}

            {invoices.length > 8 && (
              <>
                <Divider sx={{ borderStyle: 'dashed' }} />
                <Box sx={{ p: 2 }}>
                  <Button
                    size="small"
                    color="inherit"
                    startIcon={
                      <Iconify
                        width={16}
                        icon={showMore.value ? 'eva:arrow-ios-upward-fill' : 'eva:arrow-ios-downward-fill'}
                        sx={{ mr: -0.5 }}
                      />
                    }
                    onClick={showMore.onToggle}
                  >
                    Show {showMore.value ? `less` : `more`}
                  </Button>
                </Box>
              </>
            )}
          </>
        )}
      </Box>
    </Card>
  );
}
