import { NextRequest } from 'next/server';

import { getTeamSlug, isValidTeamSlug } from './subdomain';

/**
 * Get team slug from request headers or subdomain
 */
export function getTeamFromRequest(request: NextRequest): string | null {
  // First try to get from subdomain
  const subdomainTeam = getTeamSlug(request);
  if (subdomainTeam && isValidTeamSlug(subdomainTeam)) {
    return subdomainTeam;
  }

  // Fallback to header
  const headerTeam = request.headers.get('x-team-slug');
  if (headerTeam && isValidTeamSlug(headerTeam)) {
    return headerTeam;
  }

  // Fallback to query parameter
  const queryTeam = request.nextUrl.searchParams.get('team');
  if (queryTeam && isValidTeamSlug(queryTeam)) {
    return queryTeam;
  }

  return null;
}

/**
 * Validate team access for API routes
 */
export function validateTeamAccess(request: NextRequest, requiredTeam?: string): string | null {
  const teamSlug = getTeamFromRequest(request);
  
  if (!teamSlug) {
    return null;
  }

  if (requiredTeam && teamSlug !== requiredTeam) {
    return null;
  }

  return teamSlug;
}

/**
 * Create team-specific API response
 */
export function createTeamResponse(data: any, teamSlug: string) {
  return {
    ...data,
    team: teamSlug,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Middleware for team-specific API routes
 */
export function withTeamValidation(handler: (request: NextRequest, teamSlug: string) => Promise<Response>) {
  return async (request: NextRequest) => {
    const teamSlug = getTeamFromRequest(request);
    
    if (!teamSlug) {
      return new Response(
        JSON.stringify({ error: 'Team not specified' }), 
        { 
          status: 400, 
          headers: { 'Content-Type': 'application/json' } 
        }
      );
    }

    if (!isValidTeamSlug(teamSlug)) {
      return new Response(
        JSON.stringify({ error: 'Invalid team slug' }), 
        { 
          status: 400, 
          headers: { 'Content-Type': 'application/json' } 
        }
      );
    }

    return handler(request, teamSlug);
  };
}

// Legacy exports for backward compatibility
export const getTenantFromRequest = getTeamFromRequest;
export const validateTenantAccess = validateTeamAccess;
export const createTenantResponse = createTeamResponse;
export const withTenantValidation = withTeamValidation;
