/**
 * Authentication middleware for scraper service
 * Extracts JWT token from cookies or Authorization header and validates it
 */

import { Request, Response, NextFunction } from 'express';
// import { getSession, requireAuth, requireAdmin } from '@wirecrest/auth-core';
import { getSession, requireAuth, requireAdmin } from '@wirecrest/auth-core';
import { SuperRole } from '@prisma/client';

/**
 * Extract JWT token from request
 * For scraper service, we only support Bearer token from Authorization header
 */
function extractToken(req: Request): string | undefined {
  // Get Bearer token from Authorization header
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  return undefined;
}

/**
 * Attach token to request for use in route handlers
 */
function attachTokenToRequest(req: Request, token: string): void {
  (req as any).authToken = token;
}

/**
 * Basic authentication middleware
 * Validates JWT token and sets user in request
 */
export async function authenticate(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const token = extractToken(req);
    
    if (!token) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    // Attach token to request for use in route handlers
    attachTokenToRequest(req, token);

    const session = await getSession(token);
    
    if (!session || !session.user) {
      res.status(401).json({ error: 'Invalid session' });
      return;
    }

    // Attach user to request
    (req as any).user = session.user;
    (req as any).session = session;
    
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(401).json({ error: 'Authentication failed' });
  }
}

/**
 * Admin authentication middleware
 * Requires admin role
 */
export async function requireAdminAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const token = extractToken(req);
    
    if (!token) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    // Attach token to request for use in route handlers
    attachTokenToRequest(req, token);

    const session = await requireAdmin(token);
    
    // Attach user to request
    (req as any).user = session.user;
    (req as any).session = session;
    
    next();
  } catch (error) {
    console.error('Admin authentication error:', error);
    res.status(403).json({ error: 'Admin access required' });
  }
}

/**
 * Team authentication middleware
 * Validates user has access to the specified team
 */
export async function requireTeamAccess(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const token = extractToken(req);
    const { teamId } = req.params;
    
    if (!token) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    if (!teamId) {
      res.status(400).json({ error: 'Team ID required' });
      return;
    }

    // Attach token to request for use in route handlers
    attachTokenToRequest(req, token);

    const session = await requireAuth(token);
    
    // Check if user has access to this team
    if (session.user.teamId !== teamId && session.user.superRole !== SuperRole.ADMIN) {
      res.status(403).json({ error: 'Access denied to this team' });
      return;
    }

    // Attach user to request
    (req as any).user = session.user;
    (req as any).session = session;
    
    next();
  } catch (error) {
    console.error('Team access authentication error:', error);
    res.status(401).json({ error: 'Authentication failed' });
  }
}
