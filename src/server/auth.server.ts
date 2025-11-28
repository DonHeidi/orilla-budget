import { createServerFn } from '@tanstack/react-start'

// Server function to handle login
// Uses dynamic imports to avoid bundling bun:sqlite into client
export const loginFn = createServerFn({ method: 'POST' }).handler(
  async (input: { email: string; password: string }) => {
    const { userRepository } = await import('@/repositories/user.repository')
    const { sessionRepository } = await import('@/repositories/session.repository')

    const user = await userRepository.verifyPassword(input.email, input.password)

    if (!user) {
      return { success: false as const, error: 'Invalid email or password' }
    }

    const session = await sessionRepository.create(user.id)
    await userRepository.updateLastLogin(user.id)

    return {
      success: true as const,
      user: { id: user.id, handle: user.handle, role: user.role },
      token: session.token,
    }
  }
)
