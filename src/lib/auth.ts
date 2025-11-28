import { randomBytes } from 'crypto'

// Re-export client-safe constants for backwards compatibility
export { SESSION_COOKIE_NAME, SESSION_COOKIE_OPTIONS } from './auth.shared'

const SESSION_TOKEN_LENGTH = 32
const SESSION_EXPIRY_DAYS = 7

/**
 * Hash a password using Bun's built-in Argon2id implementation
 */
export async function hashPassword(password: string): Promise<string> {
  return await Bun.password.hash(password, {
    algorithm: 'argon2id',
    memoryCost: 19456, // 19 MiB
    timeCost: 2,
  })
}

/**
 * Verify a password against a hash
 */
export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return await Bun.password.verify(password, hash)
}

/**
 * Generate a cryptographically secure session token
 */
export function generateSessionToken(): string {
  return randomBytes(SESSION_TOKEN_LENGTH).toString('base64url')
}

/**
 * Generate a unique ID (UUIDv4)
 */
export function generateId(): string {
  return crypto.randomUUID()
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

/**
 * Get current ISO timestamp
 */
export function now(): string {
  return new Date().toISOString()
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

// Import session repository dynamically to avoid circular dependencies
// This function creates a session and returns the session data
export async function createSession(userId: string) {
  const { sessionRepository } = await import('@/repositories/session.repository')

  const token = generateSessionToken()
  const expiresAt = getSessionExpiry()

  const session = await sessionRepository.create({
    userId,
    token,
    expiresAt,
  })

  return session
}

