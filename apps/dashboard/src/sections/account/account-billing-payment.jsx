import { useTeam } from '@wirecrest/auth-next';
import { useState, useCallback } from 'react';
import { useBoolean } from 'minimal-shared/hooks';
// TODO: These billing functions need to be added to @/actions/billing
// For now, importing directly from billing/server will fail in client components
// import { 
//   createSetupIntent,
//   attachPaymentMethod,
//   deletePaymentMethod,
//   setDefaultPaymentMethod,
// } from '@/actions/billing';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Snackbar from '@mui/material/Snackbar';
import CardHeader from '@mui/material/CardHeader';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import DialogActions from '@mui/material/DialogActions';

import { Iconify } from 'src/components/iconify';

import { PaymentCardItem } from '../payment/payment-card-item';
import { PaymentCardCreateForm } from '../payment/payment-card-create-form';

// ----------------------------------------------------------------------

export function AccountBillingPayment({ cards, onRefresh, sx, ...other }) {
  const { team } = useTeam();
  const teamId = team?.id;
  
  console.log('🔧 AccountBillingPayment received cards:', {
    cards,
    cardsLength: cards?.length || 0,
    cardsType: typeof cards
  });
  
  const openForm = useBoolean();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [clientSecret, setClientSecret] = useState('');

  const handleAddCard = useCallback(async () => {
    if (!teamId) return;

    try {
      setLoading(true);
      setError(null);

      const result = await createSetupIntent(teamId);
      setClientSecret(result.clientSecret);
      openForm.onTrue();
    } catch (err) {
      console.error('Failed to create setup intent:', err);
      setError(err.message || 'Failed to add payment method');
    } finally {
      setLoading(false);
    }
  }, [teamId, openForm]);

  const handleSetDefault = useCallback(async (paymentMethodId) => {
    if (!teamId) return;

    try {
      setLoading(true);
      setError(null);

      await setDefaultPaymentMethod(teamId, paymentMethodId);
      setSuccess('Default payment method updated');
      onRefresh?.();
    } catch (err) {
      console.error('Failed to set default payment method:', err);
      setError(err.message || 'Failed to update default payment method');
    } finally {
      setLoading(false);
    }
  }, [teamId, onRefresh]);

  const handleDeleteCard = useCallback(async (paymentMethodId) => {
    if (!teamId) return;

    try {
      setLoading(true);
      setError(null);

      await deletePaymentMethod(teamId, paymentMethodId);
      setSuccess('Payment method deleted');
      onRefresh?.();
    } catch (err) {
      console.error('Failed to delete payment method:', err);
      setError(err.message || 'Failed to delete payment method');
    } finally {
      setLoading(false);
    }
  }, [teamId, onRefresh]);

  const handlePaymentSuccess = useCallback(async (setupIntentId) => {
    try {
      setLoading(true);
      setError(null);

      await attachPaymentMethod(teamId, setupIntentId);
      setSuccess('Payment method added successfully');
      openForm.onFalse();
      onRefresh?.();
    } catch (err) {
      console.error('Failed to attach payment method:', err);
      setError(err.message || 'Failed to add payment method');
    } finally {
      setLoading(false);
    }
  }, [teamId, openForm, onRefresh]);

  const renderCardCreateFormDialog = () => (
    <Dialog fullWidth maxWidth="xs" open={openForm.value} onClose={openForm.onFalse}>
      <DialogTitle>Add payment method</DialogTitle>

      {clientSecret ? (
        <PaymentCardCreateForm 
          clientSecret={clientSecret}
          onSuccess={handlePaymentSuccess}
          onError={setError}
          sx={{ px: 3 }} 
        />
      ) : (
        <Box sx={{ p: 3, textAlign: 'center' }}>
          <Typography>Loading payment form...</Typography>
        </Box>
      )}

      <DialogActions>
        <Button color="inherit" variant="outlined" onClick={openForm.onFalse}>
          Cancel
        </Button>
      </DialogActions>
    </Dialog>
  );

  return (
    <>
      <Card sx={[{ my: 3 }, ...(Array.isArray(sx) ? sx : [sx])]} {...other}>
        <CardHeader
          title="Payment methods"
          action={
            <Button
              size="small"
              color="primary"
              startIcon={<Iconify icon="mingcute:add-line" />}
              onClick={handleAddCard}
              disabled={loading}
            >
              {loading ? 'Loading...' : 'Add payment method'}
            </Button>
          }
        />

        {error && (
          <Alert severity="error" sx={{ mx: 3, mb: 2 }}>
            {error}
          </Alert>
        )}

        <Box
          sx={{
            p: 3,
            rowGap: 2.5,
            columnGap: 2,
            display: 'grid',
            gridTemplateColumns: { xs: 'repeat(1, 1fr)', md: 'repeat(2, 1fr)' },
          }}
        >
          {cards.length === 0 ? (
            <Box sx={{ gridColumn: '1 / -1', textAlign: 'center', py: 4 }}>
              <Typography variant="body2" color="text.secondary">
                No payment methods on file
              </Typography>
              <Typography variant="caption" color="text.disabled">
                Add a payment method to enable billing
              </Typography>
            </Box>
          ) : (
            cards.map((card) => (
              <PaymentCardItem 
                key={card.id} 
                card={card}
                onSetDefault={handleSetDefault}
                onDelete={handleDeleteCard}
                loading={loading}
              />
            ))
          )}
        </Box>
      </Card>

      {renderCardCreateFormDialog()}
      
      <Snackbar
        open={!!success}
        autoHideDuration={6000}
        onClose={() => setSuccess(null)}
        message={success}
      />
    </>
  );
}
