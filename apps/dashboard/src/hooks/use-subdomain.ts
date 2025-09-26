'use client';

import { useState, useEffect } from 'react';
import { SubdomainInfo, parseSubdomain } from '@/lib/subdomain';

/**
 * Hook to get subdomain information on the client side
 */
export function useSubdomain(): SubdomainInfo | null {
  const [subdomainInfo, setSubdomainInfo] = useState<SubdomainInfo | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname;
      const info = parseSubdomain(hostname);
      setSubdomainInfo(info);
    }
  }, []);

  return subdomainInfo;
}

/**
 * Hook to get current team slug
 */
export function useTeamSlug(): string | null {
  const subdomainInfo = useSubdomain();
  return subdomainInfo?.teamSlug || null;
}

/**
 * Hook to check if current request is from auth subdomain
 */
export function useIsAuthSubdomain(): boolean {
  const subdomainInfo = useSubdomain();
  return subdomainInfo?.isAuth || false;
}

/**
 * Hook to check if current request is from team subdomain
 */
export function useIsTeamSubdomain(): boolean {
  const subdomainInfo = useSubdomain();
  return subdomainInfo?.isTeam || false;
}
