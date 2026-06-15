# Sub-plan 5: Re-seed Demo Data for the New Model

> Part of [User/Role Login Rework](../2026-06-13-user-role-login-rework.md). Depends on Sub-plans 1 & 2.
> REQUIRED SUB-SKILL: superpowers:subagent-driven-development or superpowers:executing-plans.

**Goal:** `supabase/seed.sql` no longer writes `profiles.school_id` (dropped in Sub-plan 1) and demonstrates the new model: a multi-school user, a teacher-who-is-also-parent, and a parent with multiple children — all via `user_roles` and `parent_profile_id`.

**Architecture:** Remove the `UPDATE public.profiles SET school_id = ...` block; affiliation is already expressed by the `INSERT INTO public.user_roles` block below it. Add a second demo school and example cross-cutting users so QA can exercise every switch path.

**Tech Stack:** Supabase seed SQL, applied via `supabase db reset`.

**Known references to fix:** `supabase/seed.sql:95-105` sets `profiles.school_id`. This is the line that breaks after Sub-plan 1.

---

### Task 1: Remove the `profiles.school_id` update block

**Files:**
- Modify: `supabase/seed.sql` (lines ~95-105)

- [ ] **Step 1: Delete the dead update**

Remove the entire block:

```sql
-- Update profiles with school_id for school-scoped users
UPDATE public.profiles SET school_id = 'aaaaaaaa-0000-0000-0000-000000000001'
WHERE id IN (
  'aaaaaaaa-0000-0000-0000-000000000011',
  ...
);
```

Leave the `user_roles` INSERT block (immediately below) intact — that already carries `school_id`.

- [ ] **Step 2: Apply and verify the seed runs clean**

Run: `cd "/Users/dineshlearning/Documents/make money/erp" && supabase db reset`
Expected: completes without error (no "column school_id does not exist").

- [ ] **Step 3: Commit**

```bash
git add supabase/seed.sql
git commit -m "chore(seed): drop profiles.school_id update; affiliation via user_roles only"
```

---

### Task 2: Add a second demo school + a baked-school UUID for mobile

**Files:**
- Modify: `supabase/seed.sql` (schools section, near the first school insert)

- [ ] **Step 1: Add a second school**

Find the `INSERT INTO public.schools` for the first demo school and add a second row with a distinct `domain` (e.g. `demo2.lvh.me`) and a fixed UUID `aaaaaaaa-0000-0000-0000-000000000002`:

```sql
INSERT INTO public.schools (id, name, domain, is_active)
VALUES ('aaaaaaaa-0000-0000-0000-000000000002', 'Demo School Two', 'demo2.lvh.me', true)
ON CONFLICT (id) DO NOTHING;
```

> The mobile `EXPO_PUBLIC_SCHOOL_ID` (Sub-plan 4 Task 1) should be set to the FIRST demo school UUID `aaaaaaaa-0000-0000-0000-000000000001` for local testing.

- [ ] **Step 2: Apply and verify**

Run: `supabase db reset`
Expected: two schools present. Verify:
```sql
SELECT id, name, domain FROM public.schools;
```
Expected: both demo schools listed.

- [ ] **Step 3: Commit**

```bash
git add supabase/seed.sql
git commit -m "chore(seed): add second demo school for multi-school testing"
```

---

### Task 3: Seed cross-cutting demo users (teacher-parent, multi-school, multi-child)

**Files:**
- Modify: `supabase/seed.sql` (user_roles + student_profiles sections)

- [ ] **Step 1: Make one teacher also a parent at the same school**

Pick an existing teacher user (e.g. `aaaaaaaa-0000-0000-0000-000000000013`) and add a `parent` role at school one:

```sql
INSERT INTO public.user_roles (user_id, school_id, role, is_active)
VALUES ('aaaaaaaa-0000-0000-0000-000000000013', 'aaaaaaaa-0000-0000-0000-000000000001', 'parent', true)
ON CONFLICT (user_id, school_id, role) DO NOTHING;
```

- [ ] **Step 2: Give that teacher-parent two children at school one**

In the `student_profiles` INSERT section, ensure at least two students have `parent_profile_id = 'aaaaaaaa-0000-0000-0000-000000000013'` and `school_id = 'aaaaaaaa-0000-0000-0000-000000000001'`. Add rows if needed:

```sql
INSERT INTO public.student_profiles (id, school_id, full_name, admission_number, parent_profile_id, class_id, section_id)
VALUES
  ('bbbbbbbb-0000-0000-0000-000000000101', 'aaaaaaaa-0000-0000-0000-000000000001', 'Aarav Demo', 'ADM101', 'aaaaaaaa-0000-0000-0000-000000000013', <class_id>, <section_id>),
  ('bbbbbbbb-0000-0000-0000-000000000102', 'aaaaaaaa-0000-0000-0000-000000000001', 'Diya Demo', 'ADM102', 'aaaaaaaa-0000-0000-0000-000000000013', <class_id>, <section_id>)
ON CONFLICT (id) DO NOTHING;
```

Replace `<class_id>` / `<section_id>` with real seeded IDs (grep the seed for an existing `student_profiles` insert to copy valid class/section UUIDs).

- [ ] **Step 3: Make one user belong to BOTH schools**

Add a role for the teacher-parent at school two as well, to demonstrate the multi-school model (separate app build per school, same phone):

```sql
INSERT INTO public.user_roles (user_id, school_id, role, is_active)
VALUES ('aaaaaaaa-0000-0000-0000-000000000013', 'aaaaaaaa-0000-0000-0000-000000000002', 'teacher', true)
ON CONFLICT (user_id, school_id, role) DO NOTHING;
```

- [ ] **Step 4: Apply and verify the demo scenarios**

Run: `supabase db reset`
Then verify:
```sql
-- teacher-parent has both roles at school one
SELECT role FROM public.user_roles
WHERE user_id = 'aaaaaaaa-0000-0000-0000-000000000013'
  AND school_id = 'aaaaaaaa-0000-0000-0000-000000000001';
-- expect: teacher AND parent

-- two children
SELECT full_name FROM public.student_profiles
WHERE parent_profile_id = 'aaaaaaaa-0000-0000-0000-000000000013';
-- expect: Aarav Demo, Diya Demo

-- belongs to both schools
SELECT DISTINCT school_id FROM public.user_roles
WHERE user_id = 'aaaaaaaa-0000-0000-0000-000000000013';
-- expect: two school ids
```
Expected: all three queries return the described rows.

- [ ] **Step 5: Commit**

```bash
git add supabase/seed.sql
git commit -m "chore(seed): add teacher-parent, multi-child, and multi-school demo users"
```

---

## Sub-plan 5 done when

- `supabase db reset` runs clean with no `profiles.school_id` reference.
- A demo teacher-parent with two children at school one exists and also has a role at school two.
- QA can exercise: role switch (teacher↔parent), student switch (Aarav↔Diya), and multi-school (two builds, same phone).

This completes the User/Role Login Rework plan. Return to the [index](../2026-06-13-user-role-login-rework.md) for the execution handoff.
