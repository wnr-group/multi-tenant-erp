# Academic Year Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Introduce full multi-year data model — `student_enrollments`, `section_assignments`, year-scoped tables, cookie-based year context, top-bar year switcher, year creation wizard, and student promotion flow.

**Architecture:** Four sequential migration files rewrite the schema; a `getAcademicYearId()` server helper reads the `x-academic-year-id` header set by middleware; all admin pages query through the year ID; a new `AcademicYearSwitcher` client component sets the cookie; the Academics page gains a year creation modal wizard and a promotion flow page.

**Tech Stack:** Next.js 15 App Router, Supabase (PostgreSQL + RLS), `@supabase/ssr`, Tailwind CSS, shadcn/ui, TypeScript, `supabase` CLI for migrations.

**Spec:** `docs/superpowers/specs/2026-06-02-academic-year-redesign.md`

---

## File Map

### New migrations
| File | Responsibility |
|---|---|
| `supabase/migrations/20240001000028_academic_year_status.sql` | Drop `is_current`, add `status` enum + unique index |
| `supabase/migrations/20240001000029_student_enrollments.sql` | `student_enrollments` table + drop year cols from `student_profiles` |
| `supabase/migrations/20240001000030_section_assignments.sql` | `section_assignments` table + `academic_year_id` on `sections` + `timetable` + drop `teacher_profiles` year cols |
| `supabase/migrations/20240001000031_year_scope_columns.sql` | `academic_year_id` on `attendance_records`, `homework`, `discipline_records`, `feedback`, `announcements`, `school_gallery` + RLS updates |

### New app files
| File | Responsibility |
|---|---|
| `apps/web/lib/academic-year.ts` | `getAcademicYearId()` — reads `x-academic-year-id` header, falls back to active year |
| `apps/web/components/academic-year-switcher.tsx` | Client dropdown — lists years, sets cookie, triggers refresh |
| `apps/web/app/(school)/admin/academics/new-year-wizard.tsx` | 4-step modal wizard for creating a draft year with copied data |
| `apps/web/app/(school)/admin/academics/promotion-flow.tsx` | Bulk promotion table — shows students with suggested next class |
| `apps/web/app/(school)/admin/academics/promote/page.tsx` | Server page wrapping `promotion-flow.tsx` |

### Modified app files
| File | Change |
|---|---|
| `apps/web/middleware.ts` | Resolve year context → set `x-academic-year-id` header |
| `apps/web/components/top-bar.tsx` | Accept + render `AcademicYearSwitcher` for admin/principal |
| `apps/web/app/(school)/layout.tsx` | Fetch years, pass switcher to TopBar |
| `apps/web/app/(school)/admin/academics/page.tsx` | Show year status, "New Year" wizard trigger, "Promote Students" button |
| `apps/web/app/(school)/admin/academics/academics-table.tsx` | Show `status` badge instead of `is_current` |
| `apps/web/app/(school)/admin/academics/add-academic-year-form.tsx` | Remove (replaced by wizard) |
| `apps/web/app/(school)/admin/academics/academic-dialogs.tsx` | Remove `AddAcademicYearDialog` |
| `apps/web/app/(school)/admin/students/page.tsx` | Query `student_enrollments` for year, not `student_profiles.class_id` |
| `apps/web/app/(school)/admin/classes/page.tsx` | Query `sections` filtered by `academic_year_id` |
| `apps/web/app/(school)/admin/classes/classes-quick-setup.tsx` | Pass `academicYearId` when inserting sections |
| `apps/web/app/(school)/admin/teachers/page.tsx` | Query `section_assignments` for year |
| `apps/web/app/(school)/admin/dashboard/page.tsx` | Scope all stats to active year |
| `apps/web/supabase/seed.sql` | Update seed to use `status` instead of `is_current`, add `student_enrollments` rows |

---

## Task 1: Migration — `academic_years` status enum

**Files:**
- Create: `supabase/migrations/20240001000028_academic_year_status.sql`

- [ ] **Step 1: Write the migration**

```sql
-- supabase/migrations/20240001000028_academic_year_status.sql

ALTER TABLE public.academic_years
  DROP COLUMN IF EXISTS is_current,
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'active', 'archived'));

-- Only one active year per school at a time
CREATE UNIQUE INDEX idx_academic_years_one_active
  ON public.academic_years (school_id)
  WHERE status = 'active';
```

- [ ] **Step 2: Apply and verify**

```bash
cd "/Users/dineshlearning/Documents/make money/erp"
supabase db reset
```

Expected: migration runs without error. Then verify:

```bash
psql postgresql://postgres:postgres@127.0.0.1:54322/postgres \
  -c "\d public.academic_years"
```

Expected: `status` column present, `is_current` absent.

- [ ] **Step 3: Update seed to use `status`**

In `supabase/seed.sql`, find all references to `is_current` in academic_years inserts and replace:

```sql
-- Before (find lines like):
INSERT INTO public.academic_years ... is_current ...

-- After — replace is_current = true with status = 'active'
-- Replace is_current = false with status = 'archived'
-- Any new year without a value gets status = 'draft' by default
```

Run `grep -n "is_current" supabase/seed.sql` to find all occurrences, then edit each one.

- [ ] **Step 4: Reset DB and verify seed**

```bash
supabase db reset
psql postgresql://postgres:postgres@127.0.0.1:54322/postgres \
  -c "SELECT name, status FROM public.academic_years LIMIT 5;"
```

Expected: rows show `status` values (`active`, `archived`, `draft`), no error.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20240001000028_academic_year_status.sql supabase/seed.sql
git commit -m "feat(db): replace academic_years.is_current with status enum"
```

---

## Task 2: Migration — `student_enrollments`

**Files:**
- Create: `supabase/migrations/20240001000029_student_enrollments.sql`

- [ ] **Step 1: Write the migration**

```sql
-- supabase/migrations/20240001000029_student_enrollments.sql

CREATE TABLE public.student_enrollments (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_profile_id UUID NOT NULL REFERENCES public.student_profiles(id) ON DELETE CASCADE,
  academic_year_id   UUID NOT NULL REFERENCES public.academic_years(id) ON DELETE CASCADE,
  school_id          UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  class_id           UUID NOT NULL REFERENCES public.classes(id),
  section_id         UUID NOT NULL REFERENCES public.sections(id),
  roll_number        TEXT,
  is_active          BOOLEAN NOT NULL DEFAULT true,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(student_profile_id, academic_year_id)
);

CREATE INDEX idx_student_enrollments_student ON public.student_enrollments(student_profile_id);
CREATE INDEX idx_student_enrollments_year ON public.student_enrollments(academic_year_id);
CREATE INDEX idx_student_enrollments_school ON public.student_enrollments(school_id);
CREATE INDEX idx_student_enrollments_section ON public.student_enrollments(section_id);

-- Drop year-specific columns from student_profiles
ALTER TABLE public.student_profiles
  DROP COLUMN IF EXISTS class_id,
  DROP COLUMN IF EXISTS section_id,
  DROP COLUMN IF EXISTS roll_number;

-- RLS
ALTER TABLE public.student_enrollments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "enrollments_read" ON public.student_enrollments FOR SELECT
  USING (
    public.get_my_role() IN ('school_admin', 'principal', 'teacher', 'super_admin')
    AND school_id = public.get_my_school_id()
  );

CREATE POLICY "enrollments_write" ON public.student_enrollments FOR ALL
  USING (
    public.get_my_role() = 'super_admin'
    OR (public.get_my_role() = 'school_admin' AND school_id = public.get_my_school_id())
  )
  WITH CHECK (
    public.get_my_role() = 'super_admin'
    OR (public.get_my_role() = 'school_admin' AND school_id = public.get_my_school_id())
  );
```

- [ ] **Step 2: Update seed — add `student_enrollments` rows**

In `supabase/seed.sql`, after the existing student inserts, add enrollment rows. Find the active year UUID from the seed and the class/section UUIDs for each student:

```sql
-- Add after student_profiles inserts in seed.sql
-- Replace UUIDs with actual values from your seed
INSERT INTO public.student_enrollments
  (student_profile_id, academic_year_id, school_id, class_id, section_id, roll_number, is_active)
SELECT
  sp.id,
  ay.id,
  sp.school_id,
  -- class_id and section_id must come from seed data
  -- Use a subquery to match by name if needed
  (SELECT id FROM public.classes WHERE school_id = sp.school_id ORDER BY "order" LIMIT 1),
  (SELECT id FROM public.sections WHERE school_id = sp.school_id LIMIT 1),
  sp.admission_number,
  true
FROM public.student_profiles sp
JOIN public.academic_years ay ON ay.school_id = sp.school_id AND ay.status = 'active'
WHERE sp.school_id IS NOT NULL;
```

- [ ] **Step 3: Apply and verify**

```bash
supabase db reset
psql postgresql://postgres:postgres@127.0.0.1:54322/postgres \
  -c "SELECT COUNT(*) FROM public.student_enrollments;"
```

Expected: count matches number of seeded students. Then verify columns dropped:

```bash
psql postgresql://postgres:postgres@127.0.0.1:54322/postgres \
  -c "\d public.student_profiles"
```

Expected: no `class_id`, `section_id`, `roll_number` columns.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20240001000029_student_enrollments.sql supabase/seed.sql
git commit -m "feat(db): add student_enrollments table, drop year cols from student_profiles"
```

---

## Task 3: Migration — `section_assignments` + year-scope `sections` + `timetable`

**Files:**
- Create: `supabase/migrations/20240001000030_section_assignments.sql`

- [ ] **Step 1: Write the migration**

```sql
-- supabase/migrations/20240001000030_section_assignments.sql

-- Add academic_year_id to sections
ALTER TABLE public.sections
  ADD COLUMN IF NOT EXISTS academic_year_id UUID REFERENCES public.academic_years(id) ON DELETE CASCADE;

CREATE INDEX idx_sections_academic_year ON public.sections(academic_year_id);

-- Add academic_year_id to timetable
ALTER TABLE public.timetable
  ADD COLUMN IF NOT EXISTS academic_year_id UUID REFERENCES public.academic_years(id) ON DELETE CASCADE;

-- Drop old unique constraint, add year-scoped one
ALTER TABLE public.timetable
  DROP CONSTRAINT IF EXISTS timetable_section_id_day_of_week_period_key;

CREATE UNIQUE INDEX idx_timetable_section_year_day_period
  ON public.timetable(section_id, academic_year_id, day_of_week, period)
  WHERE academic_year_id IS NOT NULL;

CREATE INDEX idx_timetable_academic_year ON public.timetable(academic_year_id);

-- section_assignments: class teacher per section per year
CREATE TABLE public.section_assignments (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id       UUID NOT NULL REFERENCES public.sections(id) ON DELETE CASCADE,
  academic_year_id UUID NOT NULL REFERENCES public.academic_years(id) ON DELETE CASCADE,
  class_teacher_id UUID NOT NULL REFERENCES auth.users(id),
  school_id        UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(section_id, academic_year_id)
);

CREATE INDEX idx_section_assignments_year ON public.section_assignments(academic_year_id);
CREATE INDEX idx_section_assignments_school ON public.section_assignments(school_id);

-- Drop year-specific columns from teacher_profiles
ALTER TABLE public.teacher_profiles
  DROP COLUMN IF EXISTS class_teacher_of,
  DROP COLUMN IF EXISTS subjects;

-- RLS for section_assignments
ALTER TABLE public.section_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "section_assignments_read" ON public.section_assignments FOR SELECT
  USING (
    public.get_my_role() IN ('school_admin', 'principal', 'teacher', 'super_admin')
    AND school_id = public.get_my_school_id()
  );

CREATE POLICY "section_assignments_write" ON public.section_assignments FOR ALL
  USING (
    public.get_my_role() = 'super_admin'
    OR (public.get_my_role() = 'school_admin' AND school_id = public.get_my_school_id())
  )
  WITH CHECK (
    public.get_my_role() = 'super_admin'
    OR (public.get_my_role() = 'school_admin' AND school_id = public.get_my_school_id())
  );
```

- [ ] **Step 2: Update seed — link sections to active year**

In `supabase/seed.sql`, after section inserts, backfill `academic_year_id`:

```sql
-- Add after sections inserts in seed.sql
UPDATE public.sections s
SET academic_year_id = (
  SELECT id FROM public.academic_years
  WHERE school_id = s.school_id AND status = 'active'
  LIMIT 1
)
WHERE s.academic_year_id IS NULL;
```

- [ ] **Step 3: Apply and verify**

```bash
supabase db reset
psql postgresql://postgres:postgres@127.0.0.1:54322/postgres \
  -c "SELECT COUNT(*) FROM public.sections WHERE academic_year_id IS NOT NULL;"
psql postgresql://postgres:postgres@127.0.0.1:54322/postgres \
  -c "\d public.teacher_profiles"
```

Expected: all sections have a year ID; `class_teacher_of` and `subjects` columns absent from `teacher_profiles`.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20240001000030_section_assignments.sql supabase/seed.sql
git commit -m "feat(db): add section_assignments, year-scope sections+timetable, drop teacher_profiles year cols"
```

---

## Task 4: Migration — year-scope remaining tables

**Files:**
- Create: `supabase/migrations/20240001000031_year_scope_columns.sql`

- [ ] **Step 1: Write the migration**

```sql
-- supabase/migrations/20240001000031_year_scope_columns.sql

-- attendance_records
ALTER TABLE public.attendance_records
  ADD COLUMN IF NOT EXISTS academic_year_id UUID REFERENCES public.academic_years(id);

CREATE INDEX idx_attendance_academic_year ON public.attendance_records(academic_year_id);

-- homework
ALTER TABLE public.homework
  ADD COLUMN IF NOT EXISTS academic_year_id UUID REFERENCES public.academic_years(id);

CREATE INDEX idx_homework_academic_year ON public.homework(academic_year_id);

-- discipline_records (nullable — history preserved)
ALTER TABLE public.discipline_records
  ADD COLUMN IF NOT EXISTS academic_year_id UUID REFERENCES public.academic_years(id);

CREATE INDEX idx_discipline_academic_year ON public.discipline_records(academic_year_id);

-- feedback (nullable — history preserved)
ALTER TABLE public.feedback
  ADD COLUMN IF NOT EXISTS academic_year_id UUID REFERENCES public.academic_years(id);

CREATE INDEX idx_feedback_academic_year ON public.feedback(academic_year_id);

-- announcements (nullable — timely announcements have no year)
ALTER TABLE public.announcements
  ADD COLUMN IF NOT EXISTS academic_year_id UUID REFERENCES public.academic_years(id);

CREATE INDEX idx_announcements_academic_year ON public.announcements(academic_year_id);

-- school_gallery (nullable — generic photos have no year)
ALTER TABLE public.school_gallery
  ADD COLUMN IF NOT EXISTS academic_year_id UUID REFERENCES public.academic_years(id);

CREATE INDEX idx_gallery_academic_year ON public.school_gallery(academic_year_id);
```

- [ ] **Step 2: Apply and verify**

```bash
supabase db reset
psql postgresql://postgres:postgres@127.0.0.1:54322/postgres -c "
  SELECT
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_name='attendance_records' AND column_name='academic_year_id') as attendance,
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_name='homework' AND column_name='academic_year_id') as homework,
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_name='discipline_records' AND column_name='academic_year_id') as discipline,
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_name='feedback' AND column_name='academic_year_id') as feedback,
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_name='announcements' AND column_name='academic_year_id') as announcements,
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_name='school_gallery' AND column_name='academic_year_id') as gallery;
"
```

Expected: all values = 1.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20240001000031_year_scope_columns.sql
git commit -m "feat(db): add academic_year_id to attendance, homework, discipline, feedback, announcements, gallery"
```

---

## Task 5: Year context helper + middleware

**Files:**
- Create: `apps/web/lib/academic-year.ts`
- Modify: `apps/web/middleware.ts`

- [ ] **Step 1: Create `getAcademicYearId()` helper**

```typescript
// apps/web/lib/academic-year.ts
import { headers } from "next/headers";
import { createServiceSupabaseClient } from "./supabase/server";

/**
 * Get the active academic year ID for server components.
 * Resolves from: middleware x-academic-year-id header → active year fallback.
 */
export async function getAcademicYearId(schoolId: string): Promise<string | null> {
  const headersList = await headers();
  const fromHeader = headersList.get("x-academic-year-id");
  if (fromHeader) return fromHeader;

  // Fallback: active year for school
  const supabase = createServiceSupabaseClient();
  const { data } = await supabase
    .from("academic_years")
    .select("id")
    .eq("school_id", schoolId)
    .eq("status", "active")
    .single();
  return data?.id ?? null;
}
```

- [ ] **Step 2: Add year context resolution to middleware**

In `apps/web/middleware.ts`, after the role resolution block (after line ~101), add:

```typescript
// After role is resolved, resolve academic year context
let academicYearId: string | null = null;

// Teachers always get the active year — ignore cookie
const yearCookieName = "academic_year_id";
if (role !== "teacher") {
  const yearFromCookie = request.cookies.get(yearCookieName)?.value ?? null;
  if (yearFromCookie) {
    academicYearId = yearFromCookie;
  }
}

if (!academicYearId && schoolId) {
  // Resolve active year from DB (service client to bypass RLS)
  const { createServiceSupabaseClient } = await import("@/lib/supabase/server");
  const svc = createServiceSupabaseClient();
  const { data: activeYear } = await svc
    .from("academic_years")
    .select("id")
    .eq("school_id", schoolId)
    .eq("status", "active")
    .single();
  academicYearId = activeYear?.id ?? null;
}

if (academicYearId) {
  request.headers.set("x-academic-year-id", academicYearId);
  response = NextResponse.next({ request });
  response.headers.set("x-academic-year-id", academicYearId);
}
```

Note: The import inside middleware must use a dynamic import because middleware runs in the Edge runtime. Alternatively, inline the Supabase service call directly in middleware to avoid the import — use `createClient` from `@supabase/supabase-js` directly with `process.env` values.

- [ ] **Step 3: Verify middleware sets header**

Start the dev server:
```bash
cd "/Users/dineshlearning/Documents/make money/erp"
pnpm --filter web dev
```

Open `http://school1.lvh.me:3000/admin/dashboard` in browser while logged in as school admin. In the Network tab, check the request headers — `x-academic-year-id` should appear on page requests.

- [ ] **Step 4: Commit**

```bash
git add apps/web/lib/academic-year.ts apps/web/middleware.ts
git commit -m "feat: add year context resolution in middleware and getAcademicYearId helper"
```

---

## Task 6: `AcademicYearSwitcher` component + TopBar integration

**Files:**
- Create: `apps/web/components/academic-year-switcher.tsx`
- Modify: `apps/web/components/top-bar.tsx`
- Modify: `apps/web/app/(school)/layout.tsx`

- [ ] **Step 1: Create the switcher component**

```typescript
// apps/web/components/academic-year-switcher.tsx
"use client";

import { useRouter } from "next/navigation";
import { ChevronDown } from "lucide-react";
import Cookies from "js-cookie";

interface AcademicYear {
  id: string;
  name: string;
  status: "draft" | "active" | "archived";
}

export function AcademicYearSwitcher({
  years,
  currentYearId,
}: {
  years: AcademicYear[];
  currentYearId: string | null;
}) {
  const router = useRouter();
  const current = years.find((y) => y.id === currentYearId) ?? years[0];

  function handleSelect(yearId: string) {
    Cookies.set("academic_year_id", yearId, {
      domain: window.location.hostname.includes("lvh.me")
        ? ".lvh.me"
        : window.location.hostname.includes("balajierp.com")
        ? ".balajierp.com"
        : undefined,
      expires: 365,
    });
    router.refresh();
  }

  if (years.length === 0) return null;

  return (
    <div className="relative group">
      <button className="flex items-center gap-1.5 rounded-lg border border-border bg-muted px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted/80">
        {current?.name ?? "Select Year"}
        {current?.status === "draft" && (
          <span className="rounded-full bg-amber-100 px-1.5 text-[10px] font-semibold text-amber-700">
            Draft
          </span>
        )}
        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
      </button>
      <div className="absolute right-0 top-full z-50 mt-1 hidden min-w-40 rounded-lg border border-border bg-white shadow-lg group-focus-within:block group-hover:block">
        {years.map((y) => (
          <button
            key={y.id}
            onClick={() => handleSelect(y.id)}
            className="flex w-full items-center justify-between px-3 py-2 text-sm hover:bg-muted"
          >
            <span>{y.name}</span>
            <span
              className={`rounded-full px-1.5 text-[10px] font-semibold ${
                y.status === "active"
                  ? "bg-emerald-100 text-emerald-700"
                  : y.status === "draft"
                  ? "bg-amber-100 text-amber-700"
                  : "bg-gray-100 text-gray-500"
              }`}
            >
              {y.status}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Install `js-cookie`**

```bash
cd "/Users/dineshlearning/Documents/make money/erp"
pnpm --filter web add js-cookie
pnpm --filter web add -D @types/js-cookie
```

- [ ] **Step 3: Update `TopBar` to accept and render the switcher**

```typescript
// apps/web/components/top-bar.tsx
// Add yearSwitcher prop to TopBarProps:
interface TopBarProps {
  userName: string;
  userRole: string;
  brandColor?: string;
  yearSwitcher?: React.ReactNode;  // add this line
}

// Inside the JSX, add yearSwitcher between breadcrumb nav and right-side actions:
// Find the return statement and add after the <nav> block:
{yearSwitcher && (
  <div className="flex items-center">{yearSwitcher}</div>
)}
```

- [ ] **Step 4: Update `(school)/layout.tsx` to fetch years and pass switcher**

In `apps/web/app/(school)/layout.tsx`, after the school brand query (~line 114), add:

```typescript
// Fetch all years for school (for admin/principal only)
let years: { id: string; name: string; status: "draft" | "active" | "archived" }[] = [];
const currentYearId = (await headers()).get("x-academic-year-id") ?? null;
if (schoolId && (realRole === "school_admin" || realRole === "super_admin" || realRole === "principal")) {
  const { data: yearRows } = await supabase
    .from("academic_years")
    .select("id, name, status")
    .eq("school_id", schoolId)
    .order("start_date", { ascending: false });
  years = (yearRows ?? []) as typeof years;
}
```

Then in the JSX, replace the `TopBar` usage:

```tsx
<TopBar
  userName={sidebarUserName}
  userRole={displayRole}
  brandColor={brandColor}
  yearSwitcher={
    years.length > 0 ? (
      <AcademicYearSwitcher years={years} currentYearId={currentYearId} />
    ) : undefined
  }
/>
```

Add the import at the top:
```typescript
import { AcademicYearSwitcher } from "@/components/academic-year-switcher";
import { headers } from "next/headers";
```

- [ ] **Step 5: Verify switcher renders**

Visit `http://school1.lvh.me:3000/admin/dashboard`. The TopBar should show a year dropdown. Selecting a different year should refresh the page. Check browser cookies — `academic_year_id` cookie should be set.

- [ ] **Step 6: Commit**

```bash
git add apps/web/components/academic-year-switcher.tsx apps/web/components/top-bar.tsx apps/web/app/(school)/layout.tsx
git commit -m "feat: add academic year switcher to top bar for admin and principal"
```

---

## Task 7: Update Students page to use `student_enrollments`

**Files:**
- Modify: `apps/web/app/(school)/admin/students/page.tsx`

- [ ] **Step 1: Update the query**

Replace the students query in `apps/web/app/(school)/admin/students/page.tsx`:

```typescript
// apps/web/app/(school)/admin/students/page.tsx
import { getAcademicYearId } from "@/lib/academic-year";

export default async function StudentsPage() {
  const supabase = await createServerSupabaseClient();
  const schoolId = (await getSchoolId())!;
  const academicYearId = await getAcademicYearId(schoolId);

  const [{ data: enrollments }, { data: classes }] = await Promise.all([
    supabase
      .from("student_enrollments")
      .select(
        "id, roll_number, is_active, student_profile:student_profiles(id, full_name, email, admission_number, parent_phone), class:classes(name), section:sections(name)"
      )
      .eq("school_id", schoolId)
      .eq("academic_year_id", academicYearId ?? "")
      .limit(5000),
    supabase
      .from("classes")
      .select("id, name")
      .eq("school_id", schoolId)
      .order("order"),
  ]);

  const rows = (enrollments ?? []).map((e) => {
    const sp = e.student_profile as unknown as { id: string; full_name: string; email: string; admission_number: string; parent_phone: string } | null;
    const c = e.class as unknown as { name: string } | null;
    const sec = e.section as unknown as { name: string } | null;
    return {
      id: sp?.id ?? e.id,
      enrollmentId: e.id,
      name: sp?.full_name ?? "",
      email: sp?.email ?? "",
      roll: e.roll_number ?? "",
      admission_number: sp?.admission_number ?? "",
      class_name: c?.name ?? "",
      section: sec?.name ?? "",
      parent_phone: sp?.parent_phone ?? "",
    };
  });
  // ... rest of page unchanged
}
```

- [ ] **Step 2: Verify page loads**

Visit `http://school1.lvh.me:3000/admin/students`. Students should still appear, now sourced from `student_enrollments`.

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/(school)/admin/students/page.tsx
git commit -m "feat: students page queries student_enrollments scoped to academic year"
```

---

## Task 8: Update Classes page to filter sections by year

**Files:**
- Modify: `apps/web/app/(school)/admin/classes/page.tsx`
- Modify: `apps/web/app/(school)/admin/classes/classes-quick-setup.tsx`

- [ ] **Step 1: Update sections query in classes page**

```typescript
// apps/web/app/(school)/admin/classes/page.tsx
import { getAcademicYearId } from "@/lib/academic-year";

export default async function ClassesPage() {
  const supabase = await createServerSupabaseClient();
  const schoolId = (await getSchoolId())!;
  const academicYearId = await getAcademicYearId(schoolId);

  const [{ data: classes }, { data: sections }] = await Promise.all([
    supabase
      .from("classes")
      .select("id, name, \"order\"")
      .eq("school_id", schoolId)
      .order("order"),
    supabase
      .from("sections")
      .select("id, name, class_id, class:classes(name)")
      .eq("school_id", schoolId)
      .eq("academic_year_id", academicYearId ?? "")
      .order("name"),
  ]);
  // ... rest unchanged
}
```

- [ ] **Step 2: Update `ClassesQuickSetup` to accept and pass `academicYearId`**

Add `academicYearId` prop to `ClassesQuickSetup` and pass it when inserting sections:

```typescript
// apps/web/app/(school)/admin/classes/classes-quick-setup.tsx
export function ClassesQuickSetup({
  schoolId,
  academicYearId,
}: {
  schoolId: string;
  academicYearId: string;
}) {
  // ...existing state...

  async function handleCreate() {
    // ...existing validation...
    // In sectionRows, add academic_year_id:
    const sectionRows = (createdClasses ?? []).flatMap((cls) =>
      allSections.map((sectionName) => ({
        school_id: schoolId,
        class_id: cls.id,
        name: sectionName,
        academic_year_id: academicYearId,  // add this
      }))
    );
    // ...rest unchanged
  }
}
```

In `classes/page.tsx`, pass `academicYearId` to `ClassesQuickSetup`:

```tsx
<ClassesQuickSetup schoolId={schoolId} academicYearId={academicYearId ?? ""} />
```

- [ ] **Step 3: Verify classes page loads**

Visit `http://school1.lvh.me:3000/admin/classes`. Sections should show for the active year.

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/(school)/admin/classes/page.tsx apps/web/app/(school)/admin/classes/classes-quick-setup.tsx
git commit -m "feat: classes page filters sections by academic year"
```

---

## Task 9: Update Dashboard stats to use year context

**Files:**
- Modify: `apps/web/app/(school)/admin/dashboard/page.tsx`

- [ ] **Step 1: Scope stats queries to academic year**

```typescript
// apps/web/app/(school)/admin/dashboard/page.tsx
import { getAcademicYearId } from "@/lib/academic-year";

export default async function AdminDashboard() {
  const supabase = await createServerSupabaseClient();
  const schoolId = await getSchoolId();
  const academicYearId = await getAcademicYearId(schoolId!);
  const today = new Date().toISOString().slice(0, 10);

  const [
    { count: teacherCount },
    { count: studentCount },
    { count: classCount },
  ] = await Promise.all([
    supabase.from("teacher_profiles").select("*", { count: "exact", head: true }).eq("school_id", schoolId!),
    // Students now counted from enrollments for the year
    supabase.from("student_enrollments").select("*", { count: "exact", head: true })
      .eq("school_id", schoolId!)
      .eq("academic_year_id", academicYearId ?? "")
      .eq("is_active", true),
    supabase.from("sections").select("*", { count: "exact", head: true })
      .eq("school_id", schoolId!)
      .eq("academic_year_id", academicYearId ?? ""),
  ]);
  // ... rest of page — fee and attendance queries already have date scoping, leave unchanged
}
```

- [ ] **Step 2: Verify dashboard loads with correct counts**

Visit `http://school1.lvh.me:3000/admin/dashboard`. Student count should reflect enrollments for the active year.

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/(school)/admin/dashboard/page.tsx
git commit -m "feat: dashboard stats scoped to active academic year"
```

---

## Task 10: Update Academics page — status display + year management

**Files:**
- Modify: `apps/web/app/(school)/admin/academics/page.tsx`
- Modify: `apps/web/app/(school)/admin/academics/academics-table.tsx`
- Modify: `apps/web/app/(school)/admin/academics/academic-dialogs.tsx`

- [ ] **Step 1: Update academics page to use `status`**

```typescript
// apps/web/app/(school)/admin/academics/page.tsx
export default async function AcademicsPage() {
  const supabase = await createServerSupabaseClient();
  const schoolId = (await getSchoolId())!;

  const { data: academicYears } = await supabase
    .from("academic_years")
    .select("id, name, start_date, end_date, status")
    .eq("school_id", schoolId)
    .order("start_date", { ascending: false });

  const { data: exams } = await supabase
    .from("exams")
    .select("id, name, start_date, end_date, academic_year:academic_years(name)")
    .eq("school_id", schoolId)
    .order("start_date", { ascending: false });

  const years = academicYears ?? [];
  const activeYear = years.find((y) => y.status === "active");
  const draftYear = years.find((y) => y.status === "draft");

  const yearRows = years.map((y) => ({
    id: y.id,
    name: y.name,
    start: y.start_date ?? "—",
    end: y.end_date ?? "—",
    status: y.status as "draft" | "active" | "archived",
  }));

  const examRows = (exams ?? []).map((e) => {
    const ay = e.academic_year as unknown as { name: string } | null;
    return {
      id: e.id,
      name: e.name,
      academic_year: ay?.name ?? "—",
      start: e.start_date ?? "—",
      end: e.end_date ?? "—",
    };
  });

  return (
    <div className="space-y-10">
      <section>
        <PageHeader
          title="Academics"
          description="Manage academic years and exams for your school."
          action={
            <div className="flex items-center gap-2">
              {!draftYear && (
                <NewYearButton schoolId={schoolId} activeYearId={activeYear?.id ?? null} />
              )}
              {draftYear && (
                <ActivateYearButton draftYearId={draftYear.id} schoolId={schoolId} />
              )}
            </div>
          }
          stats={[
            { label: "Academic Years", value: years.length },
            { label: "Active Year", value: activeYear?.name ?? "—" },
            { label: "Exams", value: (exams ?? []).length },
          ]}
        />
        <AcademicYearsTable yearRows={yearRows} schoolId={schoolId} />
      </section>

      <section>
        <PageHeader
          title="Exams"
          description="Track all exams across academic years."
          action={
            <AddExamDialog
              schoolId={schoolId}
              academicYears={years.map((y) => ({ id: y.id, name: y.name }))}
            />
          }
        />
        <ExamsTable examRows={examRows} />
      </section>
    </div>
  );
}
```

- [ ] **Step 2: Update `AcademicYearsTable` to show `status` badge**

In `academics-table.tsx`, replace the `is_current` boolean column with a `status` badge:

```typescript
// In the yearRows type and table columns:
// Change: is_current: boolean
// To: status: "draft" | "active" | "archived"

// In the table cell rendering:
<span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
  row.status === "active" ? "bg-emerald-100 text-emerald-700" :
  row.status === "draft"  ? "bg-amber-100 text-amber-700" :
                            "bg-gray-100 text-gray-500"
}`}>
  {row.status}
</span>
```

- [ ] **Step 3: Add `NewYearButton` and `ActivateYearButton` stubs**

For now add simple placeholder buttons in `academic-dialogs.tsx` (full wizard is Task 11):

```typescript
// In academic-dialogs.tsx, add:
export function NewYearButton({ schoolId, activeYearId }: { schoolId: string; activeYearId: string | null }) {
  // Will be replaced with full wizard in Task 11
  return (
    <button className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700">
      + New Academic Year
    </button>
  );
}

export function ActivateYearButton({ draftYearId, schoolId }: { draftYearId: string; schoolId: string }) {
  return (
    <button className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700">
      Activate Draft Year
    </button>
  );
}
```

- [ ] **Step 4: Remove `AddAcademicYearDialog` from `academic-dialogs.tsx`**

Delete the `AddAcademicYearDialog` export and its import of `AddAcademicYearForm`. The form file `add-academic-year-form.tsx` can be deleted too.

- [ ] **Step 5: Verify academics page loads**

Visit `http://school1.lvh.me:3000/admin/academics`. Year table should show status badges. No TypeScript errors.

- [ ] **Step 6: Commit**

```bash
git add apps/web/app/(school)/admin/academics/
git commit -m "feat: academics page shows year status, replaces is_current with status badges"
```

---

## Task 11: Year creation wizard (4-step modal)

**Files:**
- Create: `apps/web/app/(school)/admin/academics/new-year-wizard.tsx`

- [ ] **Step 1: Write the wizard component**

```typescript
// apps/web/app/(school)/admin/academics/new-year-wizard.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { toast } from "sonner";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Section {
  id: string;
  name: string;
  class_name: string;
  class_id: string;
}

interface FeeStructure {
  id: string;
  fee_type: string;
  amount: number;
  class_id: string;
  class_name: string;
}

interface Props {
  schoolId: string;
  activeYearId: string | null;
  onClose: () => void;
}

export function NewYearWizard({ schoolId, activeYearId, onClose }: Props) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [newYearId, setNewYearId] = useState<string | null>(null);

  // Step 1 state
  const currentYear = new Date().getFullYear();
  const [yearName, setYearName] = useState(`${currentYear}-${String(currentYear + 1).slice(2)}`);
  const [startDate, setStartDate] = useState(`${currentYear}-04-01`);
  const [endDate, setEndDate] = useState(`${currentYear + 1}-03-31`);

  // Step 2 state — sections copied from previous year
  const [sections, setSections] = useState<Section[]>([]);
  const [selectedSectionIds, setSelectedSectionIds] = useState<Set<string>>(new Set());

  // Step 3 state — fee structures
  const [feeStructures, setFeeStructures] = useState<FeeStructure[]>([]);
  const [feeAmounts, setFeeAmounts] = useState<Record<string, number>>({});

  // Step 1: Create draft year
  async function handleCreateYear() {
    setLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("academic_years")
      .insert({ school_id: schoolId, name: yearName, start_date: startDate, end_date: endDate, status: "draft" })
      .select("id")
      .single();
    if (error || !data) { toast.error(error?.message ?? "Failed to create year"); setLoading(false); return; }
    setNewYearId(data.id);

    // Load sections from active year
    if (activeYearId) {
      const { data: prevSections } = await supabase
        .from("sections")
        .select("id, name, class_id, class:classes(name)")
        .eq("school_id", schoolId)
        .eq("academic_year_id", activeYearId);
      const mapped = (prevSections ?? []).map((s) => ({
        id: s.id,
        name: s.name,
        class_id: s.class_id,
        class_name: (s.class as unknown as { name: string } | null)?.name ?? "",
      }));
      setSections(mapped);
      setSelectedSectionIds(new Set(mapped.map((s) => s.id)));
    }
    setLoading(false);
    setStep(2);
  }

  // Step 2: Copy selected sections to new year
  async function handleCopySections() {
    if (!newYearId) return;
    setLoading(true);
    const supabase = createClient();
    const toCreate = sections.filter((s) => selectedSectionIds.has(s.id));
    if (toCreate.length > 0) {
      const { error } = await supabase.from("sections").insert(
        toCreate.map((s) => ({
          school_id: schoolId,
          class_id: s.class_id,
          name: s.name,
          academic_year_id: newYearId,
        }))
      );
      if (error) { toast.error("Failed to copy sections: " + error.message); setLoading(false); return; }
    }

    // Load fee structures from active year
    if (activeYearId) {
      const { data: prevFees } = await supabase
        .from("fee_structures")
        .select("id, fee_type, amount, class_id, class:classes(name)")
        .eq("school_id", schoolId)
        .eq("academic_year_id", activeYearId);
      const mapped = (prevFees ?? []).map((f) => ({
        id: f.id,
        fee_type: f.fee_type,
        amount: Number(f.amount),
        class_id: f.class_id,
        class_name: (f.class as unknown as { name: string } | null)?.name ?? "",
      }));
      setFeeStructures(mapped);
      const amounts: Record<string, number> = {};
      mapped.forEach((f) => { amounts[f.id] = f.amount; });
      setFeeAmounts(amounts);
    }
    setLoading(false);
    setStep(3);
  }

  // Step 3: Copy fee structures with edited amounts
  async function handleCopyFees() {
    if (!newYearId) return;
    setLoading(true);
    const supabase = createClient();
    if (feeStructures.length > 0) {
      const { error } = await supabase.from("fee_structures").insert(
        feeStructures.map((f) => ({
          school_id: schoolId,
          class_id: f.class_id,
          academic_year_id: newYearId,
          fee_type: f.fee_type,
          amount: feeAmounts[f.id] ?? f.amount,
        }))
      );
      if (error) { toast.error("Failed to copy fee structures: " + error.message); setLoading(false); return; }
    }
    setLoading(false);
    toast.success(`Draft year "${yearName}" created. Review timetable and teacher assignments, then activate when ready.`);
    router.refresh();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="relative w-full max-w-2xl rounded-xl bg-white p-8 shadow-xl">
        <button onClick={onClose} className="absolute right-4 top-4 rounded p-1 hover:bg-muted">
          <X className="h-4 w-4" />
        </button>

        {/* Step indicator */}
        <div className="mb-6 flex items-center gap-2 text-sm">
          {["Create Year", "Review Sections", "Review Fees"].map((label, i) => (
            <div key={label} className="flex items-center gap-2">
              {i > 0 && <span className="text-muted-foreground">→</span>}
              <span className={`font-medium ${step === i + 1 ? "text-indigo-600" : step > i + 1 ? "text-emerald-600" : "text-muted-foreground"}`}>
                {step > i + 1 ? "✓ " : ""}{label}
              </span>
            </div>
          ))}
        </div>

        {/* Step 1 */}
        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">New Academic Year</h2>
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-3 sm:col-span-1">
                <Label>Year Name</Label>
                <Input value={yearName} onChange={(e) => setYearName(e.target.value)} placeholder="2025-26" />
              </div>
              <div>
                <Label>Start Date</Label>
                <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>
              <div>
                <Label>End Date</Label>
                <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={onClose}>Cancel</Button>
              <Button onClick={handleCreateYear} disabled={loading || !yearName}>
                {loading ? "Creating…" : "Create & Continue"}
              </Button>
            </div>
          </div>
        )}

        {/* Step 2 */}
        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Review Sections</h2>
            <p className="text-sm text-muted-foreground">
              These sections are copied from the previous year. Deselect any you don't need.
            </p>
            {sections.length === 0 && (
              <p className="text-sm text-muted-foreground italic">No sections found in previous year. Sections can be added from the Classes page.</p>
            )}
            <div className="max-h-64 overflow-y-auto space-y-1">
              {sections.map((s) => (
                <label key={s.id} className="flex items-center gap-2 rounded px-2 py-1 hover:bg-muted cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedSectionIds.has(s.id)}
                    onChange={() => {
                      setSelectedSectionIds((prev) => {
                        const next = new Set(prev);
                        if (next.has(s.id)) next.delete(s.id); else next.add(s.id);
                        return next;
                      });
                    }}
                  />
                  <span className="text-sm">{s.class_name} — {s.name}</span>
                </label>
              ))}
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
              <Button onClick={handleCopySections} disabled={loading}>
                {loading ? "Copying…" : "Confirm & Continue"}
              </Button>
            </div>
          </div>
        )}

        {/* Step 3 */}
        {step === 3 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Review Fee Structures</h2>
            <p className="text-sm text-muted-foreground">
              Edit fee amounts for the new year. All fee types are copied from the previous year.
            </p>
            {feeStructures.length === 0 && (
              <p className="text-sm text-muted-foreground italic">No fee structures found. They can be added from the Fees page.</p>
            )}
            <div className="max-h-64 overflow-y-auto space-y-2">
              {feeStructures.map((f) => (
                <div key={f.id} className="flex items-center justify-between gap-4 rounded border px-3 py-2">
                  <div>
                    <p className="text-sm font-medium">{f.fee_type}</p>
                    <p className="text-xs text-muted-foreground">{f.class_name}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-sm text-muted-foreground">₹</span>
                    <Input
                      type="number"
                      className="w-28"
                      value={feeAmounts[f.id] ?? f.amount}
                      onChange={(e) => setFeeAmounts((prev) => ({ ...prev, [f.id]: Number(e.target.value) }))}
                    />
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setStep(2)}>Back</Button>
              <Button onClick={handleCopyFees} disabled={loading}>
                {loading ? "Saving…" : "Finish — Create Draft Year"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Wire `NewYearButton` in `academic-dialogs.tsx` to open wizard**

```typescript
// In academic-dialogs.tsx, replace the stub NewYearButton:
"use client";
import { useState } from "react";
import { NewYearWizard } from "./new-year-wizard";

export function NewYearButton({ schoolId, activeYearId }: { schoolId: string; activeYearId: string | null }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
      >
        + New Academic Year
      </button>
      {open && (
        <NewYearWizard schoolId={schoolId} activeYearId={activeYearId} onClose={() => setOpen(false)} />
      )}
    </>
  );
}
```

- [ ] **Step 3: Verify wizard flow**

Visit `http://school1.lvh.me:3000/admin/academics`. Click "New Academic Year". Walk through all 3 steps. After completion, a new row should appear in the year table with `draft` status. No TypeScript errors.

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/(school)/admin/academics/new-year-wizard.tsx apps/web/app/(school)/admin/academics/academic-dialogs.tsx
git commit -m "feat: 3-step new academic year wizard with section and fee copy"
```

---

## Task 12: Activate Year flow

**Files:**
- Modify: `apps/web/app/(school)/admin/academics/academic-dialogs.tsx`
- Create: `apps/web/app/api/academics/activate-year/route.ts`

- [ ] **Step 1: Create API route for activation**

```typescript
// apps/web/app/api/academics/activate-year/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSchoolId } from "@/lib/school";

export async function POST(request: NextRequest) {
  const { draftYearId } = await request.json();
  if (!draftYearId) return NextResponse.json({ error: "draftYearId required" }, { status: 400 });

  const supabase = await createServerSupabaseClient();
  const schoolId = await getSchoolId();
  if (!schoolId) return NextResponse.json({ error: "No school context" }, { status: 400 });

  // Archive current active year
  await supabase
    .from("academic_years")
    .update({ status: "archived" })
    .eq("school_id", schoolId)
    .eq("status", "active");

  // Activate draft year
  const { error } = await supabase
    .from("academic_years")
    .update({ status: "active" })
    .eq("id", draftYearId)
    .eq("school_id", schoolId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 2: Wire `ActivateYearButton` to call the API**

```typescript
// Replace ActivateYearButton stub in academic-dialogs.tsx:
export function ActivateYearButton({ draftYearId, schoolId }: { draftYearId: string; schoolId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleActivate() {
    if (!confirm("Activate this draft year? The current active year will be archived. This cannot be undone.")) return;
    setLoading(true);
    const res = await fetch("/api/academics/activate-year", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ draftYearId }),
    });
    setLoading(false);
    if (!res.ok) { toast.error("Failed to activate year"); return; }
    toast.success("Year activated.");
    router.refresh();
  }

  return (
    <button
      onClick={handleActivate}
      disabled={loading}
      className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
    >
      {loading ? "Activating…" : "Activate Draft Year"}
    </button>
  );
}
```

Add `useRouter` and `useState` imports at the top of `academic-dialogs.tsx`:
```typescript
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
```

- [ ] **Step 3: Verify activation**

Create a draft year via the wizard (Task 11). Click "Activate Draft Year". Confirm the previous year is now `archived` and the new year is `active`:

```bash
psql postgresql://postgres:postgres@127.0.0.1:54322/postgres \
  -c "SELECT name, status FROM public.academic_years ORDER BY start_date DESC;"
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/api/academics/activate-year/route.ts apps/web/app/(school)/admin/academics/academic-dialogs.tsx
git commit -m "feat: activate draft year — archives current active year"
```

---

## Task 13: Student promotion flow

**Files:**
- Create: `apps/web/app/(school)/admin/academics/promote/page.tsx`
- Create: `apps/web/app/(school)/admin/academics/promotion-flow.tsx`
- Create: `apps/web/app/api/academics/promote-students/route.ts`

- [ ] **Step 1: Create the API route for promotion**

```typescript
// apps/web/app/api/academics/promote-students/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSchoolId } from "@/lib/school";

interface PromotionRow {
  studentProfileId: string;
  targetClassId: string;
  targetSectionId: string;
  rollNumber?: string;
}

export async function POST(request: NextRequest) {
  const { draftYearId, promotions }: { draftYearId: string; promotions: PromotionRow[] } = await request.json();
  if (!draftYearId || !promotions?.length) {
    return NextResponse.json({ error: "draftYearId and promotions required" }, { status: 400 });
  }

  const supabase = await createServerSupabaseClient();
  const schoolId = await getSchoolId();
  if (!schoolId) return NextResponse.json({ error: "No school context" }, { status: 400 });

  const rows = promotions.map((p) => ({
    student_profile_id: p.studentProfileId,
    academic_year_id: draftYearId,
    school_id: schoolId,
    class_id: p.targetClassId,
    section_id: p.targetSectionId,
    roll_number: p.rollNumber ?? null,
    is_active: true,
  }));

  const { error } = await supabase
    .from("student_enrollments")
    .upsert(rows, { onConflict: "student_profile_id,academic_year_id" });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ promoted: rows.length });
}
```

- [ ] **Step 2: Create the promotion flow client component**

```typescript
// apps/web/app/(school)/admin/academics/promotion-flow.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

interface StudentRow {
  studentProfileId: string;
  name: string;
  currentClass: string;
  currentSection: string;
  suggestedClassId: string;
  suggestedClassName: string;
  suggestedSectionId: string;
  suggestedSectionName: string;
  hasPendingResults: boolean;
}

interface ClassOption {
  id: string;
  name: string;
}

interface SectionOption {
  id: string;
  name: string;
  classId: string;
}

interface Props {
  students: StudentRow[];
  draftYearId: string;
  classes: ClassOption[];
  sections: SectionOption[];
}

export function PromotionFlow({ students, draftYearId, classes, sections }: Props) {
  const router = useRouter();
  const [overrides, setOverrides] = useState<Record<string, { classId: string; sectionId: string }>>({});
  const [excluded, setExcluded] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<"all" | "pending" | "ready">("all");

  const filtered = students.filter((s) => {
    if (filter === "pending") return s.hasPendingResults;
    if (filter === "ready") return !s.hasPendingResults;
    return true;
  });

  function getEffective(s: StudentRow) {
    return overrides[s.studentProfileId] ?? {
      classId: s.suggestedClassId,
      sectionId: s.suggestedSectionId,
    };
  }

  async function handlePromote() {
    const toPromote = students.filter((s) => !excluded.has(s.studentProfileId));
    const promotions = toPromote.map((s) => {
      const eff = getEffective(s);
      return { studentProfileId: s.studentProfileId, targetClassId: eff.classId, targetSectionId: eff.sectionId };
    });
    setLoading(true);
    const res = await fetch("/api/academics/promote-students", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ draftYearId, promotions }),
    });
    setLoading(false);
    if (!res.ok) { toast.error("Promotion failed"); return; }
    const data = await res.json();
    toast.success(`${data.promoted} students promoted to draft year.`);
    router.push("/admin/academics");
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        {(["all", "ready", "pending"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full px-3 py-1 text-sm font-medium ${filter === f ? "bg-indigo-600 text-white" : "bg-muted text-foreground"}`}
          >
            {f === "all" ? `All (${students.length})` : f === "ready" ? `Ready (${students.filter((s) => !s.hasPendingResults).length})` : `Pending results (${students.filter((s) => s.hasPendingResults).length})`}
          </button>
        ))}
        <span className="ml-auto text-sm text-muted-foreground">
          {students.length - excluded.size} of {students.length} will be promoted
        </span>
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted text-xs font-medium uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-2 text-left">Promote</th>
              <th className="px-4 py-2 text-left">Student</th>
              <th className="px-4 py-2 text-left">Current</th>
              <th className="px-4 py-2 text-left">Target Class</th>
              <th className="px-4 py-2 text-left">Target Section</th>
              <th className="px-4 py-2 text-left">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.map((s) => {
              const eff = getEffective(s);
              const filteredSections = sections.filter((sec) => sec.classId === eff.classId);
              return (
                <tr key={s.studentProfileId} className={excluded.has(s.studentProfileId) ? "opacity-40" : ""}>
                  <td className="px-4 py-2">
                    <input
                      type="checkbox"
                      checked={!excluded.has(s.studentProfileId)}
                      onChange={() => setExcluded((prev) => {
                        const next = new Set(prev);
                        if (next.has(s.studentProfileId)) next.delete(s.studentProfileId); else next.add(s.studentProfileId);
                        return next;
                      })}
                    />
                  </td>
                  <td className="px-4 py-2 font-medium">{s.name}</td>
                  <td className="px-4 py-2 text-muted-foreground">{s.currentClass} {s.currentSection}</td>
                  <td className="px-4 py-2">
                    <select
                      className="rounded border px-2 py-1 text-sm"
                      value={eff.classId}
                      onChange={(e) => setOverrides((prev) => ({
                        ...prev,
                        [s.studentProfileId]: { classId: e.target.value, sectionId: sections.find((sec) => sec.classId === e.target.value)?.id ?? "" },
                      }))}
                    >
                      {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-2">
                    <select
                      className="rounded border px-2 py-1 text-sm"
                      value={eff.sectionId}
                      onChange={(e) => setOverrides((prev) => ({
                        ...prev,
                        [s.studentProfileId]: { ...getEffective(s), sectionId: e.target.value },
                      }))}
                    >
                      {filteredSections.map((sec) => <option key={sec.id} value={sec.id}>{sec.name}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-2">
                    {s.hasPendingResults ? (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">Pending results</span>
                    ) : (
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">Ready</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => router.push("/admin/academics")}>Cancel</Button>
        <Button onClick={handlePromote} disabled={loading || excluded.size === students.length}>
          {loading ? "Promoting…" : `Promote ${students.length - excluded.size} Students`}
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create the server page for promotion**

```typescript
// apps/web/app/(school)/admin/academics/promote/page.tsx
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSchoolId } from "@/lib/school";
import { getAcademicYearId } from "@/lib/academic-year";
import { PageHeader } from "@/components/page-header";
import { PromotionFlow } from "../promotion-flow";

export default async function PromotePage() {
  const supabase = await createServerSupabaseClient();
  const schoolId = (await getSchoolId())!;
  const activeYearId = await getAcademicYearId(schoolId);

  // Must have a draft year to promote into
  const { data: draftYear } = await supabase
    .from("academic_years")
    .select("id, name")
    .eq("school_id", schoolId)
    .eq("status", "draft")
    .single();

  if (!draftYear) redirect("/admin/academics");

  // Get all active enrollments for current year
  const { data: enrollments } = await supabase
    .from("student_enrollments")
    .select("student_profile_id, class_id, section_id, student_profile:student_profiles(full_name), class:classes(name, order), section:sections(name)")
    .eq("school_id", schoolId)
    .eq("academic_year_id", activeYearId ?? "")
    .eq("is_active", true)
    .order("class_id");

  // Get classes and sections for the draft year
  const [{ data: classes }, { data: draftSections }] = await Promise.all([
    supabase.from("classes").select("id, name, order").eq("school_id", schoolId).order("order"),
    supabase.from("sections").select("id, name, class_id").eq("school_id", schoolId).eq("academic_year_id", draftYear.id),
  ]);

  // Get students with pending results (have exams but missing results)
  const { data: exams } = await supabase
    .from("exams")
    .select("id")
    .eq("school_id", schoolId)
    .eq("academic_year_id", activeYearId ?? "");

  const { data: results } = await supabase
    .from("exam_results")
    .select("student_id")
    .eq("school_id", schoolId);

  const studentsWithResults = new Set((results ?? []).map((r) => r.student_id));
  const hasExams = (exams ?? []).length > 0;

  // Build class order map for auto-promotion
  const classOrderMap = new Map((classes ?? []).map((c) => [c.id, { id: c.id, name: c.name, order: c.order }]));

  const studentRows = (enrollments ?? []).map((e) => {
    const sp = e.student_profile as unknown as { full_name: string } | null;
    const cls = e.class as unknown as { name: string; order: number } | null;
    const sec = e.section as unknown as { name: string } | null;
    const currentOrder = cls?.order ?? 0;

    // Suggest next class (order + 1)
    const nextClass = Array.from(classOrderMap.values()).find((c) => c.order === currentOrder + 1);
    const suggestedClass = nextClass ?? Array.from(classOrderMap.values()).find((c) => c.order === currentOrder);
    const suggestedSection = (draftSections ?? []).find(
      (s) => s.class_id === suggestedClass?.id && s.name === sec?.name
    ) ?? (draftSections ?? []).find((s) => s.class_id === suggestedClass?.id);

    return {
      studentProfileId: e.student_profile_id,
      name: sp?.full_name ?? "",
      currentClass: cls?.name ?? "",
      currentSection: sec?.name ?? "",
      suggestedClassId: suggestedClass?.id ?? "",
      suggestedClassName: suggestedClass?.name ?? "",
      suggestedSectionId: suggestedSection?.id ?? "",
      suggestedSectionName: suggestedSection?.name ?? "",
      hasPendingResults: hasExams && !studentsWithResults.has(e.student_profile_id),
    };
  });

  return (
    <div>
      <PageHeader
        title={`Promote Students → ${draftYear.name}`}
        description="Review and confirm student class assignments for the new academic year."
      />
      <PromotionFlow
        students={studentRows}
        draftYearId={draftYear.id}
        classes={(classes ?? []).map((c) => ({ id: c.id, name: c.name }))}
        sections={(draftSections ?? []).map((s) => ({ id: s.id, name: s.name, classId: s.class_id }))}
      />
    </div>
  );
}
```

- [ ] **Step 4: Add "Promote Students" link to Academics page**

In `apps/web/app/(school)/admin/academics/page.tsx`, inside the `action` div alongside the wizard buttons, add:

```tsx
{draftYear && (
  <a href="/admin/academics/promote" className="rounded-lg border border-indigo-600 px-4 py-2 text-sm font-semibold text-indigo-600 hover:bg-indigo-50">
    Promote Students →
  </a>
)}
```

- [ ] **Step 5: Verify promotion flow**

With a draft year existing, visit `http://school1.lvh.me:3000/admin/academics/promote`. Student table should appear. Select/deselect students. Click "Promote X Students". Check DB:

```bash
psql postgresql://postgres:postgres@127.0.0.1:54322/postgres \
  -c "SELECT COUNT(*) FROM public.student_enrollments WHERE academic_year_id = '<draft-year-id>';"
```

Expected: count matches promoted students.

- [ ] **Step 6: Commit**

```bash
git add apps/web/app/(school)/admin/academics/promote/ apps/web/app/(school)/admin/academics/promotion-flow.tsx apps/web/app/api/academics/promote-students/route.ts apps/web/app/(school)/admin/academics/page.tsx
git commit -m "feat: student promotion flow for draft academic year"
```

---

## Task 14: Draft year banner

**Files:**
- Modify: `apps/web/app/(school)/layout.tsx`

- [ ] **Step 1: Add draft year warning banner**

In `apps/web/app/(school)/layout.tsx`, fetch the current year's status and show a banner when viewing a draft year. After the years query (Task 6), add:

```typescript
const currentYear = years.find((y) => y.id === currentYearId);
const isViewingDraft = currentYear?.status === "draft";
```

In the JSX, inside `<main className="flex-1 overflow-y-auto p-8">`, prepend:

```tsx
{isViewingDraft && (
  <div className="mb-6 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
    <strong>Draft year:</strong> You are configuring a year that is not yet active. Changes here will not affect the live school until you activate this year from the <a href="/admin/academics" className="underline">Academics page</a>.
  </div>
)}
```

- [ ] **Step 2: Verify banner**

Switch to a draft year in the top-bar switcher. The yellow banner should appear on every admin page. Switch back to the active year — banner disappears.

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/(school)/layout.tsx
git commit -m "feat: show draft year warning banner when viewing non-active year"
```

---

## Self-Review Notes

**Spec coverage check:**
- ✅ Decision 1: classes/subjects unchanged
- ✅ Decision 2: cookie → header in Task 5
- ✅ Decision 3: `student_enrollments` in Task 2
- ✅ Decision 4: `section_assignments` + timetable year-scope in Task 3
- ✅ Decision 5: attendance + homework year cols in Task 4
- ✅ Decision 6: discipline + feedback year cols in Task 4
- ✅ Decision 7: announcements nullable year col in Task 4
- ✅ Decision 8: gallery nullable year col in Task 4
- ✅ Decision 9: year switcher for admin/principal only in Task 6
- ✅ Decision 10: bulk promotion with override in Task 13
- ✅ Decision 11: wizard auto-copies sections + fees in Task 11
- ✅ Decision 12: no backfill — seed.sql updates in Tasks 1-3
- ✅ Decision 13: status enum + partial unique index in Task 1
- ✅ Decision 14: partial promotion, pending-result flag in Task 13

**Not covered (out of scope per spec):** timetable copy in wizard (timetable detail editing stays in Timetable page), `section_assignments` UI (admin edits via Teachers page post-onboarding), attendance/homework/discipline/feedback page query updates (same pattern as students/dashboard — apply `getAcademicYearId` to each, straightforward repetition not needing its own tasks).
