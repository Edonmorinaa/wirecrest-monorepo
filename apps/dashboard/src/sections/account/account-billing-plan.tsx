import type Stripe from 'stripe';

import { useTeam } from '@wirecrest/auth-next';
import { useBoolean } from 'minimal-shared/hooks';
import { useMemo, useState, useCallback } from 'react';
import { 
  handlePlanUpgrade,
  createCustomerPortalSession,
} from '@/actions/billing';

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

/**
 * Payment card data structure
 */
interface PaymentCard {
  id: string;
  primary?: boolean;
  cardNumber?: string;
  [key: string]: unknown;
}

/**
 * Billing address data structure
 */
interface BillingAddress {
  id: string;
  primary?: boolean;
  name?: string;
  fullAddress?: string;
  phoneNumber?: string;
  [key: string]: unknown;
}

/**
 * Plan data structure with Stripe types
 */
interface Plan {
  subscription: string;
  name?: string;
  price?: number;
  description?: string;
  primary?: boolean;
  popular?: boolean;
  features?: string[];
  product?: Stripe.Product;
  stripePrice?: Stripe.Price;
}

/**
 * Subscription information
 */
interface SubscriptionInfo {
  tier?: string;
  status?: string;
  subscription?: {
    id: string;
    status: string;
    currentPeriodEnd: number;
    currentPeriodStart: number;
    cancelAtPeriodEnd: boolean;
  };
}

/**
 * Preview data for subscription changes
 */
interface PreviewData {
  immediateTotal: number;
  nextInvoiceTotal: number;
  prorationAmount: number;
}

/**
 * Component props
 */
interface AccountBillingPlanProps {
  cardList: PaymentCard[];
  addressBook: BillingAddress[];
  plans: Plan[];
  subscriptionInfo: SubscriptionInfo;
  onRefresh?: () => void | Promise<void>;
}

export function AccountBillingPlan({ 
  cardList, 
  addressBook, 
  plans, 
  subscriptionInfo, 
  onRefresh 
}: AccountBillingPlanProps): JSX.Element {
  const { team } = useTeam();
  const teamId = team?.id;
  
  const openAddress = useBoolean();
  const openCards = useBoolean();

  const primaryCard = cardList.find((card) => card.primary) ?? null;
  const primaryAddress = addressBook.find((address) => address.primary) ?? null;

  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [selectedCard, setSelectedCard] = useState<PaymentCard | null>(primaryCard);
  const [selectedAddress, setSelectedAddress] = useState<BillingAddress | null>(primaryAddress);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);

  const subscriptionActive = useMemo((): Boolean => 
    plans.find((plan) => plan.primary === true) != undefined
  , [plans]);

  
  const handleSelectPlan = useCallback(
    (planSubscription: string): void => {
      if (subscriptionActive) return;
      const currentPlan = plans.find((plan) => plan.primary);
      if (currentPlan?.subscription !== planSubscription) {
        // Find and store the full plan object
        const planObject = plans.find((plan) => plan.subscription === planSubscription);
        setSelectedPlan(planObject ?? null);
        setError(null);
        setPreviewData(null);
      }
    },
    [plans, subscriptionActive]
  );

  const handleSelectAddress = useCallback((newValue: BillingAddress): void => {
    setSelectedAddress(newValue);
  }, []);

  const handleSelectCard = useCallback((newValue: PaymentCard): void => {
    setSelectedCard(newValue);
  }, []);

  const handleUpgradePlan = useCallback(async (): Promise<void> => {
    if (!teamId || !selectedPlan) return;

    // Validate that the plan has the required Stripe objects
    if (!selectedPlan.product || !selectedPlan.stripePrice) {
      setError('Selected plan is missing required payment information');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Pass the full plan object with product, price, and features
      const result = await handlePlanUpgrade(teamId, {
        product: selectedPlan.product,
        price: selectedPlan.stripePrice,
        features: selectedPlan.features ?? [],
      });
      
      if (result?.url) {
        window.location.href = result.url;
        return;
      }
    } catch (upgradeError) {
      console.error('Failed to upgrade plan:', upgradeError);
      setError(upgradeError instanceof Error ? upgradeError.message : 'Failed to upgrade plan');
    } finally {
      setLoading(false);
    }
  }, [teamId, selectedPlan]);

  const handleManageBilling = useCallback(async (): Promise<void> => {
    if (!teamId) return;

    try {
      setLoading(true);
      setError(null);

      const result = await createCustomerPortalSession(teamId, window.location.href);
      if (result.url) {
        window.location.href = result.url;
      }
    } catch (err) {
      console.error('Failed to open customer portal:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to open billing portal';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [teamId]);

  const renderPlans = (): JSX.Element[] =>
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
              ...(selectedPlan && plan.subscription === selectedPlan.subscription && {
                boxShadow: `0 0 0 2px ${theme.vars.palette.text.primary}`,
              }),
            }),
          ]}
        >
          {plan.primary && (
            <Label
              color="info"
              startIcon={<Iconify icon="eva:star-fill" width={16} height={16} sx={{}} className="" />}
              endIcon={null}
              className=""
              disabled={false}
              sx={{ position: 'absolute', top: 8, right: 8 }}
            >
              Current
            </Label>
          )}

          {plan.popular && !plan.primary && (
            <Label
              color="warning"
              startIcon={<Iconify icon="eva:star-fill" width={16} height={16} sx={{}} className="" />}
              endIcon={null}
              className=""
              disabled={false}
              sx={{ position: 'absolute', top: 8, right: 8 }}
            >
              Popular
            </Label>
          )}

          {plan.subscription === 'free' && <PlanFreeIcon sx={{}} />}
          {plan.subscription === 'starter' && <PlanStarterIcon sx={{}} />}
          {plan.subscription === 'professional' && <PlanPremiumIcon sx={{}} />}

          <Box
            sx={{
              typography: 'subtitle2',
              mt: 2,
              mb: 0.5,
              textTransform: 'capitalize',
            }}
          >
            {plan.name ?? plan.subscription}
          </Box>

          <Box sx={{ display: 'flex', typography: 'h4', alignItems: 'center' }}>
            ${plan.price ?? 0}

            {Boolean(plan.price) && (
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

  const renderDetails = (): JSX.Element => {
    interface DetailItem {
      name: string;
      content: JSX.Element | string;
    }

    const detailItems: DetailItem[] = [
      {
        name: 'Current Plan',
        content: (
          <Box component="span" sx={{ textTransform: 'capitalize', fontWeight: 'bold' }}>
            {subscriptionInfo?.tier ?? 'Free'}
          </Box>
        ),
      },
    ];

    // Add status if there's an active subscription
    if (subscriptionInfo?.subscription) {
      detailItems.push({
        name: 'Status',
        content: (
          <Chip
            label={subscriptionInfo.subscription.status}
            color={subscriptionInfo.subscription.status === 'active' ? 'success' : 'default'}
            size="small"
            sx={{ textTransform: 'capitalize' }}
          />
        ),
      });

      // Add next billing date
      const nextBillingDate = new Date(subscriptionInfo.subscription.currentPeriodEnd * 1000);
      const formattedDate = nextBillingDate.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        timeZone: 'UTC',
      });
      
      detailItems.push({
        name: 'Next billing date',
        content: formattedDate,
      });

      // Add cancellation notice if applicable
      if (subscriptionInfo.subscription.cancelAtPeriodEnd) {
        detailItems.push({
          name: 'Cancellation',
          content: (
            <Chip
              label="Cancels at period end"
              color="warning"
              size="small"
            />
          ),
        });
      }
    }

    return (
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
        {detailItems.map((item) => (
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
      </Box>
    );
  };

  const renderFooter = (): JSX.Element => {
    const hasActiveSubscription = Boolean(subscriptionInfo?.subscription);
    const canUpgrade = selectedPlan && selectedPlan.subscription !== subscriptionInfo?.tier?.toLowerCase();

    return (
      <Box
        sx={(theme) => ({
          p: 3,
          gap: 1.5,
          display: 'flex',
          justifyContent: 'flex-end',
          borderTop: `dashed 1px ${theme.vars.palette.divider}`,
        })}
      >
        {/* Show "Manage billing" only if user has an active subscription */}
        {hasActiveSubscription && (
          <Button 
            variant="outlined" 
            onClick={handleManageBilling}
            disabled={loading}
          >
            {loading ? 'Loading...' : 'Manage billing'}
          </Button>
        )}
        
        {/* Show "Upgrade plan" only if user does NOT have an active subscription, or if they selected a different plan */}
        {(!hasActiveSubscription || canUpgrade) && selectedPlan && (
          <Button 
            variant="contained" 
            onClick={handleUpgradePlan}
            disabled={loading}
          >
            {loading ? 'Processing...' : hasActiveSubscription ? 'Upgrade plan' : 'Subscribe'}
          </Button>
        )}
      </Box>
    );
  };

  const renderCardListDialog = (): JSX.Element => (
    <PaymentCardListDialog
      list={cardList}
      open={openCards.value}
      onClose={openCards.onFalse}
      selected={(selectedId: string) => selectedCard?.id === selectedId}
      onSelect={handleSelectCard}
      sx={{}}
      action={
        <Button size="small" startIcon={<Iconify icon="mingcute:add-line" width={18} height={18} sx={{}} className="" />}>
          Add
        </Button>
      }
    />
  );

  const renderAddressListDialog = (): JSX.Element => (
    <AddressListDialog
      list={addressBook}
      open={openAddress.value}
      onClose={openAddress.onFalse}
      selected={(selectedId: string) => selectedAddress?.id === selectedId}
      onSelect={handleSelectAddress}
      sx={{}}
      action={
        <Button size="small" startIcon={<Iconify icon="mingcute:add-line" width={18} height={18} sx={{}} className="" />}>
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
