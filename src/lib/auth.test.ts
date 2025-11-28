import { describe, it, expect } from 'bun:test'
import {
  hashPassword,
  verifyPassword,
  generateSessionToken,
  generateId,
  getSessionExpiry,
  isSessionExpired,
  now,
} from './auth'

describe('auth utilities', () => {
  describe('hashPassword', () => {
    it('should hash a password', async () => {
      const password = 'testPassword123'
      const hash = await hashPassword(password)

      expect(hash).toBeDefined()
      expect(hash).not.toBe(password)
      expect(hash.length).toBeGreaterThan(0)
    })

    it('should produce different hashes for the same password', async () => {
      const password = 'testPassword123'
      const hash1 = await hashPassword(password)
      const hash2 = await hashPassword(password)

      expect(hash1).not.toBe(hash2)
    })
  })

  describe('verifyPassword', () => {
    it('should verify a correct password', async () => {
      const password = 'testPassword123'
      const hash = await hashPassword(password)

      const isValid = await verifyPassword(password, hash)
      expect(isValid).toBe(true)
    })

    it('should reject an incorrect password', async () => {
      const password = 'testPassword123'
      const wrongPassword = 'wrongPassword'
      const hash = await hashPassword(password)

      const isValid = await verifyPassword(wrongPassword, hash)
      expect(isValid).toBe(false)
    })
  })

  describe('generateSessionToken', () => {
    it('should generate a unique token', () => {
      const token1 = generateSessionToken()
      const token2 = generateSessionToken()

      expect(token1).toBeDefined()
      expect(token2).toBeDefined()
      expect(token1).not.toBe(token2)
    })

    it('should generate a token of appropriate length', () => {
      const token = generateSessionToken()
      // Base64url encoded 32 bytes should be ~43 characters
      expect(token.length).toBeGreaterThan(40)
    })
  })

  describe('generateId', () => {
    it('should generate a valid UUID', () => {
      const id = generateId()
      // UUID format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      expect(id).toMatch(uuidRegex)
    })

    it('should generate unique IDs', () => {
      const id1 = generateId()
      const id2 = generateId()
      expect(id1).not.toBe(id2)
    })
  })

  describe('getSessionExpiry', () => {
    it('should return a future date', () => {
      const expiry = getSessionExpiry()
      const now = new Date()
      const expiryDate = new Date(expiry)

      expect(expiryDate.getTime()).toBeGreaterThan(now.getTime())
    })

    it('should default to 7 days from now', () => {
      const expiry = getSessionExpiry()
      const now = new Date()
      const expiryDate = new Date(expiry)

      // Should be approximately 7 days (604800000 ms)
      const diff = expiryDate.getTime() - now.getTime()
      const sevenDaysMs = 7 * 24 * 60 * 60 * 1000

      // Allow 1 second tolerance
      expect(diff).toBeGreaterThan(sevenDaysMs - 1000)
      expect(diff).toBeLessThan(sevenDaysMs + 1000)
    })

    it('should respect custom days parameter', () => {
      const expiry = getSessionExpiry(30)
      const now = new Date()
      const expiryDate = new Date(expiry)

      const diff = expiryDate.getTime() - now.getTime()
      const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000

      // Allow 1 second tolerance
      expect(diff).toBeGreaterThan(thirtyDaysMs - 1000)
      expect(diff).toBeLessThan(thirtyDaysMs + 1000)
    })
  })

  describe('isSessionExpired', () => {
    it('should return false for a future date', () => {
      const futureDate = new Date(Date.now() + 60000).toISOString() // 1 minute from now
      expect(isSessionExpired(futureDate)).toBe(false)
    })

    it('should return true for a past date', () => {
      const pastDate = new Date(Date.now() - 60000).toISOString() // 1 minute ago
      expect(isSessionExpired(pastDate)).toBe(true)
    })
  })

  describe('now', () => {
    it('should return a valid ISO timestamp', () => {
      const timestamp = now()
      const date = new Date(timestamp)

      expect(date.toISOString()).toBe(timestamp)
    })

    it('should return the current time', () => {
      const before = Date.now()
      const timestamp = now()
      const after = Date.now()

      const timestampMs = new Date(timestamp).getTime()
      expect(timestampMs).toBeGreaterThanOrEqual(before)
      expect(timestampMs).toBeLessThanOrEqual(after)
    })
  })
})
