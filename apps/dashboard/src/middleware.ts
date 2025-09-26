import { type NextRequest, NextResponse } from 'next/server';
import { auth } from '@wirecrest/auth/server';
import { SuperRole } from '@prisma/client';

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
  const url = request.nextUrl.clone(); // Clone to safely modify without side effects
  const { pathname } = request.nextUrl;

  // Safely retrieve user session data from cookies
  let session = null;

  const subdomain = extractSubdomain(request);
  
  // Debug logging (this should always run if the middleware is triggered)
  console.log('Middleware debug:', {
    host: request.headers.get('host'),
    pathname,
    subdomain,
    url: request.url,
    rewritePath: subdomain === 'admin' ? (pathname === '/' ? '/dashboard/superadmin' : `/dashboard/superadmin${pathname}`) : null
  });

  if (subdomain) {
    if (subdomain === 'admin') {
      if (pathname.startsWith('/auth') || pathname.startsWith('/dashboard')) {
        return new NextResponse('Not Found', { status: 404 });
      }
      try {
        session = await auth();
      } catch (error) {
        console.log('Auth session error:', error);
        // Continue without session if auth fails
      }
      // Rewrite admin subdomain to superadmin dashboard
      if (pathname === '/') {
        url.pathname = '/dashboard/superadmin';
      } else if (pathname === '/dashboard' || pathname === '/dashboard/') {
        // Handle /dashboard path on admin subdomain - redirect to root
        return NextResponse.redirect(new URL(`${protocol}://admin.${rootDomain}/`, request.url));
      } else if (pathname.startsWith('/dashboard/')) {
        // Handle /dashboard/* paths - rewrite to /dashboard/superadmin/*
        const pathAfterDashboard = pathname.replace('/dashboard', '');
        url.pathname = `/dashboard/superadmin${pathAfterDashboard}`;
      } else {
        // Handle other paths - rewrite to /dashboard/superadmin/*
        url.pathname = `/dashboard/superadmin${pathname}`;
      }
      return NextResponse.rewrite(url);
    }

    if (subdomain === 'auth') {
      if (pathname.startsWith('/auth') || pathname.startsWith('/dashboard')) {
        return new NextResponse('Not Found', { status: 404 });
      }
      try {
        session = await auth();
      } catch (error) {
        console.log('Auth session error:', error);
        // Continue without session if auth fails
      }
      // Handle post-authentication redirects from auth subdomain
      if (session?.user?.id) {
        // User is authenticated, redirect based on role
        if (session.user.superRole === SuperRole.ADMIN) {
          // Super admin should go to admin subdomain
          return NextResponse.redirect(new URL(`${protocol}://admin.${rootDomain}/`, request.url));
        } else if (session.user.team.slug) {
          // Regular user should go to their team subdomain
          return NextResponse.redirect(new URL(`${protocol}://${session.user.team.slug}.${rootDomain}/`, request.url));
        } else {
          // User has no team, redirect to main domain or show error
          return NextResponse.redirect(new URL(`${protocol}://${rootDomain}/`, request.url));
        }
      }
      
      // Not authenticated, show auth pages
      url.pathname = `/auth${pathname}`;
      return NextResponse.rewrite(url);
    }

    // For other subdomains (team subdomains), rewrite to team dashboard
    if (pathname === '/') {
      return NextResponse.rewrite(new URL(`/dashboard/teams/${subdomain}`, request.url));
    } else {
      // Handle all other paths for team subdomains
      return NextResponse.rewrite(new URL(`/dashboard/teams/${subdomain}${pathname}`, request.url));
    }
  }

  // Handle authenticated users on main domain - redirect to appropriate subdomain
if (session?.user?.id && (subdomain === 'auth')) {
  if (session.user.superRole === SuperRole.ADMIN) {
    return NextResponse.redirect(new URL(`${protocol}://admin.${rootDomain}/`, request.url));
  } else if (session.user.team.slug) {
    return NextResponse.redirect(new URL(`${protocol}://${session.user.team.slug}.${rootDomain}/`, request.url));
  }
}

  // Block direct access to /dashboard paths on main domain
  if (pathname.startsWith('/dashboard')) {
    return new NextResponse('Not Found', { status: 404 });
  }

  if (pathname.startsWith('/dashboard/superadmin')) {
    let pathAfterSuperadmin = pathname.split('/dashboard/superadmin')[1];
    if (pathAfterSuperadmin && pathAfterSuperadmin !== '') {
      if (session?.user?.superRole !== SuperRole.ADMIN) {
      return NextResponse.redirect(new URL(`${protocol}://admin.${rootDomain}${pathAfterSuperadmin}`, request.url));
      }
    }
  }

  if (pathname.startsWith('/auth')) {
    let pathAfterAuth = pathname.split('/auth')[1];
    if (pathAfterAuth && pathAfterAuth !== '') {
      return NextResponse.redirect(new URL(`${protocol}://auth.${rootDomain}${pathAfterAuth}`, request.url));
    }
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