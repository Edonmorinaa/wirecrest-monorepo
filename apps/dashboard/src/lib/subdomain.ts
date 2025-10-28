/**
 * Subdomain utilities for multi-tenant routing
 */

export interface SubdomainInfo {
  subdomain: string | null;
  domain: string;
  isAuth: boolean;
  isTeam: boolean;
  isMain: boolean;
  teamSlug?: string;
}

/**
 * Parse hostname to extract subdomain information
 */
export function parseSubdomain(hostname: string): SubdomainInfo {
  // Handle localhost and IP addresses - treat as main domain to prevent redirects
  if (hostname.includes('local') || hostname.includes('local') || hostname.includes('::1')) {
    return {
      subdomain: null,
      domain: hostname,
      isAuth: false,
      isTeam: false,
      isMain: true,
    };
  }

  const parts = hostname.split('.');
  
  // If we have at least 3 parts (subdomain.domain.tld), extract subdomain
  if (parts.length >= 3) {
    const subdomain = parts[0];
    const domain = parts.slice(1).join('.');
    
    return {
      subdomain,
      domain,
      isAuth: subdomain === 'auth',
      isTeam: subdomain !== 'www' && subdomain !== 'auth',
      isMain: subdomain === 'www' || !subdomain,
      teamSlug: subdomain !== 'www' && subdomain !== 'auth' ? subdomain : undefined,
    };
  }
  
  // No subdomain detected
  return {
    subdomain: null,
    domain: hostname,
    isAuth: false,
    isTeam: false,
    isMain: true,
  };
}

/**
 * Get the appropriate URL for a given path based on subdomain context
 */
export function getSubdomainUrl(path: string, subdomainInfo: SubdomainInfo): string {
  const { domain, isAuth, isTeam, teamSlug } = subdomainInfo;
  
  // For localhost development, include port and use http
  const isLocalhost = domain?.includes('local') ?? false;
  const port = isLocalhost ? ':3032' : '';
  const protocol = isLocalhost ? 'http' : 'https';
  
  if (isAuth) {
    // Auth subdomain - keep auth paths, redirect others to main domain
    if (path.startsWith('/auth/')) {
      return `${protocol}://auth.${domain}${port}${path}`;
    }
    return `${protocol}://${domain}${port}${path}`;
  }
  
  if (isTeam && teamSlug) {
    // Team subdomain - rewrite paths to include team context
    if (path === '/dashboard' || path === '/dashboard/') {
      return `${protocol}://${teamSlug}.${domain}${port}/dashboard`;
    }
    
    if (path.startsWith('/dashboard/') && !path.startsWith('/dashboard/teams/')) {
      return `${protocol}://${teamSlug}.${domain}${port}${path}`;
    }
    
    return `${protocol}://${teamSlug}.${domain}${port}${path}`;
  }
  
  // Main domain - redirect auth to auth subdomain, team paths to team subdomain
  if (path.startsWith('/auth/')) {
    // Clear any existing subdomain and get clean domain
    const cleanDomain = domain.replace(/^[^.]+\./, '').replace(/^www\./, '');
    return `${protocol}://auth.${cleanDomain}${port}${path}`;
  }
  
  if (path.startsWith('/dashboard/teams/')) {
    const pathParts = path.split('/');
    const teamSlugIndex = pathParts.indexOf('teams');
    
    if (teamSlugIndex !== -1 && pathParts[teamSlugIndex + 1]) {
      const pathTeamSlug = pathParts[teamSlugIndex + 1];
      const newPath = path.replace(`/dashboard/teams/${pathTeamSlug}`, '/dashboard');
      // Clear any existing subdomain and get clean domain
      const cleanDomain = domain.replace(/^[^.]+\./, '').replace(/^www\./, '');
      return `${protocol}://${pathTeamSlug}.${cleanDomain}${port}${newPath}`;
    }
  }
  
  return `${protocol}://${domain}${port}${path}`;
}

/**
 * Check if current request is from a team subdomain
 */
export function isTeamRequest(request: Request): boolean {
  const hostname = request.headers.get('host') || '';
  const subdomainInfo = parseSubdomain(hostname);
  return subdomainInfo.isTeam;
}

/**
 * Get team slug from request
 */
export function getTeamSlug(request: Request): string | null {
  const hostname = request.headers.get('host') || '';
  const subdomainInfo = parseSubdomain(hostname);
  return subdomainInfo.teamSlug || null;
}

/**
 * Validate team slug format
 */
export function isValidTeamSlug(slug: string): boolean {
  // Team slugs should be alphanumeric with hyphens, 3-50 characters
  const teamSlugRegex = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/;
  return teamSlugRegex.test(slug) && slug.length >= 3 && slug.length <= 50;
}

/**
 * Get auth subdomain URL for a given path
 * Simplified helper for common auth redirects
 */
export function getAuthUrl(path: string = '/auth/sign-in'): string {
  // Check if we're in browser environment
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    
    // For localhost development
    if (hostname.includes('localhost') || hostname.includes('local')) {
      return `http://auth.wirecrest.local:3032${path}`;
    }
    
    // For production - extract domain from current hostname
    const domain = hostname.replace(/^[^.]+\./, '').replace(/^www\./, '');
    return `https://auth.${domain}${path}`;
  }
  
  // Fallback for server-side
  return `http://auth.wirecrest.local:3032${path}`;
}

/**
 * Get URL for a specific subdomain and path
 * Simplified helper for subdomain redirects
 */
export function getSubdomainUrlForSubdomain(subdomain: string, path: string): string {
  // Check if we're in browser environment
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    
    // For localhost development
    if (hostname.includes('localhost') || hostname.includes('local')) {
      return `http://${subdomain}.wirecrest.local:3032${path}`;
    }
    
    // For production - extract domain from current hostname
    const domain = hostname.replace(/^[^.]+\./, '').replace(/^www\./, '');
    return `https://${subdomain}.${domain}${path}`;
  }
  
  // Fallback for server-side
  return `http://${subdomain}.wirecrest.local:3032${path}`;
}
