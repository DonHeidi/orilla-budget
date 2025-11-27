# Contacts & Invitations

**Date:** 2025-11-27
**Status:** Planned
**Category:** Platform Features
**Builds Upon:** [User Management & RBAC](./2025-11-27-user-management-rbac.md)

## Overview

This document defines the contacts and invitation system for connecting people to projects. It builds on the unified identity model where everyone is a user with project-scoped access.

### Platform Model

> This is a **freelancer platform** where:
> - Projects are the central connecting entity
> - The same person can be an expert on one project and a client on another
> - Access is **project-scoped** via `projectMembers`
> - People maintain a personal contact book of business connections
> - Invitations connect contacts to projects with specific roles

### Key Entities

| Entity | Purpose |
|--------|---------|
| `users` | All authenticated people (unified identity) |
| `contacts` | Personal address book entries (may link to users) |
| `projectMembers` | Project access with specific role |
| `invitations` | Pending invites to join projects |

---

## Immediate Priorities

### Priority 1: User Management (Authentication)

**Why first:** Foundation for all authenticated features.

**Scope:**
- User authentication (login, logout, session management)
- Password handling (hash with Argon2id, reset flow)
- PII table for GDPR-compliant personal data storage
- First user setup (seed or CLI for initial admin)

**Depends on:** Database migration (pii, users auth fields, sessions tables)

**Enables:** Everything else

---

### Priority 2: Project Membership

**Why second:** Core access control mechanism.

**Scope:**
- `projectMembers` table linking users to projects with roles
- Project roles: owner, expert, reviewer, client, viewer
- Project owner can invite others
- Access checks based on membership

**Depends on:** User management

**Enables:** Project-scoped data access, invitations

---

### Priority 3: Contacts & Invitations

**Why third:** Connects people across projects.

**Scope:**
- Personal contact book per user
- Contact → User linking (when contact has account)
- Invitation to project with specific role
- New user registration via invitation
- Existing user joins project via invitation

**Depends on:** User management, project membership, email capability

**Enables:** Collaboration, client onboarding

---

### Priority 4: Time Sheet Approval

**Why fourth:** Core business workflow.

**Scope:**
- `reviewer` role can approve time sheets
- Project `owner` can approve time sheets
- Approval UI in time sheets view
- Notification on submit/approve/reject
- Approved entries become locked

**Depends on:** Project membership (reviewer role)

**Enables:** Billing workflow, accountability

---

## Contacts System

### What is a Contact?

A **contact** is an entry in a user's personal address book:
- May or may not have a platform account
- Linked to user record if they've registered
- Used for sending invitations
- Personal to each user (not shared)

### Contact Data Model

```typescript
contacts {
  id: string
  ownerId: string             // Who owns this contact (FK → users)
  userId: string | null       // Link to user if they have account (FK → users)
  piiId: string | null        // PII if NOT linked to user (FK → pii)
  email: string               // For invitations
  organisationId: string | null  // Optional org association
  createdAt: string
}
```

### Contact Lifecycle

1. **Manual creation**: User adds contact with email
2. **From invitation**: Contact created when inviting someone
3. **Link to user**: When contact accepts invite, `userId` is set
4. **PII handling**:
   - If `userId` is set → display name from user's PII
   - If `userId` is null → display name from contact's own PII

### Display Logic

```typescript
function getContactDisplayName(contact: Contact): string {
  // If contact is a user, use their display
  if (contact.user) {
    return contact.user.pii?.name || contact.user.email
  }
  // Otherwise use contact's own PII
  if (contact.pii?.name) return contact.pii.name
  return contact.email
}
```

---

## Feature Specifications

### 1. Contact Management Features

#### 1.1 Contact List View (`/dashboard/contacts`)

**Visible to:** All authenticated users

**Features:**
- DataTable showing user's contacts
- Columns: Name/Email, Organisation, Has Account, Projects Shared, Created
- Search by name/email
- Filter by: Has Account, Organisation
- "Add Contact" button

#### 1.2 Create Contact

**Form fields:**
- Email (required)
- Name (optional - stored in PII)
- Organisation (optional dropdown)
- Phone (optional - stored in PII)
- Notes (optional - stored in PII)

**On submit:**
1. Check if email already exists as user → link to user
2. If not, create PII record for contact details
3. Create contact record

#### 1.3 Contact Detail View (`/dashboard/contacts.$id`)

**Features:**
- Display contact info (from user.pii or contact.pii)
- Show linked user status
- List shared projects (where both are members)
- "Invite to Project" action
- Edit contact details (if not linked to user)

#### 1.4 User Profile/Settings (`/dashboard/settings`)

**Visible to:** All authenticated users

**Features:**
- View own profile (from PII)
- Edit name, phone, address
- Change password
- Change email (with verification)
- View project memberships
- Request PII deletion (GDPR)

---

### 2. Invitation Flow Features

#### 2.1 Invite Contact to Project

**Location:** Contact detail view OR Project members view

**Form fields:**
- Contact (dropdown or pre-selected)
- Project (dropdown or pre-selected)
- Role (owner, expert, reviewer, client, viewer)

**On submit:**
1. Create invitation with `status: 'pending'`
2. Generate unique `code`
3. Set `expiresAt` (7 days from now)
4. Send invitation email

#### 2.2 Invitation Email

**Subject:** "You've been invited to join {Project Name}"

**Content:**
- Who invited them (inviter name)
- Project name and organisation
- Role they're being invited as
- Link: `{baseUrl}/dashboard/invite/{code}`
- Expiration notice

#### 2.3 Invitation Acceptance Page (`/dashboard/invite.$code`)

**Public route** (no auth required initially)

**Flow:**
1. Validate invitation code (not expired, pending status)
2. Show invitation details (project, role, inviter)
3. Branch based on auth state:

**If logged in:**
- Show "Accept Invitation" button
- On accept: Create projectMember, mark invitation accepted
- Redirect to project

**If not logged in, existing user (email match):**
- Show login form
- On login: Create projectMember, mark invitation accepted
- Redirect to project

**If not logged in, new user:**
- Show registration form:
  - Email (pre-filled, read-only)
  - Handle (required)
  - Password, Confirm Password
  - Name (optional - stored in PII)
- On submit:
  - Create PII record
  - Create user with passwordHash
  - Create projectMember
  - Mark invitation accepted
  - Auto-login, redirect to project

**Error states:**
- Invalid code → "Invitation not found"
- Expired → "Invitation expired, ask for a new invite"
- Already used → "Already joined this project"

#### 2.4 Resend/Revoke Invitation

**Location:** Project members view (pending invitations tab)

**Actions:**
- **Resend:** Generate new code, reset expiration, send email
- **Revoke:** Set status to 'expired', remove from list

---

### 3. Time Sheet Approval Features

#### 3.1 Approval Permissions

**Who can approve (project-scoped):**
- Project `owner` role
- Project `reviewer` role
- System `admin` / `super_admin` (any project)

**What they approve:**
- Time sheets for projects where they have approval permission

#### 3.2 Time Sheet Submission

**Current state:** Time sheets have workflow: draft → submitted → approved/rejected

**Submission action:**
- User clicks "Submit for Approval"
- Status changes to 'submitted'
- `submittedAt` timestamp recorded
- Notification sent to project owners/reviewers

#### 3.3 Approval UI

**Location:** Project time sheet detail view (`/dashboard/projects.$id/time-sheets`)

**Visible to:** Users with `time-sheets:approve` permission on project

**Actions:**
- "Approve" button → status: 'approved', `approvedAt`, `approvedByUserId`
- "Reject" button → opens modal for rejection reason
- "Request Changes" → status back to 'draft' with comments

#### 3.4 Approved Entry Locking

**When time sheet approved:**
- All time entries in the sheet become locked
- Locked entries: read-only, no edit/delete
- Visual indicator (lock icon, greyed out actions)

#### 3.5 Notifications

**On submission:**
- Email to project members with `reviewer` or `owner` role
- Include: submitter name, project, time period, hours total

**On approval/rejection:**
- Email to submitter
- Include: status, approver name, rejection reason if applicable

---

## Data Model Additions

> See [GDPR Data Model](../gdpr-data-model.md) for core tables (pii, users, contacts).

### Project Members (Core)

```typescript
projectMembers {
  id: string
  projectId: string           // FK → projects
  userId: string              // FK → users
  role: 'owner' | 'expert' | 'reviewer' | 'client' | 'viewer'
  createdAt: string
  // Unique constraint on (projectId, userId)
}
```

### Invitations (Core)

```typescript
invitations {
  id: string
  contactId: string           // FK → contacts
  invitedByUserId: string     // FK → users
  projectId: string           // FK → projects
  role: 'owner' | 'expert' | 'reviewer' | 'client' | 'viewer'
  code: string                // Unique invitation code
  expiresAt: string
  status: 'pending' | 'accepted' | 'expired'
  createdAt: string
}
```

### Notification Preferences (Future)

```typescript
notificationPreferences {
  id: string
  userId: string              // FK → users
  emailOnInvitation: boolean
  emailOnSubmission: boolean
  emailOnApproval: boolean
  emailOnRejection: boolean
}
```

### Approval History (Future)

```typescript
approvalHistory {
  id: string
  timeSheetId: string         // FK → timeSheets
  action: 'submitted' | 'approved' | 'rejected' | 'changes_requested'
  performedByUserId: string   // FK → users
  performedAt: string
  comment: string | null
}
```

---

## Implementation Order

### Phase A: User Authentication (Priority 1)

1. **Database migration**
   - Create `pii` table
   - Add auth fields to users table (piiId, passwordHash, role)
   - Create `sessions` table

2. **Auth utilities**
   - `src/lib/auth.ts` - password hashing (Argon2id)
   - `src/lib/session.ts` - token management

3. **Repository layer**
   - `pii.repository.ts` - create
   - `session.repository.ts` - create
   - `user.repository.ts` - add auth methods

4. **Routes**
   - `/dashboard/login` - login page
   - `/dashboard/_authenticated.tsx` - auth guard
   - `/dashboard/_authenticated/settings` - profile

5. **Seeding**
   - CLI or seed script for initial admin user

### Phase B: Project Membership (Priority 2)

1. **Database migration**
   - Create `projectMembers` table

2. **Repository layer**
   - `projectMember.repository.ts` - create

3. **Permission system**
   - `src/lib/permissions.ts` - project role permissions

4. **Routes**
   - `/dashboard/projects` - filtered by membership
   - `/dashboard/projects.$id/members` - manage members

### Phase C: Contacts & Invitations (Priority 3)

1. **Database migration**
   - Create `contacts` table
   - Create `invitations` table

2. **Repository layer**
   - `contact.repository.ts` - create
   - `invitation.repository.ts` - create

3. **Email setup**
   - Choose provider (Resend recommended)
   - Create invitation email template

4. **Routes**
   - `/dashboard/contacts` - contact list
   - `/dashboard/contacts.$id` - contact detail
   - `/dashboard/invite.$code` - invitation acceptance

5. **UI Components**
   - Contact create/edit forms
   - Invite to project flow
   - Pending invitations list

### Phase D: Time Sheet Approval (Priority 4)

1. **Permission checks**
   - `time-sheets:approve` on project membership

2. **UI updates**
   - Approve/Reject buttons (permission-gated)
   - Rejection reason modal
   - Locked entry indicators

3. **Notifications**
   - Email on submission to reviewers/owners
   - Email on approval/rejection to submitter

4. **Entry locking**
   - Lock entries when sheet approved
   - Visual indicators for locked state

---

## Open Questions

1. **Email provider:** Which service for sending emails? (Resend recommended for simplicity)

2. **Notification preferences:** MVP without preferences (always email), or build preferences UI upfront?

3. **Approval workflow:** Simple approve/reject, or multi-step with "request changes"?

4. **Contact sharing:** Should contacts be sharable within an organisation, or always personal?

5. **Invitation expiry:** How to handle expired invitations cleanly? Automatic cleanup job?

---

## Future Considerations

### Organisation-Level Permissions (Paid Accounts)

When implementing paid organisation accounts:
- `organisationMembers` table with org-level roles (owner, admin, member)
- Org admins can manage all projects within their org
- Separate from project-level permissions

### Contact Book Enhancements

- Import contacts from CSV
- Sync with external services (Google Contacts, etc.)
- Contact groups/tags
- Activity history per contact

### Advanced Invitations

- Bulk invitations to multiple contacts
- Invitation templates
- Scheduled invitations
- Invitation analytics

---

## References

- [User Management & RBAC](./2025-11-27-user-management-rbac.md) - Role definitions, auth flow
- [Permission System](./2025-11-27-permission-system.md) - Permission definitions
- [Unified Dashboard](./2025-11-27-unified-dashboard.md) - UI components, route structure
- [GDPR Data Model](../gdpr-data-model.md) - PII separation, deletion flows
