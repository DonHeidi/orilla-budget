# Focus Timer & Mindfulness Notes

**Date:** 2025-11-25
**Status:** Planned
**Category:** Mental Health & Productivity
**Context:** Adding mindfulness and productivity tracking to support mental health awareness while working

## Overview

This feature combines mental health practices with productivity tracking by implementing a focus timer that periodically prompts users to document what they're currently working on. This creates a lightweight mindfulness practice that:

1. Encourages regular check-ins with current focus and mental state
2. Creates a timestamped log of work activities
3. Provides raw data that can later be reconciled into formal time entries
4. Supports awareness of time passage and work patterns

---

## Feature Description

### Focus Timer with Check-In Prompts

**Core Functionality:**
- Timer that runs in the background while user works
- After a configurable interval (starting with 5 minutes for testing), shows a non-intrusive prompt
- Prompt asks: "What are you working on right now?"
- User enters a simple note (not exhaustive, just a quick capture)
- System automatically timestamps the note
- Notes are saved for later reconciliation

**User Experience:**
- Timer should be easily accessible (status bar, floating widget, or sidebar)
- Prompts should be non-blocking and dismissible
- Visual/audio notification option for check-in time
- Quick capture interface (single input field, one-click save)
- Ability to pause/resume timer
- Ability to skip a check-in if in flow state

---

## Technical Design

### Data Model

#### New Table: `focusNotes`

```typescript
export const focusNotes = sqliteTable('focus_notes', {
  id: text('id').primaryKey(),
  userId: text('user_id').references(() => users.id, {
    onDelete: 'cascade'
  }),
  note: text('note').notNull(),
  timestamp: text('timestamp').notNull(), // ISO datetime
  intervalMinutes: integer('interval_minutes').notNull(), // e.g., 5, 15, 30
  reconciledToTimeEntryId: text('reconciled_to_time_entry_id').references(() => timeEntries.id, {
    onDelete: 'set null'
  }), // null = not yet reconciled
  createdAt: text('created_at').notNull(),
})
```

#### New Table: `focusSettings`

```typescript
export const focusSettings = sqliteTable('focus_settings', {
  id: text('id').primaryKey(),
  userId: text('user_id').references(() => users.id, {
    onDelete: 'cascade'
  }).notNull().unique(),
  intervalMinutes: integer('interval_minutes').notNull().default(5), // Default 5 for testing
  enabled: integer('enabled', { mode: 'boolean' }).notNull().default(true),
  notificationSound: integer('notification_sound', { mode: 'boolean' }).notNull().default(false),
  autoStart: integer('auto_start', { mode: 'boolean' }).notNull().default(false), // Auto-start timer on login
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
})
```

### UI Components

#### 1. Focus Timer Widget
**Location:** Sidebar or floating component on dashboard
**Features:**
- Shows current timer state (running/paused)
- Displays time until next check-in
- Start/Stop/Pause controls
- Settings icon to adjust interval

#### 2. Check-In Prompt Modal/Toast
**Trigger:** When timer interval completes
**Contents:**
- Timestamp (read-only, auto-populated)
- Simple text input: "What are you working on?"
- Actions:
  - "Save" (saves note, restarts timer)
  - "Skip" (restarts timer without saving)
  - "Pause Timer" (dismisses prompt, pauses timer)

#### 3. Focus Notes Log View
**Route:** `/dashboard/focus-notes`
**Features:**
- List all focus notes with timestamps
- Filter by date range
- Group by day
- Select multiple notes to reconcile into time entries
- Quick actions:
  - Convert to time entry
  - Edit note
  - Delete note
  - Mark as reconciled manually

#### 4. Reconciliation Interface
**Location:** Part of Focus Notes view or Time Entries view
**Functionality:**
- Select multiple focus notes from a time range
- Automatically calculate duration based on timestamps
- Pre-fill time entry form with:
  - Combined notes as description
  - Calculated hours
  - Date from first note timestamp
- User completes: title, project selection
- Option to keep or delete source focus notes after reconciliation

#### 5. Focus Settings Page
**Route:** `/dashboard/settings/focus`
**Configuration Options:**
- Interval duration (5, 15, 30, 45, 60 minutes)
- Enable/disable notifications
- Sound on/off
- Auto-start timer on dashboard load

---

## User Workflows

### Workflow 1: Regular Work Session with Check-Ins

1. User opens dashboard
2. Focus timer auto-starts (if enabled in settings)
3. After 5 minutes, prompt appears: "What are you working on?"
4. User types: "Reviewing client wireframes"
5. Clicks "Save" - note saved with timestamp 10:05 AM
6. Timer resets and runs for another 5 minutes
7. At 10:10 AM, prompt appears again
8. User types: "Updating project estimate spreadsheet"
9. Process repeats throughout work session

### Workflow 2: Reconciling Focus Notes to Time Entry

1. User navigates to `/dashboard/focus-notes`
2. Sees list of notes from today:
   - 10:05 AM - "Reviewing client wireframes"
   - 10:10 AM - "Updating project estimate spreadsheet"
   - 10:15 AM - "Client phone call - budget questions"
   - 10:20 AM - "Updating project estimate spreadsheet"
3. Selects first two notes (10:05 and 10:10)
4. Clicks "Convert to Time Entry"
5. Form pre-fills:
   - Hours: 0.17 (10 minutes auto-calculated)
   - Description: "Reviewing client wireframes, Updating project estimate spreadsheet"
   - Date: 2025-11-25
6. User adds:
   - Title: "Project planning and review"
   - Project: "Acme Website Redesign"
7. Saves time entry
8. Original focus notes marked as reconciled (linked to time entry ID)

### Workflow 3: Skipping Check-Ins During Flow State

1. Timer prompt appears during deep focus work
2. User clicks "Skip" - timer resets without saving note
3. User continues working uninterrupted
4. Next prompt in 5 minutes

---

## Implementation Phases

### Phase 1: Core Timer & Note Capture (MVP)
**Goal:** Basic functional timer with note capture

1. Create database schema and migrations
   - `focusNotes` table
   - `focusSettings` table
2. Create repository layer
   - `focusNote.repository.ts`
   - `focusSetting.repository.ts`
3. Create basic timer component
   - Client-side timer using React state/hooks
   - Display time remaining
   - Start/Stop/Pause controls
4. Create check-in prompt component
   - Modal or toast notification
   - Single text input for note
   - Save/Skip/Pause actions
5. Create focus notes log view
   - Simple list of all notes with timestamps
   - Basic filtering by date
6. Add to dashboard sidebar navigation
   - Link to focus notes view

**Testing Focus:**
- Timer accuracy
- Note persistence
- Timestamp correctness
- 5-minute interval for rapid testing

### Phase 2: Settings & Configuration
**Goal:** User control over timer behavior

1. Create settings UI (`/dashboard/settings/focus`)
   - Interval selection (5, 15, 30, 45, 60 min)
   - Enable/disable toggle
   - Auto-start toggle
   - Notification preferences
2. Implement settings persistence
   - Load user settings on dashboard mount
   - Apply settings to timer behavior
3. Add timer state persistence
   - Store timer state in localStorage
   - Restore timer on page reload
   - Handle timer across navigation

**Testing Focus:**
- Settings saved correctly
- Timer respects user preferences
- State persistence across sessions

### Phase 3: Reconciliation Interface
**Goal:** Convert focus notes into time entries

1. Add selection UI to focus notes view
   - Checkbox for each note
   - "Select all in range" helper
2. Create reconciliation form/modal
   - Auto-calculate duration from timestamps
   - Combine notes into description
   - Allow project/title input
3. Link reconciled notes to time entries
   - Update `reconciledToTimeEntryId` field
   - Visual indicator for reconciled notes
   - Filter view: Show only unreconciled notes
4. Add bulk actions
   - Delete selected notes
   - Export to CSV
   - Mark as reconciled without creating entry

**Testing Focus:**
- Duration calculation accuracy
- Reconciliation data integrity
- Preventing double-reconciliation

### Phase 4: Advanced Features
**Goal:** Enhance UX and add power user features

1. Timer enhancements
   - Audio notification option
   - Browser notification API integration
   - Visual progress indicator
   - Keyboard shortcuts (pause: Space, skip: Esc)
2. Note templates/suggestions
   - Recent notes shown for quick selection
   - Autocomplete based on history
3. Analytics view
   - Daily/weekly note count
   - Most productive time of day
   - Work pattern visualization
4. Export functionality
   - Export focus notes to CSV/JSON
   - Integration with time entry export

---

## Technical Considerations

### Timer Implementation

**Client-Side Timer (Recommended for MVP):**
- Use `setInterval` or `setTimeout` with React state
- Store timer state in localStorage for persistence
- Pros: Simple, immediate feedback, works offline
- Cons: Affected by tab sleep/backgrounding, not perfectly accurate

**Future Enhancement - Web Worker Timer:**
- Move timer logic to Web Worker
- More accurate, runs even when tab backgrounded
- Better for longer intervals (15+ minutes)

**Future Enhancement - Server-Side Tracking:**
- Track "focus session" start time on server
- Client polls for elapsed time
- Most accurate, survives page reload
- Requires additional API endpoints

### Browser Notifications

```typescript
// Request permission on settings enable
if (Notification.permission === 'default') {
  await Notification.requestPermission()
}

// Show notification when timer completes
if (settings.notificationSound && Notification.permission === 'granted') {
  new Notification('Focus Check-In', {
    body: 'What are you working on right now?',
    icon: '/favicon.ico',
    requireInteraction: true,
  })
}
```

### State Management

**Timer State:**
- Store in React Context or Zustand for global access
- Persist to localStorage for page reload recovery
- Track: `isRunning`, `startTime`, `intervalMinutes`, `remainingSeconds`

**Notes Sync:**
- Optimistic UI updates when saving notes
- Use TanStack Query for server state management
- Invalidate notes list on save/delete

---

## Success Metrics

### Engagement Metrics
- Number of focus notes captured per user per day
- Timer uptime (% of dashboard session with timer active)
- Skip rate (skipped prompts vs. completed prompts)

### Productivity Metrics
- Reconciliation rate (% of notes converted to time entries)
- Time from note capture to reconciliation
- Average time entry accuracy (based on focus notes data)

### Mental Health Indicators
- User-reported mindfulness improvement (future survey)
- Session duration trends (are users taking breaks?)
- Note content sentiment analysis (optional, privacy-aware)

---

## Privacy & Data Considerations

### User Privacy
- Focus notes are private to the user by default
- Users control when/if notes become formal time entries
- Option to export and delete all focus notes

### Data Retention
- Keep unreconciled notes for 90 days (configurable)
- Reconciled notes can be archived or deleted by user
- Deleted notes are hard-deleted (not soft-deleted)

### Future: Team Sharing (Optional)
- Allow users to share focus patterns with team (opt-in)
- Aggregate anonymized data for team productivity insights
- Admin view: Team focus patterns without individual note content

---

## Questions & Decisions Needed

1. **Timer Accuracy:** Start with client-side timer (simple) or invest in Web Worker (more accurate) from the start?
   - **Recommendation:** Start with client-side for MVP, enhance with Web Worker in Phase 4

2. **Notification Style:** Modal (blocks UI), toast (non-blocking), or browser notification (external)?
   - **Recommendation:** Toast for MVP (non-intrusive), browser notification as Phase 4 enhancement

3. **Default Interval:** Keep 5 minutes for testing, but what's the recommended production default?
   - **Recommendation:** 5 min for testing, 25 min (Pomodoro) for production default

4. **Auto-Reconciliation:** Should the system suggest time entries based on focus note patterns?
   - **Recommendation:** Manual for MVP, AI-assisted suggestions in future

5. **Project Association:** Should focus notes optionally be tagged with a project at capture time?
   - **Recommendation:** No project at capture (keeps it lightweight), add during reconciliation

6. **Multi-Device Sync:** Should focus timer/notes sync across devices?
   - **Recommendation:** No for MVP (single-device), consider in future

7. **Pomodoro Integration:** Should we follow full Pomodoro technique (25 min work, 5 min break)?
   - **Recommendation:** Start simple with just timer, optionally add break reminders in Phase 4

8. **Note Length Limit:** Should focus notes have character limits?
   - **Recommendation:** Yes, 280 characters (tweet length) keeps it concise

---

## Integration with Existing Features

### Time Entries
- Focus notes reconcile into standard time entries
- Time entries gain optional `focusNoteIds` reference (future)
- Reconciled notes show link back to source time entry

### Dashboard Home
- Show timer widget in dashboard home view
- Display today's focus note count as a metric
- Quick link to unreconciled notes

### User Settings
- Add Focus Timer section to user settings
- Per-user configuration (not organization-wide)

---

## Future Enhancements

These are not planned for initial implementation but align with the mental health & productivity theme:

### Break Reminders
- Suggest breaks after extended focus periods
- Pomodoro-style work/break cycles
- Eye strain prevention tips

### Mood Tracking
- Optional mood rating at each check-in
- Correlate mood with productivity patterns
- Visualize mental health trends over time

### AI Insights
- Analyze focus notes to suggest project associations
- Detect context switching patterns
- Recommend optimal focus intervals based on user data

### Wellness Prompts
- Occasional mindfulness micro-exercises
- Breathing exercise reminders
- Posture check reminders

### Team Features
- Shared focus sessions (virtual co-working)
- Team productivity patterns (anonymized)
- Manager view: Team engagement metrics

---

## References & Inspiration

- **Pomodoro Technique:** 25-minute focus intervals with breaks
- **Time Awareness Research:** Regular check-ins improve time estimation accuracy
- **Mindfulness Apps:** Calm, Headspace (reminder mechanisms)
- **Activity Logging:** RescueTime, Toggl Track (automatic vs. manual logging balance)

---

## Next Steps

1. **Review & Feedback:** Discuss this roadmap with team/stakeholders
2. **Design Mockups:** Create UI mockups for timer widget, prompt, and notes view
3. **Database Migration:** Plan and execute schema changes
4. **Sprint Planning:** Allocate Phase 1 work to upcoming sprint
5. **User Testing:** Recruit beta users for testing 5-minute intervals and gathering feedback
