# Subdomain Routing Implementation

This implementation provides subdomain-based routing for multi-tenant applications using Next.js middleware and React context.

## Architecture Overview

### Subdomain Structure
- `auth.domain.com` - Authentication routes (`/auth/*`)
- `team-slug.domain.com` - Team-specific routes (maps to `/dashboard/teams/[slug]`)
- `domain.com` - Main application routes

### Key Components

#### 1. Middleware (`middleware.ts`)
- Handles subdomain detection and routing
- Redirects auth routes to `auth.domain.com`
- Redirects team routes to `team-slug.domain.com`
- Manages path rewriting for subdomain contexts

#### 2. Subdomain Utilities (`src/lib/subdomain.ts`)
- `parseSubdomain()` - Extract subdomain information from hostname
- `getSubdomainUrl()` - Generate appropriate URLs based on subdomain context
- `isTeamRequest()` - Check if request is from team subdomain
- `getTeamSlug()` - Extract team slug from request

#### 3. React Hooks (`src/hooks/use-subdomain.ts`)
- `useSubdomain()` - Get subdomain information on client side
- `useTeamSlug()` - Get current team slug
- `useIsAuthSubdomain()` - Check if on auth subdomain
- `useIsTeamSubdomain()` - Check if on team subdomain

#### 4. Team Context (`src/contexts/tenant-context.tsx`)
- `TeamProvider` - Provides team context to React components
- `useTeam()` - Access team information in components
- Legacy exports for backward compatibility

#### 5. Subdomain Redirect Component (`src/components/subdomain-redirect.tsx`)
- Handles client-side redirects based on subdomain context
- Ensures proper routing between subdomains

## Usage Examples

### Basic Team Context Usage
```tsx
import { useTeam } from '@/contexts/tenant-context';

function MyComponent() {
  const { teamSlug, isTeamSubdomain } = useTeam();
  
  if (isTeamSubdomain) {
    return <div>Team: {teamSlug}</div>;
  }
  
  return <div>Main application</div>;
}
```

### API Route with Team Validation
```tsx
import { withTeamValidation, createTeamResponse } from '@/lib/tenant-api';

async function handler(request: NextRequest, teamSlug: string) {
  // Your team-specific logic here
  const data = { team: teamSlug };
  return NextResponse.json(createTeamResponse(data, teamSlug));
}

export const GET = withTeamValidation(handler);
```

### Manual Team Detection
```tsx
import { useTeamSlug, useIsTeamSubdomain } from '@/hooks/use-subdomain';

function TeamIndicator() {
  const teamSlug = useTeamSlug();
  const isTeamSubdomain = useIsTeamSubdomain();
  
  if (isTeamSubdomain && teamSlug) {
    return <span>Current team: {teamSlug}</span>;
  }
  
  return null;
}
```

## URL Mapping

### Auth Subdomain (`auth.domain.com`)
- `/auth/signin` → `auth.domain.com/auth/signin`
- `/auth/signout` → `auth.domain.com/auth/signout`
- `/dashboard` → Redirects to `domain.com/dashboard`

### Team Subdomain (`team-slug.domain.com`)
- `/dashboard` → `team-slug.domain.com/dashboard` (maps to `/dashboard/teams/team-slug`)
- `/dashboard/settings` → `team-slug.domain.com/dashboard/settings` (maps to `/dashboard/teams/team-slug/settings`)
- `/auth/signin` → Redirects to `auth.domain.com/auth/signin`

### Main Domain (`domain.com`)
- `/auth/signin` → Redirects to `auth.domain.com/auth/signin`
- `/dashboard/teams/team-slug` → Redirects to `team-slug.domain.com/dashboard`
- `/dashboard` → Shows team selection or redirects to appropriate team

## Configuration

### Environment Variables
```env
NEXT_PUBLIC_MAIN_DOMAIN=yourdomain.com
```

### Reserved Subdomains
The following subdomains are reserved and cannot be used as team slugs:
- `www`, `auth`, `api`, `admin`, `app`, `dashboard`
- `mail`, `ftp`, `blog`, `support`, `help`, `docs`
- `status`, `cdn`, `assets`, `static`, `media`
- `images`, `files`, `uploads`

### Team Slug Validation
- 3-50 characters
- Lowercase letters, numbers, and hyphens only
- Cannot start or end with hyphen
- Must not be a reserved subdomain

## Development Setup

### Local Development
For local development, you can use:
- `wirecrest.local:3032` - Main domain
- `auth.wirecrest.local:3032` - Auth subdomain
- `team-slug.wirecrest.local:3032` - Team subdomain

### Production Setup
1. Configure DNS to point subdomains to your application
2. Set up SSL certificates for all subdomains
3. Configure your hosting platform to handle subdomain routing

## Security Considerations

1. **Team Isolation**: Each team subdomain is isolated from others
2. **Auth Separation**: Authentication is handled on a separate subdomain
3. **Path Validation**: Middleware validates and redirects paths appropriately
4. **Team Slug Validation**: Strict validation prevents reserved subdomain conflicts

## Troubleshooting

### Common Issues

1. **Infinite Redirects**: Check middleware logic for redirect loops
2. **Team Context Not Available**: Ensure `TeamProvider` wraps your components
3. **Subdomain Not Detected**: Verify hostname parsing in development
4. **API Routes Not Working**: Check team validation middleware

### Debug Tools

```tsx
// Debug subdomain information
import { useSubdomain } from '@/hooks/use-subdomain';

function DebugInfo() {
  const subdomainInfo = useSubdomain();
  console.log('Subdomain Info:', subdomainInfo);
  return null;
}
```

## Migration from Existing Routes

If you have existing routes that need to be migrated to subdomain routing:

1. Update your middleware to handle the new routing logic
2. Wrap your app with `TeamProvider` and `SubdomainRedirect`
3. Update API routes to use team validation
4. Test all redirect scenarios
5. Update any hardcoded URLs to use the new subdomain structure
