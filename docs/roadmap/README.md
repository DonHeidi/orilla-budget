# Roadmap Documentation

Product roadmap and feature specifications are documented in this folder. These documents serve as the source of truth for planned features and architectural decisions.

## File Structure

```
docs/
├── roadmap/
│   ├── README.md                         # This file - conventions
│   ├── YYYY-MM-DD-feature-name.md        # Feature specifications
│   └── ...
├── database.md                           # Database documentation
├── testing.md                            # Testing guide
└── gdpr-data-model.md                    # GDPR compliance docs
```

---

## Document Format

Each roadmap document follows this structure:

```markdown
# Feature Title

**Date:** YYYY-MM-DD
**Status:** Planned | In Progress | Completed
**Category:** Security & Authentication | Architecture & UI | etc.
**Parent:** [Parent Doc](./parent-doc.md)  (if this is a sub-document)
**Context:** Brief context about the feature

## Related Documents
- [Related Doc](./related-doc.md) - Description

## Overview
Brief description of the feature and its goals.

---

## Current State Analysis
What exists today and what gaps need to be addressed.

---

## Proposed Solution
Detailed technical specification including:
- Data model changes (with code examples)
- Implementation approach
- UI/UX considerations

---

## Implementation Phases
Numbered phases with clear deliverables.

---

## Files Overview
Tables showing:
- New files to create
- Files to modify
- Files to delete

---

## Technical Considerations
Security, performance, and other technical notes.

---

## Dependencies
New packages or tools required.

---

## References
External documentation links.

---

## Next Steps
Immediate action items.
```

---

## Naming Convention

**Format**: `YYYY-MM-DD-feature-name.md`

- Date is when the document was created
- Use kebab-case for feature name
- Examples: `2025-11-27-user-management-rbac.md`, `2025-11-22-dashboard-improvements.md`

---

## Status Values

- `Planned` - Specification complete, not yet started
- `In Progress` - Currently being implemented
- `Completed` - Fully implemented and merged

---

## Document Relationships

- Use **Parent** field to link to the main overview document
- Use **Related Documents** section to cross-reference related specs
- Large features should have a main overview doc with sub-documents for details

---

## Code Examples

Include TypeScript code samples for:
- Database schema definitions (Drizzle)
- Zod validation schemas
- Repository methods
- React components and hooks

---

## Checklists

Use markdown checkboxes for implementation tracking:

```markdown
### Phase 1: Foundation
- [ ] Create database tables
- [ ] Add repository methods
- [x] Write Zod schemas (completed)
```

---

## Working with Roadmap Documents

### Before Implementing a Feature

1. Read the relevant roadmap document(s)
2. Check the **Status** field - is it approved for implementation?
3. Review **Implementation Phases** for the recommended order
4. Check **Files Overview** for affected files
5. Follow the phase order unless there's a good reason to deviate

### During Implementation

1. Update checkboxes in the roadmap doc as tasks complete
2. Update **Status** to "In Progress" when starting
3. Add resolution notes for completed items (see dashboard-improvements.md for examples)
4. Update **Last Updated** date if making significant changes

### After Implementation

1. Update **Status** to "Completed"
2. Ensure all checkboxes are checked
3. Add any lessons learned or deviations from the plan

---

## Current Roadmap Documents

| Document | Status | Description |
|----------|--------|-------------|
| [User Management & RBAC](2025-11-27-user-management-rbac.md) | Completed | Authentication, authorization, unified identity model |
| [Permission System](2025-11-27-permission-system.md) | Completed | Granular permissions, role mappings |
| [Unified Dashboard](2025-11-27-unified-dashboard.md) | Completed | Merge expert/admin/portal into single dashboard |
| [Account & Contact Features](2025-11-27-account-contact-features.md) | Completed | Invitation flow, contact management |
| [User Management Enhancements](2025-11-28-user-management-enhancements.md) | Planned | Email integration, 2FA, OAuth, audit logging, GDPR |
| [Dashboard Improvements](2025-11-22-dashboard-improvements.md) | In Progress | Bug fixes, UI/UX improvements |
| [Focus Timer & Mindfulness](2025-11-25-focus-timer-mindfulness.md) | Planned | Focus timer feature |
| [Better Auth Migration](2025-12-02-better-auth-migration.md) | Completed | Migrate custom auth to Better Auth framework |
| [Email Integration](2025-12-03-email-integration.md) | Planned | GDPR-safe email service, password reset, verification |
| [User Auth Flows](2025-12-03-user-auth-flows.md) | Planned | Signup, password reset, settings, session management |
| [Project Ownership Model](2025-12-06-project-ownership-model.md) | Planned | Creator tracking, ownership rules, minimum owner enforcement |
