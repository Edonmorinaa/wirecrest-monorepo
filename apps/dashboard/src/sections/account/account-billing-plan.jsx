import { useTeam } from '@wirecrest/auth';
import { useState, useCallback } from 'react';
import { useBoolean } from 'minimal-shared/hooks';
import { 
  cancelTeamSubscription,
  upgradeTeamSubscription,
  previewSubscriptionChange,
  createCustomerPortalSession,
} from '@wirecrest/billing';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Grid from '@mui/material/Grid';
import Alert from '@mui/material/Alert';
import Paper from '@mui/material/Paper';
import Button from '@mui/material/Button';
import CardHeader from '@mui/material/CardHeader';
import Typography from '@mui/material/Typography';

import { PlanFreeIcon, PlanStarterIcon, PlanPremiumIcon } from 'src/assets/icons';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';

import { AddressListDialog } from '../address';
import { PaymentCardListDialog } from '../payment/payment-card-list-dialog';

// ----------------------------------------------------------------------

export function AccountBillingPlan({ cardList, addressBook, plans, subscriptionInfo, onRefresh }) {
  const { team } = useTeam();
  const teamId = team?.id;
  
  const openAddress = useBoolean();
  const openCards = useBoolean();

  const primaryCard = cardList.find((card) => card.primary) || null;
  const primaryAddress = addressBook.find((address) => address.primary) || null;

  const [selectedPlan, setSelectedPlan] = useState('');
  const [selectedCard, setSelectedCard] = useState(primaryCard);
  const [selectedAddress, setSelectedAddress] = useState(primaryAddress);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [previewData, setPreviewData] = useState(null);
  const [cleanupLoading, setCleanupLoading] = useState(false);
  const [cleanupMessage, setCleanupMessage] = useState(null);

  const handleSelectPlan = useCallback(
    (newValue) => {
      const currentPlan = plans.find((plan) => plan.primary);
      if (currentPlan?.subscription !== newValue) {
        setSelectedPlan(newValue);
        setError(null);
        setPreviewData(null);
      }
    },
    [plans]
  );

  const handleSelectAddress = useCallback((newValue) => {
    setSelectedAddress(newValue);
  }, []);

  const handleSelectCard = useCallback((newValue) => {
    setSelectedCard(newValue);
  }, []);

  const handleUpgradePlan = useCallback(async () => {
    if (!teamId || !selectedPlan) return;

    try {
      setLoading(true);
      setError(null);

      // Find the selected plan configuration
      const planConfig = plans.find(p => p.subscription === selectedPlan);
      if (!planConfig) {
        throw new Error('Selected plan not found');
      }

      // Check if team is on Free tier (no active subscription)
      const isFreeTier = !subscriptionInfo?.subscription || subscriptionInfo.tier === 'FREE';

      if (isFreeTier) {
        // For Free tier teams, go directly to Stripe Checkout
        // NO createTeamSubscription call - checkout creates the subscription
        try {
          const response = await fetch('/api/billing/checkout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              teamId,
              priceId: planConfig.stripePriceId,
              successUrl: `${window.location.origin}/user/account/billing?success=true`,
              cancelUrl: `${window.location.origin}/user/account/billing?canceled=true`,
            }),
          });

          if (!response.ok) {
            throw new Error('Failed to create checkout session');
          }

          const { url } = await response.json();
          if (url) {
            window.location.href = url;
            return;
          }
        } catch (checkoutError) {
          console.error('Failed to create checkout session:', checkoutError);
          throw checkoutError;
        }
      } else {
        // For teams with existing subscriptions, preview the change first
        const preview = await previewSubscriptionChange(teamId, planConfig.stripePriceId);
        setPreviewData(preview.preview);

        // If no payment required, proceed with upgrade
        if (!preview.requiresPaymentConfirmation) {
          await upgradeTeamSubscription(teamId, planConfig.stripePriceId);
          onRefresh?.();
        } else {
          // Handle payment confirmation
          const result = await upgradeTeamSubscription(teamId, planConfig.stripePriceId);
          if (result.requiresPaymentConfirmation) {
            // Use Stripe Customer Portal for payment confirmation
            try {
              const portalSession = await createCustomerPortalSession(teamId, window.location.href, {
                flowType: 'payment_method_update'
              });
              if (portalSession.url) {
                window.location.href = portalSession.url;
              } else {
                console.error('Failed to create customer portal session');
                onRefresh?.();
              }
            } catch (portalError) {
              console.error('Failed to create customer portal session:', portalError);
              onRefresh?.();
            }
          }
        }
      }
    } catch (err) {
      console.error('Failed to upgrade plan:', err);
      setError(err.message || 'Failed to upgrade plan');
    } finally {
      setLoading(false);
    }
  }, [teamId, selectedPlan, plans, subscriptionInfo, onRefresh]);

  const handleCancelPlan = useCallback(async () => {
    if (!teamId) return;

    try {
      setLoading(true);
      setError(null);

      await cancelTeamSubscription(teamId, { immediately: false });
      onRefresh?.();
    } catch (err) {
      console.error('Failed to cancel plan:', err);
      setError(err.message || 'Failed to cancel plan');
    } finally {
      setLoading(false);
    }
  }, [teamId, onRefresh]);

  const handleManageBilling = useCallback(async () => {
    if (!teamId) return;

    try {
      const result = await createCustomerPortalSession(teamId, window.location.href);
      if (result.url) {
        window.location.href = result.url;
      }
    } catch (err) {
      console.error('Failed to open customer portal:', err);
      setError(err.message || 'Failed to open billing portal');
    }
  }, [teamId]);

  const handleCleanupIncomplete = useCallback(async () => {
    if (!teamId) return;

    try {
      setCleanupLoading(true);
      setCleanupMessage(null);

      const response = await fetch('/api/billing/cleanup-incomplete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamId }),
      });

      if (!response.ok) {
        throw new Error('Failed to cleanup incomplete subscriptions');
      }

      const result = await response.json();
      setCleanupMessage({
        type: 'success',
        text: result.message || 'Successfully cleaned up incomplete subscriptions',
      });
      
      // Refresh billing data after cleanup
      setTimeout(() => {
        onRefresh?.();
        setCleanupMessage(null);
      }, 2000);
    } catch (err) {
      console.error('Failed to cleanup incomplete subscriptions:', err);
      setCleanupMessage({
        type: 'error',
        text: err.message || 'Failed to cleanup incomplete subscriptions',
      });
    } finally {
      setCleanupLoading(false);
    }
  }, [teamId, onRefresh]);

  const renderPlans = () =>
    plans.map((plan) => (
      <Grid key={plan.subscription} size={{ xs: 12, md: 4 }}>
        <Paper
          variant="outlined"
          onClick={() => handleSelectPlan(plan.subscription)}
          sx={[
            (theme) => ({
              p: 2.5,
              borderRadius: 1.5,
              cursor: 'pointer',
              position: 'relative',
              ...(plan.primary && { opacity: 0.48, cursor: 'default' }),
              ...(plan.subscription === selectedPlan && {
                boxShadow: `0 0 0 2px ${theme.vars.palette.text.primary}`,
              }),
            }),
          ]}
        >
          {plan.primary && (
            <Label
              color="info"
              startIcon={<Iconify icon="eva:star-fill" />}
              sx={{ position: 'absolute', top: 8, right: 8 }}
            >
              Current
            </Label>
          )}

          {plan.popular && !plan.primary && (
            <Label
              color="warning"
              startIcon={<Iconify icon="eva:star-fill" />}
              sx={{ position: 'absolute', top: 8, right: 8 }}
            >
              Popular
            </Label>
          )}

          {plan.subscription === 'free' && <PlanFreeIcon />}
          {plan.subscription === 'starter' && <PlanStarterIcon />}
          {plan.subscription === 'professional' && <PlanPremiumIcon />}

          <Box
            sx={{
              typography: 'subtitle2',
              mt: 2,
              mb: 0.5,
              textTransform: 'capitalize',
            }}
          >
            {plan.name || plan.subscription}
          </Box>

          <Box sx={{ display: 'flex', typography: 'h4', alignItems: 'center' }}>
            ${plan.price || 0}

            {!!plan.price && (
              <Box component="span" sx={{ typography: 'body2', color: 'text.disabled', ml: 0.5 }}>
                /mo
              </Box>
            )}
          </Box>

          {plan.description && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              {plan.description}
            </Typography>
          )}

          {plan.features && plan.features.length > 0 && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="caption" color="text.secondary">
                Key Features:
              </Typography>
              <Box sx={{ mt: 0.5, display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {plan.features.slice(0, 3).map((feature) => (
                  <Chip
                    key={feature}
                    label={feature.replace(/_/g, ' ')}
                    size="small"
                    variant="outlined"
                  />
                ))}
                {plan.features.length > 3 && (
                  <Chip
                    label={`+${plan.features.length - 3} more`}
                    size="small"
                    variant="outlined"
                    color="primary"
                  />
                )}
              </Box>
            </Box>
          )}
        </Paper>
      </Grid>
    ));

  const renderDetails = () => (
    <Box
      sx={{
        px: 3,
        pb: 3,
        gap: 2,
        display: 'flex',
        typography: 'body2',
        flexDirection: 'column',
      }}
    >
      {[
        {
          name: 'Current Plan',
          content: (
            <Box component="span" sx={{ textTransform: 'capitalize', fontWeight: 'bold' }}>
              {subscriptionInfo?.tier || 'Free'}
            </Box>
          ),
        },
        {
          name: 'Status',
          content: (
            <Chip
              label={subscriptionInfo?.status || 'Active'}
              color={subscriptionInfo?.status === 'active' ? 'success' : 'default'}
              size="small"
            />
          ),
        },
        // {
        //   name: 'Billing name',
        //   content: (
        //     <ButtonBase
        //       disableRipple
        //       onClick={openAddress.onTrue}
        //       sx={{ gap: 1, typography: 'subtitle2' }}
        //     >
        //       {selectedAddress?.name || 'No address set'}
        //       <Iconify width={16} icon="eva:arrow-ios-downward-fill" />
        //     </ButtonBase>
        //   ),
        // },
        // { 
        //   name: 'Billing address', 
        //   content: selectedAddress?.fullAddress || 'No address set' 
        // },
        // { 
        //   name: 'Billing phone number', 
        //   content: selectedAddress?.phoneNumber || 'Not provided' 
        // },
        // {
        //   name: 'Payment method',
        //   content: (
        //     <ButtonBase
        //       disableRipple
        //       onClick={openCards.onTrue}
        //       sx={{ gap: 1, typography: 'subtitle2' }}
        //     >
        //       {selectedCard?.cardNumber || 'No payment method'}
        //       <Iconify width={16} icon="eva:arrow-ios-downward-fill" />
        //     </ButtonBase>
        //   ),
        // },
        ...(subscriptionInfo?.subscription ? [{
          name: 'Next billing date',
          content: new Date(subscriptionInfo.subscription.currentPeriodEnd * 1000).toLocaleDateString(),
        }] : []),
        ...(subscriptionInfo?.subscription?.cancelAtPeriodEnd ? [{
          name: 'Cancellation',
          content: (
            <Chip
              label="Cancels at period end"
              color="warning"
              size="small"
            />
          ),
        }] : []),
      ].map((item) => (
        <Grid key={item.name} container spacing={{ xs: 0.5, md: 2 }}>
          <Grid sx={{ color: 'text.secondary' }} size={{ xs: 12, md: 4 }}>
            {item.name}
          </Grid>
          <Grid size={{ xs: 12, md: 8 }}>{item.content || '-'}</Grid>
        </Grid>
      ))}

      {previewData && (
        <Alert severity="info" sx={{ mt: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            Upgrade Preview
          </Typography>
          <Typography variant="body2">
            Immediate charge: ${(previewData.immediateTotal / 100).toFixed(2)}
          </Typography>
          <Typography variant="body2">
            Next invoice: ${(previewData.nextInvoiceTotal / 100).toFixed(2)}
          </Typography>
          {previewData.prorationAmount !== 0 && (
            <Typography variant="body2">
              Proration: ${(previewData.prorationAmount / 100).toFixed(2)}
            </Typography>
          )}
        </Alert>
      )}

      {error && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      )}

      {cleanupMessage && (
        <Alert severity={cleanupMessage.type} sx={{ mt: 2 }}>
          {cleanupMessage.text}
        </Alert>
      )}
    </Box>
  );

  const renderFooter = () => (
    <Box
      sx={(theme) => ({
        p: 3,
        gap: 1.5,
        display: 'flex',
        justifyContent: 'flex-end',
        borderTop: `dashed 1px ${theme.vars.palette.divider}`,
      })}
    >
      <Button 
        variant="outlined" 
        onClick={handleCleanupIncomplete}
        disabled={cleanupLoading || loading}
        color="warning"
        startIcon={<Iconify icon="solar:trash-bin-minimalistic-bold" />}
      >
        {cleanupLoading ? 'Cleaning...' : 'Cleanup Incomplete'}
      </Button>

      <Button 
        variant="outlined" 
        onClick={handleCancelPlan}
        disabled={loading || !subscriptionInfo?.subscription}
        color="error"
      >
        Cancel plan
      </Button>
      
      <Button 
        variant="outlined" 
        onClick={handleManageBilling}
        disabled={loading}
      >
        Manage billing
      </Button>
      
      {selectedPlan && selectedPlan !== subscriptionInfo?.tier?.toLowerCase() && (
        <Button 
          variant="contained" 
          onClick={handleUpgradePlan}
          disabled={loading}
        >
          {loading ? 'Processing...' : 'Upgrade plan'}
        </Button>
      )}
    </Box>
  );

  const renderCardListDialog = () => (
    <PaymentCardListDialog
      list={cardList}
      open={openCards.value}
      onClose={openCards.onFalse}
      selected={(selectedId) => selectedCard?.id === selectedId}
      onSelect={handleSelectCard}
      action={
        <Button size="small" startIcon={<Iconify icon="mingcute:add-line" />}>
          Add
        </Button>
      }
    />
  );

  const renderAddressListDialog = () => (
    <AddressListDialog
      list={addressBook}
      open={openAddress.value}
      onClose={openAddress.onFalse}
      selected={(selectedId) => selectedAddress?.id === selectedId}
      onSelect={handleSelectAddress}
      action={
        <Button size="small" startIcon={<Iconify icon="mingcute:add-line" />}>
          Add
        </Button>
      }
    />
  );

  return (
    <>
      <Card>
        <CardHeader title="Plan" />
        <Grid container spacing={2} sx={{ p: 3 }}>
          {renderPlans()}
        </Grid>
        {renderDetails()}
        {renderFooter()}
      </Card>

      {renderCardListDialog()}
      {renderAddressListDialog()}
    </>
  );
}
