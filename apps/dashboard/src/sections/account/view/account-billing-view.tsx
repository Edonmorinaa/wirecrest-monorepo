'use client';

import type Stripe from 'stripe';

import { useTeam } from '@wirecrest/auth-next';
import { useSearchParams } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';
import { 
  getTierConfigs,
  getTeamInvoices,
  getBillingAddress,
  getPaymentMethods,
  getTeamSubscriptionInfo,
} from '@/actions/billing';

import type { 
  CardData, 
  PlanData, 
  InvoiceData, 
  AddressData, 
  SubscriptionInfoData 
} from '../account-billing';
import { AccountBilling } from '../account-billing';

import Alert from '@mui/material/Alert';
import AlertTitle from '@mui/material/AlertTitle';

// ----------------------------------------------------------------------

/**
 * Tier config from API
 */
interface TierConfig {
  product: Stripe.Product;
  price: Stripe.Price;
  features: string[];
}

/**
 * Payment method from API
 */
interface PaymentMethodResponse {
  id: string;
  isDefault: boolean;
  card?: {
    last4: string;
    brand: string;
    expMonth: number;
    expYear: number;
  };
  billingDetails?: {
    name?: string;
  };
}

/**
 * Billing address from API
 */
interface BillingAddressResponse {
  id: string;
  name?: string;
  line1: string;
  line2?: string;
  city: string;
  state?: string;
  postalCode: string;
  country: string;
  phoneNumber?: string;
  isDefault: boolean;
}

/**
 * Invoice from API
 */
interface InvoiceResponse {
  id: string;
  number?: string;
  amount: number;
  created: number;
  status: string;
  hostedInvoiceUrl?: string | null;
}

/**
 * Checkout message
 */
interface CheckoutMessage {
  severity: 'success' | 'warning' | 'error' | 'info';
  title: string;
  message: string;
}

export function AccountBillingView(): JSX.Element {
  const { team } = useTeam();
  const teamId = team?.id;
  const searchParams = useSearchParams();

  const [subscriptionInfo, setSubscriptionInfo] = useState<SubscriptionInfoData | null>(null);
  const [tierConfigs, setTierConfigs] = useState<TierConfig[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodResponse[]>([]);
  const [billingAddress, setBillingAddress] = useState<BillingAddressResponse | null>(null);
  const [invoices, setInvoices] = useState<InvoiceResponse[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [checkoutMessage, setCheckoutMessage] = useState<CheckoutMessage | null>(null);

  // Check for checkout success/cancel params
  useEffect(() => {
    const success = searchParams.get('success');
    const canceled = searchParams.get('canceled');

    if (success === 'true') {
      setCheckoutMessage({
        severity: 'success',
        title: 'Subscription Activated!',
        message: 'Your subscription has been successfully activated. Welcome aboard!',
      });
      // Clear the URL params after showing message
      if (typeof window !== 'undefined') {
        window.history.replaceState({}, '', window.location.pathname);
      }
    } else if (canceled === 'true') {
      setCheckoutMessage({
        severity: 'warning',
        title: 'Checkout Canceled',
        message: 'You canceled the checkout process. No charges were made.',
      });
      // Clear the URL params after showing message
      if (typeof window !== 'undefined') {
        window.history.replaceState({}, '', window.location.pathname);
      }
    }
  }, [searchParams]);

  // Fetch all billing data
  const fetchBillingData = useCallback(async (): Promise<void> => {
    if (!teamId) return;

    try {
      setLoading(true);
      setError(null);

      // Fetch all billing data in parallel
      const [
        subscriptionData,
        tierConfigsData,
        paymentMethodsData,
        billingAddressData,
        invoicesData,
      ] = await Promise.all([
        getTeamSubscriptionInfo(teamId),
        getTierConfigs(),
        getPaymentMethods(teamId),
        getBillingAddress(teamId),
        getTeamInvoices(teamId),
      ]);

      console.log('🔧 Fetched billing data:', {
        subscriptionInfo: subscriptionData,
        tierConfigs: tierConfigsData,
        paymentMethods: paymentMethodsData,
        billingAddress: billingAddressData,
        invoices: invoicesData,
      });

      setSubscriptionInfo(subscriptionData);
      setTierConfigs(tierConfigsData);
      setPaymentMethods(paymentMethodsData);
      setBillingAddress(billingAddressData);
      setInvoices(invoicesData);

    } catch (err) {
      console.error('Failed to fetch billing data:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to load billing information';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [teamId]);

  useEffect(() => {
    void fetchBillingData();
  }, [fetchBillingData]);

  // Debug raw tier configs from API
  console.log('🔧 Raw tierConfigs from API:', tierConfigs, 'Length:', tierConfigs?.length);
  
  // Check if tierConfigs is empty
  if (!tierConfigs || tierConfigs.length === 0) {
    console.warn('⚠️ No tier configs returned from API. You may need to initialize Stripe products.');
    console.log('💡 Run: npx tsx packages/billing/scripts/initialize-products.ts');
  }
  
  // Transform Stripe data for UI components
  const plans: PlanData[] = (tierConfigs || [])
    .filter((config): config is TierConfig => {
      if (!config) {
        console.warn('⚠️ Null/undefined config found');
        return false;
      }
      if (!config.product || !config.price) {
        console.warn('⚠️ Filtering out incomplete config:', config);
        return false;
      }
      return true;
    })
    .map((config): PlanData => {
      const tier = config.product?.metadata?.tier ?? 'UNKNOWN';
      const priceAmount = config.price?.unit_amount ? config.price.unit_amount / 100 : 0;
      const interval = config.price?.recurring?.interval ?? 'month';
      
      return {
        // UI display fields
        subscription: tier.toLowerCase(),
        price: priceAmount,
        primary: subscriptionInfo?.tier?.toUpperCase() === tier.toUpperCase(),
        plan: tier.toLowerCase(),
        name: config.product?.name ?? 'Unknown Plan',
        description: config.product?.description ?? '',
        features: config.features ?? [],
        popular: config.product?.metadata?.popular === 'true',
        highlighted: config.product?.metadata?.highlighted === 'true',
        tier: tier.toUpperCase(),
        billingInterval: interval,
        
        // Full Stripe objects for checkout (using different property names to avoid conflicts)
        product: config.product,
        stripePrice: config.price,
      };
    });

  // Debug the transformed plans data
  console.log('🔧 Transformed plans:', plans, 'Count:', plans?.length);

  const cards: CardData[] = paymentMethods.map((pm): CardData => ({
    id: pm.id,
    cardNumber: `**** **** **** ${pm.card?.last4 ?? '0000'}`,
    cardType: pm.card?.brand ?? 'card',
    primary: pm.isDefault,
    name: pm.billingDetails?.name ?? 'Card',
    expDate: `${pm.card?.expMonth?.toString().padStart(2, '0')}/${pm.card?.expYear}`,
  }));

  console.log('🔧 Payment methods data:', {
    rawPaymentMethods: paymentMethods,
    transformedCards: cards,
    cardsLength: cards.length
  });

  const addressBook: AddressData[] = billingAddress ? [{
    id: billingAddress.id,
    name: billingAddress.name ?? 'Billing Address',
    fullAddress: `${billingAddress.line1}${billingAddress.line2 ? ', ' + billingAddress.line2 : ''}, ${billingAddress.city}${billingAddress.state ? ', ' + billingAddress.state : ''} ${billingAddress.postalCode}, ${billingAddress.country}`,
    phoneNumber: billingAddress.phoneNumber ?? '',
    primary: billingAddress.isDefault,
  }] : [];

  const transformedInvoices: InvoiceData[] = invoices.map((invoice): InvoiceData => ({
    id: invoice.id,
    invoiceNumber: invoice.number ?? invoice.id,
    price: invoice.amount / 100, // Convert from cents
    createdAt: new Date(invoice.created * 1000),
    status: invoice.status,
    pdfUrl: invoice.hostedInvoiceUrl ?? null,
  }));

  // Create a refresh handler that doesn't reload the whole page
  const handleRefresh = useCallback(async (): Promise<void> => {
    await fetchBillingData();
  }, [fetchBillingData]);

  if (loading) {
    return (
      <div style={{ padding: '24px', textAlign: 'center' }}>
        <div>Loading billing information...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '24px', textAlign: 'center', color: 'red' }}>
        <div>Error: {error}</div>
        <button onClick={() => window.location.reload()}>Retry</button>
      </div>
    );
  }

  return (
    <>
      {checkoutMessage && (
        <Alert 
          severity={checkoutMessage.severity} 
          onClose={() => setCheckoutMessage(null)}
          sx={{ mb: 3 }}
        >
          <AlertTitle>{checkoutMessage.title}</AlertTitle>
          {checkoutMessage.message}
        </Alert>
      )}
      <AccountBilling
        plans={plans}
        cards={cards}
        invoices={transformedInvoices}
        addressBook={addressBook}
        subscriptionInfo={subscriptionInfo ?? { tier: 'FREE', status: 'active', enabledFeatures: [] }}
        onRefresh={handleRefresh}
      />
    </>
  );
}
