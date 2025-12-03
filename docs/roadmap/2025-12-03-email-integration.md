# Email Integration

**Date:** 2025-12-03
**Status:** Planned
**Category:** Security & Authentication
**Parent:** [Better Auth Migration](./2025-12-02-better-auth-migration.md)

## Overview

Integrate a GDPR-compliant email service for transactional emails including:
- Email verification on signup
- Password reset emails
- Portal user migration (send reset emails to converted users)

---

## Current State

- Better Auth is configured but has no email sending capability
- `sendResetPassword` and `sendVerificationEmail` are not configured
- Converted portal users cannot set their passwords without email

---

## Proposed Solution

### Email Service: Mailjet (recommended)

**Why Mailjet?**
- French company (GDPR native)
- EU data centers
- Generous free tier (6,000 emails/month, 200/day)
- Simple REST API
- Focused on transactional email (not a full CRM)

### Business Email: Proton Mail

> **Note:** Set up a Proton Mail Business account for the sending domain.
> Proton is Swiss-based with strong privacy focus and GDPR compliance.
> Use Mailjet as the relay service for transactional emails.

### Email Types

| Email Type | Trigger | Purpose |
|------------|---------|---------|
| Email Verification | User signup | Verify email ownership |
| Password Reset | Forgot password | Allow password recovery |
| Welcome Email | After verification | Onboard new users (optional) |
| Portal Migration | One-time script | Notify converted portal users |

---

## Implementation Phases

### Phase 1: Email Service Setup
- [ ] Set up Proton Mail Business account for sending domain
- [ ] Create Mailjet account
- [ ] Verify sending domain in Mailjet
- [ ] Add DNS records (SPF, DKIM, DMARC)
- [ ] Generate API key and secret
- [ ] Add `MAILJET_API_KEY` and `MAILJET_SECRET_KEY` to environment variables
- [ ] Install SDK: `bun add node-mailjet`

### Phase 2: Email Module
- [ ] Create `src/lib/email.ts` with send function
- [ ] Create email templates (text + HTML)
- [ ] Add error handling and logging
- [ ] Test email sending

### Phase 3: Better Auth Integration
- [ ] Configure `sendResetPassword` in `auth.ts`
- [ ] Configure `sendVerificationEmail` in `auth.ts`
- [ ] Add password reset page route
- [ ] Add email verification callback route
- [ ] Test password reset flow
- [ ] Test email verification flow

### Phase 4: Signup Flow Enhancement
- [ ] Enable `requireEmailVerification` option
- [ ] Update signup UI to show verification pending state
- [ ] Add resend verification email button
- [ ] Handle verification success redirect

### Phase 5: Portal User Migration
- [ ] Create `scripts/send-portal-user-reset-emails.ts`
- [ ] Query all converted portal users (users without credential accounts)
- [ ] Send password reset emails in batches (respect rate limits)
- [ ] Log success/failures
- [ ] Run migration script

---

## Technical Specification

### Email Module

```typescript
// src/lib/email.ts
import Mailjet from 'node-mailjet'

const mailjet = Mailjet.apiConnect(
  process.env.MAILJET_API_KEY!,
  process.env.MAILJET_SECRET_KEY!
)

interface SendEmailOptions {
  to: string
  subject: string
  text: string
  html?: string
}

export async function sendEmail({ to, subject, text, html }: SendEmailOptions) {
  try {
    await mailjet.post('send', { version: 'v3.1' }).request({
      Messages: [
        {
          From: {
            Email: process.env.EMAIL_FROM_ADDRESS || 'noreply@example.com',
            Name: process.env.EMAIL_FROM_NAME || 'Orilla Budget',
          },
          To: [{ Email: to }],
          Subject: subject,
          TextPart: text,
          HTMLPart: html || text,
        },
      ],
    })
    console.log(`Email sent to ${to}: ${subject}`)
  } catch (error) {
    console.error(`Failed to send email to ${to}:`, error)
    throw error
  }
}
```

### Better Auth Configuration

```typescript
// src/lib/auth.ts
import { sendEmail } from './email'

export const auth = betterAuth({
  // ... existing config

  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true, // NEW
    sendResetPassword: async ({ user, url }, request) => {
      await sendEmail({
        to: user.email,
        subject: 'Reset your password - Orilla Budget',
        text: `Hi ${user.name},\n\nClick the link below to reset your password:\n\n${url}\n\nThis link expires in 1 hour.\n\nIf you didn't request this, you can ignore this email.`,
        html: `
          <h2>Reset your password</h2>
          <p>Hi ${user.name},</p>
          <p>Click the button below to reset your password:</p>
          <p><a href="${url}" style="background: #0066cc; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">Reset Password</a></p>
          <p>This link expires in 1 hour.</p>
          <p>If you didn't request this, you can ignore this email.</p>
        `,
      })
    },
    password: {
      // ... existing Argon2id config
    },
  },

  emailVerification: {
    sendOnSignUp: true,
    sendVerificationEmail: async ({ user, url }, request) => {
      await sendEmail({
        to: user.email,
        subject: 'Verify your email - Orilla Budget',
        text: `Hi ${user.name},\n\nWelcome to Orilla Budget! Please verify your email by clicking the link below:\n\n${url}\n\nThis link expires in 24 hours.`,
        html: `
          <h2>Welcome to Orilla Budget!</h2>
          <p>Hi ${user.name},</p>
          <p>Please verify your email by clicking the button below:</p>
          <p><a href="${url}" style="background: #0066cc; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">Verify Email</a></p>
          <p>This link expires in 24 hours.</p>
        `,
      })
    },
    autoSignInAfterVerification: true,
  },
})
```

### Password Reset Page

```typescript
// src/routes/reset-password.tsx
import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { authClient } from '@/lib/auth-client'

export const Route = createFileRoute('/reset-password')({
  component: ResetPasswordPage,
  validateSearch: (search: Record<string, unknown>) => ({
    token: search.token as string | undefined,
    error: search.error as string | undefined,
  }),
})

function ResetPasswordPage() {
  const { token, error } = Route.useSearch()
  const [newPassword, setNewPassword] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')

  if (error === 'INVALID_TOKEN') {
    return <div>This reset link is invalid or has expired.</div>
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus('loading')

    const result = await authClient.resetPassword({
      token: token!,
      newPassword,
    })

    if (result.error) {
      setStatus('error')
    } else {
      setStatus('success')
    }
  }

  // ... render form
}
```

### Portal Migration Script

```typescript
// scripts/send-portal-user-reset-emails.ts
import { db } from '@/db'
import { betterAuth } from '@/db/better-auth-schema'
import { eq, isNull } from 'drizzle-orm'
import { auth } from '@/lib/auth'

async function sendPortalUserResetEmails() {
  // Find users without credential accounts (converted portal users)
  const usersWithoutPasswords = await db
    .select({ user: betterAuth.user })
    .from(betterAuth.user)
    .leftJoin(
      betterAuth.account,
      eq(betterAuth.user.id, betterAuth.account.userId)
    )
    .where(isNull(betterAuth.account.id))

  console.log(`Found ${usersWithoutPasswords.length} users without passwords`)

  const BATCH_SIZE = 10
  const DELAY_MS = 1000 // 1 second between batches

  for (let i = 0; i < usersWithoutPasswords.length; i += BATCH_SIZE) {
    const batch = usersWithoutPasswords.slice(i, i + BATCH_SIZE)

    await Promise.all(
      batch.map(async ({ user }) => {
        try {
          await auth.api.forgetPassword({
            body: { email: user.email, redirectTo: '/reset-password' }
          })
          console.log(`✓ Sent reset email to ${user.email}`)
        } catch (error) {
          console.error(`✗ Failed for ${user.email}:`, error)
        }
      })
    )

    if (i + BATCH_SIZE < usersWithoutPasswords.length) {
      await new Promise(resolve => setTimeout(resolve, DELAY_MS))
    }
  }

  console.log('Done!')
}

sendPortalUserResetEmails()
```

---

## Files Overview

### New Files

| File | Purpose |
|------|---------|
| `src/lib/email.ts` | Email sending module |
| `src/routes/reset-password.tsx` | Password reset page |
| `src/routes/verify-email.tsx` | Email verification callback (optional) |
| `scripts/send-portal-user-reset-emails.ts` | Migration script |

### Files to Modify

| File | Changes |
|------|---------|
| `src/lib/auth.ts` | Add `sendResetPassword`, `sendVerificationEmail` |
| `.env` | Add `BREVO_API_KEY`, `EMAIL_FROM_ADDRESS`, `EMAIL_FROM_NAME` |
| `src/routes/login.tsx` | Add "Forgot password?" link |
| `src/routes/signup.tsx` | Handle verification pending state |

---

## Environment Variables

```bash
# .env
MAILJET_API_KEY=your-api-key-here
MAILJET_SECRET_KEY=your-secret-key-here
EMAIL_FROM_ADDRESS=noreply@yourdomain.com
EMAIL_FROM_NAME=Orilla Budget
```

---

## DNS Configuration

For email deliverability, configure these DNS records:

| Type | Name | Value |
|------|------|-------|
| TXT | @ | SPF record (provided by Mailjet) |
| TXT | mailjet._domainkey | DKIM record (provided by Mailjet) |
| TXT | _dmarc | `v=DMARC1; p=quarantine; rua=mailto:dmarc@yourdomain.com` |

> **Note:** Proton Mail Business will also require DNS records for the domain.
> Configure Proton records first, then add Mailjet as an authorized sender.

---

## Testing Checklist

### Password Reset Flow
- [ ] User can request password reset
- [ ] Email is received within 1 minute
- [ ] Reset link works and shows form
- [ ] Expired/invalid tokens show error
- [ ] Password can be changed successfully
- [ ] User can log in with new password

### Email Verification Flow
- [ ] Verification email sent on signup
- [ ] Email is received within 1 minute
- [ ] Verification link works
- [ ] User is signed in after verification
- [ ] Unverified users cannot access protected routes

### Portal Migration
- [ ] Script identifies correct users
- [ ] Emails are sent in batches
- [ ] Rate limits are respected
- [ ] Success/failure logged correctly

---

## Security Considerations

- Reset tokens expire after 1 hour
- Verification tokens expire after 24 hours
- Emails don't expose user existence (same response for valid/invalid emails)
- HTML emails have text fallback
- Rate limiting on password reset requests (Better Auth default)

---

## GDPR Compliance

| Requirement | Implementation |
|-------------|----------------|
| Data location | Mailjet EU data centers (France) |
| Data processing agreement | Mailjet provides DPA |
| Business email | Proton Mail (Swiss, strong privacy) |
| Consent | Email verification = implicit consent |
| Right to erasure | User deletion removes email from system |
| Data minimization | Only email, name, timestamp stored |

---

## Dependencies

```bash
bun add node-mailjet
```

---

## References

- [Better Auth Email Documentation](https://www.better-auth.com/docs/concepts/email)
- [Better Auth Password Reset](https://www.better-auth.com/docs/authentication/email-password#request-password-reset)
- [Mailjet API Documentation](https://dev.mailjet.com/)
- [Mailjet Node.js SDK](https://github.com/mailjet/mailjet-apiv3-nodejs)
- [Proton Mail Business](https://proton.me/business)

---

## Next Steps

1. Set up Proton Mail Business account
2. Create Mailjet account at https://mailjet.com
3. Verify sending domain in both services
4. Add DNS records (Proton first, then Mailjet)
5. Begin Phase 1 implementation
