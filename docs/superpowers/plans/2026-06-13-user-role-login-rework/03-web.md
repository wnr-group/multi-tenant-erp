# Sub-plan 3: Web Role Resolution & Active-Scope Headers

> Part of [User/Role Login Rework](../2026-06-13-user-role-login-rework.md). Depends on Sub-plan 1.
> REQUIRED SUB-SKILL: superpowers:subagent-driven-development or superpowers:executing-plans.

**Goal:** On web, school comes from the subdomain (unchanged), the role is resolved by fixed precedence among the user's roles at that school, and both are sent as headers so the `db-pre-request` hook can validate them. Users with no role at the subdomain's school land on a clear no-access page.

**Architecture:** `apps/web/middleware.ts` already resolves `x-school-id` from the subdomain and reads `user_roles`. We change its role lookup to fetch ALL active roles at the school and pick the highest-precedence one, then set an `x-active-role` request header alongside `x-school-id` so the scope hook validates the exact pair. Parent remains redirected to `/download-app` (never a web experience).

**Tech Stack:** Next.js middleware, Supabase SSR client.

---

### Task 1: Resolve role by precedence and emit `x-active-role`

**Files:**
- Modify: `apps/web/middleware.ts`

- [ ] **Step 1: Replace the single-role lookup with precedence resolution**

Find the "Resolve user's real role" block (the `.maybeSingle()` query on `user_roles` for `schoolId`, plus the platform-admin fallback). Replace the school-scoped lookup with a multi-row fetch + precedence pick:

```typescript
// Resolve user's role at this school by fixed precedence.
const ROLE_PRECEDENCE: Record<string, number> = {
  school_admin: 1,
  principal: 2,
  teacher: 3,
  parent: 4,
  student: 5,
};

let role: string | null = null;
if (schoolId) {
  const { data: rows } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .eq("school_id", schoolId)
    .eq("is_active", true);
  if (rows && rows.length > 0) {
    role = rows
      .map((r) => r.role as string)
      .sort((a, b) => (ROLE_PRECEDENCE[a] ?? 99) - (ROLE_PRECEDENCE[b] ?? 99))[0];
  }
}
if (!role) {
  // Platform admin fallback (NULL school_id, super_admin).
  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .is("school_id", null)
    .eq("is_active", true)
    .maybeSingle();
  role = data?.role ?? null;
}
if (!role) {
  return NextResponse.redirect(new URL("/login?reason=no_access", request.url));
}
```

- [ ] **Step 2: Emit the `x-active-role` header so the scope hook validates the exact pair**

Immediately after `role` is finalized (and after `x-school-id` is set), add:

```typescript
// Pass the resolved role to PostgREST so scope_pre_request validates (user, school, role).
request.headers.set("x-active-role", role);
response = NextResponse.next({ request });
response.headers.set("x-active-role", role);
```

> The existing `super_admin → school_admin` effective-role mapping for ROUTING stays as-is for redirect logic; but the header we pass for DB scope must be a role the user actually holds at that school. For a super_admin acting on a school domain who has no school-level row, the platform-admin path already governs DB access via the NULL-school branch in `scope_pre_request`, so only set `x-active-role` when `schoolId` resolved a real school-level role. Guard it:

```typescript
if (schoolId && ROLE_PRECEDENCE[role]) {
  request.headers.set("x-active-role", role);
  response = NextResponse.next({ request });
  response.headers.set("x-active-role", role);
}
```

- [ ] **Step 3: Typecheck**

Run: `cd "/Users/dineshlearning/Documents/make money/erp/apps/web" && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Manual verification**

Run the dev server: `cd "/Users/dineshlearning/Documents/make money/erp/apps/web" && npm run dev`
- Log in on a school subdomain (e.g. `demo.lvh.me:3000`) as a user who is BOTH teacher and principal at that school.
- Expected: you land on the principal dashboard (precedence), not teacher.
- Open a subdomain where the user has NO role.
- Expected: redirected to `/login?reason=no_access`.

- [ ] **Step 5: Commit**

```bash
git add apps/web/middleware.ts
git commit -m "feat(web): resolve school role by precedence and pass x-active-role to scope hook"
```

---

### Task 2: Render a clear no-access reason on the login page

**Files:**
- Modify: `apps/web/app/(auth)/login/login-form.tsx`

- [ ] **Step 1: Read the `reason` query param and show a banner**

The middleware redirects to `/login?reason=no_access`. In the login form, read `useSearchParams()` and, when `reason === "no_access"`, render a non-blocking banner above the form:

```tsx
import { useSearchParams } from "next/navigation";
// ...
const params = useSearchParams();
const noAccess = params.get("reason") === "no_access";
// ...in JSX, above the phone input:
{noAccess && (
  <div className="mb-4 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
    You don’t have access to this school. Please contact your school administrator.
  </div>
)}
```

If the file is a server component, extract the banner into a small client component or read `searchParams` from the page props instead — match the file's existing pattern.

- [ ] **Step 2: Typecheck + visual check**

Run: `cd "/Users/dineshlearning/Documents/make money/erp/apps/web" && npx tsc --noEmit`
Then visit `http://demo.lvh.me:3000/login?reason=no_access`.
Expected: amber banner renders above the login form.

- [ ] **Step 3: Commit**

```bash
git add "apps/web/app/(auth)/login/login-form.tsx"
git commit -m "feat(web): show no-access reason banner on login"
```

---

## Sub-plan 3 done when

- Web resolves the highest-precedence role at the subdomain's school.
- `x-active-role` is sent so `scope_pre_request` validates the exact `(user, school, role)`.
- A user with no role at the subdomain sees a clear no-access banner.

Proceed to [Sub-plan 4: Mobile](04-mobile.md).
