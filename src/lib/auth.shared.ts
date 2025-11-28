/**
 * Client-safe auth constants
 * This file can be safely imported in both client and server code
 */

const SESSION_EXPIRY_DAYS = 7

/**
 * Cookie configuration for session tokens
 */
export const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge: 60 * 60 * 24 * SESSION_EXPIRY_DAYS, // 7 days in seconds
}

export const SESSION_COOKIE_NAME = 'session_token'
