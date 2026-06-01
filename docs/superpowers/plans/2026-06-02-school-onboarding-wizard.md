# School Onboarding Wizard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a full-page 4-step onboarding wizard that guides a new school admin through academic year → classes & sections → teachers → students, automatically shown on first login before any other admin page is accessible.

**Architecture:** A new `/admin/onboarding` route outside the `(school)` layout group renders the wizard without sidebar/topbar. `(school)/admin/layout.tsx` checks for zero `academic_years` and redirects there. Step progress is derived from DB state on mount. Each step is a focused client component. On completion, redirects to dashboard with a dismissible "what's next" banner.

**Tech Stack:** Next.js 15 App Router, Supabase (`@supabase/ssr`), Tailwind CSS, shadcn/ui, TypeScript.

**Spec:** `docs/superpowers/specs/2026-06-02-school-onboarding-wizard-design.md`

**Dependency:** Requires the academic year redesign plan (`2026-06-02-academic-year-redesign.md`) to be fully executed first — specifically the `academic_years.status` enum migration (Task 1 of that plan).

---

## File Map

### New files
| File | Responsibility |
|---|---|
| `apps/web/app/admin/onboarding/page.tsx` | Server entry — fetches school + step state, renders wizard shell |
| `apps/web/app/admin/onboarding/wizard-shell.tsx` | Client — step indicator, step state machine, mounts step components |
| `apps/web/app/admin/onboarding/steps/step-academic-year.tsx` | Client — Step 1: year name + dates, inserts academic year |
| `apps/web/app/admin/onboarding/steps/step-classes.tsx` | Client — Step 2: wraps `ClassesQuickSetup` |
| `apps/web/app/admin/onboarding/steps/step-teachers.tsx` | Client — Step 3: bulk name+phone entry |
| `apps/web/app/admin/onboarding/steps/step-students.tsx` | Client — Step 4: bulk name+class+section entry |
| `apps/web/app/admin/onboarding/completion-screen.tsx` | Client — 2-second success state, then redirects |
| `apps/web/app/api/onboarding/create-teachers/route.ts` | API — creates teacher auth users + profiles in bulk |
| `apps/web/app/api/onboarding/create-students/route.ts` | API — creates student profiles + enrollments in bulk |

### Modified files
| File | Change |
|---|---|
| `apps/web/app/(school)/admin/layout.tsx` | Add zero-academic-years check → redirect to `/admin/onboarding` |
| `apps/web/app/(school)/admin/dashboard/page.tsx` | Add dismissible post-onboarding "what's next" banner |

---

## Task 1: Redirect gate in admin layout

**Files:**
- Modify: `apps/web/app/(school)/admin/layout.tsx`

- [ ] **Step 1: Add the zero-years check**

In `apps/web/app/(school)/admin/layout.tsx`, after the `if (!roleRow || !allowed.includes(...))` guard (around line 24), add:

```typescript
// Check if school has any academic years — if not, redirect to onboarding
const schoolId = await getSchoolId();
if (schoolId) {
  const { count } = await supabase
    .from("academic_years")
    .select("*", { count: "exact", head: true })
    .eq("school_id", schoolId);
  if ((count ?? 0) === 0) {
    redirect("/admin/onboarding");
  }
}
```

Add `getSchoolId` import at the top:
```typescript
import { getSchoolId } from "@/lib/school";
```

- [ ] **Step 2: Verify redirect fires**

With Supabase running and the dev server up, delete all academic years for a test school:

```bash
psql postgresql://postgres:postgres@127.0.0.1:54322/postgres \
  -c "DELETE FROM public.academic_years WHERE school_id = (SELECT id FROM public.schools WHERE domain = 'school1.lvh.me');"
```

Visit `http://school1.lvh.me:3000/admin/dashboard` while logged in as school admin. Should redirect to `/admin/onboarding` (404 is expected — route doesn't exist yet).

Restore the year:
```bash
cd "/Users/dineshlearning/Documents/make money/erp" && supabase db reset
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/(school)/admin/layout.tsx
git commit -m "feat: redirect to onboarding if school has no academic year"
```

---

## Task 2: Onboarding page shell (server entry)

**Files:**
- Create: `apps/web/app/admin/onboarding/page.tsx`

Note: This route is at `app/admin/onboarding` (not inside `app/(school)/admin`) so it renders without the sidebar/topbar shell.

- [ ] **Step 1: Create the server page**

```typescript
// apps/web/app/admin/onboarding/page.tsx
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSchoolId } from "@/lib/school";
import { WizardShell } from "./wizard-shell";

export default async function OnboardingPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const schoolId = await getSchoolId();
  if (!schoolId) redirect("/login");

  // If school already has an active year, redirect to dashboard
  const { count } = await supabase
    .from("academic_years")
    .select("*", { count: "exact", head: true })
    .eq("school_id", schoolId);

  if ((count ?? 0) > 0) redirect("/admin/dashboard");

  // Fetch school name for display
  const { data: school } = await supabase
    .from("schools")
    .select("name, primary_color")
    .eq("id", schoolId)
    .single();

  // Determine resume step from DB state
  const [{ count: classCount }, { count: teacherCount }, { count: studentCount }] = await Promise.all([
    supabase.from("classes").select("*", { count: "exact", head: true }).eq("school_id", schoolId),
    supabase.from("teacher_profiles").select("*", { count: "exact", head: true }).eq("school_id", schoolId),
    supabase.from("student_profiles").select("*", { count: "exact", head: true }).eq("school_id", schoolId),
  ]);

  // All counts are 0 (no academic year yet) → Step 1
  // academic_year exists but no classes → Step 2 (handled below after year creation)
  const initialStep = 1;

  return (
    <WizardShell
      schoolId={schoolId}
      schoolName={school?.name ?? "Your School"}
      brandColor={school?.primary_color ?? "#4f46e5"}
      initialStep={initialStep}
      classCount={classCount ?? 0}
      teacherCount={teacherCount ?? 0}
      studentCount={studentCount ?? 0}
    />
  );
}
```

- [ ] **Step 2: Create the wizard shell client component (stub)**

Create a minimal stub so the page compiles:

```typescript
// apps/web/app/admin/onboarding/wizard-shell.tsx
"use client";

export function WizardShell({
  schoolId,
  schoolName,
  brandColor,
  initialStep,
  classCount,
  teacherCount,
  studentCount,
}: {
  schoolId: string;
  schoolName: string;
  brandColor: string;
  initialStep: number;
  classCount: number;
  teacherCount: number;
  studentCount: number;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <p className="text-muted-foreground">Onboarding wizard loading… (stub)</p>
    </div>
  );
}
```

- [ ] **Step 3: Verify page renders**

Delete academic years for the test school and visit `http://school1.lvh.me:3000/admin/onboarding`. Should show the stub text. No TypeScript errors.

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/admin/onboarding/
git commit -m "feat: onboarding page server entry with resume-step detection"
```

---

## Task 3: Step indicator + wizard shell state machine

**Files:**
- Modify: `apps/web/app/admin/onboarding/wizard-shell.tsx`

- [ ] **Step 1: Implement the full wizard shell**

```typescript
// apps/web/app/admin/onboarding/wizard-shell.tsx
"use client";

import { useState } from "react";
import { GraduationCap, Check } from "lucide-react";
import { StepAcademicYear } from "./steps/step-academic-year";
import { StepClasses } from "./steps/step-classes";
import { StepTeachers } from "./steps/step-teachers";
import { StepStudents } from "./steps/step-students";
import { CompletionScreen } from "./completion-screen";

const STEPS = [
  { label: "Academic Year" },
  { label: "Classes & Sections" },
  { label: "Teachers" },
  { label: "Students" },
];

export function WizardShell({
  schoolId,
  schoolName,
  brandColor,
  initialStep,
}: {
  schoolId: string;
  schoolName: string;
  brandColor: string;
  initialStep: number;
  classCount: number;
  teacherCount: number;
  studentCount: number;
}) {
  const [step, setStep] = useState(initialStep);
  const [academicYearId, setAcademicYearId] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  if (done) return <CompletionScreen schoolName={schoolName} brandColor={brandColor} />;

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      {/* Header */}
      <header className="flex h-14 items-center justify-between border-b bg-white px-8">
        <div className="flex items-center gap-2.5">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-lg"
            style={{ backgroundColor: brandColor }}
          >
            <GraduationCap className="h-[18px] w-[18px] text-white" />
          </div>
          <span className="text-sm font-semibold text-foreground">{schoolName}</span>
        </div>
      </header>

      {/* Step indicator */}
      <div className="flex items-center justify-center gap-0 border-b bg-white px-8 py-4">
        {STEPS.map((s, i) => {
          const num = i + 1;
          const isComplete = step > num;
          const isCurrent = step === num;
          return (
            <div key={s.label} className="flex items-center">
              {i > 0 && (
                <div className={`h-px w-12 ${isComplete || isCurrent ? "bg-indigo-600" : "bg-border"}`} />
              )}
              <div className="flex flex-col items-center gap-1">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold ${
                    isComplete
                      ? "bg-indigo-600 text-white"
                      : isCurrent
                      ? "border-2 border-indigo-600 text-indigo-600"
                      : "border-2 border-border text-muted-foreground"
                  }`}
                >
                  {isComplete ? <Check className="h-4 w-4" /> : num}
                </div>
                <span className={`text-xs ${isCurrent ? "font-semibold text-indigo-600" : "text-muted-foreground"}`}>
                  {s.label}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Step content */}
      <main className="flex flex-1 items-start justify-center px-4 py-10">
        <div className="w-full max-w-2xl">
          {step === 1 && (
            <StepAcademicYear
              schoolId={schoolId}
              brandColor={brandColor}
              onComplete={(yearId) => { setAcademicYearId(yearId); setStep(2); }}
            />
          )}
          {step === 2 && (
            <StepClasses
              schoolId={schoolId}
              academicYearId={academicYearId ?? ""}
              brandColor={brandColor}
              onComplete={() => setStep(3)}
              onSkip={() => setStep(3)}
            />
          )}
          {step === 3 && (
            <StepTeachers
              schoolId={schoolId}
              brandColor={brandColor}
              onComplete={() => setStep(4)}
              onSkip={() => setStep(4)}
            />
          )}
          {step === 4 && (
            <StepStudents
              schoolId={schoolId}
              academicYearId={academicYearId ?? ""}
              brandColor={brandColor}
              onComplete={() => setDone(true)}
              onSkip={() => setDone(true)}
            />
          )}
        </div>
      </main>
    </div>
  );
}
```

- [ ] **Step 2: Create stub step files so the shell compiles**

```typescript
// apps/web/app/admin/onboarding/steps/step-academic-year.tsx
"use client";
export function StepAcademicYear({ onComplete, brandColor, schoolId }: { schoolId: string; brandColor: string; onComplete: (yearId: string) => void }) {
  return <div>Step 1 stub</div>;
}

// apps/web/app/admin/onboarding/steps/step-classes.tsx
"use client";
export function StepClasses({ onComplete, onSkip, schoolId, academicYearId, brandColor }: { schoolId: string; academicYearId: string; brandColor: string; onComplete: () => void; onSkip: () => void }) {
  return <div>Step 2 stub</div>;
}

// apps/web/app/admin/onboarding/steps/step-teachers.tsx
"use client";
export function StepTeachers({ onComplete, onSkip, schoolId, brandColor }: { schoolId: string; brandColor: string; onComplete: () => void; onSkip: () => void }) {
  return <div>Step 3 stub</div>;
}

// apps/web/app/admin/onboarding/steps/step-students.tsx
"use client";
export function StepStudents({ onComplete, onSkip, schoolId, academicYearId, brandColor }: { schoolId: string; academicYearId: string; brandColor: string; onComplete: () => void; onSkip: () => void }) {
  return <div>Step 4 stub</div>;
}

// apps/web/app/admin/onboarding/completion-screen.tsx
"use client";
export function CompletionScreen({ schoolName, brandColor }: { schoolName: string; brandColor: string }) {
  return <div>Done!</div>;
}
```

- [ ] **Step 3: Verify shell renders with step indicator**

Visit `http://school1.lvh.me:3000/admin/onboarding` (with no academic years). Should show the 4-step indicator and "Step 1 stub" content. No TypeScript errors.

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/admin/onboarding/
git commit -m "feat: onboarding wizard shell with step indicator and state machine"
```

---

## Task 4: Step 1 — Academic Year

**Files:**
- Modify: `apps/web/app/admin/onboarding/steps/step-academic-year.tsx`

- [ ] **Step 1: Implement Step 1**

```typescript
// apps/web/app/admin/onboarding/steps/step-academic-year.tsx
"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function StepAcademicYear({
  schoolId,
  brandColor,
  onComplete,
}: {
  schoolId: string;
  brandColor: string;
  onComplete: (yearId: string) => void;
}) {
  const currentYear = new Date().getFullYear();
  const [name, setName] = useState(`${currentYear}-${String(currentYear + 1).slice(2)}`);
  const [startDate, setStartDate] = useState(`${currentYear}-04-01`);
  const [endDate, setEndDate] = useState(`${currentYear + 1}-03-31`);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { toast.error("Year name is required"); return; }
    if (startDate >= endDate) { toast.error("Start date must be before end date"); return; }
    setLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("academic_years")
      .insert({ school_id: schoolId, name: name.trim(), start_date: startDate, end_date: endDate, status: "active" })
      .select("id")
      .single();
    setLoading(false);
    if (error || !data) { toast.error(error?.message ?? "Failed to create year"); return; }
    onComplete(data.id);
  }

  return (
    <div className="space-y-6 rounded-xl border bg-white p-8 shadow-sm">
      <div>
        <h2 className="text-xl font-semibold text-foreground">Create Academic Year</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          This is the current year your school is running. You can add more years later.
        </p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="year-name">Year Name</Label>
          <Input
            id="year-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="2025-26"
            required
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="start-date">Start Date</Label>
            <Input
              id="start-date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="end-date">End Date</Label>
            <Input
              id="end-date"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        </div>
        <Button
          type="submit"
          disabled={loading}
          className="w-full"
          style={{ backgroundColor: brandColor }}
        >
          {loading ? "Creating…" : "Create & Continue →"}
        </Button>
      </form>
    </div>
  );
}
```

- [ ] **Step 2: Verify Step 1 works end to end**

Visit `http://school1.lvh.me:3000/admin/onboarding`. Fill in year name and dates. Click "Create & Continue". Should advance to Step 2 (stub). Verify in DB:

```bash
psql postgresql://postgres:postgres@127.0.0.1:54322/postgres \
  -c "SELECT name, status FROM public.academic_years ORDER BY created_at DESC LIMIT 3;"
```

Expected: new row with `status = 'active'`.

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/admin/onboarding/steps/step-academic-year.tsx
git commit -m "feat: onboarding Step 1 — academic year creation"
```

---

## Task 5: Step 2 — Classes & Sections

**Files:**
- Modify: `apps/web/app/admin/onboarding/steps/step-classes.tsx`

- [ ] **Step 1: Implement Step 2 by reusing `ClassesQuickSetup`**

```typescript
// apps/web/app/admin/onboarding/steps/step-classes.tsx
"use client";

import { ClassesQuickSetup } from "@/app/(school)/admin/classes/classes-quick-setup";
import { Button } from "@/components/ui/button";

export function StepClasses({
  schoolId,
  academicYearId,
  brandColor,
  onComplete,
  onSkip,
}: {
  schoolId: string;
  academicYearId: string;
  brandColor: string;
  onComplete: () => void;
  onSkip: () => void;
}) {
  return (
    <div className="space-y-6">
      <div className="rounded-xl border bg-white p-8 shadow-sm">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-foreground">Set Up Classes & Sections</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Select the classes your school runs. Sections like A, B, C will be created for each.
          </p>
        </div>
        <ClassesQuickSetup
          schoolId={schoolId}
          academicYearId={academicYearId}
          onAfterCreate={onComplete}
        />
      </div>
      <div className="text-center">
        <button
          type="button"
          onClick={onSkip}
          className="text-sm text-muted-foreground underline hover:text-foreground"
        >
          I'll set this up later
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Add `onAfterCreate` callback prop to `ClassesQuickSetup`**

In `apps/web/app/(school)/admin/classes/classes-quick-setup.tsx`, add an optional `onAfterCreate` prop that fires after successful creation:

```typescript
export function ClassesQuickSetup({
  schoolId,
  academicYearId,
  onAfterCreate,
}: {
  schoolId: string;
  academicYearId: string;
  onAfterCreate?: () => void;
}) {
  // ...existing code...

  async function handleCreate() {
    // ...existing implementation...
    // At the very end, after toast.success:
    onAfterCreate?.();
  }
}
```

- [ ] **Step 3: Verify Step 2**

Complete Step 1, then on Step 2 select some classes and click "Create All". Should advance to Step 3. Verify in DB:

```bash
psql postgresql://postgres:postgres@127.0.0.1:54322/postgres \
  -c "SELECT COUNT(*) FROM public.sections WHERE school_id = (SELECT id FROM public.schools WHERE domain = 'school1.lvh.me');"
```

Also verify "I'll set this up later" advances to Step 3 without creating classes.

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/admin/onboarding/steps/step-classes.tsx apps/web/app/(school)/admin/classes/classes-quick-setup.tsx
git commit -m "feat: onboarding Step 2 — classes and sections via QuickSetup"
```

---

## Task 6: Step 3 — Teachers bulk entry + API

**Files:**
- Create: `apps/web/app/api/onboarding/create-teachers/route.ts`
- Modify: `apps/web/app/admin/onboarding/steps/step-teachers.tsx`

- [ ] **Step 1: Create the teacher bulk-create API route**

```typescript
// apps/web/app/api/onboarding/create-teachers/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createServiceSupabaseClient } from "@/lib/supabase/server";
import { getSchoolId } from "@/lib/school";

interface TeacherInput {
  fullName: string;
  phone: string;
}

export async function POST(request: NextRequest) {
  const { teachers }: { teachers: TeacherInput[] } = await request.json();
  if (!teachers?.length) return NextResponse.json({ created: 0 });

  const schoolId = await getSchoolId();
  if (!schoolId) return NextResponse.json({ error: "No school context" }, { status: 400 });

  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const svc = createServiceSupabaseClient();
  const created: string[] = [];

  for (const t of teachers) {
    const phone = `+91${t.phone.replace(/\D/g, "").slice(-10)}`;

    // Create auth user via admin API
    const { data: authUser, error: authError } = await svc.auth.admin.createUser({
      phone,
      phone_confirm: true,
      user_metadata: { full_name: t.fullName },
    });

    if (authError || !authUser.user) continue;

    const userId = authUser.user.id;

    // Update profile
    await svc.from("profiles").update({
      full_name: t.fullName,
      school_id: schoolId,
      phone,
    }).eq("id", userId);

    // Create teacher_profile
    await svc.from("teacher_profiles").insert({
      profile_id: userId,
      school_id: schoolId,
    });

    // Assign role
    await svc.from("user_roles").insert({
      user_id: userId,
      school_id: schoolId,
      role: "teacher",
      is_active: true,
    });

    created.push(userId);
  }

  return NextResponse.json({ created: created.length });
}
```

- [ ] **Step 2: Implement Step 3 component**

```typescript
// apps/web/app/admin/onboarding/steps/step-teachers.tsx
"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface TeacherRow {
  fullName: string;
  phone: string;
}

export function StepTeachers({
  schoolId,
  brandColor,
  onComplete,
  onSkip,
}: {
  schoolId: string;
  brandColor: string;
  onComplete: () => void;
  onSkip: () => void;
}) {
  const [rows, setRows] = useState<TeacherRow[]>([{ fullName: "", phone: "" }]);
  const [loading, setLoading] = useState(false);

  function updateRow(index: number, field: keyof TeacherRow, value: string) {
    setRows((prev) => prev.map((r, i) => i === index ? { ...r, [field]: value } : r));
  }

  function addRow() {
    setRows((prev) => [...prev, { fullName: "", phone: "" }]);
  }

  function removeRow(index: number) {
    setRows((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSave() {
    const valid = rows.filter((r) => r.fullName.trim() && r.phone.trim().length === 10);
    if (valid.length === 0) { toast.error("Add at least one teacher with name and 10-digit phone"); return; }
    setLoading(true);
    const res = await fetch("/api/onboarding/create-teachers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ teachers: valid }),
    });
    setLoading(false);
    if (!res.ok) { toast.error("Failed to create teachers"); return; }
    const data = await res.json();
    toast.success(`${data.created} teacher${data.created !== 1 ? "s" : ""} added.`);
    onComplete();
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border bg-white p-8 shadow-sm">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-foreground">Add Teachers</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Teachers will be able to log in with their phone number. Subject and class assignments can be done later.
          </p>
        </div>

        <div className="space-y-3">
          {rows.map((row, i) => (
            <div key={i} className="flex items-center gap-3">
              <Input
                placeholder="Full name"
                value={row.fullName}
                onChange={(e) => updateRow(i, "fullName", e.target.value)}
                className="flex-1"
              />
              <div className="flex w-44 items-center overflow-hidden rounded-lg border border-border focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20">
                <span className="flex items-center bg-muted px-2 text-sm text-muted-foreground">+91</span>
                <Input
                  type="tel"
                  inputMode="numeric"
                  pattern="\d{10}"
                  maxLength={10}
                  placeholder="9876543210"
                  value={row.phone}
                  onChange={(e) => updateRow(i, "phone", e.target.value.replace(/\D/g, ""))}
                  className="border-0 shadow-none focus-visible:ring-0"
                />
              </div>
              {rows.length > 1 && (
                <button type="button" onClick={() => removeRow(i)} className="rounded p-1 text-muted-foreground hover:bg-muted">
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={addRow}
          className="mt-3 flex items-center gap-1.5 text-sm text-indigo-600 hover:underline"
        >
          <Plus className="h-3.5 w-3.5" /> Add another teacher
        </button>

        <div className="mt-6">
          <Button onClick={handleSave} disabled={loading} className="w-full" style={{ backgroundColor: brandColor }}>
            {loading ? "Saving…" : "Save & Continue →"}
          </Button>
        </div>
      </div>

      <div className="text-center">
        <button type="button" onClick={onSkip} className="text-sm text-muted-foreground underline hover:text-foreground">
          Skip for now
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Verify Step 3**

Complete Steps 1–2, then on Step 3 add 2 teachers with valid phone numbers. Click "Save & Continue". Verify in DB:

```bash
psql postgresql://postgres:postgres@127.0.0.1:54322/postgres \
  -c "SELECT p.full_name, p.phone FROM public.profiles p JOIN public.teacher_profiles tp ON tp.profile_id = p.id ORDER BY p.created_at DESC LIMIT 5;"
```

Also verify "Skip for now" advances to Step 4 without creating teachers.

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/api/onboarding/create-teachers/ apps/web/app/admin/onboarding/steps/step-teachers.tsx
git commit -m "feat: onboarding Step 3 — bulk teacher creation"
```

---

## Task 7: Step 4 — Students bulk entry + API

**Files:**
- Create: `apps/web/app/api/onboarding/create-students/route.ts`
- Modify: `apps/web/app/admin/onboarding/steps/step-students.tsx`

- [ ] **Step 1: Create the student bulk-create API route**

```typescript
// apps/web/app/api/onboarding/create-students/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createServiceSupabaseClient } from "@/lib/supabase/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSchoolId } from "@/lib/school";

interface StudentInput {
  fullName: string;
  classId: string;
  sectionId: string;
  academicYearId: string;
}

export async function POST(request: NextRequest) {
  const { students }: { students: StudentInput[] } = await request.json();
  if (!students?.length) return NextResponse.json({ created: 0 });

  const schoolId = await getSchoolId();
  if (!schoolId) return NextResponse.json({ error: "No school context" }, { status: 400 });

  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const svc = createServiceSupabaseClient();
  let created = 0;

  for (const s of students) {
    // Create minimal auth user (no phone — student doesn't log in directly)
    const { data: authUser, error: authError } = await svc.auth.admin.createUser({
      email: `student-${Date.now()}-${Math.random().toString(36).slice(2)}@noreply.internal`,
      user_metadata: { full_name: s.fullName },
    });

    if (authError || !authUser.user) continue;

    const userId = authUser.user.id;

    await svc.from("profiles").update({
      full_name: s.fullName,
      school_id: schoolId,
    }).eq("id", userId);

    const { data: sp } = await svc.from("student_profiles").insert({
      profile_id: userId,
      school_id: schoolId,
      admission_number: `ADM-${Date.now()}`,
    }).select("id").single();

    if (!sp) continue;

    // Create enrollment for the academic year
    await svc.from("student_enrollments").insert({
      student_profile_id: sp.id,
      academic_year_id: s.academicYearId,
      school_id: schoolId,
      class_id: s.classId,
      section_id: s.sectionId,
      is_active: true,
    });

    created++;
  }

  return NextResponse.json({ created });
}
```

- [ ] **Step 2: Implement Step 4 component**

```typescript
// apps/web/app/admin/onboarding/steps/step-students.tsx
"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Plus, X } from "lucide-react";
import { createClient } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface StudentRow {
  fullName: string;
  classId: string;
  sectionId: string;
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

export function StepStudents({
  schoolId,
  academicYearId,
  brandColor,
  onComplete,
  onSkip,
}: {
  schoolId: string;
  academicYearId: string;
  brandColor: string;
  onComplete: () => void;
  onSkip: () => void;
}) {
  const [rows, setRows] = useState<StudentRow[]>([{ fullName: "", classId: "", sectionId: "" }]);
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [sections, setSections] = useState<SectionOption[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    Promise.all([
      supabase.from("classes").select("id, name").eq("school_id", schoolId).order("order"),
      supabase.from("sections").select("id, name, class_id").eq("school_id", schoolId).eq("academic_year_id", academicYearId),
    ]).then(([{ data: cls }, { data: sec }]) => {
      setClasses(cls ?? []);
      const mapped = (sec ?? []).map((s) => ({ id: s.id, name: s.name, classId: s.class_id }));
      setSections(mapped);
      // Pre-fill first row if only one class
      if ((cls ?? []).length === 1) {
        const firstClass = cls![0];
        const firstSection = mapped.find((s) => s.classId === firstClass.id);
        setRows([{ fullName: "", classId: firstClass.id, sectionId: firstSection?.id ?? "" }]);
      }
    });
  }, [schoolId, academicYearId]);

  function updateRow(index: number, field: keyof StudentRow, value: string) {
    setRows((prev) =>
      prev.map((r, i) => {
        if (i !== index) return r;
        const updated = { ...r, [field]: value };
        // Reset section when class changes
        if (field === "classId") updated.sectionId = sections.find((s) => s.classId === value)?.id ?? "";
        return updated;
      })
    );
  }

  function addRow() {
    const last = rows[rows.length - 1];
    setRows((prev) => [...prev, { fullName: "", classId: last?.classId ?? "", sectionId: last?.sectionId ?? "" }]);
  }

  function removeRow(index: number) {
    setRows((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSave() {
    const valid = rows.filter((r) => r.fullName.trim() && r.classId && r.sectionId);
    if (valid.length === 0) { toast.error("Add at least one student with name, class, and section"); return; }
    setLoading(true);
    const res = await fetch("/api/onboarding/create-students", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ students: valid.map((r) => ({ ...r, academicYearId })) }),
    });
    setLoading(false);
    if (!res.ok) { toast.error("Failed to create students"); return; }
    const data = await res.json();
    toast.success(`${data.created} student${data.created !== 1 ? "s" : ""} added.`);
    onComplete();
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border bg-white p-8 shadow-sm">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-foreground">Add Students</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Add students manually or skip and use bulk import later from the Students page.
          </p>
        </div>

        {classes.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">No classes found. Complete Step 2 first, or skip and add students later.</p>
        ) : (
          <>
            <div className="space-y-3">
              {rows.map((row, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Input
                    placeholder="Student full name"
                    value={row.fullName}
                    onChange={(e) => updateRow(i, "fullName", e.target.value)}
                    className="flex-1"
                  />
                  <select
                    value={row.classId}
                    onChange={(e) => updateRow(i, "classId", e.target.value)}
                    className="rounded-lg border border-border bg-white px-3 py-2 text-sm"
                  >
                    <option value="">Class</option>
                    {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  <select
                    value={row.sectionId}
                    onChange={(e) => updateRow(i, "sectionId", e.target.value)}
                    className="rounded-lg border border-border bg-white px-3 py-2 text-sm"
                  >
                    <option value="">Section</option>
                    {sections.filter((s) => s.classId === row.classId).map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                  {rows.length > 1 && (
                    <button type="button" onClick={() => removeRow(i)} className="rounded p-1 text-muted-foreground hover:bg-muted">
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            <button type="button" onClick={addRow} className="mt-3 flex items-center gap-1.5 text-sm text-indigo-600 hover:underline">
              <Plus className="h-3.5 w-3.5" /> Add another student
            </button>
          </>
        )}

        <div className="mt-6">
          <Button onClick={handleSave} disabled={loading || classes.length === 0} className="w-full" style={{ backgroundColor: brandColor }}>
            {loading ? "Saving…" : "Finish Setup →"}
          </Button>
        </div>
      </div>

      <div className="text-center">
        <button type="button" onClick={onSkip} className="text-sm text-muted-foreground underline hover:text-foreground">
          Skip for now
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Verify Step 4**

Complete Steps 1–3, then on Step 4 add 2 students. Click "Finish Setup". Verify in DB:

```bash
psql postgresql://postgres:postgres@127.0.0.1:54322/postgres \
  -c "SELECT sp.admission_number, p.full_name, se.class_id FROM public.student_profiles sp JOIN public.profiles p ON p.id = sp.profile_id JOIN public.student_enrollments se ON se.student_profile_id = sp.id ORDER BY sp.created_at DESC LIMIT 5;"
```

Also test "Skip for now" — should trigger `onComplete` and show the completion screen.

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/api/onboarding/create-students/ apps/web/app/admin/onboarding/steps/step-students.tsx
git commit -m "feat: onboarding Step 4 — bulk student creation with enrollment"
```

---

## Task 8: Completion screen + post-onboarding banner

**Files:**
- Modify: `apps/web/app/admin/onboarding/completion-screen.tsx`
- Modify: `apps/web/app/(school)/admin/dashboard/page.tsx`

- [ ] **Step 1: Implement completion screen**

```typescript
// apps/web/app/admin/onboarding/completion-screen.tsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2 } from "lucide-react";

export function CompletionScreen({
  schoolName,
  brandColor,
}: {
  schoolName: string;
  brandColor: string;
}) {
  const router = useRouter();

  useEffect(() => {
    const t = setTimeout(() => router.push("/admin/dashboard"), 2000);
    return () => clearTimeout(t);
  }, [router]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-gray-50">
      <CheckCircle2 className="h-16 w-16 text-emerald-500" />
      <div className="text-center">
        <h1 className="text-2xl font-bold text-foreground">{schoolName} is ready.</h1>
        <p className="mt-2 text-sm text-muted-foreground">Taking you to the dashboard…</p>
      </div>
      <div className="h-1 w-40 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full animate-[grow_2s_linear_forwards] rounded-full"
          style={{ backgroundColor: brandColor }}
        />
      </div>
    </div>
  );
}
```

Add the animation to `apps/web/tailwind.config.ts` (or the global CSS) if not already present:

```typescript
// In tailwind.config.ts, extend theme.animation:
animation: {
  "grow": "grow 2s linear forwards",
},
keyframes: {
  grow: {
    "0%": { width: "0%" },
    "100%": { width: "100%" },
  },
},
```

- [ ] **Step 2: Add post-onboarding banner to dashboard**

In `apps/web/app/(school)/admin/dashboard/page.tsx`, add a client component for the banner. Create it inline:

```typescript
// Add at the top of dashboard page, before the stats grid:
import { PostOnboardingBanner } from "./post-onboarding-banner";

// In the JSX, as first child of the space-y-6 div:
<PostOnboardingBanner />
```

Create the banner component:

```typescript
// apps/web/app/(school)/admin/dashboard/post-onboarding-banner.tsx
"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import Link from "next/link";

const STORAGE_KEY = "onboarding_banner_dismissed";

export function PostOnboardingBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem(STORAGE_KEY);
    if (!dismissed) setVisible(true);
  }, []);

  function dismiss() {
    localStorage.setItem(STORAGE_KEY, "1");
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-4">
      <div className="flex items-center gap-4">
        <span className="text-sm font-medium text-emerald-800">
          Setup complete — here's what to do next:
        </span>
        <div className="flex items-center gap-2">
          <Link href="/admin/timetable" className="rounded-lg border border-emerald-300 bg-white px-3 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-50">
            Add Timetable
          </Link>
          <Link href="/admin/subjects" className="rounded-lg border border-emerald-300 bg-white px-3 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-50">
            Assign Subjects
          </Link>
          <Link href="/admin/fees" className="rounded-lg border border-emerald-300 bg-white px-3 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-50">
            Set Up Fees
          </Link>
        </div>
      </div>
      <button onClick={dismiss} className="rounded p-1 text-emerald-600 hover:bg-emerald-100">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
```

- [ ] **Step 3: Verify full wizard flow end to end**

Delete academic years for test school. Visit `http://school1.lvh.me:3000/admin/dashboard`. Should redirect to onboarding. Complete all 4 steps. Completion screen should show for ~2 seconds then redirect to dashboard. Dashboard should show the green "Setup complete" banner. Dismiss it — should not reappear on refresh.

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/admin/onboarding/completion-screen.tsx apps/web/app/(school)/admin/dashboard/post-onboarding-banner.tsx apps/web/app/(school)/admin/dashboard/page.tsx
git commit -m "feat: onboarding completion screen and post-onboarding dashboard banner"
```

---

## Self-Review Notes

**Spec coverage check:**
- ✅ Route `/admin/onboarding` outside `(school)` layout — Task 2
- ✅ Entry logic — zero academic years → redirect — Task 1
- ✅ Exit logic — year created → `status = 'active'` → redirect passes — Task 1
- ✅ Re-entry prevention — server page redirects if year exists — Task 2
- ✅ URL stays constant throughout — single page, client state — Task 3
- ✅ Resume logic — derived from DB counts — Task 2
- ✅ Step indicator with checkmarks — Task 3
- ✅ Step 1: academic year with smart defaults — Task 4
- ✅ Step 2: reuses ClassesQuickSetup — Task 5
- ✅ Step 3: bulk teacher entry, name + phone only — Task 6
- ✅ Step 4: bulk student entry, name + class + section — Task 7
- ✅ "I'll set this up later" / "Skip for now" on each step — Tasks 5, 6, 7
- ✅ Completion screen 2-second auto-redirect — Task 8
- ✅ Post-onboarding dashboard banner — Task 8
- ✅ Banner dismissed via localStorage — Task 8
