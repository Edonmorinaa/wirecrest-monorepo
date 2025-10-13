'use client';

import { useTeam } from '@wirecrest/auth';
import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { 
  getTierConfigs,
  getTeamInvoices,
  getBillingAddress,
  getPaymentMethods,
  getTeamSubscriptionInfo,
} from '@wirecrest/billing';

import Alert from '@mui/material/Alert';
import AlertTitle from '@mui/material/AlertTitle';

import { AccountBilling } from '../account-billing';

// ----------------------------------------------------------------------

export function AccountBillingView() {
  const { team } = useTeam();
  const teamId = team?.id;
  const searchParams = useSearchParams();

  const [subscriptionInfo, setSubscriptionInfo] = useState(null);
  const [tierConfigs, setTierConfigs] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [billingAddress, setBillingAddress] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [checkoutMessage, setCheckoutMessage] = useState(null);

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
  useEffect(() => {
    const fetchBillingData = async () => {
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
        setError(err.message || 'Failed to load billing information');
      } finally {
        setLoading(false);
      }
    };

    fetchBillingData();
  }, [teamId]);

  // Transform data for UI components
  const plans = tierConfigs.map(config => ({
    subscription: config.tier.toLowerCase(),
    price: config.basePrice,
    primary: subscriptionInfo?.tier === config.tier,
    plan: config.tier.toLowerCase(),
    name: config.name,
    description: config.description,
    features: config.enabledFeatures,
    popular: config.popular,
    highlighted: config.highlighted,
    // Add Stripe-specific fields needed for subscription creation
    stripePriceId: config.stripePriceId,
    stripeProductId: config.stripeProductId,
    tier: config.tier,
    billingInterval: config.billingInterval,
    includedSeats: config.includedSeats,
    includedLocations: config.includedLocations,
    includedRefreshes: config.includedRefreshes,
    pricePerSeat: config.pricePerSeat,
    pricePerLocation: config.pricePerLocation,
    pricePerRefresh: config.pricePerRefresh,
  }));

  // Debug the transformed plans data
  console.log('🔧 Transformed plans:', plans);

  const cards = paymentMethods.map(pm => ({
    id: pm.id,
    cardNumber: `**** **** **** ${pm.card?.last4 || '0000'}`,
    cardType: pm.card?.brand || 'card',
    primary: pm.isDefault,
    name: pm.billingDetails?.name || 'Card',
    expDate: `${pm.card?.expMonth?.toString().padStart(2, '0')}/${pm.card?.expYear}`,
  }));

  console.log('🔧 Payment methods data:', {
    rawPaymentMethods: paymentMethods,
    transformedCards: cards,
    cardsLength: cards.length
  });

  const addressBook = billingAddress ? [{
    id: billingAddress.id,
    name: billingAddress.name || 'Billing Address',
    fullAddress: `${billingAddress.line1}${billingAddress.line2 ? ', ' + billingAddress.line2 : ''}, ${billingAddress.city}${billingAddress.state ? ', ' + billingAddress.state : ''} ${billingAddress.postalCode}, ${billingAddress.country}`,
    phoneNumber: billingAddress.phoneNumber || '',
    primary: billingAddress.isDefault,
  }] : [];

  const transformedInvoices = invoices.map(invoice => ({
    id: invoice.id,
    invoiceNumber: invoice.number || invoice.id,
    price: invoice.amount / 100, // Convert from cents
    createdAt: new Date(invoice.created * 1000),
    status: invoice.status,
    pdfUrl: invoice.hosted_invoice_url,
  }));

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
        subscriptionInfo={subscriptionInfo}
        onRefresh={() => window.location.reload()}
      />
    </>
  );
}
