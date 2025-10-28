/**
 * Token generation utilities for server-side use
 * Uses Node.js crypto (server-side only)
 */

import * as crypto from 'crypto';

export function generateToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export function generateSecureToken(): string {
  return crypto.randomBytes(64).toString('hex');
}
