/**
 * Password Utilities
 *
 * Standalone password hashing functions using Bun's built-in Argon2id.
 * Separated from auth.ts to avoid triggering Better Auth initialization.
 */

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
