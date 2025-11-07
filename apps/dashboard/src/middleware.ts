import { Team, SuperRole } from '@prisma/client';
import { getToken, type JWT } from 'next-auth/jwt';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * JWT token structure for middleware authentication
 * Extends NextAuth JWT with application-specific fields
 */
interface MiddlewareJWT extends JWT {
  superRole?: SuperRole;
  team?: Pick<Team, 'slug'>;
}

const protocol =
  process.env.NODE_ENV === 'production' ? 'https' : 'http';
const rootDomain = process.env.NEXT_PUBLIC_MAIN_DOMAIN || 'wirecrest.local:3032';

/**
 * Validates if a string is a valid subdomain according to RFC 1123
 * @param subdomain - The subdomain string to validate
 * @returns true if valid, false otherwise
 */
function isValidSubdomain(subdomain: string): boolean {
  return /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/i.test(subdomain);
}

/**
 * Extracts and validates the subdomain from the request host header
 * Handles local development, production, and Vercel preview deployments
 * 
 * @param request - The Next.js request object
 * @returns The subdomain string if valid and present, null otherwise
 * 
 * @example
 * // Local: tenant.localhost:3032 -> "tenant"
 * // Production: tenant.wirecrest.com -> "tenant"
 * // Vercel Preview: tenant---branch.vercel.app -> "tenant"
 */
function extractSubdomain(request: NextRequest): string | null {
  const host = request.headers.get('host') || '';
  const hostname = host.split(':')[0];

  // Local development environment
  if (hostname.includes('localhost') || hostname.includes('wirecrest.local')) {
    // Check if it's a subdomain of localhost or wirecrest.local
    if (hostname.includes('.localhost') || hostname.includes('.wirecrest.local')) {
      const parts = hostname.split('.');
      if (parts.length > 1 && parts[0] !== 'www') {
        const subdomain = parts[0];
        return isValidSubdomain(subdomain) ? subdomain : null;
      }
    }
    return null;
  }

  // Production environment
  const rootDomainFormatted = rootDomain.split(':')[0];

  // Handle preview deployment URLs (tenant---branch-name.vercel.app)
  if (hostname.includes('---') && hostname.endsWith('.vercel.app')) {
    const parts = hostname.split('---');
    const subdomain = parts.length > 0 ? parts[0] : null;
    return subdomain && isValidSubdomain(subdomain) ? subdomain : null;
  }

  // Regular subdomain detection
  const isSubdomain =
    hostname !== rootDomainFormatted &&
    hostname !== `www.${rootDomainFormatted}` &&
    hostname.endsWith(`.${rootDomainFormatted}`);

  if (isSubdomain) {
    const subdomain = hostname.replace(`.${rootDomainFormatted}`, '');
    return isValidSubdomain(subdomain) ? subdomain : null;
  }

  return null;
}

/**
 * Next.js middleware for subdomain-based routing and authentication
 * 
 * Handles routing logic for:
 * - admin.domain.com -> Super admin dashboard
 * - auth.domain.com -> Authentication pages
 * - tenant.domain.com -> Tenant-specific dashboard
 * - domain.com -> Public landing pages
 * 
 * @param request - The Next.js request object
 * @returns NextResponse with appropriate routing/rewrite logic
 */
export async function middleware(request: NextRequest) {
  const url = request.nextUrl.clone();
  const { pathname } = request.nextUrl;
  const subdomain = extractSubdomain(request);

  if (subdomain) {
    if (subdomain === 'admin') {
      if (pathname.startsWith('/auth') || pathname.startsWith('/dashboard')) {
        return new NextResponse('Not Found', { status: 404 });
      }
      
      if (pathname === '/') {
        url.pathname = '/dashboard/superadmin';
      } else if (pathname === '/dashboard' || pathname === '/dashboard/') {
        return NextResponse.redirect(new URL(`${protocol}://admin.${rootDomain}/`, request.url));
      } else if (pathname.startsWith('/dashboard/')) {
        const pathAfterDashboard = pathname.replace('/dashboard', '');
        url.pathname = `/dashboard/superadmin${pathAfterDashboard}`;
      } else {
        url.pathname = `/dashboard/superadmin${pathname}`;
      }
      return NextResponse.rewrite(url);
    }

    if (subdomain === 'auth') {
      // Prevent nested auth or dashboard paths
      if (pathname.startsWith('/auth') || pathname.startsWith('/dashboard')) {
        return new NextResponse('Not Found', { status: 404 });
      }
      
      // Validate required environment variable
      if (!process.env.NEXTAUTH_SECRET) {
        console.error('NEXTAUTH_SECRET is not defined');
        return new NextResponse('Server configuration error', { status: 500 });
      }

      try {
        const token = await getToken({ 
          req: request, 
          secret: process.env.NEXTAUTH_SECRET 
        }) as MiddlewareJWT | null;

        // If user is authenticated, redirect them away from auth subdomain
        if (token) {
          const { superRole, team } = token;
          
          // Super admin users go to admin subdomain
          if (superRole === 'ADMIN') {
            return NextResponse.redirect(
              new URL(`${protocol}://admin.${rootDomain}/`, request.url)
            );
          }
          
          // Tenant users go to their team's subdomain
          if (team?.slug && isValidSubdomain(team.slug)) {
            return NextResponse.redirect(
              new URL(`${protocol}://${team.slug}.${rootDomain}/`, request.url)
            );
          }
          
          // Fallback: redirect authenticated users without team to main domain
          return NextResponse.redirect(
            new URL(`${protocol}://${rootDomain}/`, request.url)
          );
        }
      } catch (error) {
        console.error('Error retrieving token:', error);
        // Continue to auth page on token retrieval failure
      }
      
      // No token or error - serve auth pages
      url.pathname = `/auth${pathname}`;
      return NextResponse.rewrite(url);
    }

    return pathname === '/'
      ? NextResponse.rewrite(new URL(`/dashboard/teams/${subdomain}`, request.url))
      : NextResponse.rewrite(new URL(`/dashboard/teams/${subdomain}${pathname}`, request.url));
  }

  if (pathname.startsWith('/dashboard')) {
    return new NextResponse('Not Found', { status: 404 });
  }

  if (pathname.startsWith('/auth/') && pathname !== '/auth') {
    const pathAfterAuth = pathname.split('/auth')[1];
    return NextResponse.redirect(new URL(`${protocol}://auth.${rootDomain}${pathAfterAuth}`, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all paths except for:
     * 1. /api routes
     * 2. /_next (Next.js internals)
     * 3. all root files inside /public (e.g. /favicon.ico)
     */
    '/((?!api|_next|[\\w-]+\\.\\w+).*)'
  ]
};