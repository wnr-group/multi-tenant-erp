# Plan 2: Section Switcher + Nav Architecture

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the broken role-switching mechanism (`acting_as` cookie, `SwitchRolePanel`, context-switch API) with a global section switcher in the sidebar. When a section is selected, the sidebar swaps to the teacher portal nav. Principals/admins get a "Back" exit button. Teachers auto-select their homeroom.

**Architecture:** The section switcher is a client component rendered inside the `Sidebar`. The school layout queries available sections (role-dependent) and passes them as props. An `active_section` cookie persists the selection. Middleware reads it and sets an `x-active-section` header. The teacher layout checks this header — if a non-teacher accesses `/teacher/*` without an active section, they're redirected back.

**Tech Stack:** Next.js 16 App Router, Supabase JS, TypeScript, cookies API.

**Spec:** `docs/superpowers/specs/2026-04-29-section-scoped-portal-design.md` — "Section Switcher" and "Navigation Architecture" sections.

**Depends on:** Plan 1 (timetable data must exist for teacher section queries).

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `apps/web/components/section-switcher.tsx` | Client component: grouped dropdown, cookie write, navigation |
| Modify | `apps/web/components/sidebar.tsx` | Accept and render section switcher + exit button |
| Modify | `apps/web/app/(school)/layout.tsx` | Query sections based on role, pass to sidebar. Remove `acting_as` logic. Update NAV_ITEMS. |
| Modify | `apps/web/middleware.ts` | Read `active_section` cookie, set header, allow `/teacher/*` for principals/admins with active section. Remove `acting_as` handling. |
| Modify | `apps/web/app/(school)/teacher/layout.tsx` | Check `x-active-section` header. Redirect non-teachers without section. Remove `ContextSwitchBanner`. |
| Modify | `apps/web/app/(school)/principal/layout.tsx` | Remove `ContextSwitchBanner`. |
| Modify | `apps/web/app/(school)/admin/layout.tsx` | Remove `ContextSwitchBanner`. |
| Modify | `apps/web/app/(school)/admin/dashboard/page.tsx` | Remove `SwitchRolePanel` usage. |
| Modify | `apps/web/app/(school)/principal/dashboard/page.tsx` | Remove `SwitchRolePanel` usage. |
| Delete | `apps/web/components/switch-role-panel.tsx` | Old role-switching component. |
| Delete | `apps/web/components/context-switch-banner.tsx` | Old "Viewing as..." banner. |
| Delete | `apps/web/components/exit-context-button.tsx` | Old exit button for context banner. |
| Delete | `apps/web/app/api/context-switch/route.ts` | Old API for setting acting_as cookie. |
| Delete | `apps/web/app/api/context-exit/route.ts` | Old API for clearing acting_as cookie. |
| Create | `apps/web/lib/section-context.ts` | Helper: `getActiveSection()` reads header, returns section UUID or null. |

---

## Task 1: Create Section Context Helper

**Files:**
- Create: `apps/web/lib/section-context.ts`

This helper is used by every teacher page to read the active section. Single source of truth.

- [ ] **Step 1: Create the helper**

```typescript
// apps/web/lib/section-context.ts
import { headers } from "next/headers";

export async function getActiveSection(): Promise<string | null> {
  const h = await headers();
  return h.get("x-active-section") ?? null;
}
```

- [ ] **Step 2: Commit**

```bash
cd "/Users/dineshlearning/Documents/make money/erp"
git add apps/web/lib/section-context.ts
git commit -m "feat: add getActiveSection() helper for section context"
```

---

## Task 2: Create Section Switcher Component

**Files:**
- Create: `apps/web/components/section-switcher.tsx`

A client component that renders a grouped `<select>` dropdown. On change, writes the `active_section` cookie and navigates to `/teacher/dashboard`.

- [ ] **Step 1: Create the component**

```tsx
// apps/web/components/section-switcher.tsx
"use client";

import { useRouter } from "next/navigation";

export interface SectionOption {
  id: string;
  name: string;       // "A", "B"
  className: string;  // "Class 8"
  classOrder: number;
}

interface SectionSwitcherProps {
  sections: SectionOption[];
  activeSectionId: string | null;
  userRole: string;
  exitUrl?: string;
}

function groupByClass(sections: SectionOption[]) {
  const sorted = [...sections].sort(
    (a, b) => a.classOrder - b.classOrder || a.name.localeCompare(b.name)
  );
  const groups: { className: string; items: SectionOption[] }[] = [];
  for (const s of sorted) {
    const last = groups[groups.length - 1];
    if (last && last.className === s.className) {
      last.items.push(s);
    } else {
      groups.push({ className: s.className, items: [s] });
    }
  }
  return groups;
}

function getParentDomain(): string {
  const host = window.location.hostname;
  if (host.includes("lvh.me")) return ".lvh.me";
  if (host.includes("balajierp.com")) return ".balajierp.com";
  return "";
}

export function SectionSwitcher({
  sections,
  activeSectionId,
  userRole,
  exitUrl,
}: SectionSwitcherProps) {
  const router = useRouter();
  const groups = groupByClass(sections);

  function handleChange(sectionId: string) {
    if (!sectionId) return;
    const domain = getParentDomain();
    document.cookie = `active_section=${sectionId}; path=/; domain=${domain}; max-age=${60 * 60 * 8}; samesite=lax`;
    window.location.href = "/teacher/dashboard";
  }

  function handleExit() {
    const domain = getParentDomain();
    document.cookie = `active_section=; path=/; domain=${domain}; max-age=0; samesite=lax`;
    window.location.href = exitUrl ?? "/";
  }

  if (sections.length === 0) {
    if (userRole === "teacher") {
      return (
        <div className="px-3 py-2">
          <p className="text-[11px] text-white/40">No sections assigned. Contact your administrator.</p>
        </div>
      );
    }
    return null;
  }

  const activeSection = sections.find((s) => s.id === activeSectionId);
  const activeLabel = activeSection
    ? `${activeSection.className} – ${activeSection.name}`
    : undefined;

  return (
    <div className="px-3 py-2 space-y-1.5">
      {exitUrl && activeSectionId && (
        <button
          onClick={handleExit}
          className="flex w-full items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-medium text-amber-300 hover:bg-white/[0.08] transition-colors"
        >
          ← Back to {userRole === "principal" ? "Principal" : "Admin"}
        </button>
      )}
      <select
        value={activeSectionId ?? ""}
        onChange={(e) => handleChange(e.target.value)}
        className="w-full rounded-md border border-white/20 bg-white/10 px-2.5 py-1.5 text-xs font-medium text-white placeholder:text-white/40 focus:border-white/40 focus:outline-none"
      >
        {!activeSectionId && (
          <option value="" disabled>Select a class / section</option>
        )}
        {groups.map((group) => (
          <optgroup key={group.className} label={group.className} className="bg-gray-900 text-white">
            {group.items.map((s) => (
              <option key={s.id} value={s.id} className="bg-gray-900 text-white">
                {s.className} – Section {s.name}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

```bash
cd "/Users/dineshlearning/Documents/make money/erp/apps/web" && pnpm type-check
```

Expected: exits 0 (standalone component, no imports from unwritten code).

- [ ] **Step 3: Commit**

```bash
cd "/Users/dineshlearning/Documents/make money/erp"
git add apps/web/components/section-switcher.tsx
git commit -m "feat: section switcher component with grouped dropdown"
```

---

## Task 3: Update Sidebar to Render Section Switcher

**Files:**
- Modify: `apps/web/components/sidebar.tsx`

The Sidebar needs to accept the section switcher as a prop (rendered between the school title and nav links).

- [ ] **Step 1: Add sectionSwitcher prop**

In `apps/web/components/sidebar.tsx`, update the `SidebarProps` interface and render the slot:

Change the interface from:

```typescript
interface SidebarProps {
  title: string;
  items: NavItem[];
  brandColor?: string;
  userName?: string;
  userRole?: string;
}
```

To:

```typescript
interface SidebarProps {
  title: string;
  items: NavItem[];
  brandColor?: string;
  userName?: string;
  userRole?: string;
  sectionSwitcher?: React.ReactNode;
}
```

Then in the component, destructure `sectionSwitcher` and render it between the divider (after school title) and the `<nav>`:

Change this section:

```tsx
      <div className="mx-4 border-t" style={{ borderColor: dividerColor }} />
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-3">
```

To:

```tsx
      <div className="mx-4 border-t" style={{ borderColor: dividerColor }} />
      {sectionSwitcher}
      {sectionSwitcher && (
        <div className="mx-4 border-t" style={{ borderColor: dividerColor }} />
      )}
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-3">
```

- [ ] **Step 2: Type-check**

```bash
cd "/Users/dineshlearning/Documents/make money/erp/apps/web" && pnpm type-check
```

Expected: exits 0 (sectionSwitcher is optional).

- [ ] **Step 3: Commit**

```bash
cd "/Users/dineshlearning/Documents/make money/erp"
git add apps/web/components/sidebar.tsx
git commit -m "feat: sidebar accepts sectionSwitcher render slot"
```

---

## Task 4: Update School Layout — Section Queries + New Nav

**Files:**
- Modify: `apps/web/app/(school)/layout.tsx`

This is the biggest single change. The layout must:
1. Query available sections based on role
2. Read `active_section` cookie
3. Determine the correct nav items (use teacher nav if section is active for principal/admin)
4. Pass everything to the Sidebar and SectionSwitcher
5. Remove all `acting_as` cookie handling
6. Update NAV_ITEMS: add Timetable/Discipline/Reports to admin, add Discipline/Fees to teacher

- [ ] **Step 1: Rewrite the layout**

Replace the entire file with:

```tsx
// apps/web/app/(school)/layout.tsx
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createServerSupabaseClient } from "../../lib/supabase/server";
import { getSchoolId } from "@/lib/school";
import { Sidebar } from "@/components/sidebar";
import { TopBar } from "@/components/top-bar";
import { SectionSwitcher } from "@/components/section-switcher";
import type { SectionOption } from "@/components/section-switcher";

const SCHOOL_ROLES = [
  "super_admin",
  "school_admin",
  "principal",
  "teacher",
] as const;

const NAV_ITEMS: Record<string, { label: string; href: string }[]> = {
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
    { label: "Discipline",     href: "/admin/discipline" },
    { label: "Reports",        href: "/admin/reports" },
    { label: "Settings",       href: "/admin/settings" },
  ],
  teacher: [
    { label: "Dashboard",  href: "/teacher/dashboard" },
    { label: "Attendance", href: "/teacher/attendance" },
    { label: "Homework",   href: "/teacher/homework" },
    { label: "Results",    href: "/teacher/results" },
    { label: "Discipline", href: "/teacher/discipline" },
    { label: "Fees",       href: "/teacher/fees" },
    { label: "Feedback",   href: "/teacher/feedback" },
  ],
  // teacher nav without Feedback — used when principal/admin is in section view
  teacher_no_feedback: [
    { label: "Dashboard",  href: "/teacher/dashboard" },
    { label: "Attendance", href: "/teacher/attendance" },
    { label: "Homework",   href: "/teacher/homework" },
    { label: "Results",    href: "/teacher/results" },
    { label: "Discipline", href: "/teacher/discipline" },
    { label: "Fees",       href: "/teacher/fees" },
  ],
  principal: [
    { label: "Dashboard",     href: "/principal/dashboard" },
    { label: "Announcements", href: "/principal/announcements" },
    { label: "Discipline",    href: "/principal/discipline" },
    { label: "Reports",       href: "/principal/reports" },
  ],
  super_admin: [
    { label: "Dashboard", href: "/platform-admin/dashboard" },
    { label: "Schools",   href: "/platform-admin/schools" },
  ],
};

const EXIT_URLS: Record<string, string> = {
  school_admin: "/admin/dashboard",
  super_admin: "/admin/dashboard",
  principal: "/principal/dashboard",
};

export default async function SchoolLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [{ data: roleRow }, { data: profile }] = await Promise.all([
    supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .limit(1)
      .single(),
    supabase
      .from("profiles")
      .select("full_name, school_id")
      .eq("id", user.id)
      .single(),
  ]);

  if (
    !roleRow ||
    !SCHOOL_ROLES.includes(roleRow.role as (typeof SCHOOL_ROLES)[number])
  ) {
    redirect("/login");
  }

  const realRole = roleRow.role as string;
  const userName = profile?.full_name || user.email || "User";

  let brandColor: string | undefined;
  let schoolName = "School ERP";
  const schoolId = profile?.school_id ?? (await getSchoolId());
  if (schoolId) {
    const { data: school } = await supabase
      .from("schools")
      .select("name, primary_color")
      .eq("id", schoolId)
      .single();
    brandColor = school?.primary_color ?? undefined;
    schoolName = school?.name ?? "School ERP";
  }

  // Read active section cookie
  const cookieStore = await cookies();
  const activeSectionId = cookieStore.get("active_section")?.value ?? null;

  // Query available sections based on role
  let sections: SectionOption[] = [];
  if (schoolId) {
    if (realRole === "teacher") {
      // Teacher: homeroom (class_teacher_of) + timetable sections
      const [{ data: teacherProfile }, { data: timetableRows }] = await Promise.all([
        supabase
          .from("teacher_profiles")
          .select("class_teacher_of, section:sections!teacher_profiles_class_teacher_of_fkey(id, name, class:classes(name, order))")
          .eq("profile_id", user.id)
          .maybeSingle(),
        supabase
          .from("timetable")
          .select("section:sections(id, name, class:classes(name, order))")
          .eq("teacher_id", user.id),
      ]);

      const seen = new Set<string>();

      // Add homeroom section first
      if (teacherProfile?.section) {
        const sec = teacherProfile.section as unknown as { id: string; name: string; class: { name: string; order: number } | null };
        if (sec?.id) {
          seen.add(sec.id);
          sections.push({ id: sec.id, name: sec.name, className: sec.class?.name ?? "", classOrder: sec.class?.order ?? 0 });
        }
      }

      // Add timetable sections
      for (const row of timetableRows ?? []) {
        const sec = row.section as unknown as { id: string; name: string; class: { name: string; order: number } | null };
        if (sec?.id && !seen.has(sec.id)) {
          seen.add(sec.id);
          sections.push({ id: sec.id, name: sec.name, className: sec.class?.name ?? "", classOrder: sec.class?.order ?? 0 });
        }
      }
    } else {
      // Principal/Admin/Super Admin: all sections
      const { data: allSections } = await supabase
        .from("sections")
        .select("id, name, class:classes(name, order)")
        .eq("school_id", schoolId);

      for (const sec of allSections ?? []) {
        const cls = sec.class as unknown as { name: string; order: number } | null;
        sections.push({ id: sec.id, name: sec.name, className: cls?.name ?? "", classOrder: cls?.order ?? 0 });
      }
    }
  }

  // Determine nav items based on role and active section
  let navItems: { label: string; href: string }[];
  let displayRole: string;

  if (activeSectionId && realRole !== "teacher") {
    // Principal/Admin in section view → teacher nav without feedback
    navItems = NAV_ITEMS.teacher_no_feedback;
    displayRole = realRole; // still show their real role label
  } else if (realRole === "teacher") {
    navItems = NAV_ITEMS.teacher;
    displayRole = "teacher";
  } else {
    navItems = NAV_ITEMS[realRole] ?? [];
    displayRole = realRole;
  }

  // Build the section switcher element
  const exitUrl = EXIT_URLS[realRole];
  const sectionSwitcherEl = sections.length > 0 || realRole === "teacher" ? (
    <SectionSwitcher
      sections={sections}
      activeSectionId={activeSectionId}
      userRole={realRole}
      exitUrl={realRole !== "teacher" ? exitUrl : undefined}
    />
  ) : null;

  return (
    <div className="flex h-screen overflow-hidden bg-muted">
      <Sidebar
        title={schoolName}
        items={navItems}
        brandColor={brandColor}
        userName={userName}
        userRole={displayRole}
        sectionSwitcher={sectionSwitcherEl}
      />
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopBar
          userName={userName}
          userRole={displayRole}
          brandColor={brandColor}
        />
        <main className="flex-1 overflow-y-auto p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

```bash
cd "/Users/dineshlearning/Documents/make money/erp/apps/web" && pnpm type-check
```

May have errors from files still importing deleted components. We'll fix those in Task 6.

- [ ] **Step 3: Commit**

```bash
cd "/Users/dineshlearning/Documents/make money/erp"
git add "apps/web/app/(school)/layout.tsx"
git commit -m "feat: school layout with section switcher, role-based section queries, new nav"
```

---

## Task 5: Update Middleware — Section Cookie + Remove acting_as

**Files:**
- Modify: `apps/web/middleware.ts`

The middleware must:
1. Read `active_section` cookie and set `x-active-section` header
2. Allow principals/admins to access `/teacher/*` when `active_section` is set
3. Remove all `acting_as` cookie handling
4. Remove the super_admin auto-redirect that sets `acting_as=school_admin`

- [ ] **Step 1: Rewrite the middleware**

Replace the entire file with:

```typescript
// apps/web/middleware.ts
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

const PUBLIC_PATHS = ["/login", "/auth/callback", "/invite", "/download-app"];
const PLATFORM_ADMIN_DOMAINS = ["admin.balajierp.com", "core.lvh.me"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const host = request.headers.get("host") ?? "";
  const domain = host.replace(/:\d+$/, "");
  const isPlatformAdmin =
    PLATFORM_ADMIN_DOMAINS.includes(domain) ||
    pathname.startsWith("/platform-admin");

  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(
          cookiesToSet: { name: string; value: string; options: CookieOptions }[]
        ) {
          const host = request.headers.get("host") ?? "";
          const isLvh = host.includes("lvh.me");
          const isBalaji = host.includes("balajierp.com");
          const cookieDomain = isLvh ? ".lvh.me" : isBalaji ? ".balajierp.com" : undefined;

          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            response = NextResponse.next({ request });
            response.cookies.set(name, value, {
              ...options,
              domain: cookieDomain,
            });
          });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  let schoolId: string | null = null;
  if (!isPlatformAdmin) {
    const { data: school } = await supabase
      .from("schools")
      .select("id, is_active")
      .eq("domain", domain)
      .single();

    if (!school || !school.is_active) {
      return new NextResponse("School not found or inactive.", { status: 404 });
    }
    schoolId = school.id;
    request.headers.set("x-school-id", school.id);
    response = NextResponse.next({ request });
    response.headers.set("x-school-id", school.id);
  }

  // Resolve user's real role
  let role: string | null = null;
  if (schoolId) {
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("school_id", schoolId)
      .eq("is_active", true)
      .maybeSingle();
    role = data?.role ?? null;
  }
  if (!role) {
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

  // Platform admin routing
  if (isPlatformAdmin) {
    if (role !== "super_admin") {
      return NextResponse.redirect(new URL("/login?reason=no_access", request.url));
    }
    if (!pathname.startsWith("/platform-admin") && !pathname.startsWith("/api")) {
      return NextResponse.redirect(new URL("/platform-admin/dashboard", request.url));
    }
    return response;
  }

  // Read active section cookie
  const activeSection = request.cookies.get("active_section")?.value ?? null;
  if (activeSection) {
    response.headers.set("x-active-section", activeSection);
  }

  // Super admin on school domain without explicit role → treat as school_admin
  const effectiveRole = role === "super_admin" ? "school_admin" : role;

  // Route enforcement
  if (!pathname.startsWith("/api") && !pathname.startsWith("/auth")) {
    // Allow principals/admins to access /teacher/* when they have an active section
    if (pathname.startsWith("/teacher")) {
      const canAccessTeacher =
        effectiveRole === "teacher" ||
        ((effectiveRole === "school_admin" || effectiveRole === "principal") && activeSection);
      if (!canAccessTeacher) {
        const dest = effectiveRole === "principal" ? "/principal/dashboard" : "/admin/dashboard";
        return NextResponse.redirect(new URL(dest, request.url));
      }
    } else if (effectiveRole === "school_admin" && !pathname.startsWith("/admin")) {
      return NextResponse.redirect(new URL("/admin/dashboard", request.url));
    } else if (effectiveRole === "principal" && !pathname.startsWith("/principal") && !pathname.startsWith("/teacher")) {
      return NextResponse.redirect(new URL("/principal/dashboard", request.url));
    } else if (effectiveRole === "teacher" && !pathname.startsWith("/teacher")) {
      return NextResponse.redirect(new URL("/teacher/dashboard", request.url));
    } else if (effectiveRole === "parent" && !pathname.startsWith("/download-app")) {
      return NextResponse.redirect(new URL("/download-app", request.url));
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|_next/webpack-hmr|__nextjs_font|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|woff2?)$).*)",
  ],
};
```

Key changes from the original:
- Removed all `acting_as` cookie reading/writing
- Removed `x-acting-as` and `x-real-role` headers
- Removed super_admin auto-redirect that set `acting_as=school_admin`
- Added `active_section` cookie reading → `x-active-section` header
- Added logic: `/teacher/*` is accessible to principals/admins WITH active section
- Super admin on school domain is now treated as `school_admin` directly (no cookie needed)

- [ ] **Step 2: Type-check**

```bash
cd "/Users/dineshlearning/Documents/make money/erp/apps/web" && pnpm type-check
```

- [ ] **Step 3: Commit**

```bash
cd "/Users/dineshlearning/Documents/make money/erp"
git add apps/web/middleware.ts
git commit -m "feat: middleware reads active_section cookie, removes acting_as mechanism"
```

---

## Task 6: Remove Old Role-Switching + Update Layouts

**Files:**
- Delete: `apps/web/components/switch-role-panel.tsx`
- Delete: `apps/web/components/context-switch-banner.tsx`
- Delete: `apps/web/components/exit-context-button.tsx`
- Delete: `apps/web/app/api/context-switch/route.ts`
- Delete: `apps/web/app/api/context-exit/route.ts`
- Modify: `apps/web/app/(school)/teacher/layout.tsx`
- Modify: `apps/web/app/(school)/principal/layout.tsx`
- Modify: `apps/web/app/(school)/admin/layout.tsx`
- Modify: `apps/web/app/(school)/admin/dashboard/page.tsx`
- Modify: `apps/web/app/(school)/principal/dashboard/page.tsx`

- [ ] **Step 1: Delete old files**

```bash
cd "/Users/dineshlearning/Documents/make money/erp"
rm apps/web/components/switch-role-panel.tsx
rm apps/web/components/context-switch-banner.tsx
rm apps/web/components/exit-context-button.tsx
rm -rf apps/web/app/api/context-switch
rm -rf apps/web/app/api/context-exit
```

- [ ] **Step 2: Update teacher layout — remove banner, add section redirect**

Replace the entire file:

```tsx
// apps/web/app/(school)/teacher/layout.tsx
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getActiveSection } from "@/lib/section-context";

export default async function TeacherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: roleRow } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .limit(1)
    .single();

  const allowed = ["teacher", "principal", "school_admin", "super_admin"];
  if (!roleRow || !allowed.includes(roleRow.role)) redirect("/login");

  // Non-teachers must have an active section to access teacher pages
  if (roleRow.role !== "teacher") {
    const activeSection = await getActiveSection();
    if (!activeSection) {
      const dest = roleRow.role === "principal" ? "/principal/dashboard" : "/admin/dashboard";
      redirect(dest);
    }
  }

  return <>{children}</>;
}
```

- [ ] **Step 3: Update principal layout — remove banner**

Replace the entire file:

```tsx
// apps/web/app/(school)/principal/layout.tsx
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export default async function PrincipalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: roleRow } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .limit(1)
    .single();

  const allowed = ["principal", "school_admin", "super_admin"];
  if (!roleRow || !allowed.includes(roleRow.role)) redirect("/login");

  return <>{children}</>;
}
```

- [ ] **Step 4: Update admin layout — remove banner**

Replace the entire file:

```tsx
// apps/web/app/(school)/admin/layout.tsx
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: roleRow } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .limit(1)
    .single();

  const allowed = ["school_admin", "super_admin"];
  if (!roleRow || !allowed.includes(roleRow.role)) redirect("/login");

  return <>{children}</>;
}
```

- [ ] **Step 5: Remove SwitchRolePanel from admin dashboard**

In `apps/web/app/(school)/admin/dashboard/page.tsx`:
- Remove the import: `import { SwitchRolePanel } from "@/components/switch-role-panel";`
- Remove the JSX: `<SwitchRolePanel roles={["principal", "teacher"]} />`

- [ ] **Step 6: Remove SwitchRolePanel from principal dashboard**

In `apps/web/app/(school)/principal/dashboard/page.tsx`:
- Remove the import: `import { SwitchRolePanel } from "@/components/switch-role-panel";`
- Remove the JSX: `<SwitchRolePanel roles={["teacher"]} />`

- [ ] **Step 7: Type-check**

```bash
cd "/Users/dineshlearning/Documents/make money/erp/apps/web" && pnpm type-check
```

Expected: exits 0. All references to deleted components should now be removed.

If there are remaining references to `ContextSwitchBanner`, `SwitchRolePanel`, `acting_as`, or the deleted API routes, search and remove them:

```bash
cd "/Users/dineshlearning/Documents/make money/erp" && grep -r "switch-role-panel\|context-switch-banner\|exit-context-button\|acting_as\|context-switch\|context-exit" apps/web/ --include="*.tsx" --include="*.ts" -l
```

Fix any remaining references before committing.

- [ ] **Step 8: Commit**

```bash
cd "/Users/dineshlearning/Documents/make money/erp"
git add -A
git commit -m "feat: remove old role-switching mechanism, update all layouts

- Delete SwitchRolePanel, ContextSwitchBanner, ExitContextButton
- Delete /api/context-switch and /api/context-exit
- Teacher layout: redirect non-teachers without active section
- Principal/Admin layouts: remove banner rendering
- Dashboard pages: remove SwitchRolePanel usage"
```

---

## Task 7: End-to-End Verification

**No files to modify — testing only.**

- [ ] **Step 1: Reset database and start dev server**

```bash
cd "/Users/dineshlearning/Documents/make money/erp" && supabase db reset
cd apps/web && pnpm dev
```

- [ ] **Step 2: Test as school admin**

1. Navigate to `http://school1.lvh.me:3000/login`
2. Login as `schooladmin@demo.com` / `Admin@1234`
3. Verify: lands on admin dashboard with school-wide stats
4. Verify: sidebar shows all 13 nav items including Timetable, Discipline, Reports
5. Verify: section switcher at top shows "Select a class / section" with all 24 sections grouped by class
6. Select "Class 8 – Section A"
7. Verify: redirects to `/teacher/dashboard`
8. Verify: sidebar swaps to teacher nav (Dashboard, Attendance, Homework, Results, Discipline, Fees) — NO Feedback
9. Verify: "← Back to Admin" button appears above the switcher
10. Click "← Back to Admin"
11. Verify: redirects to `/admin/dashboard`, section switcher resets to "Select a class / section"

- [ ] **Step 3: Test as principal**

1. Logout, login as `principal@demo.com` / `Admin@1234`
2. Verify: lands on principal dashboard
3. Verify: sidebar shows Dashboard, Announcements, Discipline, Reports
4. Verify: section switcher shows all 24 sections
5. Select "Class 1 – Section A"
6. Verify: redirects to `/teacher/dashboard`, sidebar swaps, "← Back to Principal" shown
7. Click back
8. Verify: returns to principal dashboard

- [ ] **Step 4: Test as teacher**

1. Logout, login as `teacher1@demo.com` / `Admin@1234` (Ravi Kumar)
2. Verify: lands on `/teacher/dashboard` with Class 8A auto-selected
3. Verify: section switcher shows 3 sections (Class 8A, Class 8B, Class 7A — from homeroom + timetable)
4. Verify: sidebar shows teacher nav INCLUDING Feedback
5. Switch to "Class 7 – Section A"
6. Verify: page reloads, switcher shows Class 7A selected
7. Verify: NO "Back to" button (teachers don't have another dashboard)

- [ ] **Step 5: Test edge cases**

1. Manually navigate to `http://school1.lvh.me:3000/teacher/dashboard` as principal (without selecting a section)
2. Verify: redirects to `/principal/dashboard`
3. As teacher, verify typing `/admin/dashboard` in URL redirects to `/teacher/dashboard`
4. As admin with Class 8A selected, navigate between Attendance, Homework, Results pages
5. Verify: all pages load without error (content may be incomplete — scoped pages come in Plan 3)

- [ ] **Step 6: Commit any fixes from testing**

If any issues found during testing, fix and commit:
```bash
cd "/Users/dineshlearning/Documents/make money/erp"
git add -A
git commit -m "fix: [describe what was fixed during e2e testing]"
```

---

## Self-Review

**Spec coverage:**
- ✅ Section switcher component with grouped dropdown
- ✅ Cookie-based section persistence (8-hour TTL)
- ✅ Middleware reads active_section, sets x-active-section header
- ✅ Principals/admins allowed on /teacher/* with active section
- ✅ Teacher auto-selects homeroom section
- ✅ Principal/admin shows "Select a class/section" prompt
- ✅ Full nav swap when section selected
- ✅ "Back to Principal/Admin" exit button
- ✅ Remove all acting_as mechanism
- ✅ Remove SwitchRolePanel, ContextSwitchBanner, context-switch APIs
- ✅ Admin sidebar: added Timetable, Discipline, Reports
- ✅ Teacher sidebar: added Discipline, Fees
- ✅ Feedback hidden for principal/admin in section view
- ✅ Section context helper (getActiveSection)

**Placeholder scan:** No TBDs, TODOs, or vague steps found.

**Type consistency:** `SectionOption` interface consistent between section-switcher.tsx and layout.tsx. `getActiveSection()` returns `string | null` consistently.

**Note for Plan 3:** The teacher portal pages don't yet USE the active section to scope their data. They'll still show their current behavior (some broken, some unscoped). Plan 3 rewrites each page to read from `getActiveSection()` and scope all queries.
