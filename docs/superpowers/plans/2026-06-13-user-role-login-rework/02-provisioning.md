# Sub-plan 2: Provisioning Find-or-Create by Phone

> Part of [User/Role Login Rework](../2026-06-13-user-role-login-rework.md). Depends on Sub-plan 1.
> REQUIRED SUB-SKILL: superpowers:subagent-driven-development or superpowers:executing-plans.

**Goal:** Adding a teacher/parent/student by phone reuses an existing identity if the phone already exists, and only attaches a new `user_roles` row for the current school. No more duplicate-phone errors when a person joins a second school.

**Architecture:** A shared server-only helper `findOrCreateUserByPhone(adminClient, phone, fullName)` returns a `userId`, looking up `auth.users` by phone first and creating only when absent. Four call sites are retrofitted to call it, then upsert `user_roles`. Profile name/avatar is NOT overwritten for an existing user (School B can attach a role but not rename the human). Student additions resolve `parent_phone` through the same helper and set `parent_profile_id`.

**Tech Stack:** Next.js API routes, `@supabase/supabase-js` admin client.

---

### Task 1: Create the shared `findOrCreateUserByPhone` helper

**Files:**
- Create: `apps/web/lib/provisioning/find-or-create-user.ts`

- [ ] **Step 1: Write the helper**

```typescript
import type { SupabaseClient } from "@supabase/supabase-js";

export interface FindOrCreateResult {
  userId: string;
  created: boolean;
}

/**
 * One phone = one human. Reuse the existing auth user if the phone already exists,
 * otherwise create it. Does NOT overwrite an existing user's profile name/avatar —
 * the shared profile is owned by the person, not by any one school.
 *
 * @param adminClient a service-role Supabase client
 * @param phone normalized "+91XXXXXXXXXX"
 * @param fullName used only when creating a new user
 */
export async function findOrCreateUserByPhone(
  adminClient: SupabaseClient,
  phone: string,
  fullName: string,
): Promise<FindOrCreateResult> {
  // 1. Look up an existing profile by phone (profiles.phone is UNIQUE).
  const { data: existing } = await adminClient
    .from("profiles")
    .select("id")
    .eq("phone", phone)
    .maybeSingle();

  if (existing?.id) {
    return { userId: existing.id, created: false };
  }

  // 2. Create the auth user. The handle_new_user trigger creates the profile row.
  const { data: userData, error: createError } = await adminClient.auth.admin.createUser({
    phone,
    phone_confirm: true,
    user_metadata: { full_name: fullName },
  });

  if (createError || !userData?.user) {
    // 3. Race: another request created this phone between our lookup and insert.
    //    auth.users.phone is UNIQUE → fall back to lookup instead of erroring.
    const { data: raced } = await adminClient
      .from("profiles")
      .select("id")
      .eq("phone", phone)
      .maybeSingle();
    if (raced?.id) {
      return { userId: raced.id, created: false };
    }
    throw new Error(createError?.message ?? "Failed to create user");
  }

  // 4. Ensure the profile name is set for the freshly created user only.
  await adminClient
    .from("profiles")
    .update({ full_name: fullName, phone })
    .eq("id", userData.user.id);

  return { userId: userData.user.id, created: true };
}

/**
 * Idempotently attach a role at a school. Safe to call when the role already exists
 * (UNIQUE(user_id, school_id, role)).
 */
export async function attachRole(
  adminClient: SupabaseClient,
  userId: string,
  schoolId: string,
  role: string,
): Promise<void> {
  const { error } = await adminClient
    .from("user_roles")
    .upsert(
      { user_id: userId, school_id: schoolId, role, is_active: true },
      { onConflict: "user_id,school_id,role" },
    );
  if (error) throw new Error(`Failed to assign role: ${error.message}`);
}
```

- [ ] **Step 2: Typecheck**

Run: `cd "/Users/dineshlearning/Documents/make money/erp/apps/web" && npx tsc --noEmit`
Expected: no errors from `lib/provisioning/find-or-create-user.ts`.

- [ ] **Step 3: Commit**

```bash
git add apps/web/lib/provisioning/find-or-create-user.ts
git commit -m "feat(web): add findOrCreateUserByPhone + attachRole provisioning helpers"
```

---

### Task 2: Retrofit `invite-user` route

**Files:**
- Modify: `apps/web/app/api/invite-user/route.ts`

- [ ] **Step 1: Replace the createUser + role insert + profile update block**

Find the block that starts at `const { data: userData, error: createError } = await adminClient.auth.admin.createUser({` and ends after the `profiles` update (the `profileError` block). Replace it with:

```typescript
import { findOrCreateUserByPhone, attachRole } from "@/lib/provisioning/find-or-create-user";

// ...inside POST, after adminClient is created and phone validated:
let userId: string;
try {
  const result = await findOrCreateUserByPhone(adminClient, phone, fullName);
  userId = result.userId;
  await attachRole(adminClient, userId, schoolId, role);
} catch (e) {
  return NextResponse.json(
    { error: e instanceof Error ? e.message : "Provisioning failed" },
    { status: 400 },
  );
}
```

Remove the now-dead `roleError` block and the `profiles` `.update({ school_id: schoolId, ... })` call entirely (no `school_id` column exists anymore; profile name is handled by the helper only for new users).

- [ ] **Step 2: Keep `extraInserts` but make them idempotent**

The `extraInserts` loop inserts into `teacher_profiles` / `parent_profiles` with `profile_id: userId`. Change the `.insert(` to `.upsert(` so re-adding an existing user to a second role/school does not 23505 on those tables. If those tables lack a unique constraint on `profile_id`+`school_id`, leave as insert but wrap in a try and ignore duplicate (`23505`) errors:

```typescript
for (const { table, data } of extraInserts) {
  const { error: insertError } = await adminClient.from(table).insert({ ...data, profile_id: userId });
  if (insertError && insertError.code !== "23505") {
    return NextResponse.json({ error: `Failed to insert into ${table}: ${insertError.message}` }, { status: 500 });
  }
}
```

Also delete the `await adminClient.auth.admin.deleteUser(userId)` cleanup calls — we must NOT delete a shared identity that may belong to other schools.

- [ ] **Step 3: Typecheck**

Run: `cd "/Users/dineshlearning/Documents/make money/erp/apps/web" && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/api/invite-user/route.ts
git commit -m "feat(web): invite-user reuses existing identity across schools"
```

---

### Task 3: Retrofit `schools/[id]/users` route

**Files:**
- Modify: `apps/web/app/api/schools/[id]/users/route.ts`

- [ ] **Step 1: Replace provisioning block**

Add the import and replace the `createUser` → `user_roles` insert → `profiles.update({ school_id })` block with:

```typescript
import { findOrCreateUserByPhone, attachRole } from "@/lib/provisioning/find-or-create-user";

let userId: string;
try {
  const result = await findOrCreateUserByPhone(adminClient, phone, fullName);
  userId = result.userId;
  await attachRole(adminClient, userId, schoolId, role);
} catch (e) {
  return NextResponse.json(
    { error: e instanceof Error ? e.message : "Provisioning failed" },
    { status: 400 },
  );
}
```

For the `if (role === "teacher")` block that inserts `teacher_profiles`, change `.insert(` to tolerate duplicates:

```typescript
if (role === "teacher") {
  const { error: teacherError } = await adminClient
    .from("teacher_profiles")
    .insert({ profile_id: userId, school_id: schoolId });
  if (teacherError && teacherError.code !== "23505") {
    return NextResponse.json({ error: `Failed to create teacher profile: ${teacherError.message}` }, { status: 500 });
  }
}
```

Remove all `deleteUser(userId)` cleanup calls and the `profiles.update({ school_id })` call.

- [ ] **Step 2: Typecheck**

Run: `cd "/Users/dineshlearning/Documents/make money/erp/apps/web" && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add "apps/web/app/api/schools/[id]/users/route.ts"
git commit -m "feat(web): schools users route reuses existing identity"
```

---

### Task 4: Retrofit `onboarding/create-teachers` route

**Files:**
- Modify: `apps/web/app/api/onboarding/create-teachers/route.ts`

- [ ] **Step 1: Replace the per-teacher loop body**

Replace the `svc.auth.admin.createUser` + `Promise.all([...profiles.update..., teacher_profiles.insert, user_roles.insert])` block inside `for (const t of teachers)` with:

```typescript
import { findOrCreateUserByPhone, attachRole } from "@/lib/provisioning/find-or-create-user";

for (const t of teachers) {
  const phone = `+91${t.phone.replace(/\D/g, "").slice(-10)}`;
  try {
    const { userId } = await findOrCreateUserByPhone(svc, phone, t.fullName);
    await attachRole(svc, userId, schoolId, "teacher");
    const { error: tpErr } = await svc
      .from("teacher_profiles")
      .insert({ profile_id: userId, school_id: schoolId });
    if (tpErr && tpErr.code !== "23505") { failed.push(t.fullName); continue; }
    created.push(userId);
  } catch {
    failed.push(t.fullName);
  }
}
```

Remove the `deleteUser` cleanup and the `profiles.update({ school_id })`.

- [ ] **Step 2: Typecheck**

Run: `cd "/Users/dineshlearning/Documents/make money/erp/apps/web" && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/api/onboarding/create-teachers/route.ts
git commit -m "feat(web): onboarding teachers route reuses existing identity"
```

---

### Task 5: Retrofit `schools/[id]/import` route + link student parents

**Files:**
- Modify: `apps/web/app/api/schools/[id]/import/route.ts`

- [ ] **Step 1: Replace the teacher/parent branch provisioning**

In the `else` branch ("Teachers and parents get auth accounts via phone"), replace the `createUser` → `user_roles.insert` → `profiles.update` block with:

```typescript
import { findOrCreateUserByPhone, attachRole } from "@/lib/provisioning/find-or-create-user";

if (!/^\+91\d{10}$/.test(row.phone)) {
  throw new Error(`Invalid phone number: ${row.phone}. Must be +91 followed by 10 digits.`);
}
const { userId } = await findOrCreateUserByPhone(adminClient, row.phone, row.full_name);
await attachRole(adminClient, userId, schoolId, role);
```

Remove the `deleteUser` cleanup and `profiles.update({ school_id })`.

- [ ] **Step 2: Link the student's parent by phone (student branch)**

In the `if (role === "student")` branch, after building `classId`/`sectionId` and BEFORE inserting `student_profiles`, resolve the parent if a parent phone column is present in the row. Add:

```typescript
let parentProfileId: string | null = null;
const rawParentPhone = (row as Record<string, string>).parent_phone;
if (rawParentPhone) {
  const parentPhone = `+91${rawParentPhone.replace(/\D/g, "").slice(-10)}`;
  if (/^\+91\d{10}$/.test(parentPhone)) {
    const parentName = (row as Record<string, string>).parent_name ?? "";
    const { userId: parentId } = await findOrCreateUserByPhone(adminClient, parentPhone, parentName);
    await attachRole(adminClient, parentId, schoolId, "parent");
    parentProfileId = parentId;
  }
}
```

Then add `parent_profile_id: parentProfileId` to the `student_profiles` insert object.

- [ ] **Step 3: Typecheck**

Run: `cd "/Users/dineshlearning/Documents/make money/erp/apps/web" && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add "apps/web/app/api/schools/[id]/import/route.ts"
git commit -m "feat(web): import route reuses identity and links student parents by phone"
```

---

### Task 6: Retrofit the add-student form path (single add)

**Files:**
- Review: `apps/web/app/(school)/admin/students/add-student-form.tsx` and its submit API route.

- [ ] **Step 1: Trace where the form posts**

Run: `grep -rn "add-student\|parent_phone\|student_profiles" "apps/web/app/(school)/admin/students"`
Expected: identifies the server action / API route that inserts a `student_profiles` row.

- [ ] **Step 2: Apply parent-linking**

In that handler, if `parent_phone` is provided, resolve it via `findOrCreateUserByPhone` + `attachRole(..., "parent")` (same shape as Sub-plan 2 Task 5 Step 2) and set `parent_profile_id` on the inserted student. If the handler runs with the user's RLS client rather than the admin client, switch it to the service-role admin client for the parent-resolution portion only (creating auth users requires service role).

- [ ] **Step 3: Typecheck**

Run: `cd "/Users/dineshlearning/Documents/make money/erp/apps/web" && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add "apps/web/app/(school)/admin/students"
git commit -m "feat(web): single student add links parent by phone"
```

---

## Sub-plan 2 done when

- A single helper owns find-or-create-by-phone; all 4 API routes + the single-add path use it.
- Re-adding an existing phone in another school attaches a role instead of erroring.
- No code overwrites a shared profile's name for an existing user, and no `deleteUser` cleanup can destroy a shared identity.
- Students get a real `parent_profile_id` linked to an auth identity.

Proceed to [Sub-plan 3: Web](03-web.md).
