'use client';

import { ReactNode, useContext, createContext } from 'react';

import { StripeData, useStripeData } from 'src/hooks/useStripeData';

// ----------------------------------------------------------------------

interface StripeDataContextType {
  data: StripeData;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

const StripeDataContext = createContext<StripeDataContextType | undefined>(undefined);

// ----------------------------------------------------------------------

interface StripeDataProviderProps {
  children: ReactNode;
}

export function StripeDataProvider({ children }: StripeDataProviderProps) {
  const stripeData = useStripeData();

  return (
    <StripeDataContext.Provider value={stripeData}>
      {children}
    </StripeDataContext.Provider>
  );
}

// ----------------------------------------------------------------------

export function useStripeDataContext() {
  const context = useContext(StripeDataContext);
  if (context === undefined) {
    throw new Error('useStripeDataContext must be used within a StripeDataProvider');
  }
  return context;
}
