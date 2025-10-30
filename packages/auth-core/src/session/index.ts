/**
 * Server-side session management for auth-core
 * Provides JWT verification for server-side contexts (Express, Scraper, etc.)
 * 
 * NOTE: For Next.js/Edge Runtime, use NextAuth's auth() function directly
 * NextAuth v5 handles crypto compatibility internally
 */

import { prisma } from '@wirecrest/db';
import { SuperRole } from '@prisma/client';
// Use dynamic import to support CJS consumers (jose is ESM-only)
type JwtVerifyFn = (token: string | Uint8Array, key: unknown) => Promise<{ payload: any }>;
let jwtVerifyLoader: Promise<JwtVerifyFn> | null = null;
async function getJwtVerify(): Promise<JwtVerifyFn> {
  if (!jwtVerifyLoader) {
    jwtVerifyLoader = import('jose').then((m: any) => m.jwtVerify as JwtVerifyFn);
  }
  return jwtVerifyLoader;
}

export interface SessionUser {
  id: string;
  email: string;
  name?: string | null;
  image?: string | null;
  role?: string;
  superRole?: SuperRole;
  teamId?: string;
  team?: {
    id: string;
    name: string;
    slug: string;
  };
}

export interface Session {
  user: SessionUser;
  accessToken?: string;
}

interface JWTPayload {
  sub?: string;
  userId?: string;
  exp?: number;
  iat?: number;
  role?: string;
  superRole?: SuperRole;
  teamId?: string;
  team?: {
    id: string;
    name: string;
    slug: string;
  };
  [key: string]: unknown;
}

interface JWTHeader {
  alg: string;
  typ: string;
  [key: string]: unknown;
}

interface DecodedJWT {
  header: JWTHeader;
  payload: JWTPayload;
  signature: string;
}

/**
 * Get session from JWT token or database session
 * This mimics NextAuth's auth() function but works without Next.js
 */
function isValidUserId(userId: unknown): userId is string {
  return typeof userId === 'string' && userId.length > 0;
}

/**
 * Retrieves a session from a JWT token.
 * Adds debug logs for tracing execution and potential issues.
 */
export async function getSession(token?: string): Promise<Session | null> {
  console.debug("[getSession] Getting session for token:", token);
  if (!token) {
    console.debug("[getSession] No token provided.");
    return null;
  }
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) {
    console.debug("[getSession] NEXTAUTH_SECRET is not set in environment variables.");
    return null;
  }

  let payload: JWTPayload;
  try {
    const encoder = new TextEncoder();
    const key = encoder.encode(secret);
    const jwtVerify = await getJwtVerify();
    const result = await jwtVerify(token, key);
    payload = result.payload as JWTPayload;
    console.debug("[getSession] JWT verified. Payload:", payload);
  } catch (error) {
    console.warn("[getSession] Failed to verify JWT token.", { error });
    return null; // invalid token
  }

  // build session user
  const userId = payload.sub || payload.userId;
  if (!userId) {
    console.debug("[getSession] No valid userId in JWT payload.", { payload });
    return null;
  }

  const sessionUser: SessionUser = {
    id: userId,
    email: (payload as any).email || "",
    name: (payload as any).name || null,
    image: (payload as any).picture || null,
    role: payload.role,
    superRole: payload.superRole,
    teamId: payload.teamId,
    team: payload.team
      ? {
          id: payload.team.id,
          name: payload.team.name,
          slug: payload.team.slug,
        }
      : undefined,
  };

  console.debug("[getSession] Session user built:", sessionUser);

  return { user: sessionUser };
}


function isValidJWTStructure(token: string): token is string {
  return typeof token === 'string' && token.split('.').length === 3;
}

function isJWTHeader(header: unknown): header is JWTHeader {
  return (
    typeof header === 'object' &&
    header !== null &&
    'alg' in header &&
    'typ' in header &&
    typeof (header as JWTHeader).alg === 'string' &&
    typeof (header as JWTHeader).typ === 'string'
  );
}

function isJWTPayload(payload: unknown): payload is JWTPayload {
  return (
    typeof payload === 'object' &&
    payload !== null &&
    (typeof (payload as JWTPayload).sub === 'string' ||
      typeof (payload as JWTPayload).userId === 'string')
  );
}

function decodeJWT(token: string): DecodedJWT | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }

    const [headerEncoded, payloadEncoded, signature] = parts;
    
    const header = JSON.parse(Buffer.from(headerEncoded, 'base64url').toString());
    const payload = JSON.parse(Buffer.from(payloadEncoded, 'base64url').toString());

    if (!isJWTHeader(header) || !isJWTPayload(payload)) {
      return null;
    }

    return {
      header,
      payload,
      signature
    };
  } catch {
    return null;
  }
}


export async function verifyJWTSignature(token: string, secret: string) {
  try {
    const encoder = new TextEncoder();
    const key = encoder.encode(secret);
    const jwtVerify = await getJwtVerify();
    await jwtVerify(token, key);
    return true;
  } catch (error) {
    console.error('verifyJWTSignature: Error verifying JWT signature - temp: verifyJWTSignature', error);
    return false;
  }
}

function isTokenExpired(payload: JWTPayload): boolean {
  if (!payload.exp) {
    return false;
  }
  return payload.exp < Math.floor(Date.now() / 1000);
}

/**
 * Require authentication - throws if not authenticated
 */
export async function requireAuth(token?: string): Promise<Session> {
  if (!token || typeof token !== 'string') {
    throw new Error('Unauthorized: Authentication required - temp: requireAuth');
  }

  const session = await getSession(token);
  if (!session || !session.user || !session.user.id || !session.user.email) {
    throw new Error(`Unauthorized: Authentication required - temp: session: ${JSON.stringify(session)}`);
  }
  
  return session;
}

/**
 * Require admin privileges - throws if not admin
 */
export async function requireAdmin(token?: string): Promise<Session> {
  const session = await requireAuth(token);
  
  if (!session.user.superRole || session.user.superRole !== SuperRole.ADMIN) {
    throw new Error('Unauthorized: Admin access required');
  }
  
  return session;
}

/**
 * Check if user has specific role
 */
export function hasRole(user: SessionUser, role: SuperRole): boolean {
  return user.superRole === role;
}

/**
 * Check if user is admin
 */
export function isAdmin(user: SessionUser): boolean {
  return hasRole(user, SuperRole.ADMIN);
}

/**
 * Check if user is support
 */
export function isSupport(user: SessionUser): boolean {
  return hasRole(user, SuperRole.SUPPORT);
}

export function isTenant(user: SessionUser): boolean {
  return user.superRole === SuperRole.TENANT;
}
