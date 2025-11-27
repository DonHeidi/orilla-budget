# GDPR Data Model Considerations

**Date:** 2025-11-27
**Status:** Draft
**Category:** Compliance & Architecture

## Overview

This document outlines the data model considerations for GDPR compliance in Orilla Budget. The goal is to separate personally identifiable information (PII) from business data so that:

1. PII can be deleted upon request (right to erasure)
2. Business data remains intact for legitimate business purposes
3. The system continues to function after PII deletion

---

## Legal Basis

### Legitimate Interest (Article 6(1)(f))

Some data is required for the system to function. Retention is justified under legitimate interest:

- **Email** - Required for authentication, notifications, invitations
- **Handle** - System identifier, not PII

### Consent / Contract (Article 6(1)(a,b))

Additional personal data collected with consent or for contract performance:

- Name
- Phone
- Address
- Notes / free-text fields

This data can be deleted without breaking system functionality.

---

## Data Classification

### System-Required Data (Retained)

| Field | Entity | Justification |
|-------|--------|---------------|
| email | users | Authentication, password reset, notifications |
| email | contacts | Invitations, communication |
| handle | users | System identifier, non-PII |
| passwordHash | users | Authentication |

### Personal Data (Deletable)

| Field | Entity | Notes |
|-------|--------|-------|
| name | pii | Display name |
| phone | pii | Contact information |
| address | pii | Billing/contact |
| notes | pii | Free-text, may contain PII |

### Business Data (Preserved)

| Entity | References | Notes |
|--------|------------|-------|
| timeEntries | userId | Hours logged, survives user PII deletion |
| timeSheets | submittedByUserId, approvedByUserId | Approval workflow |
| projectMembers | userId | Access control |
| projects | - | Business entity |
| organisations | - | Business entity |

---

## Proposed Data Model

```
pii                      # Personal data beyond system needs (deletable)
  - id
  - name
  - phone
  - address
  - notes

users                    # Authentication + system-required data
  - id
  - piiId                # FK → pii (SET NULL on delete)
  - email                # Legitimate interest
  - handle               # System identifier
  - passwordHash
  - createdAt

contacts                 # Address book entries
  - id
  - ownerId              # FK → users (who owns this contact)
  - userId               # FK → users (if contact is also a user)
  - piiId                # FK → pii (SET NULL on delete) - only if NOT linked to user
  - email                # Needed for invitations
  - organisationId
  - createdAt

projectMembers
  - id
  - userId               # FK → users
  - projectId            # FK → projects
  - role
  - createdAt

timeEntries
  - id
  - userId               # FK → users (survives PII deletion)
  - projectId
  - hours
  - ...

timeSheets
  - id
  - submittedByUserId    # FK → users
  - approvedByUserId     # FK → users (nullable)
  - ...

invitations
  - id
  - contactId            # FK → contacts
  - invitedByUserId      # FK → users
  - projectId            # FK → projects (optional)
  - code
  - expiresAt
  - status
  - createdAt
```

---

## Deletion Scenarios

### Scenario 1: User requests PII deletion (but keeps account)

**Action:** Delete row from `pii` table

**Result:**
- `users.piiId` becomes NULL
- Name, phone, address removed
- Email retained (legitimate interest)
- User can still login
- Business data intact, displays email or handle instead of name

### Scenario 2: User requests full account deletion

**Action:**
1. Delete from `pii` table
2. Anonymize `users` row (clear email, set flag)
3. Keep `users.id` for referential integrity

**Result:**
- All PII gone
- User cannot login
- Business data shows "Deleted User" or "User #[id]"
- Historical records preserved for business purposes

### Scenario 3: Contact requests data deletion

**Action:**
1. Delete from `pii` table (if contact has own piiId)
2. Keep `contacts` row for business records

**Result:**
- Contact PII removed
- Contact shows as "Deleted Contact" or email only
- Invitation history preserved

### Scenario 4: Contact who is also a user requests deletion

**Action:**
- Follow user deletion flow
- Contact row remains, `userId` becomes NULL or points to anonymized user

---

## Display Logic

When rendering user/contact information:

```typescript
function getDisplayName(user: User): string {
  if (user.pii?.name) return user.pii.name
  if (user.email) return user.email
  if (user.handle) return user.handle
  return `User #${user.id.slice(0, 8)}`
}

function getContactDisplayName(contact: Contact): string {
  // If contact is a user, use user's display
  if (contact.user) return getDisplayName(contact.user)

  // Otherwise use contact's own PII
  if (contact.pii?.name) return contact.pii.name
  if (contact.email) return contact.email
  return `Contact #${contact.id.slice(0, 8)}`
}
```

---

## Open Questions

1. **Retention period:** How long to keep anonymized user records before full deletion?

2. **Email as PII:** Email is technically PII. Is legitimate interest sufficient, or do we need explicit consent?

3. **Audit trail:** Do we need to log when PII was deleted and by whom?

4. **Data export:** GDPR also requires data portability (Article 20). What format for export?

5. **Cascading deletes:** When a user is deleted, what happens to:
   - Contacts they own?
   - Projects they created?
   - Organisations they manage?

6. **Third-party sharing:** If we integrate with external services, how do we handle deletion propagation?

---

## Implementation Notes

### Database Constraints

```sql
-- PII table with cascade-safe foreign keys
ALTER TABLE users
  ADD CONSTRAINT fk_users_pii
  FOREIGN KEY (pii_id) REFERENCES pii(id)
  ON DELETE SET NULL;

ALTER TABLE contacts
  ADD CONSTRAINT fk_contacts_pii
  FOREIGN KEY (pii_id) REFERENCES pii(id)
  ON DELETE SET NULL;
```

### Drizzle Schema Pattern

```typescript
export const pii = sqliteTable('pii', {
  id: text('id').primaryKey(),
  name: text('name'),
  phone: text('phone'),
  address: text('address'),
  notes: text('notes'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
})

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  piiId: text('pii_id').references(() => pii.id, { onDelete: 'set null' }),
  email: text('email').unique().notNull(),
  handle: text('handle').unique().notNull(),
  passwordHash: text('password_hash'),
  createdAt: text('created_at').notNull(),
})
```

---

## References

- [GDPR Article 6 - Lawfulness of processing](https://gdpr-info.eu/art-6-gdpr/)
- [GDPR Article 17 - Right to erasure](https://gdpr-info.eu/art-17-gdpr/)
- [GDPR Article 20 - Right to data portability](https://gdpr-info.eu/art-20-gdpr/)
- [ICO Guide to Legitimate Interests](https://ico.org.uk/for-organisations/guide-to-data-protection/guide-to-the-general-data-protection-regulation-gdpr/legitimate-interests/)

---

## Next Steps

1. Legal review of legitimate interest justification for email retention
2. Define retention periods for anonymized records
3. Implement data export functionality
4. Create deletion request workflow UI
5. Add audit logging for PII deletions
