import Stripe from 'stripe';
import { StripeServiceOption } from '@wirecrest/billing';
import { useState, useEffect, useCallback } from 'react';

export interface StripeData {
  products: Stripe.Product[];
  taxRates: Stripe.TaxRate[];
  prices: Stripe.Price[];
  serviceOptions: StripeServiceOption[];
  errors: {
    products: any;
    taxRates: any;
    prices: any;
  };
}

export function useStripeData() {
  const [data, setData] = useState<StripeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStripeData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/stripe/data', {
        cache: 'no-store', // Don't cache to ensure fresh data
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const stripeData = await response.json();
      setData(stripeData);
    } catch (err) {
      console.error('Failed to fetch Stripe data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch Stripe data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStripeData();
  }, [fetchStripeData]);

  return {
    data,
    loading,
    error,
    refetch: fetchStripeData,
  };
}
