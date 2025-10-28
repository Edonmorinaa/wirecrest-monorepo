import type Stripe from 'stripe';

import Grid from '@mui/material/Grid';

import { AccountBillingPlan } from './account-billing-plan';
import { AccountBillingHistory } from './account-billing-history';

// ----------------------------------------------------------------------

/**
 * Payment card display data
 */
export interface CardData {
  id: string;
  cardNumber: string;
  cardType: string;
  primary: boolean;
  name: string;
  expDate: string;
  [key: string]: unknown;
}

/**
 * Plan display data with Stripe types
 */
export interface PlanData {
  subscription: string;
  price: number;
  primary: boolean;
  plan: string;
  name: string;
  description: string;
  features: string[];
  popular: boolean;
  highlighted: boolean;
  tier: string;
  billingInterval: string;
  product: Stripe.Product;
  stripePrice: Stripe.Price;
}

/**
 * Invoice display data
 */
export interface InvoiceData {
  id: string;
  invoiceNumber: string;
  price: number;
  createdAt: Date;
  status: string;
  pdfUrl?: string | null;
}

/**
 * Billing address display data
 */
export interface AddressData {
  id: string;
  name: string;
  fullAddress: string;
  phoneNumber: string;
  primary: boolean;
  [key: string]: unknown;
}

/**
 * Subscription information
 */
export interface SubscriptionInfoData {
  tier: string;
  status: string;
  enabledFeatures: string[];
  subscription?: {
    id: string;
    status: string;
    currentPeriodEnd: number;
    currentPeriodStart: number;
    cancelAtPeriodEnd: boolean;
  };
}

/**
 * AccountBilling component props
 */
interface AccountBillingProps {
  cards: CardData[];
  plans: PlanData[];
  invoices: InvoiceData[];
  addressBook: AddressData[];
  subscriptionInfo: SubscriptionInfoData;
  onRefresh: () => void | Promise<void>;
}

export function AccountBilling({ 
  cards, 
  plans, 
  invoices, 
  addressBook, 
  subscriptionInfo, 
  onRefresh 
}: AccountBillingProps): JSX.Element {
  return (
    <Grid container spacing={5}>
      <Grid size={{ xs: 12, md: 8 }}>
        <AccountBillingPlan 
          plans={plans} 
          cardList={cards} 
          addressBook={addressBook} 
          subscriptionInfo={subscriptionInfo}
          onRefresh={onRefresh}
        />
        {/* <AccountBillingPayment cards={cards} onRefresh={onRefresh} /> */}
        {/* <AccountBillingAddress addressBook={addressBook} onRefresh={onRefresh} /> */}
      </Grid>

      <Grid size={{ xs: 12, md: 4 }}>
        <AccountBillingHistory invoices={invoices} onRefresh={onRefresh} sx={{}} />
      </Grid>
    </Grid>
  );
}
