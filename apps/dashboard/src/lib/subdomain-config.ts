/**
 * Subdomain configuration for multi-tenant setup
 */

export const SUBDOMAIN_CONFIG = {
  // Main domain (where the app is hosted)
  mainDomain: process.env.NEXT_PUBLIC_MAIN_DOMAIN || 'wirecrest.local:3032',
  
  // Auth subdomain
  authSubdomain: 'auth',
  
  // Reserved subdomains that should not be used as team slugs
  reservedSubdomains: [
    'www',
    'auth',
    'api',
    'admin',
    'app',
    'dashboard',
    'mail',
    'ftp',
    'blog',
    'support',
    'help',
    'docs',
    'status',
    'cdn',
    'assets',
    'static',
    'media',
    'images',
    'files',
    'uploads',
  ],
  
  // Team slug validation rules
  teamSlugRules: {
    minLength: 3,
    maxLength: 50,
    pattern: /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/,
    // Cannot start or end with hyphen
    // Can only contain lowercase letters, numbers, and hyphens
  },
  
  // URL patterns for different subdomains
  urlPatterns: {
    auth: {
      allowedPaths: ['/auth/*'],
      redirectTo: 'main',
    },
    team: {
      allowedPaths: ['/dashboard/*', '/api/tenant/*'],
      redirectTo: 'main',
    },
    main: {
      allowedPaths: ['/*'],
      redirectAuthTo: 'auth',
      redirectTeamTo: 'team',
    },
  },
};

/**
 * Check if a subdomain is reserved
 */
export function isReservedSubdomain(subdomain: string): boolean {
  return SUBDOMAIN_CONFIG.reservedSubdomains.includes(subdomain.toLowerCase());
}

/**
 * Validate team slug
 */
export function validateTeamSlug(slug: string): { valid: boolean; error?: string } {
  const { minLength, maxLength, pattern } = SUBDOMAIN_CONFIG.teamSlugRules;
  
  if (slug.length < minLength) {
    return { valid: false, error: `Team slug must be at least ${minLength} characters` };
  }
  
  if (slug.length > maxLength) {
    return { valid: false, error: `Team slug must be no more than ${maxLength} characters` };
  }
  
  if (!pattern.test(slug)) {
    return { valid: false, error: 'Team slug can only contain lowercase letters, numbers, and hyphens' };
  }
  
  if (isReservedSubdomain(slug)) {
    return { valid: false, error: 'This subdomain is reserved' };
  }
  
  return { valid: true };
}

/**
 * Get the full domain for a subdomain
 */
export function getSubdomainUrl(subdomain: string, path: string = ''): string {
  const domain = SUBDOMAIN_CONFIG.mainDomain;
  
  // For localhost development, use http
  const isLocalhost = domain.includes('local');
  const protocol = isLocalhost ? 'http' : 'https';
  
  if (subdomain === 'main') {
    return `${protocol}://${domain}${path}`;
  }
  
  return `${protocol}://${subdomain}.${domain}${path}`;
}

/**
 * Get the main domain URL
 */
export function getMainDomainUrl(path: string = ''): string {
  return getSubdomainUrl('main', path);
}

/**
 * Get the auth subdomain URL
 */
export function getAuthDomainUrl(path: string = ''): string {
  return getSubdomainUrl(SUBDOMAIN_CONFIG.authSubdomain, path);
}

/**
 * Get the team subdomain URL
 */
export function getTeamDomainUrl(teamSlug: string, path: string = ''): string {
  return getSubdomainUrl(teamSlug, path);
}
