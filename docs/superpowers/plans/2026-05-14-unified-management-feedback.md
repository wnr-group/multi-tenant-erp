# Unified Management Feedback Inbox

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Merge principal and admin feedback into a single "Management Feedback" inbox visible to both roles. Remove the role-selection buttons from the parent feedback flow so all management feedback goes to a unified queue.

**Architecture:** Both principal and admin feedback pages currently query `feedback` filtered by `to_role`. We replace both with a single query for `to_role IN ('principal', 'school_admin')` — or simplify to a new value `management`. The simpler approach: change both pages to query the same data (to_role in principal, school_admin), making both see the full inbox. Either role can respond.

**Tech Stack:** Next.js server components, Supabase, FeedbackList component

---

### Task 1: Update Admin Feedback Page to Show All Management Feedback

**Files:**
- Modify: `apps/web/app/(school)/admin/feedback/page.tsx`

- [ ] **Step 1: Update the query to fetch both principal and school_admin feedback**

Replace the current query:

```tsx
const { data: feedback } = await supabase
  .from("feedback")
  .select(
    "id, subject, message, status, created_at, response, from_user:profiles!feedback_from_user_id_fkey(full_name)"
  )
  .eq("school_id", schoolId)
  .eq("to_role", "school_admin")
  .order("created_at", { ascending: false });
```

with:

```tsx
const { data: feedback } = await supabase
  .from("feedback")
  .select(
    "id, subject, message, status, created_at, response, from_user:profiles!feedback_from_user_id_fkey(full_name)"
  )
  .eq("school_id", schoolId)
  .in("to_role", ["school_admin", "principal"])
  .order("created_at", { ascending: false });
```

- [ ] **Step 2: Update the page title**

Change:

```tsx
<h1 className="mb-6 text-2xl font-bold text-gray-900">Feedback — Management</h1>
```

to:

```tsx
<h1 className="mb-6 text-2xl font-bold text-gray-900">Feedback</h1>
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/(school)/admin/feedback/page.tsx
git commit -m "feat(feedback): admin sees unified management feedback inbox"
```

---

### Task 2: Update Principal Feedback Page to Show Same Unified Inbox

**Files:**
- Modify: `apps/web/app/(school)/principal/feedback/page.tsx`

- [ ] **Step 1: Read the current principal feedback page**

Current file at `apps/web/app/(school)/principal/feedback/page.tsx` queries with `.eq("to_role", "principal")`.

- [ ] **Step 2: Update query to match admin (both roles)**

Replace the query filter `.eq("to_role", "principal")` with `.in("to_role", ["school_admin", "principal"])`:

```tsx
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSchoolId } from "@/lib/school";
import { FeedbackList } from "../../teacher/feedback/feedback-list";

export default async function PrincipalFeedbackPage() {
  const supabase = await createServerSupabaseClient();
  const schoolId = (await getSchoolId())!;

  const { data: feedback } = await supabase
    .from("feedback")
    .select(
      "id, subject, message, status, created_at, response, from_user:profiles!feedback_from_user_id_fkey(full_name)"
    )
    .eq("school_id", schoolId)
    .in("to_role", ["school_admin", "principal"])
    .order("created_at", { ascending: false });

  const items = (feedback ?? []).map((f) => {
    const fromUser = f.from_user as unknown as { full_name: string } | null;
    return {
      id: f.id,
      subject: f.subject ?? "—",
      message: f.message ?? "—",
      from_name: fromUser?.full_name ?? "—",
      from_role: "parent",
      status: f.status ?? "open",
      response: f.response ?? "",
      created_at: f.created_at ? new Date(f.created_at).toLocaleDateString() : "—",
    };
  });

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Feedback</h1>
      <FeedbackList items={items} />
    </div>
  );
}
```

- [ ] **Step 3: Verify both pages show same data**

Log in as admin and principal — both should see the same feedback items.

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/(school)/principal/feedback/page.tsx
git commit -m "feat(feedback): principal sees unified management feedback inbox"
```

---

### Task 3: Remove Role Selection from Parent Feedback Submission (if exists)

**Files:**
- Search: `apps/web/` for any parent-facing feedback form with role selection buttons

- [ ] **Step 1: Search for parent feedback submission UI**

```bash
grep -rn "to_role\|principal\|school_admin" apps/web/ --include="*.tsx" | grep -i "parent\|send\|submit\|form" | grep -v ".next/"
```

If a form exists where parents choose between "Principal" and "Admin" as the recipient, change it to always set `to_role: "management"` or just `to_role: "principal"` (since both roles now see both). If no such form exists in the web app (it may be mobile-only), skip this task.

- [ ] **Step 2: If form found, remove the role-selection buttons and hardcode to_role**

Replace any radio/button group for choosing recipient with a hardcoded value. The feedback will go to the unified inbox regardless of which specific `to_role` value is set, since both pages now query both values.

- [ ] **Step 3: Commit (if changes made)**

```bash
git add -A
git commit -m "feat(feedback): remove principal/admin selection from parent feedback form"
```
