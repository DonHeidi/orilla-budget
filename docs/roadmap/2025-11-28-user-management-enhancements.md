# User Management Enhancements

**Date:** 2025-11-28
**Status:** Planned
**Category:** Platform Features
**Builds Upon:** [User Management & RBAC](./2025-11-27-user-management-rbac.md)

## Overview

This document outlines future enhancements for Orilla Budget, building on the completed User Management & RBAC implementation. These features were originally planned as Phase 5 but have been extracted into a separate roadmap for future development.

---

## Features

### 1. Email Integration

**Priority:** High
**Context:** Deferred from Phase 4 of User Management & RBAC. Currently, admins manually share invitation links.

**Scope:**
- Choose email provider (Resend recommended for simplicity)
- Send invitation emails with secure links
- Send password reset emails
- Email verification for new accounts

**Implementation:**
```typescript
// Example structure
src/lib/email/
├── client.ts          // Email provider client (Resend)
├── templates/
│   ├── invitation.tsx // Invitation email template
│   └── password-reset.tsx
└── send.ts            // Email sending utilities
```

**User Stories:**
- As an admin, I want users to receive an email when invited so they can easily join
- As a user, I can request a password reset email if I forget my password
- As a new user, I receive a welcome email after registration

---

### 2. Organisation-Level Permissions

**Priority:** Medium
**Context:** For paid organisation accounts with multiple team members.

**Scope:**
- `organisationMembers` table linking users to organisations with roles
- Organisation roles: owner, admin, member
- Org admins can manage all projects within their organisation
- Separate from project-level permissions

**Data Model:**
```typescript
organisationMembers {
  id: string
  organisationId: string    // FK → organisations
  userId: string            // FK → users
  role: 'owner' | 'admin' | 'member'
  createdAt: string
}
```

**User Stories:**
- As an org owner, I can invite team members to my organisation
- As an org admin, I can manage all projects within the organisation
- As an org member, I see all org projects in my dashboard

---

### 3. Audit Logging

**Priority:** Medium
**Context:** Track important user actions for accountability and debugging.

**Scope:**
- Log authentication events (login, logout, password change)
- Log data modifications (create, update, delete)
- Log permission-sensitive actions
- Admin UI for viewing audit logs

**Data Model:**
```typescript
auditLogs {
  id: string
  userId: string            // Who performed the action
  action: string            // e.g., 'user.login', 'project.create'
  resourceType: string      // e.g., 'project', 'timeEntry'
  resourceId: string | null // ID of affected resource
  metadata: text            // JSON with additional context
  ipAddress: string | null
  userAgent: string | null
  createdAt: string
}
```

**Actions to Log:**
- `auth.login`, `auth.logout`, `auth.password_change`
- `user.create`, `user.update`, `user.delete`
- `project.create`, `project.update`, `project.delete`
- `timeEntry.create`, `timeEntry.update`, `timeEntry.delete`
- `invitation.create`, `invitation.accept`

---

### 4. Two-Factor Authentication (2FA)

**Priority:** Medium
**Context:** Enhanced security for user accounts.

**Scope:**
- TOTP-based 2FA (Google Authenticator, Authy compatible)
- QR code setup flow
- Recovery codes for account recovery
- Optional enforcement for admin accounts

**Data Model:**
```typescript
userTwoFactor {
  id: string
  userId: string
  secret: string            // Encrypted TOTP secret
  recoveryCodes: text       // Encrypted JSON array
  enabledAt: string | null
  createdAt: string
}
```

**User Stories:**
- As a user, I can enable 2FA on my account for extra security
- As a user, I enter a 6-digit code from my authenticator app when logging in
- As a user, I can use a recovery code if I lose access to my authenticator

---

### 5. OAuth Integration

**Priority:** Low
**Context:** Allow users to sign in with existing accounts.

**Scope:**
- Google OAuth integration
- GitHub OAuth integration
- Link OAuth accounts to existing users
- Create new users from OAuth

**Data Model:**
```typescript
oauthAccounts {
  id: string
  userId: string
  provider: 'google' | 'github'
  providerAccountId: string
  email: string
  createdAt: string
}
```

**User Stories:**
- As a user, I can sign in with my Google account
- As a user, I can link my GitHub account for one-click login
- As a new user, I can create an account using OAuth without a password

---

### 6. GDPR Data Export

**Priority:** Medium
**Context:** Article 20 compliance - Right to data portability.

**Scope:**
- Generate complete data export for a user
- Include all personal data and user-generated content
- Export in machine-readable format (JSON)
- Admin UI for triggering exports
- Self-service export request for users

**Export Contents:**
- User profile (from PII)
- Projects and memberships
- Time entries
- Time sheets
- Contacts
- Invitations sent/received

**User Stories:**
- As a user, I can request an export of all my data
- As an admin, I can generate data exports for users
- The export is in a standard format I can import elsewhere

---

### 7. PII Deletion Workflow

**Priority:** Medium
**Context:** Article 17 compliance - Right to erasure.

**Scope:**
- Delete all PII for a user while preserving business records
- Anonymize time entries (retain hours, remove personal identifiers)
- Handle cascade effects properly
- Confirmation workflow with waiting period
- Admin approval for deletion requests

**Process:**
1. User requests account deletion
2. 7-day waiting period (user can cancel)
3. Admin reviews and approves
4. PII record deleted (cascade sets user.piiId to null)
5. User record retained with handle/email anonymized
6. Time entries preserved with anonymized user reference

**User Stories:**
- As a user, I can request deletion of my personal data
- As an admin, I can review and process deletion requests
- Business records are preserved even after user deletion

---

## Implementation Order

**Recommended sequence:**

1. **Email Integration** - Enables better invitation flow and password reset
2. **Audit Logging** - Provides visibility into system usage
3. **GDPR Data Export** - Compliance requirement
4. **PII Deletion Workflow** - Compliance requirement
5. **Two-Factor Authentication** - Security enhancement
6. **Organisation Permissions** - Business feature for paid accounts
7. **OAuth Integration** - Convenience feature

---

## Dependencies

### New Packages

```bash
# Email
bun add resend              # Email sending

# 2FA
bun add otpauth             # TOTP generation/validation
bun add qrcode              # QR code generation

# OAuth
bun add arctic              # OAuth library
```

---

## References

- [User Management & RBAC](./2025-11-27-user-management-rbac.md) - Completed foundation
- [GDPR Data Model](../gdpr-data-model.md) - PII separation architecture
- [GDPR Article 17 - Right to erasure](https://gdpr-info.eu/art-17-gdpr/)
- [GDPR Article 20 - Right to data portability](https://gdpr-info.eu/art-20-gdpr/)
- [Resend Documentation](https://resend.com/docs)
- [Arctic OAuth Library](https://arctic.js.org/)
