import { getToken } from 'next-auth/jwt';
import { NextResponse, type NextRequest } from 'next/server';
import type { SuperRole } from '@prisma/client';

const protocol =
  process.env.NODE_ENV === 'production' ? 'https' : 'http';
const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'wirecrest.local:3032';

function extractSubdomain(request: NextRequest): string | null {
  const host = request.headers.get('host') || '';
  const hostname = host.split(':')[0];

  // Local development environment
  if (hostname.includes('localhost') || hostname.includes('wirecrest.local')) {
    // Check if it's a subdomain of localhost or wirecrest.local
    if (hostname.includes('.localhost') || hostname.includes('.wirecrest.local')) {
      const parts = hostname.split('.');
      if (parts.length > 1 && parts[0] !== 'www') {
        return parts[0];
      }
    }
    return null;
  }

  // Production environment
  const rootDomainFormatted = rootDomain.split(':')[0];

  // Handle preview deployment URLs (tenant---branch-name.vercel.app)
  if (hostname.includes('---') && hostname.endsWith('.vercel.app')) {
    const parts = hostname.split('---');
    return parts.length > 0 ? parts[0] : null;
  }

  // Regular subdomain detection
  const isSubdomain =
    hostname !== rootDomainFormatted &&
    hostname !== `www.${rootDomainFormatted}` &&
    hostname.endsWith(`.${rootDomainFormatted}`);

  return isSubdomain ? hostname.replace(`.${rootDomainFormatted}`, '') : null;
}

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
      if (pathname.startsWith('/auth') || pathname.startsWith('/dashboard')) {
        return new NextResponse('Not Found', { status: 404 });
      }
      
      const token = await getToken({ 
        req: request, 
        secret: process.env.NEXTAUTH_SECRET 
      });
      
      if (token?.sub) {
        if (token.superRole === 'ADMIN') {
          return NextResponse.redirect(new URL(`${protocol}://admin.${rootDomain}/`, request.url));
        } else if (token.team?.slug) {
          return NextResponse.redirect(new URL(`${protocol}://${token.team.slug}.${rootDomain}/`, request.url));
        } else {
          return NextResponse.redirect(new URL(`${protocol}://${rootDomain}/`, request.url));
        }
      }
      
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

export const runtime = 'edge';

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