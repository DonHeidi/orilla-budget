# User Authentication Flows

**Date:** 2025-12-03
**Status:** Planned
**Category:** Security & Authentication
**Parent:** [Better Auth Migration](./2025-12-02-better-auth-migration.md)

## Overview

Implement user-facing authentication flows and account management features. These are the typical self-service features users expect from a modern application.

---

## Related Documents

- [Better Auth Migration](./2025-12-02-better-auth-migration.md) - Core auth infrastructure
- [Email Integration](./2025-12-03-email-integration.md) - Required for email-based flows

---

## User Flows

### Authentication Flows

| Flow | Priority | Email Required | Status |
|------|----------|----------------|--------|
| Sign Up | High | Yes (verification) | Partial |
| Sign In | High | No | ✅ Done |
| Sign Out | High | No | ✅ Done |
| Forgot Password | High | Yes | Planned |
| Reset Password | High | No | Planned |

### Account Management Flows

| Flow | Priority | Email Required | Status |
|------|----------|----------------|--------|
| Change Password | High | No | Planned |
| Change Email | Medium | Yes (verification) | Planned |
| Update Profile | Medium | No | Planned |
| Delete Account | Medium | No | Planned |
| View Active Sessions | Low | No | Planned |
| Revoke Sessions | Low | No | Planned |

### Security Flows

| Flow | Priority | Status |
|------|----------|--------|
| Two-Factor Authentication (2FA) | Medium | Planned |
| Backup Codes | Medium | Planned |
| Social Login (OAuth) | Low | Planned |
| Passkeys / WebAuthn | Low | Future |

---

## Implementation Phases

### Phase 1: Core Authentication UI
- [ ] Create `/signup` route with registration form
- [ ] Add "Forgot password?" link to login page
- [ ] Create `/forgot-password` route
- [ ] Create `/reset-password` route
- [ ] Handle email verification redirect
- [ ] Add verification pending state to signup

### Phase 2: Password Management
- [ ] Create `/settings/security` route
- [ ] Add "Change Password" form
- [ ] Validate current password before change
- [ ] Option to revoke other sessions on password change
- [ ] Show password strength indicator

### Phase 3: Email Management
- [ ] Add "Change Email" form to settings
- [ ] Send verification to new email
- [ ] Keep old email until new is verified
- [ ] Notify old email of change attempt
- [ ] Handle verification callback

### Phase 4: Profile Management
- [ ] Create `/settings/profile` route
- [ ] Update display name
- [ ] Update handle
- [ ] Upload avatar (optional)
- [ ] Update notification preferences

### Phase 5: Session Management
- [ ] Create `/settings/sessions` route
- [ ] List active sessions with device info
- [ ] Show current session indicator
- [ ] "Sign out" button per session
- [ ] "Sign out all other sessions" button
- [ ] Show last activity timestamp

### Phase 6: Account Deletion
- [ ] Create `/settings/danger` route
- [ ] Add "Delete Account" section
- [ ] Require password confirmation
- [ ] Show data that will be deleted
- [ ] Grace period before permanent deletion (optional)
- [ ] Send confirmation email

### Phase 7: Two-Factor Authentication
- [ ] Add TOTP plugin to Better Auth
- [ ] Create 2FA setup flow
- [ ] Generate QR code for authenticator apps
- [ ] Verify TOTP before enabling
- [ ] Generate backup codes
- [ ] Add 2FA challenge to login flow
- [ ] Allow 2FA recovery with backup codes

### Phase 8: Social Login (Optional)
- [ ] Add OAuth providers (Google, GitHub)
- [ ] Link/unlink social accounts
- [ ] Handle account merging
- [ ] Show connected accounts in settings

---

## Technical Specification

### Routes Structure

```
/login                    # Sign in
/signup                   # Registration
/forgot-password          # Request password reset
/reset-password           # Set new password (with token)
/verify-email             # Email verification callback
/settings
  /profile                # Name, handle, avatar
  /security               # Password, 2FA
  /sessions               # Active sessions
  /email                  # Change email
  /danger                 # Delete account
```

### Sign Up Flow

```typescript
// src/routes/signup.tsx
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useForm } from '@tanstack/react-form'
import { authClient } from '@/lib/auth-client'
import { useState } from 'react'

export const Route = createFileRoute('/signup')({
  component: SignUpPage,
})

function SignUpPage() {
  const navigate = useNavigate()
  const [verificationSent, setVerificationSent] = useState(false)

  const form = useForm({
    defaultValues: {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
    onSubmit: async ({ value }) => {
      const result = await authClient.signUp.email({
        name: value.name,
        email: value.email,
        password: value.password,
      })

      if (result.error) {
        // Handle error
        return
      }

      // If email verification required
      setVerificationSent(true)
    },
  })

  if (verificationSent) {
    return (
      <div>
        <h2>Check your email</h2>
        <p>We've sent a verification link to your email address.</p>
        <button onClick={() => authClient.sendVerificationEmail()}>
          Resend verification email
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={(e) => { e.preventDefault(); form.handleSubmit() }}>
      {/* Form fields */}
    </form>
  )
}
```

### Forgot Password Flow

```typescript
// src/routes/forgot-password.tsx
import { createFileRoute } from '@tanstack/react-router'
import { useForm } from '@tanstack/react-form'
import { authClient } from '@/lib/auth-client'
import { useState } from 'react'

export const Route = createFileRoute('/forgot-password')({
  component: ForgotPasswordPage,
})

function ForgotPasswordPage() {
  const [sent, setSent] = useState(false)

  const form = useForm({
    defaultValues: { email: '' },
    onSubmit: async ({ value }) => {
      await authClient.forgetPassword({
        email: value.email,
        redirectTo: '/reset-password',
      })
      // Always show success (don't reveal if email exists)
      setSent(true)
    },
  })

  if (sent) {
    return (
      <div>
        <h2>Check your email</h2>
        <p>If an account exists with that email, we've sent a reset link.</p>
      </div>
    )
  }

  return (
    <form onSubmit={(e) => { e.preventDefault(); form.handleSubmit() }}>
      <input
        type="email"
        placeholder="Email address"
        {...form.getFieldProps('email')}
      />
      <button type="submit">Send reset link</button>
    </form>
  )
}
```

### Reset Password Flow

```typescript
// src/routes/reset-password.tsx
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useForm } from '@tanstack/react-form'
import { authClient } from '@/lib/auth-client'

export const Route = createFileRoute('/reset-password')({
  component: ResetPasswordPage,
  validateSearch: (search) => ({
    token: search.token as string | undefined,
    error: search.error as string | undefined,
  }),
})

function ResetPasswordPage() {
  const { token, error } = Route.useSearch()
  const navigate = useNavigate()

  if (error === 'INVALID_TOKEN') {
    return (
      <div>
        <h2>Invalid or expired link</h2>
        <p>This password reset link is no longer valid.</p>
        <a href="/forgot-password">Request a new link</a>
      </div>
    )
  }

  const form = useForm({
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
    onSubmit: async ({ value }) => {
      const result = await authClient.resetPassword({
        token: token!,
        newPassword: value.password,
      })

      if (result.error) {
        // Handle error
        return
      }

      navigate({ to: '/login', search: { message: 'password-reset' } })
    },
  })

  return (
    <form onSubmit={(e) => { e.preventDefault(); form.handleSubmit() }}>
      <h2>Set new password</h2>
      <input
        type="password"
        placeholder="New password"
        {...form.getFieldProps('password')}
      />
      <input
        type="password"
        placeholder="Confirm password"
        {...form.getFieldProps('confirmPassword')}
      />
      <button type="submit">Reset password</button>
    </form>
  )
}
```

### Change Password Flow

```typescript
// src/routes/settings/security.tsx
import { createFileRoute } from '@tanstack/react-router'
import { useForm } from '@tanstack/react-form'
import { authClient } from '@/lib/auth-client'

export const Route = createFileRoute('/settings/security')({
  component: SecuritySettingsPage,
})

function SecuritySettingsPage() {
  const form = useForm({
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
      revokeOtherSessions: true,
    },
    onSubmit: async ({ value }) => {
      const result = await authClient.changePassword({
        currentPassword: value.currentPassword,
        newPassword: value.newPassword,
        revokeOtherSessions: value.revokeOtherSessions,
      })

      if (result.error) {
        // Handle error (wrong current password, etc.)
        return
      }

      // Show success message
    },
  })

  return (
    <form onSubmit={(e) => { e.preventDefault(); form.handleSubmit() }}>
      <h2>Change Password</h2>
      {/* Form fields */}
    </form>
  )
}
```

### Change Email Flow

```typescript
// src/routes/settings/email.tsx
import { createFileRoute } from '@tanstack/react-router'
import { useForm } from '@tanstack/react-form'
import { authClient, useSession } from '@/lib/auth-client'

export const Route = createFileRoute('/settings/email')({
  component: EmailSettingsPage,
})

function EmailSettingsPage() {
  const { data: session } = useSession()

  const form = useForm({
    defaultValues: {
      newEmail: '',
    },
    onSubmit: async ({ value }) => {
      const result = await authClient.changeEmail({
        newEmail: value.newEmail,
        callbackURL: '/settings/email?verified=true',
      })

      if (result.error) {
        // Handle error
        return
      }

      // Show "verification sent" message
    },
  })

  return (
    <div>
      <h2>Email Address</h2>
      <p>Current: {session?.user.email}</p>

      <form onSubmit={(e) => { e.preventDefault(); form.handleSubmit() }}>
        <input
          type="email"
          placeholder="New email address"
          {...form.getFieldProps('newEmail')}
        />
        <button type="submit">Change email</button>
      </form>

      <p className="text-sm text-muted">
        You'll need to verify your new email before it becomes active.
      </p>
    </div>
  )
}
```

### Session Management

```typescript
// src/routes/settings/sessions.tsx
import { createFileRoute } from '@tanstack/react-router'
import { authClient, useSession } from '@/lib/auth-client'
import { createServerFn } from '@tanstack/react-start'

const listSessionsFn = createServerFn({ method: 'GET' }).handler(async () => {
  // Better Auth provides session listing via admin API
  // or you can query the session table directly
})

export const Route = createFileRoute('/settings/sessions')({
  component: SessionsPage,
  loader: () => listSessionsFn(),
})

function SessionsPage() {
  const { data: session } = useSession()
  const sessions = Route.useLoaderData()

  const handleRevokeSession = async (sessionId: string) => {
    await authClient.revokeSession({ id: sessionId })
    // Refresh
  }

  const handleRevokeAllOther = async () => {
    await authClient.revokeOtherSessions()
    // Refresh
  }

  return (
    <div>
      <h2>Active Sessions</h2>

      <ul>
        {sessions.map((s) => (
          <li key={s.id}>
            <div>
              <strong>{s.userAgent}</strong>
              <span>{s.ipAddress}</span>
              <span>Last active: {s.updatedAt}</span>
              {s.id === session?.session.id && <span>(Current)</span>}
            </div>
            {s.id !== session?.session.id && (
              <button onClick={() => handleRevokeSession(s.id)}>
                Sign out
              </button>
            )}
          </li>
        ))}
      </ul>

      <button onClick={handleRevokeAllOther}>
        Sign out all other sessions
      </button>
    </div>
  )
}
```

### Account Deletion

```typescript
// src/routes/settings/danger.tsx
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { authClient } from '@/lib/auth-client'
import { useState } from 'react'

export const Route = createFileRoute('/settings/danger')({
  component: DangerSettingsPage,
})

function DangerSettingsPage() {
  const navigate = useNavigate()
  const [showConfirm, setShowConfirm] = useState(false)
  const [password, setPassword] = useState('')

  const handleDelete = async () => {
    const result = await authClient.deleteUser({
      password,
    })

    if (result.error) {
      // Handle error (wrong password)
      return
    }

    navigate({ to: '/' })
  }

  return (
    <div>
      <h2>Danger Zone</h2>

      <div className="border border-red-500 p-4 rounded">
        <h3>Delete Account</h3>
        <p>
          This will permanently delete your account and all associated data.
          This action cannot be undone.
        </p>

        {!showConfirm ? (
          <button
            className="bg-red-500 text-white"
            onClick={() => setShowConfirm(true)}
          >
            Delete my account
          </button>
        ) : (
          <div>
            <p>Enter your password to confirm:</p>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button onClick={handleDelete}>
              Yes, permanently delete my account
            </button>
            <button onClick={() => setShowConfirm(false)}>
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
```

---

## Files Overview

### New Files

| File | Purpose |
|------|---------|
| `src/routes/signup.tsx` | Registration page |
| `src/routes/forgot-password.tsx` | Password reset request |
| `src/routes/reset-password.tsx` | Set new password |
| `src/routes/verify-email.tsx` | Email verification callback |
| `src/routes/settings.tsx` | Settings layout |
| `src/routes/settings/profile.tsx` | Profile management |
| `src/routes/settings/security.tsx` | Password & 2FA |
| `src/routes/settings/email.tsx` | Email management |
| `src/routes/settings/sessions.tsx` | Session management |
| `src/routes/settings/danger.tsx` | Account deletion |

### Files to Modify

| File | Changes |
|------|---------|
| `src/routes/login.tsx` | Add forgot password link, signup link |
| `src/routes/dashboard.tsx` | Add settings link to sidebar |
| `src/lib/auth.ts` | Enable delete user, change email features |

---

## UI Components Needed

| Component | Purpose |
|-----------|---------|
| `PasswordInput` | Password field with show/hide toggle |
| `PasswordStrength` | Password strength indicator |
| `ConfirmDialog` | Confirmation modal for destructive actions |
| `SessionCard` | Display session info with actions |
| `SettingsLayout` | Sidebar navigation for settings pages |

---

## Validation Rules

### Password Requirements
- Minimum 8 characters
- Maximum 128 characters
- At least one uppercase letter (optional)
- At least one number (optional)
- At least one special character (optional)

### Email Requirements
- Valid email format
- Not already in use by another account
- Domain not in blocklist (optional)

---

## Security Considerations

| Feature | Consideration |
|---------|---------------|
| Password Reset | Don't reveal if email exists |
| Email Change | Verify new email before switching |
| Account Delete | Require password confirmation |
| Session Revoke | Invalidate token immediately |
| 2FA | Require backup codes before enabling |

---

## Error Messages

| Scenario | Message |
|----------|---------|
| Invalid email | "Please enter a valid email address" |
| Password too short | "Password must be at least 8 characters" |
| Passwords don't match | "Passwords do not match" |
| Wrong current password | "Current password is incorrect" |
| Email already in use | "An account with this email already exists" |
| Invalid reset token | "This link has expired or is invalid" |
| Rate limited | "Too many attempts. Please try again later." |

---

## Testing Checklist

### Sign Up
- [ ] Can register with valid email/password
- [ ] Shows validation errors for invalid input
- [ ] Sends verification email
- [ ] Cannot login before verification (if required)

### Forgot Password
- [ ] Can request reset for existing email
- [ ] Same response for non-existent email (security)
- [ ] Email arrives within 1 minute
- [ ] Link expires after 1 hour

### Reset Password
- [ ] Can set new password with valid token
- [ ] Shows error for expired/invalid token
- [ ] Redirects to login after success

### Change Password
- [ ] Requires correct current password
- [ ] Can revoke other sessions
- [ ] New password works for login

### Change Email
- [ ] Sends verification to new email
- [ ] Old email still works until verified
- [ ] New email works after verification

### Session Management
- [ ] Shows all active sessions
- [ ] Can revoke individual sessions
- [ ] Can revoke all other sessions
- [ ] Revoked sessions are immediately invalid

### Account Deletion
- [ ] Requires password confirmation
- [ ] Shows warning about data loss
- [ ] Actually deletes all user data
- [ ] User cannot login after deletion

---

## Dependencies

```bash
# Already installed with Better Auth
# No additional dependencies required
```

---

## References

- [Better Auth Email & Password](https://www.better-auth.com/docs/authentication/email-password)
- [Better Auth User Management](https://www.better-auth.com/docs/concepts/users-accounts)
- [Better Auth Sessions](https://www.better-auth.com/docs/concepts/session-management)
- [Better Auth Two-Factor](https://www.better-auth.com/docs/plugins/two-factor)

---

## Next Steps

1. Implement Phase 1: Core Authentication UI
2. Requires [Email Integration](./2025-12-03-email-integration.md) to be completed first
3. Design settings page layout
4. Create UI components
