import Stripe from 'stripe';
import { StripeServiceOption } from '@wirecrest/billing';
import { trpc } from 'src/lib/trpc/client';

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

/**
 * Hook for fetching Stripe data using tRPC
 * Replaces direct fetch calls with React Query (via tRPC)
 */
export function useStripeData() {
  const { data, error, isLoading, refetch } = trpc.billing.getStripeData.useQuery(undefined, {
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    staleTime: 3600000, // 1 hour
  });

  return {
    data: data || null,
    loading: isLoading,
    error: error ? (error instanceof Error ? error.message : 'Failed to fetch Stripe data') : null,
    refresh: refetch,
  };
}
