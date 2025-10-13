'use client';

import { useTeamSlug, useSubdomain } from '@/hooks/use-subdomain';
import { useState, useEffect, ReactNode, useContext, createContext } from 'react';

interface TeamContextType {
  teamSlug: string | null;
  isTeamSubdomain: boolean;
  isAuthSubdomain: boolean;
  isLoading: boolean;
}

const TeamContext = createContext<TeamContextType | undefined>(undefined);

interface TeamProviderProps {
  children: ReactNode;
}

export function TeamProvider({ children }: TeamProviderProps) {
  const subdomainInfo = useSubdomain();
  const teamSlug = useTeamSlug();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (subdomainInfo) {
      setIsLoading(false);
    }
  }, [subdomainInfo]);

  // For localhost development, always treat as main domain
  const isLocalhost = typeof window !== 'undefined' && window.location.hostname.includes('localhost');
  
  const value: TeamContextType = {
    teamSlug: isLocalhost ? null : teamSlug,
    isTeamSubdomain: isLocalhost ? false : (subdomainInfo?.isTeam || false),
    isAuthSubdomain: isLocalhost ? false : (subdomainInfo?.isAuth || false),
    isLoading: isLocalhost ? false : isLoading,
  };

  return (
    <TeamContext.Provider value={value}>
      {children}
    </TeamContext.Provider>
  );
}

export function useTeam(): TeamContextType {
  const context = useContext(TeamContext);
  if (context === undefined) {
    throw new Error('useTeam must be used within a TeamProvider');
  }
  return context;
}

// Legacy exports for backward compatibility
export const TenantProvider = TeamProvider;
export const useTenant = useTeam;
