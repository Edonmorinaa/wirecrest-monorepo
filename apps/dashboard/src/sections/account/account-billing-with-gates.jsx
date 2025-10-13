/**
 * Example: Account Billing with Feature Gates
 * Shows how to integrate feature flags with existing components
 */

'use client';

import { PremiumBadge, FeatureGateWrapper } from '@/components/feature-gates/FeatureGateWrapper';

import Grid from '@mui/material/Grid';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';

import { AccountBillingPlan } from './account-billing-plan';
import { AccountBillingPayment } from './account-billing-payment';
import { AccountBillingHistory } from './account-billing-history';
import { AccountBillingAddress } from './account-billing-address';

// ----------------------------------------------------------------------

export function AccountBillingWithGates({ cards, plans, invoices, addressBook }) {
  return (
    <Grid container spacing={5}>
      <Grid size={{ xs: 12, md: 8 }}>
        {/* Standard billing plan - always visible */}
        <AccountBillingPlan plans={plans} cardList={cards} addressBook={addressBook} />
        
        {/* Payment methods - only for paid plans */}
        <FeatureGateWrapper 
          feature="payment_methods"
          fallback={
            <Alert severity="info" sx={{ my: 2 }}>
              <Typography variant="h6">Payment Methods</Typography>
              <Typography variant="body2">
                Upgrade to a paid plan to manage payment methods.
              </Typography>
              <Button variant="contained" sx={{ mt: 1 }}>
                Upgrade Plan
              </Button>
            </Alert>
          }
        >
          <AccountBillingPayment cards={cards} />
        </FeatureGateWrapper>

        {/* Advanced billing features - premium only */}
        <FeatureGateWrapper feature="advanced_billing">
          <div>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Advanced Billing Features
              <PremiumBadge feature="advanced_billing" />
            </Typography>
            <AccountBillingAddress addressBook={addressBook} />
          </div>
        </FeatureGateWrapper>
      </Grid>

      <Grid size={{ xs: 12, md: 4 }}>
        {/* Billing history - with usage limits */}
        <FeatureGateWrapper 
          feature="billing_history"
          fallback={
            <Alert severity="info">
              <Typography variant="h6">Billing History</Typography>
              <Typography variant="body2">
                View detailed billing history with a paid subscription.
              </Typography>
            </Alert>
          }
        >
          <AccountBillingHistory invoices={invoices} />
        </FeatureGateWrapper>

        {/* Usage analytics - premium feature */}
        <FeatureGateWrapper feature="usage_analytics">
          <div style={{ marginTop: 24 }}>
            <Typography variant="h6" gutterBottom>
              Usage Analytics
              <PremiumBadge feature="usage_analytics" />
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Track your usage patterns and optimize your subscription.
            </Typography>
            {/* Add usage charts/meters here */}
          </div>
        </FeatureGateWrapper>
      </Grid>
    </Grid>
  );
}
