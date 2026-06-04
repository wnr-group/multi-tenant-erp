# Bonafide Certificate Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow school admins and principals to generate, preview, and print bonafide certificates for students using a browser print-to-PDF workflow, with an audit log of every issuance.

**Architecture:** Mirrors the existing report cards pattern — a list page with a searchable student table, a detail/print page that renders the certificate as HTML and triggers `window.print()`. All new fields (DOB, parent name, gender) are added to `student_profiles` via migration. An API route logs each certificate issuance to a new `bonafide_certificates` table.

**Tech Stack:** Next.js 14 app router, Supabase (Postgres + Storage), Tailwind CSS, browser-native print-to-PDF (no PDF library).

---

## File Map

**New files:**
- `supabase/migrations/20240001000032_bonafide_certificates.sql` — schema migration
- `apps/web/app/(school)/admin/certificates/page.tsx` — list + history tabs (server component)
- `apps/web/app/(school)/admin/certificates/certificates-table.tsx` — client component (student list + history)
- `apps/web/app/(school)/admin/certificates/[studentId]/page.tsx` — server component, fetches data
- `apps/web/app/(school)/admin/certificates/[studentId]/certificate-view.tsx` — client component, renders + prints certificate
- `apps/web/app/(school)/principal/certificates/page.tsx` — re-exports admin page
- `apps/web/app/(school)/principal/certificates/[studentId]/page.tsx` — re-exports admin detail page
- `apps/web/app/api/certificates/log/route.ts` — POST endpoint to save audit log entry

**Modified files:**
- `apps/web/app/(school)/layout.tsx` — add "Certificates" nav item for admin + principal
- `apps/web/app/(school)/admin/settings/page.tsx` — add logo upload + address fields
- `apps/web/app/(school)/admin/students/[id]/student-edit-form.tsx` — add DOB, parent name, gender fields

---

## Task 1: Schema Migration

**Files:**
- Create: `supabase/migrations/20240001000032_bonafide_certificates.sql`

- [ ] **Step 1: Write the migration file**

```sql
-- Add new fields to student_profiles
ALTER TABLE public.student_profiles
  ADD COLUMN IF NOT EXISTS date_of_birth DATE,
  ADD COLUMN IF NOT EXISTS parent_name   TEXT,
  ADD COLUMN IF NOT EXISTS gender        TEXT CHECK (gender IN ('male', 'female', 'other'));

-- Audit log for bonafide certificates
CREATE TABLE public.bonafide_certificates (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id          UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  student_profile_id UUID NOT NULL REFERENCES public.student_profiles(id) ON DELETE CASCADE,
  academic_year_id   UUID NOT NULL REFERENCES public.academic_years(id),
  generated_by       UUID NOT NULL REFERENCES auth.users(id),
  generated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_bonafide_school ON public.bonafide_certificates(school_id);
CREATE INDEX idx_bonafide_student ON public.bonafide_certificates(student_profile_id);

ALTER TABLE public.bonafide_certificates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bonafide_read" ON public.bonafide_certificates FOR SELECT
  USING (
    public.get_my_role() IN ('school_admin', 'principal', 'super_admin')
    AND school_id = public.get_my_school_id()
  );

CREATE POLICY "bonafide_insert" ON public.bonafide_certificates FOR INSERT
  WITH CHECK (
    public.get_my_role() IN ('school_admin', 'principal', 'super_admin')
    AND school_id = public.get_my_school_id()
  );
```

- [ ] **Step 2: Push migration to production**

```bash
cd /Users/dineshlearning/Documents/make\ money/erp
supabase db push --linked
```

Expected output: migration applied successfully, no errors.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20240001000032_bonafide_certificates.sql
git commit -m "feat(schema): add bonafide_certificates table and student DOB/gender/parent_name fields"
```

---

## Task 2: Settings Page — Logo Upload + Address

**Files:**
- Modify: `apps/web/app/(school)/admin/settings/page.tsx`

- [ ] **Step 1: Replace the settings page with the updated version that adds logo upload and address**

Replace the entire contents of `apps/web/app/(school)/admin/settings/page.tsx` with:

```tsx
"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Camera } from "lucide-react";

export default function SettingsPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [address, setAddress] = useState("");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase.from("profiles").select("school_id").eq("id", user.id).single().then(({ data: p }) => {
        if (!p?.school_id) return;
        setSchoolId(p.school_id);
        supabase.from("schools").select("name, contact_email, address, logo_url").eq("id", p.school_id).single().then(({ data: s }) => {
          if (!s) return;
          setName(s.name);
          setContactEmail(s.contact_email ?? "");
          setAddress(s.address ?? "");
          setLogoUrl(s.logo_url ?? null);
        });
      });
    });
  }, []);

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !schoolId) return;
    if (!file.type.startsWith("image/")) { toast.error("Please select an image file."); return; }
    if (file.size > 2 * 1024 * 1024) { toast.error("Logo must be under 2 MB."); return; }

    setUploading(true);
    const supabase = createClient();
    const ext = file.name.split(".").pop() ?? "png";
    const path = `${schoolId}/logo.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("school-assets")
      .upload(path, file, { upsert: true, contentType: file.type });

    if (uploadError) { toast.error(uploadError.message); setUploading(false); return; }

    const { data: urlData } = supabase.storage.from("school-assets").getPublicUrl(path);
    const publicUrl = urlData.publicUrl;

    const { error: dbError } = await supabase.from("schools").update({ logo_url: publicUrl }).eq("id", schoolId);
    if (dbError) { toast.error(dbError.message); setUploading(false); return; }

    setLogoUrl(publicUrl);
    toast.success("Logo updated.");
    setUploading(false);
    router.refresh();
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!schoolId) return;
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.from("schools").update({
      name,
      contact_email: contactEmail,
      address: address || null,
    }).eq("id", schoolId);
    setLoading(false);
    if (error) { toast.error("Failed to save settings."); } else { toast.success("Settings saved."); }
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">School Settings</h1>
        <p className="mt-1 text-sm text-gray-500">Update your school's information.</p>
      </div>
      <div className="max-w-lg space-y-6">
        {/* Logo upload */}
        <div className="rounded-lg border bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-500">School Logo</h2>
          <div className="flex items-center gap-5">
            <div
              className="relative h-20 w-20 cursor-pointer overflow-hidden rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 flex items-center justify-center hover:border-indigo-400 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              {logoUrl ? (
                <Image src={logoUrl} alt="School logo" fill className="object-contain p-1" unoptimized />
              ) : (
                <Camera className="h-7 w-7 text-gray-300" />
              )}
              {uploading && (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                  <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700">Upload school logo</p>
              <p className="text-xs text-gray-400 mt-0.5">PNG or JPG, max 2 MB. Used on certificates and letterheads.</p>
              <button
                type="button"
                className="mt-2 text-xs font-medium text-indigo-600 hover:underline"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? "Uploading…" : "Choose file"}
              </button>
            </div>
          </div>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
        </div>

        {/* General info form */}
        <form onSubmit={handleSave} className="space-y-5 rounded-lg border bg-white p-6 shadow-sm">
          <div className="space-y-1.5">
            <Label htmlFor="school-name">School Name</Label>
            <Input id="school-name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="contact-email">Contact Email</Label>
            <Input id="contact-email" type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="address">School Address</Label>
            <textarea
              id="address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder={"KG Campus: 123 Main Road, City - 600001\nHigh School Campus: 456 Second Street, City - 600002"}
              rows={3}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
            />
            <p className="text-xs text-muted-foreground">Shown on certificates and other official documents.</p>
          </div>
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Saving…" : "Save Changes"}
          </Button>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create the `school-assets` storage bucket in Supabase**

Go to the Supabase dashboard → Storage → New bucket.
- Name: `school-assets`
- Public: **Yes** (so logo URLs are publicly readable for certificates)

Or run via SQL:
```sql
INSERT INTO storage.buckets (id, name, public) VALUES ('school-assets', 'school-assets', true)
ON CONFLICT (id) DO NOTHING;
```

- [ ] **Step 3: Verify logo upload works**

Start the dev server (`pnpm dev` from repo root), navigate to `/admin/settings`, upload a logo image, confirm it saves and displays.

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/\(school\)/admin/settings/page.tsx
git commit -m "feat(settings): add school logo upload and address fields"
```

---

## Task 3: Student Edit Form — DOB, Parent Name, Gender

**Files:**
- Modify: `apps/web/app/(school)/admin/students/[id]/student-edit-form.tsx`

- [ ] **Step 1: Update the Props interface and add new state variables**

In `student-edit-form.tsx`, update the `Props` interface and component signature:

```tsx
interface Props {
  studentId: string;
  enrollmentId: string | null;
  schoolId: string;
  initialName: string;
  initialEmail: string;
  initialRoll: string;
  initialAdmission: string;
  initialParentPhone: string;
  initialClassId: string;
  initialSectionId: string;
  initialDateOfBirth: string;   // ISO date string "YYYY-MM-DD" or ""
  initialParentName: string;
  initialGender: string;        // "male" | "female" | "other" | ""
  classes: ClassOption[];
}
```

Add three new `useState` hooks inside the component (after the existing ones):

```tsx
const [dateOfBirth, setDateOfBirth] = useState(initialDateOfBirth);
const [parentName, setParentName] = useState(initialParentName);
const [gender, setGender] = useState(initialGender);
```

- [ ] **Step 2: Update `handleSubmit` to save the three new fields**

Inside `handleSubmit`, update the `student_profiles` update call:

```tsx
const { error: spErr } = await supabase
  .from("student_profiles")
  .update({
    admission_number: admission || null,
    parent_phone: parentPhone || null,
    date_of_birth: dateOfBirth || null,
    parent_name: parentName || null,
    gender: gender || null,
  })
  .eq("id", studentId);
```

- [ ] **Step 3: Add the three new form fields to the JSX**

Add after the Parent Phone field and before the Class field:

```tsx
<div className="col-span-2">
  <Label>Parent / Guardian Name</Label>
  <Input value={parentName} onChange={(e) => setParentName(e.target.value)} placeholder="e.g. RAMESH A" />
</div>
<div>
  <Label>Date of Birth</Label>
  <Input type="date" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} />
</div>
<div>
  <Label>Gender</Label>
  <NativeSelect
    options={[
      { value: "male", label: "Male" },
      { value: "female", label: "Female" },
      { value: "other", label: "Other" },
    ]}
    value={gender}
    onChange={(e) => setGender(e.target.value)}
    placeholder="Select gender"
  />
</div>
```

- [ ] **Step 4: Update the parent server component that renders `StudentEditForm` to pass the new props**

In `apps/web/app/(school)/admin/students/[id]/page.tsx`, update the `student_profiles` select query to include the new fields:

```tsx
supabase
  .from("student_profiles")
  .select("id, full_name, email, admission_number, parent_phone, date_of_birth, parent_name, gender, profile:profiles!profile_id(full_name, email, avatar_url)")
  .eq("id", id)
  .single(),
```

Then pass them to `StudentEditForm`:

```tsx
<StudentEditForm
  studentId={student.id}
  enrollmentId={enrollment?.id ?? null}
  schoolId={schoolId}
  initialName={displayName !== "Student" ? displayName : ""}
  initialEmail={displayEmail}
  initialParentPhone={displayParentPhone}
  initialRoll={enrollment?.roll_number ?? ""}
  initialAdmission={student.admission_number ?? ""}
  initialClassId={enrollment?.class_id ?? ""}
  initialSectionId={enrollment?.section_id ?? ""}
  initialDateOfBirth={(student as any).date_of_birth ?? ""}
  initialParentName={(student as any).parent_name ?? ""}
  initialGender={(student as any).gender ?? ""}
  classes={classes ?? []}
/>
```

- [ ] **Step 5: Commit**

```bash
git add apps/web/app/\(school\)/admin/students/\[id\]/student-edit-form.tsx
git add apps/web/app/\(school\)/admin/students/\[id\]/page.tsx
git commit -m "feat(students): add date of birth, parent name, and gender fields to student edit form"
```

---

## Task 4: API Route — Log Certificate Issuance

**Files:**
- Create: `apps/web/app/api/certificates/log/route.ts`

- [ ] **Step 1: Create the API route**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSchoolId } from "@/lib/school";
import { getAcademicYearId } from "@/lib/academic-year";

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: roleRow } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .maybeSingle();

  if (!roleRow || !["school_admin", "principal", "super_admin"].includes(roleRow.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const schoolId = await getSchoolId();
  if (!schoolId) return NextResponse.json({ error: "School not found" }, { status: 404 });

  const academicYearId = await getAcademicYearId(schoolId);
  if (!academicYearId) return NextResponse.json({ error: "No active academic year" }, { status: 400 });

  let body: { student_profile_id: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.student_profile_id) {
    return NextResponse.json({ error: "student_profile_id is required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("bonafide_certificates")
    .insert({
      school_id: schoolId,
      student_profile_id: body.student_profile_id,
      academic_year_id: academicYearId,
      generated_by: user.id,
    })
    .select("id")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ id: data.id });
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/app/api/certificates/log/route.ts
git commit -m "feat(api): add POST /api/certificates/log endpoint for certificate audit trail"
```

---

## Task 5: Certificate View Component

**Files:**
- Create: `apps/web/app/(school)/admin/certificates/[studentId]/certificate-view.tsx`

- [ ] **Step 1: Create the certificate view client component**

```tsx
"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface CertificateData {
  schoolName: string;
  schoolLogoUrl: string | null;
  schoolAddress: string | null;
  studentName: string;
  admissionNumber: string | null;
  className: string;
  sectionName: string;
  parentName: string | null;
  gender: string | null;        // "male" | "female" | "other" | null
  dateOfBirth: string | null;   // ISO "YYYY-MM-DD"
  academicYearName: string;
  studentProfileId: string;
  backHref: string;             // e.g. "/admin/certificates" or "/principal/certificates"
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

function genderText(gender: string | null): { relation: string; pronoun: string; salutation: string } {
  if (gender === "male")   return { relation: "son",    pronoun: "His",   salutation: "Mr." };
  if (gender === "female") return { relation: "daughter", pronoun: "Her", salutation: "Mrs." };
  return                          { relation: "child",  pronoun: "Their", salutation: "Mr./Mrs." };
}

export function CertificateView({ data }: { data: CertificateData }) {
  const printRef = useRef<HTMLDivElement>(null);
  const [logging, setLogging] = useState(false);
  const { relation, pronoun, salutation } = genderText(data.gender);
  const hasWarning = !data.dateOfBirth || !data.parentName || !data.gender;

  async function handlePrint() {
    // Log the issuance first
    setLogging(true);
    try {
      await fetch("/api/certificates/log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ student_profile_id: data.studentProfileId }),
      });
    } catch {
      // Non-blocking — proceed with print even if log fails
    }
    setLogging(false);

    const content = printRef.current;
    if (!content) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Bonafide Certificate — ${data.studentName}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: 'Times New Roman', Times, serif; padding: 48px 56px; color: #1a1a1a; font-size: 14px; line-height: 1.6; }
            .header { display: flex; align-items: flex-start; gap: 20px; padding-bottom: 12px; border-bottom: 2px solid #1a1a1a; margin-bottom: 40px; }
            .header img { width: 72px; height: 72px; object-fit: contain; }
            .header-text h1 { font-size: 20px; font-weight: bold; text-transform: uppercase; letter-spacing: 2px; color: #1a1a1a; margin-bottom: 4px; }
            .header-text p { font-size: 11px; color: #444; }
            .title { text-align: center; font-size: 14px; font-weight: bold; text-decoration: underline; letter-spacing: 1px; margin-bottom: 36px; }
            .body-text { text-align: justify; font-size: 14px; line-height: 2; text-indent: 48px; position: relative; z-index: 1; }
            .watermark-wrap { position: relative; }
            .watermark { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 220px; height: 220px; opacity: 0.08; object-fit: contain; z-index: 0; }
            .footer { display: flex; justify-content: space-between; margin-top: 80px; font-size: 13px; }
            @media print { body { padding: 48px 56px; } }
          </style>
        </head>
        <body>
          <div class="header">
            ${data.schoolLogoUrl ? `<img src="${data.schoolLogoUrl}" alt="Logo" />` : ""}
            <div class="header-text">
              <h1>${data.schoolName}</h1>
              ${data.schoolAddress ? data.schoolAddress.split("\n").map((line: string) => `<p>${line}</p>`).join("") : ""}
            </div>
          </div>

          <div class="title">TO WHOM IT MAY CONCERN</div>

          <div class="watermark-wrap">
            ${data.schoolLogoUrl ? `<img class="watermark" src="${data.schoolLogoUrl}" alt="" />` : ""}
            <p class="body-text">
              This is to certify that <strong>${data.studentName.toUpperCase()}</strong>, a student of
              <strong>${data.className} - ${data.sectionName}</strong>, Adm No. ${data.admissionNumber ?? "—"},
              ${relation} of ${salutation} <strong>${(data.parentName ?? "—").toUpperCase()}</strong>
              is a bonafide student of our school for the academic year
              <strong>${data.academicYearName}</strong>.
              ${pronoun} date of birth is <strong>${formatDate(data.dateOfBirth)}</strong> as per our school records.
            </p>
          </div>

          <div class="footer">
            <span>Date : ${formatDate(new Date().toISOString().slice(0, 10))}</span>
            <span>PRINCIPAL</span>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => { printWindow.print(); }, 300);
  }

  return (
    <div className="min-h-screen bg-muted/30 p-6">
      <div className="mx-auto max-w-3xl">
        {/* Toolbar */}
        <div className="mb-6 flex items-center justify-between">
          <Link href={data.backHref} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
            Back to Certificates
          </Link>
          <Button onClick={handlePrint} disabled={logging} className="gap-2">
            <Printer className="h-4 w-4" />
            {logging ? "Preparing…" : "Print / Download PDF"}
          </Button>
        </div>

        {/* Warning banner */}
        {hasWarning && (
          <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Some student details are missing (
            {[!data.dateOfBirth && "date of birth", !data.parentName && "parent name", !data.gender && "gender"].filter(Boolean).join(", ")}
            ). <Link href={`/admin/students/${data.studentProfileId}`} className="font-medium underline">Edit the student profile</Link> to fill them in before printing.
          </div>
        )}

        {/* Certificate preview */}
        <div ref={printRef} className="rounded-xl border border-border bg-white p-12 shadow-sm font-serif">
          {/* Header */}
          <div className="flex items-start gap-5 border-b-2 border-gray-900 pb-3 mb-10">
            {data.schoolLogoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={data.schoolLogoUrl} alt="Logo" className="h-16 w-16 object-contain shrink-0" />
            )}
            <div>
              <h1 className="text-lg font-bold uppercase tracking-widest text-gray-900">{data.schoolName}</h1>
              {data.schoolAddress && data.schoolAddress.split("\n").map((line, i) => (
                <p key={i} className="text-xs text-gray-500">{line}</p>
              ))}
            </div>
          </div>

          {/* Title */}
          <p className="text-center text-sm font-bold underline tracking-widest mb-10">TO WHOM IT MAY CONCERN</p>

          {/* Body with watermark */}
          <div className="relative">
            {data.schoolLogoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={data.schoolLogoUrl}
                alt=""
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-52 w-52 object-contain opacity-[0.07] pointer-events-none"
              />
            )}
            <p className="text-sm leading-loose text-justify indent-12 relative z-10">
              This is to certify that{" "}
              <strong className="uppercase">{data.studentName}</strong>, a student of{" "}
              <strong>{data.className} - {data.sectionName}</strong>, Adm No. {data.admissionNumber ?? "—"}{" "}
              {relation} of {salutation}{" "}
              <strong className="uppercase">{data.parentName ?? "—"}</strong>{" "}
              is a bonafide student of our school for the academic year{" "}
              <strong>{data.academicYearName}</strong>.{" "}
              {pronoun} date of birth is{" "}
              <strong>{formatDate(data.dateOfBirth)}</strong> as per our school records.
            </p>
          </div>

          {/* Footer */}
          <div className="mt-20 flex justify-between text-sm">
            <span>Date : {formatDate(new Date().toISOString().slice(0, 10))}</span>
            <span className="font-medium">PRINCIPAL</span>
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/app/\(school\)/admin/certificates/\[studentId\]/certificate-view.tsx
git commit -m "feat(certificates): add CertificateView component with print-to-PDF"
```

---

## Task 6: Certificate Detail Page (Server Component)

**Files:**
- Create: `apps/web/app/(school)/admin/certificates/[studentId]/page.tsx`

- [ ] **Step 1: Create the server component**

```tsx
export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSchoolId } from "@/lib/school";
import { getAcademicYearId } from "@/lib/academic-year";
import { CertificateView } from "./certificate-view";

export default async function CertificatePage({ params }: { params: Promise<{ studentId: string }> }) {
  const { studentId } = await params;
  const supabase = await createServerSupabaseClient();
  const schoolId = (await getSchoolId())!;
  const academicYearId = await getAcademicYearId(schoolId);

  const [{ data: student }, { data: school }, { data: enrollment }, { data: academicYear }] = await Promise.all([
    supabase
      .from("student_profiles")
      .select("id, full_name, admission_number, date_of_birth, parent_name, gender")
      .eq("id", studentId)
      .eq("school_id", schoolId)
      .single(),
    supabase
      .from("schools")
      .select("name, logo_url, address")
      .eq("id", schoolId)
      .single(),
    supabase
      .from("student_enrollments")
      .select("roll_number, class:classes(name), section:sections(name)")
      .eq("student_profile_id", studentId)
      .eq("school_id", schoolId)
      .eq("academic_year_id", academicYearId ?? "")
      .eq("is_active", true)
      .maybeSingle(),
    academicYearId
      ? supabase.from("academic_years").select("name").eq("id", academicYearId).single()
      : Promise.resolve({ data: null }),
  ]);

  if (!student) notFound();

  const cls = enrollment?.class as unknown as { name: string } | null;
  const sec = enrollment?.section as unknown as { name: string } | null;

  return (
    <CertificateView
      data={{
        schoolName: school?.name ?? "School",
        schoolLogoUrl: school?.logo_url ?? null,
        schoolAddress: school?.address ?? null,
        studentName: (student as any).full_name ?? "—",
        admissionNumber: student.admission_number ?? null,
        className: cls?.name ?? "—",
        sectionName: sec?.name ?? "—",
        parentName: (student as any).parent_name ?? null,
        gender: (student as any).gender ?? null,
        dateOfBirth: (student as any).date_of_birth ?? null,
        academicYearName: academicYear?.name ?? "—",
        studentProfileId: student.id,
        backHref: "/admin/certificates",
      }}
    />
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/app/\(school\)/admin/certificates/\[studentId\]/page.tsx
git commit -m "feat(certificates): add certificate detail server page"
```

---

## Task 7: Certificates List Page

**Files:**
- Create: `apps/web/app/(school)/admin/certificates/page.tsx`
- Create: `apps/web/app/(school)/admin/certificates/certificates-table.tsx`

- [ ] **Step 1: Create the certificates-table client component**

```tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { Award } from "lucide-react";
import { FilterableDataTable } from "@/components/filterable-data-table";
import { EmptyState } from "@/components/empty-state";

interface StudentRow {
  id: string;
  name: string;
  admission: string;
  class_name: string;
  section: string;
}

interface HistoryRow {
  id: string;
  student_name: string;
  class_name: string;
  academic_year: string;
  generated_by_name: string;
  generated_at: string;
}

interface Option { label: string; value: string }

export function CertificatesTable({
  students,
  history,
  classOptions,
  baseHref,
}: {
  students: StudentRow[];
  history: HistoryRow[];
  classOptions: Option[];
  baseHref: string; // "/admin/certificates" or "/principal/certificates"
}) {
  const [tab, setTab] = useState<"students" | "history">("students");

  return (
    <div className="space-y-4">
      {/* Tab switcher */}
      <div className="flex gap-1 border-b border-border">
        {(["students", "history"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium capitalize transition-colors border-b-2 -mb-px ${
              tab === t ? "border-indigo-600 text-indigo-600" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t === "students" ? "Students" : "History"}
          </button>
        ))}
      </div>

      {tab === "students" ? (
        <FilterableDataTable
          data={students}
          columns={[
            { header: "Name", accessor: "name" },
            { header: "Admission No.", accessor: "admission" },
            { header: "Class", accessor: "class_name" },
            { header: "Section", accessor: "section" },
          ]}
          searchKeys={["name", "admission"]}
          searchPlaceholder="Search by name or admission number..."
          filter={
            classOptions.length > 0
              ? {
                  label: "All Classes",
                  options: classOptions,
                  filterFn: (row: StudentRow, value: string) => row.class_name === value,
                }
              : undefined
          }
          renderActions={(row) => (
            <Link
              href={`${baseHref}/${row.id}`}
              className="inline-flex items-center gap-1.5 rounded-md bg-indigo-50 px-2.5 py-1.5 text-xs font-medium text-indigo-700 hover:bg-indigo-100"
            >
              <Award className="h-3.5 w-3.5" />
              Generate
            </Link>
          )}
          emptyState={
            <EmptyState icon={Award} title="No students found" description="Add students to generate certificates." />
          }
        />
      ) : (
        <FilterableDataTable
          data={history}
          columns={[
            { header: "Student", accessor: "student_name" },
            { header: "Class", accessor: "class_name" },
            { header: "Academic Year", accessor: "academic_year" },
            { header: "Generated By", accessor: "generated_by_name" },
            { header: "Date", accessor: "generated_at" },
          ]}
          searchKeys={["student_name"]}
          searchPlaceholder="Search by student name..."
          emptyState={
            <EmptyState icon={Award} title="No certificates issued yet" description="Generate a certificate to see history here." />
          }
        />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Create the certificates list server page**

```tsx
export const dynamic = "force-dynamic";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSchoolId } from "@/lib/school";
import { getAcademicYearId } from "@/lib/academic-year";
import { PageHeader } from "@/components/page-header";
import { CertificatesTable } from "./certificates-table";

export default async function CertificatesPage() {
  const supabase = await createServerSupabaseClient();
  const schoolId = (await getSchoolId())!;
  const academicYearId = await getAcademicYearId(schoolId);

  const [{ data: enrollments }, { data: classes }, { data: history }] = await Promise.all([
    supabase
      .from("student_enrollments")
      .select("student_profile_id, roll_number, student_profile:student_profiles(id, full_name, admission_number), class:classes(name), section:sections(name)")
      .eq("school_id", schoolId)
      .eq("academic_year_id", academicYearId ?? "")
      .eq("is_active", true)
      .order("student_profile_id"),
    supabase
      .from("classes")
      .select("id, name")
      .eq("school_id", schoolId)
      .order("order"),
    supabase
      .from("bonafide_certificates")
      .select("id, generated_at, student_profile:student_profiles(full_name), academic_year:academic_years(name), generated_by_profile:profiles!generated_by(full_name)")
      .eq("school_id", schoolId)
      .order("generated_at", { ascending: false })
      .limit(200),
  ]);

  const students = (enrollments ?? []).map((e) => {
    const sp = e.student_profile as unknown as { id: string; full_name: string | null; admission_number: string | null } | null;
    const cls = e.class as unknown as { name: string } | null;
    const sec = e.section as unknown as { name: string } | null;
    return {
      id: sp?.id ?? "",
      name: sp?.full_name ?? "—",
      admission: sp?.admission_number ?? "—",
      class_name: cls?.name ?? "—",
      section: sec?.name ?? "—",
    };
  }).filter((s) => s.id);

  const historyRows = (history ?? []).map((h) => {
    const sp = h.student_profile as unknown as { full_name: string | null } | null;
    const ay = h.academic_year as unknown as { name: string | null } | null;
    const gen = (h as any).generated_by_profile as { full_name: string | null } | null;
    return {
      id: h.id,
      student_name: sp?.full_name ?? "—",
      class_name: "—",
      academic_year: ay?.name ?? "—",
      generated_by_name: gen?.full_name ?? "—",
      generated_at: new Date(h.generated_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }),
    };
  });

  const classOptions = (classes ?? []).map((c) => ({ label: c.name, value: c.name }));

  return (
    <div>
      <PageHeader
        title="Certificates"
        description="Generate bonafide certificates for students."
        stats={[{ label: "Total Students", value: students.length }]}
      />
      <CertificatesTable
        students={students}
        history={historyRows}
        classOptions={classOptions}
        baseHref="/admin/certificates"
      />
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/\(school\)/admin/certificates/page.tsx
git add apps/web/app/\(school\)/admin/certificates/certificates-table.tsx
git commit -m "feat(certificates): add certificates list and history page"
```

---

## Task 8: Principal Routes (Re-export Admin Pages)

**Files:**
- Create: `apps/web/app/(school)/principal/certificates/page.tsx`
- Create: `apps/web/app/(school)/principal/certificates/[studentId]/page.tsx`

- [ ] **Step 1: Create principal certificates list page**

```tsx
export { default } from "@/app/(school)/admin/certificates/page";
```

Wait — re-exporting a server component this way won't work because `backHref` is hardcoded in the admin page. Instead, create a thin wrapper:

```tsx
// apps/web/app/(school)/principal/certificates/page.tsx
export const dynamic = "force-dynamic";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSchoolId } from "@/lib/school";
import { getAcademicYearId } from "@/lib/academic-year";
import { PageHeader } from "@/components/page-header";
import { CertificatesTable } from "@/app/(school)/admin/certificates/certificates-table";

export default async function PrincipalCertificatesPage() {
  const supabase = await createServerSupabaseClient();
  const schoolId = (await getSchoolId())!;
  const academicYearId = await getAcademicYearId(schoolId);

  const [{ data: enrollments }, { data: classes }, { data: history }] = await Promise.all([
    supabase
      .from("student_enrollments")
      .select("student_profile_id, roll_number, student_profile:student_profiles(id, full_name, admission_number), class:classes(name), section:sections(name)")
      .eq("school_id", schoolId)
      .eq("academic_year_id", academicYearId ?? "")
      .eq("is_active", true)
      .order("student_profile_id"),
    supabase
      .from("classes")
      .select("id, name")
      .eq("school_id", schoolId)
      .order("order"),
    supabase
      .from("bonafide_certificates")
      .select("id, generated_at, student_profile:student_profiles(full_name), academic_year:academic_years(name), generated_by_profile:profiles!generated_by(full_name)")
      .eq("school_id", schoolId)
      .order("generated_at", { ascending: false })
      .limit(200),
  ]);

  const students = (enrollments ?? []).map((e) => {
    const sp = e.student_profile as unknown as { id: string; full_name: string | null; admission_number: string | null } | null;
    const cls = e.class as unknown as { name: string } | null;
    const sec = e.section as unknown as { name: string } | null;
    return { id: sp?.id ?? "", name: sp?.full_name ?? "—", admission: sp?.admission_number ?? "—", class_name: cls?.name ?? "—", section: sec?.name ?? "—" };
  }).filter((s) => s.id);

  const historyRows = (history ?? []).map((h) => {
    const sp = h.student_profile as unknown as { full_name: string | null } | null;
    const ay = h.academic_year as unknown as { name: string | null } | null;
    const gen = (h as any).generated_by_profile as { full_name: string | null } | null;
    return { id: h.id, student_name: sp?.full_name ?? "—", class_name: "—", academic_year: ay?.name ?? "—", generated_by_name: gen?.full_name ?? "—", generated_at: new Date(h.generated_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) };
  });

  const classOptions = (classes ?? []).map((c) => ({ label: c.name, value: c.name }));

  return (
    <div>
      <PageHeader title="Certificates" description="Generate bonafide certificates for students." stats={[{ label: "Total Students", value: students.length }]} />
      <CertificatesTable students={students} history={historyRows} classOptions={classOptions} baseHref="/principal/certificates" />
    </div>
  );
}
```

- [ ] **Step 2: Create principal certificate detail page**

```tsx
// apps/web/app/(school)/principal/certificates/[studentId]/page.tsx
export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSchoolId } from "@/lib/school";
import { getAcademicYearId } from "@/lib/academic-year";
import { CertificateView } from "@/app/(school)/admin/certificates/[studentId]/certificate-view";

export default async function PrincipalCertificatePage({ params }: { params: Promise<{ studentId: string }> }) {
  const { studentId } = await params;
  const supabase = await createServerSupabaseClient();
  const schoolId = (await getSchoolId())!;
  const academicYearId = await getAcademicYearId(schoolId);

  const [{ data: student }, { data: school }, { data: enrollment }, { data: academicYear }] = await Promise.all([
    supabase.from("student_profiles").select("id, full_name, admission_number, date_of_birth, parent_name, gender").eq("id", studentId).eq("school_id", schoolId).single(),
    supabase.from("schools").select("name, logo_url, address").eq("id", schoolId).single(),
    supabase.from("student_enrollments").select("roll_number, class:classes(name), section:sections(name)").eq("student_profile_id", studentId).eq("school_id", schoolId).eq("academic_year_id", academicYearId ?? "").eq("is_active", true).maybeSingle(),
    academicYearId ? supabase.from("academic_years").select("name").eq("id", academicYearId).single() : Promise.resolve({ data: null }),
  ]);

  if (!student) notFound();

  const cls = enrollment?.class as unknown as { name: string } | null;
  const sec = enrollment?.section as unknown as { name: string } | null;

  return (
    <CertificateView
      data={{
        schoolName: school?.name ?? "School",
        schoolLogoUrl: school?.logo_url ?? null,
        schoolAddress: school?.address ?? null,
        studentName: (student as any).full_name ?? "—",
        admissionNumber: student.admission_number ?? null,
        className: cls?.name ?? "—",
        sectionName: sec?.name ?? "—",
        parentName: (student as any).parent_name ?? null,
        gender: (student as any).gender ?? null,
        dateOfBirth: (student as any).date_of_birth ?? null,
        academicYearName: academicYear?.name ?? "—",
        studentProfileId: student.id,
        backHref: "/principal/certificates",
      }}
    />
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/\(school\)/principal/certificates/page.tsx
git add apps/web/app/\(school\)/principal/certificates/\[studentId\]/page.tsx
git commit -m "feat(certificates): add principal certificates routes"
```

---

## Task 9: Add Certificates to Sidebar Navigation

**Files:**
- Modify: `apps/web/app/(school)/layout.tsx`

- [ ] **Step 1: Add "Certificates" to admin and principal nav items**

In `apps/web/app/(school)/layout.tsx`, find the `NAV_ITEMS` object and add the Certificates entry:

For `school_admin` array, add after `"Report Cards"`:
```tsx
{ label: "Certificates",  href: "/admin/certificates" },
```

For `principal` array, add after `"Reports"`:
```tsx
{ label: "Certificates", href: "/principal/certificates" },
```

The updated sections should look like:
```tsx
school_admin: [
  { label: "Dashboard",      href: "/admin/dashboard" },
  { label: "Teachers",       href: "/admin/teachers" },
  { label: "Students",       href: "/admin/students" },
  { label: "Classes",        href: "/admin/classes" },
  { label: "Subjects",       href: "/admin/subjects" },
  { label: "Timetable",      href: "/admin/timetable" },
  { label: "Academics",      href: "/admin/academics" },
  { label: "Fees",           href: "/admin/fees" },
  { label: "Syllabus",       href: "/admin/syllabus" },
  { label: "Announcements",  href: "/admin/announcements" },
  { label: "Gallery",        href: "/admin/gallery" },
  { label: "Discipline",     href: "/admin/discipline" },
  { label: "Feedback",       href: "/admin/feedback" },
  { label: "Reports",        href: "/admin/reports" },
  { label: "Report Cards",   href: "/admin/report-cards" },
  { label: "Certificates",   href: "/admin/certificates" },
  { label: "Settings",       href: "/admin/settings" },
],
```

```tsx
principal: [
  { label: "Dashboard",     href: "/principal/dashboard" },
  { label: "Announcements", href: "/principal/announcements" },
  { label: "Discipline",    href: "/principal/discipline" },
  { label: "Feedback",      href: "/principal/feedback" },
  { label: "Reports",       href: "/principal/reports" },
  { label: "Certificates",  href: "/principal/certificates" },
],
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/app/\(school\)/layout.tsx
git commit -m "feat(nav): add Certificates to admin and principal sidebar"
```

---

## Task 10: End-to-End Verification

- [ ] **Step 1: Start the dev server**

```bash
cd /Users/dineshlearning/Documents/make\ money/erp
pnpm dev
```

- [ ] **Step 2: Test settings page logo upload**

Navigate to `http://school1.lvh.me:3000/admin/settings`. Upload a logo image. Confirm it appears in the preview and the address field saves.

- [ ] **Step 3: Test student edit form new fields**

Navigate to a student's profile at `/admin/students/[id]`. Confirm the DOB, parent name, and gender fields appear and save correctly.

- [ ] **Step 4: Test certificate generation (admin)**

Navigate to `http://school1.lvh.me:3000/admin/certificates`. Confirm the student list loads. Click "Generate" for a student. Confirm the certificate preview renders with school header, student info, and watermark. Click "Print / Download PDF" — confirm the print window opens with the certificate. Check the History tab to verify the audit record was saved.

- [ ] **Step 5: Test certificate generation (principal)**

Log in as a principal, navigate to `/principal/certificates`. Confirm the same flow works.

- [ ] **Step 6: Test warning banner**

Find a student with no DOB/parent name/gender set. Generate their certificate. Confirm the amber warning banner appears listing which fields are missing, with a link to edit the profile.

- [ ] **Step 7: Final commit and push**

```bash
git push origin main
```

---

## Self-Review Notes

- All spec requirements covered: schema, settings logo/address, student form (DOB/gender/parent), list page, detail/print page, audit log, principal routes, nav items.
- `CertificateData` interface defined in `certificate-view.tsx` (Task 5) is used consistently in Tasks 6, 7, and 8.
- `CertificatesTable` defined in Task 7 Step 1 is imported in Task 8 Step 1 — import path confirmed as `@/app/(school)/admin/certificates/certificates-table`.
- Audit log fires on print button click (not page load) — no duplicate records on refresh.
- Missing data handled: warning banner + "—" fallbacks, certificate still generates.
- `school-assets` Storage bucket must be created manually (Step 2 of Task 2) — noted explicitly.
