/**
 * Auth Utilities
 *
 * Standalone authentication utility functions.
 * Separated from auth.ts to avoid triggering Better Auth initialization.
 */

import { randomBytes } from 'crypto'

// =============================================================================
// CONSTANTS
// =============================================================================

const SESSION_TOKEN_LENGTH = 32
const SESSION_EXPIRY_DAYS = 7

// =============================================================================
// PASSWORD UTILITIES (re-exported from password.ts)
// =============================================================================

export { hashPassword, verifyPassword } from './password'

// =============================================================================
// ID & TOKEN GENERATION
// =============================================================================

/**
 * Generate a unique ID (UUIDv4)
 * Uses Web Crypto API which is available in both browsers and Node.js
 */
export function generateId(): string {
  return crypto.randomUUID()
}

/**
 * Generate a cryptographically secure session token
 */
export function generateSessionToken(): string {
  return randomBytes(SESSION_TOKEN_LENGTH).toString('base64url')
}

/**
 * Generate a cryptographically secure token of specified length
 * Used for invitation codes, password reset tokens, etc.
 */
export function generateToken(length: number = 32): string {
  // Calculate bytes needed for the desired character length in base64url
  const bytesNeeded = Math.ceil((length * 3) / 4)
  return randomBytes(bytesNeeded).toString('base64url').slice(0, length)
}

// =============================================================================
// TIMESTAMP UTILITIES
// =============================================================================

/**
 * Get current ISO timestamp
 */
export function now(): string {
  return new Date().toISOString()
}

/**
 * Calculate session expiry timestamp
 */
export function getSessionExpiry(days: number = SESSION_EXPIRY_DAYS): string {
  const expiry = new Date()
  expiry.setDate(expiry.getDate() + days)
  return expiry.toISOString()
}

/**
 * Check if a session has expired
 */
export function isSessionExpired(expiresAt: string): boolean {
  return new Date(expiresAt) < new Date()
}
