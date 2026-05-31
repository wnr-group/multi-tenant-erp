# Student Profile Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a full student profile (photo, attendance history, academics, fees) accessible and editable by both admins (`/admin/students/[id]`) and teachers (`/teacher/students`, `/teacher/students/[id]`), backed by a Supabase Storage bucket for photos.

**Architecture:** One migration adds `photo_url` + `parent_phone` to `student_profiles` and widens the RLS write policy to include teachers. A shared set of server-component tab panels (`StudentAttendanceTab`, `StudentAcademicsTab`, `StudentFeesTab`) are composed into both the admin and teacher detail pages. The teacher students list page is section-scoped via the existing `getActiveSection()` helper.

**Tech Stack:** Next.js 15 App Router (server components + client forms), Supabase (Postgres + Storage), Tailwind CSS, shadcn/ui primitives already in `apps/web/components/ui/`.

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `supabase/migrations/20240001000021_student_profile_fields.sql` | Create | Add `photo_url`, `parent_phone`; widen `student_profiles_write` RLS to teachers; create `student-photos` storage bucket + policies |
| `apps/web/app/(school)/admin/students/add-student-form.tsx` | Modify | Add `parent_phone` field |
| `apps/web/app/(school)/admin/students/[id]/page.tsx` | Rewrite | Full tabbed profile page (server component, fetches all data) |
| `apps/web/app/(school)/admin/students/[id]/student-edit-form.tsx` | Create | Client form for editing name, email, roll, admission_no, class, section, parent_phone |
| `apps/web/app/(school)/admin/students/[id]/photo-upload.tsx` | Create | Client component — click avatar → file picker → upload to Supabase Storage → update `photo_url` |
| `apps/web/app/(school)/admin/students/[id]/student-attendance-tab.tsx` | Create | Server component — monthly calendar grid + stats for one student |
| `apps/web/app/(school)/admin/students/[id]/student-academics-tab.tsx` | Create | Server component — exam results grouped by exam for one student |
| `apps/web/app/(school)/admin/students/[id]/student-fees-tab.tsx` | Create | Server component + inline `RecordPaymentForm` for one student |
| `apps/web/app/(school)/teacher/students/page.tsx` | Create | Section-scoped student list (server component) |
| `apps/web/app/(school)/teacher/students/[id]/page.tsx` | Create | Teacher's student detail — same tabs, full edit access |
| `apps/web/app/(school)/layout.tsx` | Modify | Add "Students" to teacher nav items |

---

## Task 1: Migration — schema + RLS + storage bucket

**Files:**
- Create: `supabase/migrations/20240001000021_student_profile_fields.sql`

- [ ] **Step 1: Write the migration**

```sql
-- supabase/migrations/20240001000021_student_profile_fields.sql

-- New columns on student_profiles
ALTER TABLE public.student_profiles
  ADD COLUMN IF NOT EXISTS photo_url   TEXT,
  ADD COLUMN IF NOT EXISTS parent_phone TEXT;

-- Widen student_profiles write policy to include teachers
DROP POLICY IF EXISTS "student_profiles_write" ON public.student_profiles;
CREATE POLICY "student_profiles_write" ON public.student_profiles FOR ALL
  USING (
    public.get_my_role() IN ('super_admin', 'school_admin', 'teacher')
    AND school_id = public.get_my_school_id()
  )
  WITH CHECK (
    public.get_my_role() IN ('super_admin', 'school_admin', 'teacher')
    AND school_id = public.get_my_school_id()
  );

-- Storage bucket for student photos (public read, authenticated write)
INSERT INTO storage.buckets (id, name, public)
VALUES ('student-photos', 'student-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Allow any authenticated school user to upload
CREATE POLICY "student_photos_insert" ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'student-photos'
    AND auth.role() = 'authenticated'
  );

-- Allow authenticated users to update/delete their own uploads
CREATE POLICY "student_photos_update" ON storage.objects FOR UPDATE
  USING (bucket_id = 'student-photos' AND auth.role() = 'authenticated');

CREATE POLICY "student_photos_delete" ON storage.objects FOR DELETE
  USING (bucket_id = 'student-photos' AND auth.role() = 'authenticated');

-- Public read (bucket is public, but explicit policy for safety)
CREATE POLICY "student_photos_select" ON storage.objects FOR SELECT
  USING (bucket_id = 'student-photos');
```

- [ ] **Step 2: Apply the migration**

```bash
cd /path/to/repo
npx supabase db push
# or for local dev:
npx supabase migration up
```

Expected: migration applies with no errors.

- [ ] **Step 3: Verify columns exist**

```bash
npx supabase db shell --command "\d public.student_profiles" | grep -E "photo_url|parent_phone"
```

Expected output contains both `photo_url` and `parent_phone` rows.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20240001000021_student_profile_fields.sql
git commit -m "feat: add photo_url + parent_phone to student_profiles, widen teacher write RLS, add student-photos storage bucket"
```

---

## Task 2: Add parent_phone to "Add Student" form

**Files:**
- Modify: `apps/web/app/(school)/admin/students/add-student-form.tsx`

- [ ] **Step 1: Add `parentPhone` state and field**

Replace the existing `add-student-form.tsx` content with:

```tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";

interface ClassOption { id: string; name: string }
interface SectionOption { id: string; name: string }

export function AddStudentForm({
  schoolId,
  classes,
  onSuccess,
}: {
  schoolId: string;
  classes: ClassOption[];
  onSuccess?: () => void;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [rollNumber, setRollNumber] = useState("");
  const [admissionNumber, setAdmissionNumber] = useState("");
  const [parentPhone, setParentPhone] = useState("");
  const [classId, setClassId] = useState("");
  const [sectionId, setSectionId] = useState("");
  const [sections, setSections] = useState<SectionOption[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!classId) return;
    const supabase = createClient();
    supabase
      .from("sections")
      .select("id, name")
      .eq("class_id", classId)
      .then(({ data }) => {
        setSections(data ?? []);
        setSectionId("");
      });
  }, [classId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.from("student_profiles").insert({
      school_id: schoolId,
      full_name: name,
      email: email || null,
      class_id: classId || null,
      section_id: sectionId || null,
      roll_number: rollNumber || null,
      admission_number: admissionNumber || null,
      parent_phone: parentPhone || null,
    });
    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }
    setName(""); setEmail(""); setRollNumber(""); setAdmissionNumber("");
    setParentPhone(""); setClassId(""); setSectionId("");
    setLoading(false);
    toast.success("Student added.");
    router.refresh();
    onSuccess?.();
  }

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-3">
      <div><Label>Full Name *</Label><Input value={name} onChange={(e) => setName(e.target.value)} required /></div>
      <div><Label>Email (optional)</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
      <div><Label>Roll Number</Label><Input value={rollNumber} onChange={(e) => setRollNumber(e.target.value)} /></div>
      <div><Label>Admission Number</Label><Input value={admissionNumber} onChange={(e) => setAdmissionNumber(e.target.value)} /></div>
      <div className="col-span-2">
        <Label>Parent Phone *</Label>
        <Input
          type="tel"
          value={parentPhone}
          onChange={(e) => setParentPhone(e.target.value)}
          placeholder="+91 98765 43210"
          required
        />
      </div>
      <div>
        <Label>Class</Label>
        <NativeSelect
          options={classes.map((c) => ({ value: c.id, label: c.name }))}
          value={classId}
          onChange={(e) => setClassId(e.target.value)}
          placeholder="Select class"
        />
      </div>
      <div>
        <Label>Section</Label>
        <NativeSelect
          options={sections.map((s) => ({ value: s.id, label: s.name }))}
          value={sectionId}
          onChange={(e) => setSectionId(e.target.value)}
          placeholder="Select section"
          disabled={!classId}
        />
      </div>
      <div className="col-span-2">
        <Button type="submit" disabled={loading}>{loading ? "Adding…" : "Add Student"}</Button>
      </div>
    </form>
  );
}
```

- [ ] **Step 2: Verify the form renders without TypeScript errors**

```bash
cd apps/web && npx tsc --noEmit 2>&1 | grep "add-student-form"
```

Expected: no output (no errors).

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/\(school\)/admin/students/add-student-form.tsx
git commit -m "feat: add parent_phone + admission_number fields to Add Student form"
```

---

## Task 3: PhotoUpload client component

**Files:**
- Create: `apps/web/app/(school)/admin/students/[id]/photo-upload.tsx`

- [ ] **Step 1: Create the component**

```tsx
// apps/web/app/(school)/admin/students/[id]/photo-upload.tsx
"use client";

import { useRef, useState, useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { toast } from "sonner";
import { Camera } from "lucide-react";

interface Props {
  studentId: string;
  studentName: string;
  photoUrl: string | null;
}

export function PhotoUpload({ studentId, studentName, photoUrl }: Props) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(photoUrl);
  const [isPending, startTransition] = useTransition();

  const initials = studentName
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5 MB.");
      return;
    }

    // Optimistic preview
    const localUrl = URL.createObjectURL(file);
    setPreview(localUrl);

    startTransition(async () => {
      const supabase = createClient();
      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `${studentId}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("student-photos")
        .upload(path, file, { upsert: true, contentType: file.type });

      if (uploadError) {
        toast.error(uploadError.message);
        setPreview(photoUrl);
        return;
      }

      const { data: urlData } = supabase.storage
        .from("student-photos")
        .getPublicUrl(path);

      const publicUrl = urlData.publicUrl;

      const { error: dbError } = await supabase
        .from("student_profiles")
        .update({ photo_url: publicUrl })
        .eq("id", studentId);

      if (dbError) {
        toast.error(dbError.message);
        setPreview(photoUrl);
        return;
      }

      toast.success("Photo updated.");
      router.refresh();
    });
  }

  return (
    <div className="relative group cursor-pointer" onClick={() => inputRef.current?.click()}>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFile}
        disabled={isPending}
      />
      <div className="relative h-20 w-20 rounded-full overflow-hidden bg-emerald-100 flex items-center justify-center">
        {preview ? (
          <Image
            src={preview}
            alt={studentName}
            fill
            className="object-cover"
            unoptimized
          />
        ) : (
          <span className="text-2xl font-bold text-emerald-600">{initials}</span>
        )}
        {/* Overlay on hover */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-full">
          <Camera className="h-6 w-6 text-white" />
        </div>
        {isPending && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-full">
            <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Check for TypeScript errors**

```bash
cd apps/web && npx tsc --noEmit 2>&1 | grep "photo-upload"
```

Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/\(school\)/admin/students/\[id\]/photo-upload.tsx
git commit -m "feat: PhotoUpload component — click avatar to upload to Supabase Storage"
```

---

## Task 4: StudentEditForm client component

**Files:**
- Create: `apps/web/app/(school)/admin/students/[id]/student-edit-form.tsx`

- [ ] **Step 1: Create the component**

```tsx
// apps/web/app/(school)/admin/students/[id]/student-edit-form.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";

interface ClassOption { id: string; name: string }
interface SectionOption { id: string; name: string }

interface Props {
  studentId: string;
  schoolId: string;
  initialName: string;
  initialEmail: string;
  initialRoll: string;
  initialAdmission: string;
  initialParentPhone: string;
  initialClassId: string;
  initialSectionId: string;
  classes: ClassOption[];
}

export function StudentEditForm({
  studentId,
  schoolId,
  initialName,
  initialEmail,
  initialRoll,
  initialAdmission,
  initialParentPhone,
  initialClassId,
  initialSectionId,
  classes,
}: Props) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [email, setEmail] = useState(initialEmail);
  const [roll, setRoll] = useState(initialRoll);
  const [admission, setAdmission] = useState(initialAdmission);
  const [parentPhone, setParentPhone] = useState(initialParentPhone);
  const [classId, setClassId] = useState(initialClassId);
  const [sectionId, setSectionId] = useState(initialSectionId);
  const [sections, setSections] = useState<SectionOption[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!classId) return;
    const supabase = createClient();
    supabase
      .from("sections")
      .select("id, name")
      .eq("class_id", classId)
      .then(({ data }) => setSections(data ?? []));
  }, [classId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("student_profiles")
      .update({
        full_name: name,
        email: email || null,
        roll_number: roll || null,
        admission_number: admission || null,
        parent_phone: parentPhone || null,
        class_id: classId || null,
        section_id: sectionId || null,
      })
      .eq("id", studentId);
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Student profile updated.");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
      <div><Label>Full Name *</Label><Input value={name} onChange={(e) => setName(e.target.value)} required /></div>
      <div><Label>Email</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
      <div><Label>Roll Number</Label><Input value={roll} onChange={(e) => setRoll(e.target.value)} /></div>
      <div><Label>Admission Number</Label><Input value={admission} onChange={(e) => setAdmission(e.target.value)} /></div>
      <div className="col-span-2">
        <Label>Parent Phone</Label>
        <Input type="tel" value={parentPhone} onChange={(e) => setParentPhone(e.target.value)} placeholder="+91 98765 43210" />
      </div>
      <div>
        <Label>Class</Label>
        <NativeSelect
          options={classes.map((c) => ({ value: c.id, label: c.name }))}
          value={classId}
          onChange={(e) => setClassId(e.target.value)}
          placeholder="Select class"
        />
      </div>
      <div>
        <Label>Section</Label>
        <NativeSelect
          options={sections.map((s) => ({ value: s.id, label: s.name }))}
          value={sectionId}
          onChange={(e) => setSectionId(e.target.value)}
          placeholder="Select section"
          disabled={!classId}
        />
      </div>
      <div className="col-span-2">
        <Button type="submit" disabled={loading}>{loading ? "Saving…" : "Save Changes"}</Button>
      </div>
    </form>
  );
}
```

- [ ] **Step 2: Check TypeScript**

```bash
cd apps/web && npx tsc --noEmit 2>&1 | grep "student-edit-form"
```

Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/\(school\)/admin/students/\[id\]/student-edit-form.tsx
git commit -m "feat: StudentEditForm — edit all student fields including parent phone, class/section"
```

---

## Task 5: StudentAttendanceTab server component

**Files:**
- Create: `apps/web/app/(school)/admin/students/[id]/student-attendance-tab.tsx`

- [ ] **Step 1: Create the component**

```tsx
// apps/web/app/(school)/admin/students/[id]/student-attendance-tab.tsx
import { createServerSupabaseClient } from "@/lib/supabase/server";

const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const DAY_LABELS = ["Su","Mo","Tu","We","Th","Fr","Sa"];

interface Props {
  studentId: string;
  month: number; // 0-indexed
  year: number;
}

export async function StudentAttendanceTab({ studentId, month, year }: Props) {
  const supabase = await createServerSupabaseClient();

  const from = `${year}-${String(month + 1).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month + 1, 0).getDate();
  const to = `${year}-${String(month + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

  const { data: records } = await supabase
    .from("attendance_records")
    .select("date, status")
    .eq("student_id", studentId)
    .gte("date", from)
    .lte("date", to);

  const statusMap: Record<string, string> = {};
  for (const r of records ?? []) statusMap[r.date] = r.status;

  const present = Object.values(statusMap).filter((s) => s === "present").length;
  const absent = Object.values(statusMap).filter((s) => s === "absent").length;
  const late = Object.values(statusMap).filter((s) => s === "late").length;
  const total = Object.keys(statusMap).length;
  const pct = total > 0 ? Math.round((present / total) * 100) : 0;

  const firstDow = new Date(year, month, 1).getDay();
  const daysInMonth = lastDay;
  const cells = [...Array(firstDow).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];

  function cellColor(day: number): string {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const s = statusMap[dateStr];
    if (s === "present") return "bg-emerald-500 text-white";
    if (s === "absent") return "bg-rose-500 text-white";
    if (s === "late") return "bg-amber-400 text-white";
    return "bg-muted text-muted-foreground";
  }

  return (
    <div className="space-y-6">
      {/* Stats row */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Attendance", value: `${pct}%`, color: "text-emerald-600" },
          { label: "Present", value: present, color: "text-emerald-600" },
          { label: "Absent", value: absent, color: "text-rose-600" },
          { label: "Late", value: late, color: "text-amber-600" },
        ].map((s) => (
          <div key={s.label} className="rounded-lg border bg-card p-4 text-center shadow-sm">
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="mt-1 text-xs text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Calendar */}
      <div className="rounded-lg border bg-card p-4 shadow-sm">
        <h3 className="mb-3 text-sm font-semibold text-muted-foreground">
          {MONTH_NAMES[month]} {year}
        </h3>
        <div className="grid grid-cols-7 gap-1">
          {DAY_LABELS.map((d) => (
            <div key={d} className="py-1 text-center text-xs font-medium text-muted-foreground">{d}</div>
          ))}
          {cells.map((day, i) => (
            <div key={i} className={`aspect-square rounded-md flex items-center justify-center text-xs font-medium ${day ? cellColor(day) : ""}`}>
              {day ?? ""}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex gap-4 text-xs text-muted-foreground">
        {[
          { color: "bg-emerald-500", label: "Present" },
          { color: "bg-rose-500", label: "Absent" },
          { color: "bg-amber-400", label: "Late" },
          { color: "bg-muted", label: "No record" },
        ].map((l) => (
          <div key={l.label} className="flex items-center gap-1.5">
            <div className={`h-3 w-3 rounded-sm ${l.color}`} />
            {l.label}
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Check TypeScript**

```bash
cd apps/web && npx tsc --noEmit 2>&1 | grep "student-attendance-tab"
```

Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/\(school\)/admin/students/\[id\]/student-attendance-tab.tsx
git commit -m "feat: StudentAttendanceTab — monthly calendar grid + stats for one student"
```

---

## Task 6: StudentAcademicsTab server component

**Files:**
- Create: `apps/web/app/(school)/admin/students/[id]/student-academics-tab.tsx`

- [ ] **Step 1: Create the component**

```tsx
// apps/web/app/(school)/admin/students/[id]/student-academics-tab.tsx
import { createServerSupabaseClient } from "@/lib/supabase/server";

interface Props {
  studentId: string;
}

export async function StudentAcademicsTab({ studentId }: Props) {
  const supabase = await createServerSupabaseClient();

  const { data: results } = await supabase
    .from("exam_results")
    .select("id, marks_obtained, max_marks, grade, subject:subjects(name), exam:exams(name, start_date)")
    .eq("student_id", studentId)
    .order("created_at", { ascending: false });

  // Group by exam name
  const examMap = new Map<string, { examName: string; date: string; results: typeof results }>();
  for (const r of results ?? []) {
    const exam = r.exam as unknown as { name: string; start_date: string | null } | null;
    const examName = exam?.name ?? "Unknown Exam";
    const date = exam?.start_date ?? "";
    if (!examMap.has(examName)) examMap.set(examName, { examName, date, results: [] });
    examMap.get(examName)!.results!.push(r);
  }

  const groups = Array.from(examMap.values()).sort((a, b) =>
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  if (groups.length === 0) {
    return (
      <p className="py-12 text-center text-sm text-muted-foreground">No exam results recorded yet.</p>
    );
  }

  return (
    <div className="space-y-6">
      {groups.map(({ examName, date, results: groupResults }) => {
        const totalObtained = (groupResults ?? []).reduce((s, r) => s + (r.marks_obtained ?? 0), 0);
        const totalMax = (groupResults ?? []).reduce((s, r) => s + (r.max_marks ?? 0), 0);
        const pct = totalMax > 0 ? Math.round((totalObtained / totalMax) * 100) : 0;

        return (
          <div key={examName} className="rounded-lg border bg-card shadow-sm overflow-hidden">
            <div className="flex items-center justify-between bg-muted/50 px-4 py-3">
              <div>
                <h3 className="text-sm font-semibold text-foreground">{examName}</h3>
                {date && <p className="text-xs text-muted-foreground">{new Date(date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</p>}
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${pct >= 60 ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>
                {totalObtained}/{totalMax} · {pct}%
              </span>
            </div>
            <table className="min-w-full divide-y divide-border text-sm">
              <thead>
                <tr className="bg-muted/30">
                  <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">Subject</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-muted-foreground">Marks</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-muted-foreground">Grade</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {(groupResults ?? []).map((r) => {
                  const subject = r.subject as unknown as { name: string } | null;
                  return (
                    <tr key={r.id} className="hover:bg-muted/20">
                      <td className="px-4 py-2 font-medium text-foreground">{subject?.name ?? "—"}</td>
                      <td className="px-4 py-2 text-right tabular-nums text-muted-foreground">
                        {r.marks_obtained ?? "—"}/{r.max_marks ?? "—"}
                      </td>
                      <td className="px-4 py-2 text-right font-semibold text-foreground">{r.grade ?? "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Check TypeScript**

```bash
cd apps/web && npx tsc --noEmit 2>&1 | grep "student-academics-tab"
```

Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/\(school\)/admin/students/\[id\]/student-academics-tab.tsx
git commit -m "feat: StudentAcademicsTab — exam results grouped by exam with totals"
```

---

## Task 7: StudentFeesTab server component

**Files:**
- Create: `apps/web/app/(school)/admin/students/[id]/student-fees-tab.tsx`

- [ ] **Step 1: Create the component**

```tsx
// apps/web/app/(school)/admin/students/[id]/student-fees-tab.tsx
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSchoolId } from "@/lib/school";
import { StudentFeesClient } from "./student-fees-client";

interface Props {
  studentId: string;
  studentName: string;
}

export async function StudentFeesTab({ studentId, studentName }: Props) {
  const supabase = await createServerSupabaseClient();
  const schoolId = (await getSchoolId())!;

  // Get student's class to find fee structures
  const { data: sp } = await supabase
    .from("student_profiles")
    .select("class_id")
    .eq("id", studentId)
    .single();

  const { data: feeStructures } = await supabase
    .from("fee_structures")
    .select("id, fee_type, amount")
    .eq("school_id", schoolId)
    .eq("class_id", sp?.class_id ?? "00000000-0000-0000-0000-000000000000");

  const { data: payments } = await supabase
    .from("fee_payments")
    .select("fee_structure_id, amount_paid, concession_amount")
    .eq("student_id", studentId)
    .eq("school_id", schoolId);

  const paidMap = new Map<string, number>();
  const concessionMap = new Map<string, number>();
  for (const p of payments ?? []) {
    paidMap.set(p.fee_structure_id, (paidMap.get(p.fee_structure_id) ?? 0) + (p.amount_paid ?? 0));
    concessionMap.set(p.fee_structure_id, (concessionMap.get(p.fee_structure_id) ?? 0) + (p.concession_amount ?? 0));
  }

  const rows = (feeStructures ?? []).map((fs) => ({
    feeStructureId: fs.id,
    feeType: fs.fee_type as string,
    amountDue: fs.amount as number,
    amountPaid: paidMap.get(fs.id) ?? 0,
    concessionTotal: concessionMap.get(fs.id) ?? 0,
    status: (() => {
      const effective = (paidMap.get(fs.id) ?? 0) + (concessionMap.get(fs.id) ?? 0);
      if (effective >= (fs.amount as number)) return "paid";
      if (effective > 0) return "partial";
      return "pending";
    })(),
  }));

  return (
    <StudentFeesClient
      rows={rows}
      schoolId={schoolId}
      studentId={studentId}
      studentName={studentName}
    />
  );
}
```

- [ ] **Step 2: Create the client shell for the fees tab**

```tsx
// apps/web/app/(school)/admin/students/[id]/student-fees-client.tsx
"use client";

import { useState } from "react";
import { RecordPaymentForm } from "@/app/(school)/teacher/fees/record-payment-form";

interface FeeRow {
  feeStructureId: string;
  feeType: string;
  amountDue: number;
  amountPaid: number;
  concessionTotal: number;
  status: string;
}

interface Props {
  rows: FeeRow[];
  schoolId: string;
  studentId: string;
  studentName: string;
}

function StatusBadge({ status }: { status: string }) {
  const cls =
    status === "paid" ? "bg-emerald-100 text-emerald-800" :
    status === "partial" ? "bg-amber-100 text-amber-800" :
    "bg-rose-100 text-rose-800";
  return <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${cls}`}>{status}</span>;
}

export function StudentFeesClient({ rows, schoolId, studentId, studentName }: Props) {
  const [payingFor, setPayingFor] = useState<FeeRow | null>(null);

  const totalDue = rows.reduce((s, r) => s + r.amountDue, 0);
  const totalPaid = rows.reduce((s, r) => s + r.amountPaid + r.concessionTotal, 0);
  const outstanding = Math.max(0, totalDue - totalPaid);

  return (
    <div className="space-y-4">
      {payingFor && (
        <RecordPaymentForm
          schoolId={schoolId}
          studentId={studentId}
          studentName={studentName}
          feeStructureId={payingFor.feeStructureId}
          amountDue={payingFor.amountDue}
          amountPaid={payingFor.amountPaid}
          concessionTotal={payingFor.concessionTotal}
          onClose={() => setPayingFor(null)}
        />
      )}

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total Due", value: `₹${totalDue.toLocaleString("en-IN")}`, color: "text-foreground" },
          { label: "Paid", value: `₹${totalPaid.toLocaleString("en-IN")}`, color: "text-emerald-600" },
          { label: "Outstanding", value: `₹${outstanding.toLocaleString("en-IN")}`, color: outstanding > 0 ? "text-rose-600" : "text-emerald-600" },
        ].map((s) => (
          <div key={s.label} className="rounded-lg border bg-card p-4 text-center shadow-sm">
            <p className={`text-xl font-bold tabular-nums ${s.color}`}>{s.value}</p>
            <p className="mt-1 text-xs text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border bg-card shadow-sm">
        <table className="min-w-full divide-y divide-border text-sm">
          <thead className="bg-muted/50">
            <tr>
              {["Fee Type", "Due (₹)", "Paid (₹)", "Concession (₹)", "Status", "Action"].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No fee structures assigned to this student&apos;s class.</td></tr>
            ) : rows.map((row) => (
              <tr key={row.feeStructureId} className="hover:bg-muted/30">
                <td className="px-4 py-3 font-medium">{row.feeType}</td>
                <td className="px-4 py-3 tabular-nums">{row.amountDue.toLocaleString("en-IN")}</td>
                <td className="px-4 py-3 tabular-nums">{row.amountPaid.toLocaleString("en-IN")}</td>
                <td className="px-4 py-3 tabular-nums">{row.concessionTotal > 0 ? row.concessionTotal.toLocaleString("en-IN") : "—"}</td>
                <td className="px-4 py-3"><StatusBadge status={row.status} /></td>
                <td className="px-4 py-3">
                  {row.status !== "paid" && (
                    <button onClick={() => setPayingFor(row)} className="text-sm font-medium text-blue-600 hover:underline">
                      Record Payment
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Check TypeScript**

```bash
cd apps/web && npx tsc --noEmit 2>&1 | grep -E "student-fees"
```

Expected: no output.

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/\(school\)/admin/students/\[id\]/student-fees-tab.tsx apps/web/app/\(school\)/admin/students/\[id\]/student-fees-client.tsx
git commit -m "feat: StudentFeesTab — per-student fee summary with inline Record Payment"
```

---

## Task 8: Admin student detail page (full rewrite)

**Files:**
- Modify: `apps/web/app/(school)/admin/students/[id]/page.tsx`

- [ ] **Step 1: Rewrite the page**

```tsx
// apps/web/app/(school)/admin/students/[id]/page.tsx
export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSchoolId } from "@/lib/school";
import { buttonVariants } from "@/components/ui/button";
import { PhotoUpload } from "./photo-upload";
import { StudentEditForm } from "./student-edit-form";
import { StudentAttendanceTab } from "./student-attendance-tab";
import { StudentAcademicsTab } from "./student-academics-tab";
import { StudentFeesTab } from "./student-fees-tab";

type Tab = "attendance" | "academics" | "fees";

export default async function StudentDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string; month?: string; year?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const activeTab = (sp.tab ?? "attendance") as Tab;
  const now = new Date();
  const month = sp.month !== undefined ? parseInt(sp.month, 10) : now.getMonth();
  const year = sp.year !== undefined ? parseInt(sp.year, 10) : now.getFullYear();

  const supabase = await createServerSupabaseClient();
  const schoolId = (await getSchoolId())!;

  const [{ data: student }, { data: classes }] = await Promise.all([
    supabase
      .from("student_profiles")
      .select("id, full_name, email, roll_number, admission_number, photo_url, parent_phone, class_id, section_id, class:classes(name), section:sections(name)")
      .eq("id", id)
      .single(),
    supabase
      .from("classes")
      .select("id, name")
      .eq("school_id", schoolId)
      .order("order"),
  ]);

  if (!student) notFound();

  const cls = student.class as unknown as { name: string } | null;
  const sec = student.section as unknown as { name: string } | null;

  const tabs: { key: Tab; label: string }[] = [
    { key: "attendance", label: "Attendance" },
    { key: "academics", label: "Academics" },
    { key: "fees", label: "Fees" },
  ];

  // Month nav helpers
  const prevDate = new Date(year, month - 1);
  const nextDate = new Date(year, month + 1);
  const prevHref = `?tab=attendance&month=${prevDate.getMonth()}&year=${prevDate.getFullYear()}`;
  const nextHref = `?tab=attendance&month=${nextDate.getMonth()}&year=${nextDate.getFullYear()}`;
  const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

  return (
    <div className="space-y-6">
      <Link href="/admin/students" className={buttonVariants({ variant: "ghost", size: "sm" }) + " -ml-2"}>
        <ArrowLeft className="mr-1.5 h-4 w-4" />
        Back to Students
      </Link>

      {/* Student card */}
      <div className="rounded-lg border bg-white p-6 shadow-sm">
        <div className="flex items-start gap-5">
          <PhotoUpload
            studentId={student.id}
            studentName={student.full_name ?? "Student"}
            photoUrl={student.photo_url ?? null}
          />
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-bold text-gray-900">{student.full_name ?? "—"}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-500">
              {cls?.name && <span>{cls.name}{sec?.name ? ` · Section ${sec.name}` : ""}</span>}
              {student.roll_number && <span>Roll No: {student.roll_number}</span>}
              {student.admission_number && <span>Adm: {student.admission_number}</span>}
              {student.parent_phone && <span>📞 {student.parent_phone}</span>}
            </div>
          </div>
        </div>
      </div>

      {/* Edit form */}
      <div className="rounded-lg border bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-500">Edit Profile</h2>
        <StudentEditForm
          studentId={student.id}
          schoolId={schoolId}
          initialName={student.full_name ?? ""}
          initialEmail={student.email ?? ""}
          initialRoll={student.roll_number ?? ""}
          initialAdmission={student.admission_number ?? ""}
          initialParentPhone={student.parent_phone ?? ""}
          initialClassId={student.class_id ?? ""}
          initialSectionId={student.section_id ?? ""}
          classes={classes ?? []}
        />
      </div>

      {/* Tabs */}
      <div>
        <div className="flex gap-1 border-b border-border">
          {tabs.map((t) => (
            <Link
              key={t.key}
              href={`?tab=${t.key}`}
              className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
                activeTab === t.key
                  ? "border-indigo-600 text-indigo-600"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.label}
            </Link>
          ))}
        </div>
        <div className="pt-6">
          {activeTab === "attendance" && (
            <>
              <div className="mb-4 flex items-center gap-3">
                <Link href={prevHref} className="rounded-md border px-3 py-1.5 text-sm hover:bg-muted">←</Link>
                <span className="text-sm font-medium">{MONTH_NAMES[month]} {year}</span>
                <Link href={nextHref} className="rounded-md border px-3 py-1.5 text-sm hover:bg-muted">→</Link>
              </div>
              <StudentAttendanceTab studentId={id} month={month} year={year} />
            </>
          )}
          {activeTab === "academics" && <StudentAcademicsTab studentId={id} />}
          {activeTab === "fees" && <StudentFeesTab studentId={id} studentName={student.full_name ?? "Student"} />}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Check TypeScript**

```bash
cd apps/web && npx tsc --noEmit 2>&1 | grep "students/\[id\]/page"
```

Expected: no output.

- [ ] **Step 3: Verify in browser**

Navigate to `http://school.lvh.me:3000/admin/students` → click "View Profile" on any student. Verify:
- Avatar shows initials (or photo if uploaded)
- Click avatar → file picker opens → photo uploads
- Edit form pre-filled with student's current data
- Attendance tab shows calendar
- Academics tab shows results or "No results yet"
- Fees tab shows fee table with Record Payment button

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/\(school\)/admin/students/\[id\]/page.tsx
git commit -m "feat: full admin student detail page — photo, edit form, attendance/academics/fees tabs"
```

---

## Task 9: Teacher Students page (section-scoped list)

**Files:**
- Create: `apps/web/app/(school)/teacher/students/page.tsx`

- [ ] **Step 1: Create the page**

```tsx
// apps/web/app/(school)/teacher/students/page.tsx
export const dynamic = "force-dynamic";

import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getActiveSection } from "@/lib/section-context";
import { NoSectionPrompt } from "../no-section-prompt";

export default async function TeacherStudentsPage() {
  const sectionId = await getActiveSection();
  if (!sectionId) return <NoSectionPrompt />;

  const supabase = await createServerSupabaseClient();

  const [{ data: sectionRow }, { data: students }] = await Promise.all([
    supabase
      .from("sections")
      .select("name, class:classes(name)")
      .eq("id", sectionId)
      .single(),
    supabase
      .from("student_profiles")
      .select("id, full_name, roll_number, admission_number, photo_url, parent_phone")
      .eq("section_id", sectionId)
      .order("full_name"),
  ]);

  const cls = sectionRow?.class as unknown as { name: string } | null;
  const sectionLabel = cls ? `${cls.name} – Section ${sectionRow?.name}` : sectionRow?.name ?? "";

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Students</h1>
        <p className="mt-1 text-sm text-gray-500">{sectionLabel} · {students?.length ?? 0} students</p>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border bg-card shadow-sm">
        <table className="min-w-full divide-y divide-border text-sm">
          <thead className="bg-muted/50">
            <tr>
              {["Student", "Roll No.", "Admission No.", "Parent Phone", ""].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {(students ?? []).length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">No students in this section.</td>
              </tr>
            ) : (students ?? []).map((s) => {
              const initials = (s.full_name ?? "?").split(" ").slice(0, 2).map((w: string) => w[0]?.toUpperCase() ?? "").join("");
              return (
                <tr key={s.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-600 overflow-hidden">
                        {s.photo_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={s.photo_url} alt={s.full_name ?? ""} className="h-full w-full object-cover" />
                        ) : initials}
                      </div>
                      <span className="font-medium text-foreground">{s.full_name ?? "—"}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{s.roll_number ?? "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{s.admission_number ?? "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{s.parent_phone ?? "—"}</td>
                  <td className="px-4 py-3">
                    <Link href={`/teacher/students/${s.id}`} className="text-sm font-medium text-indigo-600 hover:underline">
                      View Profile
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Check TypeScript**

```bash
cd apps/web && npx tsc --noEmit 2>&1 | grep "teacher/students/page"
```

Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/\(school\)/teacher/students/page.tsx
git commit -m "feat: teacher students list page — section-scoped, shows photo/phone/roll"
```

---

## Task 10: Teacher student detail page

**Files:**
- Create: `apps/web/app/(school)/teacher/students/[id]/page.tsx`

- [ ] **Step 1: Create the page**

```tsx
// apps/web/app/(school)/teacher/students/[id]/page.tsx
export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSchoolId } from "@/lib/school";
import { buttonVariants } from "@/components/ui/button";
import { PhotoUpload } from "@/app/(school)/admin/students/[id]/photo-upload";
import { StudentEditForm } from "@/app/(school)/admin/students/[id]/student-edit-form";
import { StudentAttendanceTab } from "@/app/(school)/admin/students/[id]/student-attendance-tab";
import { StudentAcademicsTab } from "@/app/(school)/admin/students/[id]/student-academics-tab";
import { StudentFeesTab } from "@/app/(school)/admin/students/[id]/student-fees-tab";

type Tab = "attendance" | "academics" | "fees";

export default async function TeacherStudentDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string; month?: string; year?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const activeTab = (sp.tab ?? "attendance") as Tab;
  const now = new Date();
  const month = sp.month !== undefined ? parseInt(sp.month, 10) : now.getMonth();
  const year = sp.year !== undefined ? parseInt(sp.year, 10) : now.getFullYear();

  const supabase = await createServerSupabaseClient();
  const schoolId = (await getSchoolId())!;

  const [{ data: student }, { data: classes }] = await Promise.all([
    supabase
      .from("student_profiles")
      .select("id, full_name, email, roll_number, admission_number, photo_url, parent_phone, class_id, section_id, class:classes(name), section:sections(name)")
      .eq("id", id)
      .single(),
    supabase
      .from("classes")
      .select("id, name")
      .eq("school_id", schoolId)
      .order("order"),
  ]);

  if (!student) notFound();

  const cls = student.class as unknown as { name: string } | null;
  const sec = student.section as unknown as { name: string } | null;

  const tabs: { key: Tab; label: string }[] = [
    { key: "attendance", label: "Attendance" },
    { key: "academics", label: "Academics" },
    { key: "fees", label: "Fees" },
  ];

  const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const prevDate = new Date(year, month - 1);
  const nextDate = new Date(year, month + 1);
  const prevHref = `?tab=attendance&month=${prevDate.getMonth()}&year=${prevDate.getFullYear()}`;
  const nextHref = `?tab=attendance&month=${nextDate.getMonth()}&year=${nextDate.getFullYear()}`;

  return (
    <div className="space-y-6">
      <Link href="/teacher/students" className={buttonVariants({ variant: "ghost", size: "sm" }) + " -ml-2"}>
        <ArrowLeft className="mr-1.5 h-4 w-4" />
        Back to Students
      </Link>

      {/* Student card */}
      <div className="rounded-lg border bg-white p-6 shadow-sm">
        <div className="flex items-start gap-5">
          <PhotoUpload
            studentId={student.id}
            studentName={student.full_name ?? "Student"}
            photoUrl={student.photo_url ?? null}
          />
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-bold text-gray-900">{student.full_name ?? "—"}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-500">
              {cls?.name && <span>{cls.name}{sec?.name ? ` · Section ${sec.name}` : ""}</span>}
              {student.roll_number && <span>Roll No: {student.roll_number}</span>}
              {student.admission_number && <span>Adm: {student.admission_number}</span>}
              {student.parent_phone && <span>📞 {student.parent_phone}</span>}
            </div>
          </div>
        </div>
      </div>

      {/* Edit form */}
      <div className="rounded-lg border bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-500">Edit Profile</h2>
        <StudentEditForm
          studentId={student.id}
          schoolId={schoolId}
          initialName={student.full_name ?? ""}
          initialEmail={student.email ?? ""}
          initialRoll={student.roll_number ?? ""}
          initialAdmission={student.admission_number ?? ""}
          initialParentPhone={student.parent_phone ?? ""}
          initialClassId={student.class_id ?? ""}
          initialSectionId={student.section_id ?? ""}
          classes={classes ?? []}
        />
      </div>

      {/* Tabs */}
      <div>
        <div className="flex gap-1 border-b border-border">
          {tabs.map((t) => (
            <Link
              key={t.key}
              href={`?tab=${t.key}`}
              className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
                activeTab === t.key
                  ? "border-indigo-600 text-indigo-600"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.label}
            </Link>
          ))}
        </div>
        <div className="pt-6">
          {activeTab === "attendance" && (
            <>
              <div className="mb-4 flex items-center gap-3">
                <Link href={prevHref} className="rounded-md border px-3 py-1.5 text-sm hover:bg-muted">←</Link>
                <span className="text-sm font-medium">{MONTH_NAMES[month]} {year}</span>
                <Link href={nextHref} className="rounded-md border px-3 py-1.5 text-sm hover:bg-muted">→</Link>
              </div>
              <StudentAttendanceTab studentId={id} month={month} year={year} />
            </>
          )}
          {activeTab === "academics" && <StudentAcademicsTab studentId={id} />}
          {activeTab === "fees" && <StudentFeesTab studentId={id} studentName={student.full_name ?? "Student"} />}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Check TypeScript**

```bash
cd apps/web && npx tsc --noEmit 2>&1 | grep "teacher/students"
```

Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/\(school\)/teacher/students/\[id\]/page.tsx
git commit -m "feat: teacher student detail page — photo upload, full edit, attendance/academics/fees tabs"
```

---

## Task 11: Add "Students" to teacher nav + wire layout

**Files:**
- Modify: `apps/web/app/(school)/layout.tsx`

- [ ] **Step 1: Add Students to teacher nav items**

In `apps/web/app/(school)/layout.tsx`, find the `teacher` nav array and add the Students entry:

```ts
// Find this block in layout.tsx:
  teacher: [
    { label: "Dashboard",  href: "/teacher/dashboard" },
    { label: "Attendance", href: "/teacher/attendance" },
    { label: "Homework",   href: "/teacher/homework" },
    { label: "Results",    href: "/teacher/results" },
    { label: "Discipline", href: "/teacher/discipline" },
    { label: "Fees",       href: "/teacher/fees" },
    { label: "Feedback",   href: "/teacher/feedback" },
  ],
  teacher_no_feedback: [
    { label: "Dashboard",  href: "/teacher/dashboard" },
    { label: "Attendance", href: "/teacher/attendance" },
    { label: "Homework",   href: "/teacher/homework" },
    { label: "Results",    href: "/teacher/results" },
    { label: "Discipline", href: "/teacher/discipline" },
    { label: "Fees",       href: "/teacher/fees" },
  ],

// Replace with:
  teacher: [
    { label: "Dashboard",  href: "/teacher/dashboard" },
    { label: "Students",   href: "/teacher/students" },
    { label: "Attendance", href: "/teacher/attendance" },
    { label: "Homework",   href: "/teacher/homework" },
    { label: "Results",    href: "/teacher/results" },
    { label: "Discipline", href: "/teacher/discipline" },
    { label: "Fees",       href: "/teacher/fees" },
    { label: "Feedback",   href: "/teacher/feedback" },
  ],
  teacher_no_feedback: [
    { label: "Dashboard",  href: "/teacher/dashboard" },
    { label: "Students",   href: "/teacher/students" },
    { label: "Attendance", href: "/teacher/attendance" },
    { label: "Homework",   href: "/teacher/homework" },
    { label: "Results",    href: "/teacher/results" },
    { label: "Discipline", href: "/teacher/discipline" },
    { label: "Fees",       href: "/teacher/fees" },
  ],
```

- [ ] **Step 2: Add Students icon to sidebar ICON_MAP**

In `apps/web/components/sidebar.tsx`, add `Students` to the `ICON_MAP`:

```ts
// Find this in sidebar.tsx:
import {
  LayoutDashboard, School, GraduationCap, Users, BookOpen,
  Calendar, ClipboardList, DollarSign, Megaphone, Settings,
  Clock, FileText, MessageSquare, UserCheck,
  Building2, BarChart3, Shield, Upload, LogOut,
} from "lucide-react";

// The ICON_MAP already has entries — add one line:
  Students: GraduationCap,
```

- [ ] **Step 3: Check TypeScript**

```bash
cd apps/web && npx tsc --noEmit 2>&1 | grep -E "layout|sidebar"
```

Expected: no output.

- [ ] **Step 4: Verify in browser**

Log in as teacher1@demo.com → sidebar should show "Students" link → click it → see section-scoped student list → click "View Profile" on a student → full profile opens.

- [ ] **Step 5: Commit**

```bash
git add apps/web/app/\(school\)/layout.tsx apps/web/components/sidebar.tsx
git commit -m "feat: add Students nav item to teacher sidebar, wire to section-scoped student list"
```

---

## Self-Review Checklist

**Spec coverage:**
- ✅ Student photo — Task 1 (migration + bucket), Task 3 (PhotoUpload), Task 8/10 (used in both detail pages)
- ✅ Parent phone compulsory — Task 1 (migration), Task 2 (Add Student form), Task 4 (edit form)
- ✅ Attendance history — Task 5 (StudentAttendanceTab with calendar + stats)
- ✅ Academic details — Task 6 (StudentAcademicsTab with results grouped by exam)
- ✅ Fees details + Record Payment — Task 7 (StudentFeesTab + StudentFeesClient)
- ✅ Admin can create + edit — Tasks 2, 4, 8
- ✅ Teacher has dedicated Students tab — Tasks 9, 10, 11
- ✅ Teachers have full edit access — Task 1 (RLS widened), Task 10 (uses same edit form)
- ✅ Photo upload: click → instant upload — Task 3

**Placeholder scan:** None found — all steps contain full code.

**Type consistency:**
- `PhotoUpload` props: `studentId`, `studentName`, `photoUrl` — consistent in Task 3, 8, 10 ✅
- `StudentEditForm` props: all initial* props — consistent in Tasks 4, 8, 10 ✅
- `StudentFeesTab` props: `studentId`, `studentName` — consistent in Tasks 7, 8, 10 ✅
- `RecordPaymentForm` import path used in `student-fees-client.tsx` matches existing file at `@/app/(school)/teacher/fees/record-payment-form` ✅
