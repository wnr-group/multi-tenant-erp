# School Onboarding Wizard — Design Spec

**Date:** 2026-06-02
**Status:** Approved
**Scope:** First-time school admin onboarding flow

---

## Context

When a new school is provisioned by the platform admin, the school admin logs in to a blank school. There is no academic year, no classes, no teachers, no students. Without guided setup, the admin faces an empty dashboard with no clear starting point.

This spec describes a full-page, multi-step onboarding wizard that guides the school admin through the minimum viable setup in 15–20 minutes, after which the full admin interface becomes accessible.

This wizard is **first-time only**. Subsequent year setup (promoting students, copying sections/timetable to a new year) is a separate lighter flow designed as part of the academic year feature.

---

## Completion Signal

A school is considered "set up" when it has at least one `academic_years` row. No new DB column or flag is needed. This is derived purely from DB state.

---

## Route Structure

**Route:** `/admin/onboarding`

This route sits **outside** the `(school)` layout group so it renders without the sidebar and topbar shell. It is a standalone full-page experience.

### Entry Logic

In `app/(school)/admin/layout.tsx`, after confirming the user has `school_admin` or `super_admin` role, query `academic_years` for the school. If zero rows exist, redirect to `/admin/onboarding` before rendering the normal admin layout.

This means every page under `/admin/*` is naturally gated — no special per-page check needed.

### Exit Logic

On wizard completion, redirect to `/admin/dashboard`. The academic year created in Step 1 serves as the permanent completion flag.

### Re-entry Prevention

- If the school already has ≥1 academic year, visiting `/admin/onboarding` redirects immediately to `/admin/dashboard`.
- A `super_admin` visiting a school that is already set up gets the same redirect.

### URL Behaviour

The URL stays at `/admin/onboarding` throughout all 4 steps. Step state lives in React client state only — no sub-routes, no back-button confusion.

---

## Resume Logic

On wizard mount, query the DB and derive which step to resume from:

| DB State | Resume At |
|---|---|
| No academic year | Step 1 |
| Has academic year, no classes | Step 2 |
| Has classes, no teacher profiles for this school | Step 3 |
| Has teachers, no student profiles for this school | Step 4 |
| Has all four | Redirect to `/admin/dashboard` |

---

## Step Structure

### Progress Indicator

A horizontal stepper at the top of the page showing all 4 steps:

```
① Academic Year  →  ② Classes & Sections  →  ③ Teachers  →  ④ Students
```

- Completed steps: checkmark icon, muted style
- Current step: highlighted with brand colour
- Future steps: greyed out
- School name and logo shown top-left throughout

---

### Step 1 — Academic Year

**Fields:**
- Year name (text input) — smart default pre-filled as current Indian academic year (e.g. "2025-26", April this year → March next year)
- Start date (date picker) — pre-filled to April 1 of current year
- End date (date picker) — pre-filled to March 31 of next year

**Action:** "Create & Continue" — inserts into `academic_years` with `status = 'active'`, then advances to Step 2.

**Dependency:** Requires the academic year schema rewrite (replacing `is_current boolean` with `status enum`) from the academic year redesign spec to be migrated first.

**Validation:** Name required. Start date must be before end date.

---

### Step 2 — Classes & Sections

Reuses the existing `ClassesQuickSetup` component directly (already built at `app/(school)/admin/classes/classes-quick-setup.tsx`).

- Chip-toggle grid for preset classes (LKG, UKG, 1–12)
- Chip-toggle grid for preset sections (A–E)
- Custom class/section input for non-standard names
- Live preview: "X classes × Y sections = Z total"

**Action:** "Create & Continue" — inserts classes and sections, then advances to Step 3.

**Escape:** "I'll set this up later" text link at the bottom — skips to Step 3 without creating classes. Not a prominent button.

---

### Step 3 — Teachers

A dynamic bulk-entry list. Each row has:
- Full Name (text input)
- Phone Number (10-digit, country code +91 prepended automatically)

"+ Add another teacher" link appends a new empty row. Rows can be removed with an X button. Minimum: 0 rows (skip is allowed).

**Action:** "Save & Continue" — creates `auth` users + `profiles` + `teacher_profiles` + `user_roles` for each row, then advances to Step 4.

**Escape:** "Skip for now" text link — teachers can be added later from the Teachers page.

**Note:** Subject assignments and class teacher designation are NOT part of this step. Those are configured in the full Teachers page after setup. This step only gets teachers able to log in.

---

### Step 4 — Students

A dynamic bulk-entry list. Each row has:
- Full Name (text input)
- Class (dropdown — populated from classes created in Step 2)
- Section (dropdown — filtered by selected class)

"+ Add another student" link appends a new empty row.

**Action:** "Finish Setup" — creates student records, then shows the completion screen.

**Escape:** "Skip for now" text link — students can be added later via bulk import or the Students page.

---

## Completion Screen

After Step 4 confirms, show a full-screen success state for 2 seconds before auto-redirecting to `/admin/dashboard`:

- Large checkmark
- School name
- Text: "Your school is ready. Taking you to the dashboard…"
- No button — auto-redirects after 2 seconds

---

## Post-Onboarding Dashboard Banner

On the admin's first visit to the dashboard after completing setup, show a single dismissible banner:

> "Setup complete — here's what to do next:"
> [Add Timetable] [Assign Subjects] [Set Up Fees]

- Three quick-action chips linking to the relevant pages
- Dismissed permanently when the admin clicks X
- Dismissed state stored in `localStorage` (no DB column needed)

---

## What This Wizard Does NOT Cover

These are configured in normal admin flow after setup:

- Subject assignments per teacher
- Class teacher designation per section
- Timetable creation
- Fee structure setup
- Syllabus upload
- Subsequent academic year creation (separate wizard, part of academic year feature)

---

## Files Affected

| File | Change |
|---|---|
| `app/(school)/admin/layout.tsx` | Add DB check + redirect to `/admin/onboarding` if no academic year |
| `app/admin/onboarding/page.tsx` | New — full-page wizard (outside `(school)` layout group) |
| `app/admin/onboarding/steps/step-academic-year.tsx` | New — Step 1 component |
| `app/admin/onboarding/steps/step-classes.tsx` | New — Step 2, wraps existing `ClassesQuickSetup` |
| `app/admin/onboarding/steps/step-teachers.tsx` | New — Step 3 bulk-entry component |
| `app/admin/onboarding/steps/step-students.tsx` | New — Step 4 bulk-entry component |
| `app/admin/onboarding/completion-screen.tsx` | New — 2-second success state |
| `app/(school)/admin/dashboard/page.tsx` | Add post-onboarding dismissible banner |

---

## Out of Scope

- Mobile (Expo app) onboarding — school admins use the web app only
- Platform admin onboarding — covered by the platform admin flow
- Re-running onboarding for existing schools
