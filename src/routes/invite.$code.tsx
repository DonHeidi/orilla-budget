import {
  createFileRoute,
  useNavigate,
  useRouter,
} from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { useState } from 'react'
import { useForm } from '@tanstack/react-form'
import { zodValidator } from '@tanstack/zod-form-adapter'
import { CheckCircle, XCircle, UserPlus, LogIn } from 'lucide-react'
import { invitationRepository } from '@/repositories/invitation.repository'
import { contactRepository } from '@/repositories/contact.repository'
import { getCurrentUser } from '@/lib/auth/helpers.server'
import { auth } from '@/lib/better-auth'
import { db, betterAuth } from '@/db'
import { eq, and } from 'drizzle-orm'
import { registrationSchema } from '@/schemas'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { InvitationWithDetails } from '@/repositories/invitation.repository'

interface InvitePageData {
  invitation: InvitationWithDetails | null
  isAuthenticated: boolean
  currentUser: {
    id: string
    handle: string
    email: string
  } | null
  error?: string
}

const getInvitationFn = createServerFn({ method: 'GET' })
  .inputValidator((data: { code: string }) => data)
  .handler(async ({ data }): Promise<InvitePageData> => {
    const invitation = await invitationRepository.findValidByCode(data.code)

    if (!invitation) {
      return {
        invitation: null,
        isAuthenticated: false,
        currentUser: null,
        error: 'Invalid or expired invitation',
      }
    }

    // Check if user is already authenticated
    const user = await getCurrentUser()
    if (user) {
      return {
        invitation,
        isAuthenticated: true,
        currentUser: {
          id: user.id,
          handle: user.handle,
          email: user.email,
        },
      }
    }

    return {
      invitation,
      isAuthenticated: false,
      currentUser: null,
    }
  })

const acceptInvitationFn = createServerFn({ method: 'POST' })
  .inputValidator((data: { code: string }) => data)
  .handler(async ({ data }) => {
    const user = await getCurrentUser()
    if (!user) {
      throw new Error('Not authenticated')
    }

    const invitation = await invitationRepository.findValidByCode(data.code)
    if (!invitation) {
      throw new Error('Invalid or expired invitation')
    }

    // Add user to project if specified
    if (invitation.projectId && invitation.role) {
      // Check if already a member
      const existingMembership = await db
        .select()
        .from(betterAuth.teamMember)
        .where(
          and(
            eq(betterAuth.teamMember.teamId, invitation.projectId),
            eq(betterAuth.teamMember.userId, user.id)
          )
        )
        .get()

      if (!existingMembership) {
        await db.insert(betterAuth.teamMember).values({
          id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
          teamId: invitation.projectId,
          userId: user.id,
          projectRole: invitation.role,
          createdAt: new Date(),
        })
      }
    }

    // Link contact to user if not already linked
    const contact = await contactRepository.findById(invitation.contactId)
    if (contact && !contact.userId) {
      await contactRepository.linkToUser(contact.id, user.id)
    }

    // Mark invitation as accepted
    await invitationRepository.accept(invitation.id)

    return { success: true, projectId: invitation.projectId }
  })

const registerAndAcceptFn = createServerFn({ method: 'POST' })
  .inputValidator(
    (data: {
      code: string
      handle: string
      email: string
      password: string
      name?: string
    }) => data
  )
  .handler(async ({ data }) => {
    const invitation = await invitationRepository.findValidByCode(data.code)
    if (!invitation) {
      throw new Error('Invalid or expired invitation')
    }

    // Check if user with email already exists
    const existingUser = await db
      .select()
      .from(betterAuth.user)
      .where(eq(betterAuth.user.email, data.email))
      .get()
    if (existingUser) {
      throw new Error('An account with this email already exists. Please log in instead.')
    }

    // Check if handle is taken
    const existingHandle = await db
      .select()
      .from(betterAuth.user)
      .where(eq(betterAuth.user.handle, data.handle))
      .get()
    if (existingHandle) {
      throw new Error('This handle is already taken')
    }

    // Create user using Better Auth API
    const signUpResult = await auth.api.signUpEmail({
      body: {
        email: data.email,
        password: data.password,
        name: data.name || data.handle,
      },
    })

    if (!signUpResult.user) {
      throw new Error('Failed to create user account')
    }

    const userId = signUpResult.user.id

    // Update user with handle
    await db
      .update(betterAuth.user)
      .set({ handle: data.handle })
      .where(eq(betterAuth.user.id, userId))

    // Add user to project if specified
    if (invitation.projectId && invitation.role) {
      await db.insert(betterAuth.teamMember).values({
        id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        teamId: invitation.projectId,
        userId: userId,
        projectRole: invitation.role,
        createdAt: new Date(),
      })
    }

    // Link contact to user
    const contact = await contactRepository.findById(invitation.contactId)
    if (contact) {
      await contactRepository.linkToUser(contact.id, userId)
    }

    // Mark invitation as accepted
    await invitationRepository.accept(invitation.id)

    return {
      success: true,
      projectId: invitation.projectId,
      // Note: Better Auth handles the session automatically via cookies
    }
  })

export const Route = createFileRoute('/invite/$code')({
  component: InvitePage,
  loader: ({ params }) => getInvitationFn({ data: { code: params.code } }),
})

function InvitePage() {
  const { code } = Route.useParams()
  const data = Route.useLoaderData()
  const navigate = useNavigate()
  const router = useRouter()
  const [mode, setMode] = useState<'choice' | 'register' | 'login'>('choice')
  const [isAccepting, setIsAccepting] = useState(false)
  const [acceptError, setAcceptError] = useState<string | null>(null)

  // Invalid invitation
  if (!data.invitation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center">
          <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Invalid Invitation</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {data.error ||
              'This invitation link is invalid or has expired. Please request a new invitation.'}
          </p>
          <Button onClick={() => navigate({ to: '/login' })}>Go to Login</Button>
        </div>
      </div>
    )
  }

  const { invitation, isAuthenticated, currentUser } = data

  const handleAcceptAsCurrentUser = async () => {
    setIsAccepting(true)
    setAcceptError(null)
    try {
      const result = await acceptInvitationFn({ data: { code } })
      if (result.projectId) {
        navigate({ to: '/dashboard/projects' })
      } else {
        navigate({ to: '/dashboard' })
      }
    } catch (error) {
      setAcceptError(
        error instanceof Error ? error.message : 'Failed to accept invitation'
      )
    } finally {
      setIsAccepting(false)
    }
  }

  // User is authenticated - show accept button
  if (isAuthenticated && currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-center mb-2">
            You've Been Invited!
          </h1>
          <p className="text-gray-600 dark:text-gray-400 text-center mb-6">
            <strong>{invitation.invitedBy.handle}</strong> has invited you
            {invitation.project
              ? ` to join the project "${invitation.project.name}"`
              : ' to connect'}
            {invitation.role ? ` as ${invitation.role}` : ''}.
          </p>

          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-6">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Accepting as:
            </p>
            <p className="font-medium">@{currentUser.handle}</p>
            <p className="text-sm text-gray-500">{currentUser.email}</p>
          </div>

          {acceptError && (
            <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-3 rounded-lg mb-4 text-sm">
              {acceptError}
            </div>
          )}

          <div className="space-y-3">
            <Button
              className="w-full"
              onClick={handleAcceptAsCurrentUser}
              disabled={isAccepting}
            >
              {isAccepting ? 'Accepting...' : 'Accept Invitation'}
            </Button>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => navigate({ to: '/dashboard' })}
            >
              Cancel
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // User is not authenticated - show register/login options
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
        {mode === 'choice' && (
          <>
            <UserPlus className="h-16 w-16 text-blue-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-center mb-2">
              You've Been Invited!
            </h1>
            <p className="text-gray-600 dark:text-gray-400 text-center mb-6">
              <strong>@{invitation.invitedBy.handle}</strong> has invited you
              {invitation.project
                ? ` to join the project "${invitation.project.name}"`
                : ' to connect'}
              {invitation.role ? ` as ${invitation.role}` : ''}.
            </p>

            <div className="space-y-3">
              <Button className="w-full" onClick={() => setMode('register')}>
                <UserPlus className="mr-2 h-4 w-4" />
                Create Account
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setMode('login')}
              >
                <LogIn className="mr-2 h-4 w-4" />
                I Already Have an Account
              </Button>
            </div>
          </>
        )}

        {mode === 'register' && (
          <RegisterForm
            invitation={invitation}
            code={code}
            onBack={() => setMode('choice')}
          />
        )}

        {mode === 'login' && (
          <LoginPrompt
            invitation={invitation}
            code={code}
            onBack={() => setMode('choice')}
          />
        )}
      </div>
    </div>
  )
}

function RegisterForm({
  invitation,
  code,
  onBack,
}: {
  invitation: InvitationWithDetails
  code: string
  onBack: () => void
}) {
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)

  const form = useForm({
    defaultValues: {
      handle: '',
      email: invitation.contact.email,
      password: '',
      confirmPassword: '',
      name: invitation.contact.pii?.name || '',
    },
    validatorAdapter: zodValidator(),
    validators: {
      onSubmitAsync: registrationSchema,
    },
    onSubmit: async ({ value }) => {
      setError(null)
      try {
        const result = await registerAndAcceptFn({
          data: {
            code,
            handle: value.handle,
            email: value.email,
            password: value.password,
            name: value.name,
          },
        })

        // Set session cookie (this needs to be done on client)
        document.cookie = `${SESSION_COOKIE_NAME}=${result.sessionToken}; path=/; max-age=${7 * 24 * 60 * 60}; samesite=lax`

        if (result.projectId) {
          navigate({ to: '/dashboard/projects' })
        } else {
          navigate({ to: '/dashboard' })
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Registration failed')
      }
    },
  })

  return (
    <>
      <h2 className="text-xl font-bold mb-4">Create Your Account</h2>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
        Create an account to accept {invitation.invitedBy.handle}'s invitation.
      </p>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-3 rounded-lg mb-4 text-sm">
          {error}
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault()
          form.handleSubmit()
        }}
        className="space-y-4"
      >
        <form.Field name="name">
          {(field) => (
            <div>
              <label className="text-sm font-medium">Name</label>
              <Input
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                placeholder="Your name"
                className="mt-1"
              />
            </div>
          )}
        </form.Field>

        <form.Field
          name="handle"
          validators={{
            onChange: registrationSchema.shape.handle,
          }}
        >
          {(field) => (
            <div>
              <label className="text-sm font-medium">Handle *</label>
              <div className="relative mt-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                  @
                </span>
                <Input
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder="username"
                  className="pl-7"
                />
              </div>
              {field.state.meta.isTouched &&
                field.state.meta.errors.length > 0 && (
                  <p className="text-sm text-red-500 mt-1">
                    {field.state.meta.errors
                      .map((err) =>
                        typeof err === 'string' ? err : err.message
                      )
                      .join(', ')}
                  </p>
                )}
            </div>
          )}
        </form.Field>

        <form.Field
          name="email"
          validators={{
            onChange: registrationSchema.shape.email,
          }}
        >
          {(field) => (
            <div>
              <label className="text-sm font-medium">Email *</label>
              <Input
                type="email"
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                className="mt-1"
              />
              {field.state.meta.isTouched &&
                field.state.meta.errors.length > 0 && (
                  <p className="text-sm text-red-500 mt-1">
                    {field.state.meta.errors
                      .map((err) =>
                        typeof err === 'string' ? err : err.message
                      )
                      .join(', ')}
                  </p>
                )}
            </div>
          )}
        </form.Field>

        <form.Field
          name="password"
          validators={{
            onChange: registrationSchema.shape.password,
          }}
        >
          {(field) => (
            <div>
              <label className="text-sm font-medium">Password *</label>
              <Input
                type="password"
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                className="mt-1"
              />
              {field.state.meta.isTouched &&
                field.state.meta.errors.length > 0 && (
                  <p className="text-sm text-red-500 mt-1">
                    {field.state.meta.errors
                      .map((err) =>
                        typeof err === 'string' ? err : err.message
                      )
                      .join(', ')}
                  </p>
                )}
            </div>
          )}
        </form.Field>

        <form.Field name="confirmPassword">
          {(field) => (
            <div>
              <label className="text-sm font-medium">Confirm Password *</label>
              <Input
                type="password"
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                className="mt-1"
              />
            </div>
          )}
        </form.Field>

        <div className="flex gap-3 pt-4">
          <Button type="button" variant="outline" onClick={onBack}>
            Back
          </Button>
          <form.Subscribe
            selector={(state) => [state.canSubmit, state.isSubmitting]}
          >
            {([canSubmit, isSubmitting]) => (
              <Button
                type="submit"
                className="flex-1"
                disabled={!canSubmit || isSubmitting}
              >
                {isSubmitting ? 'Creating...' : 'Create Account & Accept'}
              </Button>
            )}
          </form.Subscribe>
        </div>
      </form>
    </>
  )
}

function LoginPrompt({
  invitation,
  code,
  onBack,
}: {
  invitation: InvitationWithDetails
  code: string
  onBack: () => void
}) {
  const navigate = useNavigate()

  return (
    <>
      <LogIn className="h-12 w-12 text-blue-500 mx-auto mb-4" />
      <h2 className="text-xl font-bold text-center mb-4">Log In to Accept</h2>
      <p className="text-gray-600 dark:text-gray-400 text-center mb-6">
        Log in to your existing account, then return to this invitation link to
        accept it.
      </p>

      <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-6">
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
          Invitation code:
        </p>
        <code className="text-sm font-mono bg-gray-200 dark:bg-gray-600 px-2 py-1 rounded">
          {code}
        </code>
        <p className="text-xs text-gray-500 mt-2">
          Save this code! After logging in, visit this page again.
        </p>
      </div>

      <div className="space-y-3">
        <Button
          className="w-full"
          onClick={() =>
            navigate({
              to: '/login',
              search: { redirect: `/invite/${code}` },
            })
          }
        >
          Go to Login
        </Button>
        <Button variant="outline" className="w-full" onClick={onBack}>
          Back
        </Button>
      </div>
    </>
  )
}
