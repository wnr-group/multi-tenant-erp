# Design: Results Rework, Homework Calendar, Parent Feedback
**Date:** 2026-05-06

---

## 1. Results Page Rework

### Goal
Group exam results by academic year, show student rank per exam (parent view), and show a full ranked leaderboard (teacher view).

### Parent Mobile — `apps/mobile/app/(parent)/academics.tsx` (Results tab)

- Results tab displays exam results grouped by academic year (collapsible sections, e.g., "2025-26").
- Inside each year, exams appear as cards showing:
  - Exam name and date range
  - Total marks obtained / total max marks
  - **Rank badge**: "Rank X of Y" — computed as count of students in same section with a higher total + 1
- Tapping an exam card expands a subject breakdown table: Subject | Marks | Max | Grade.

### Teacher Mobile — `apps/mobile/app/(teacher)/classes.tsx` (Results tab)

- Existing exam selector remains.
- Results list becomes a ranked table sorted by total marks descending.
- Columns: Rank | Student Name | Total Marks | Grade.
- Top 3 get gold/silver/bronze rank badges.

### Teacher Web — `apps/web/app/(school)/teacher/results/page.tsx`

- Each exam in the list gets a "View Rankings" button.
- Opens a ranked leaderboard: sortable table with Rank, Student, Total Marks, and per-subject breakdown.

### Data Layer

- No schema changes. Rankings computed client-side:
  1. Sum `marks_obtained` per student per exam.
  2. Sort descending, assign rank (ties share rank).
- All data already available in `exam_results` table.

---

## 2. Homework Calendar View

### Goal
Replace the flat homework list on the parent mobile app with a calendar-based view that shows homework availability at a glance and reveals details on day selection.

### Parent Mobile — `apps/mobile/app/(parent)/academics.tsx` (Homework tab)

- **Top section**: `react-native-calendars` `Calendar` component.
  - Days with homework show colored dot indicators (up to 3 dots for multiple subjects).
  - Default selected day: today.
- **Bottom panel**: Scrollable list of homework cards for the selected day.
  - Each card: Subject name + color tag, Homework title, Description (truncated, expandable), Status badge (Pending / Submitted / Overdue).
  - If no homework on selected day: "No homework for this day."
- Month navigation triggers a re-fetch for the new month range.

### Data Layer

- Query: `homework` table filtered by `section_id` (student's section) and `due_date BETWEEN month_start AND month_end`.
- No schema changes needed.

---

## 3. Parent Feedback — Two Types

### Goal
Let parents send two distinct types of feedback: a direct message to their child's class teacher, and a formal message to school management (principal/admin).

### Parent Mobile — `apps/mobile/app/(parent)/more.tsx` (Feedback section)

Replace the current single textarea with two distinct cards:

**Card 1: "Message Teacher"**
- Icon: chat bubble
- Subtitle: "Send a message to your child's class teacher"
- Form: Subject + Message
- Submits with `to_role = 'teacher'`, `to_user_id = class_teacher_id` (resolved from student's section)
- Visible in teacher's existing feedback inbox on web

**Card 2: "Contact Management"**
- Icon: building/office
- Subtitle: "Reach out to the principal or school admin"
- Form: Subject + Message + To dropdown (Principal / Admin)
- Submits with `to_role = 'principal'` or `to_role = 'school_admin'`, `to_user_id = null`

### Schema Change

```sql
ALTER TABLE feedback ADD COLUMN to_user_id uuid REFERENCES auth.users(id);
```

This allows teacher-targeted messages to route to a specific teacher rather than all teachers.

### Teacher Web — `apps/web/app/(school)/teacher/feedback/feedback-list.tsx`

- Existing inbox continues to work. Teacher sees messages where `to_role = 'teacher'` AND `to_user_id = auth.uid()`.
- Add filter tabs: "From Parents" | "All".

### Admin/Principal Web — new page

- New inbox: `apps/web/app/(school)/admin/feedback/page.tsx` (and equivalent principal route).
- Lists feedback with `to_role IN ('school_admin', 'principal')`.
- Supports viewing and responding inline (same respond pattern as teacher feedback).

### RLS Policy Update

- Existing `feedback_select` policy for teachers must be tightened: teachers should only see feedback where `to_user_id = auth.uid()` (not all teacher-role feedback).
- Admin/principal policies remain broad (see all school feedback for their role).

---

## Summary of Schema Changes

| Change | Reason |
|--------|--------|
| `ALTER TABLE feedback ADD COLUMN to_user_id uuid` | Route teacher messages to specific teacher |

## Files Affected

| File | Change |
|------|--------|
| `apps/mobile/app/(parent)/academics.tsx` | Results grouping + rank badge; Homework calendar |
| `apps/mobile/app/(teacher)/classes.tsx` | Ranked results table |
| `apps/web/app/(school)/teacher/results/page.tsx` | View Rankings button + leaderboard |
| `apps/web/app/(school)/teacher/feedback/feedback-list.tsx` | Filter tabs, tightened query |
| `apps/web/app/(school)/admin/feedback/page.tsx` | New management feedback inbox |
| `supabase/migrations/` | Add `to_user_id` column + update RLS |
