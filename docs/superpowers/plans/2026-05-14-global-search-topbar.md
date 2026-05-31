# Top Bar Redesign + Global Search

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the top bar to include a global people search (students + teachers) with Cmd+K keyboard shortcut. The search should be a spotlight-style modal that searches by name or roll number.

**Architecture:** A new `CommandSearch` client component renders a dialog triggered by clicking the search bar in the top bar or pressing Cmd+K. It fetches results from a new API route that queries `student_profiles` and `teacher_profiles` via full-text search. Results link to the appropriate detail page based on role context.

**Tech Stack:** Next.js App Router, Supabase, React client component, Cmd+K keyboard listener

---

### Task 1: Create the Search API Route

**Files:**
- Create: `apps/web/app/api/search/route.ts`

- [ ] **Step 1: Create the API route**

Create `apps/web/app/api/search/route.ts`:

```tsx
import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSchoolId } from "@/lib/school";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim();
  if (!q || q.length < 2) {
    return NextResponse.json({ results: [] });
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ results: [] }, { status: 401 });

  const schoolId = await getSchoolId();
  if (!schoolId) return NextResponse.json({ results: [] });

  const pattern = `%${q}%`;

  const [{ data: students }, { data: teachers }] = await Promise.all([
    supabase
      .from("student_profiles")
      .select("id, full_name, roll_number, class:classes(name), section:sections(name)")
      .eq("school_id", schoolId)
      .or(`full_name.ilike.${pattern},roll_number.ilike.${pattern}`)
      .limit(8),
    supabase
      .from("teacher_profiles")
      .select("profile_id, profile:profiles!teacher_profiles_profile_id_fkey(full_name)")
      .eq("school_id", schoolId)
      .limit(8),
  ]);

  const teacherResults = (teachers ?? [])
    .filter((t) => {
      const name = (t.profile as unknown as { full_name: string } | null)?.full_name ?? "";
      return name.toLowerCase().includes(q.toLowerCase());
    })
    .slice(0, 5);

  const results = [
    ...(students ?? []).map((s) => {
      const cls = s.class as unknown as { name: string } | null;
      const sec = s.section as unknown as { name: string } | null;
      return {
        id: s.id,
        type: "student" as const,
        name: s.full_name ?? "—",
        detail: [cls?.name, sec?.name].filter(Boolean).join(" – ") || s.roll_number || "",
      };
    }),
    ...teacherResults.map((t) => {
      const profile = t.profile as unknown as { full_name: string } | null;
      return {
        id: t.profile_id,
        type: "teacher" as const,
        name: profile?.full_name ?? "—",
        detail: "Teacher",
      };
    }),
  ];

  return NextResponse.json({ results });
}
```

- [ ] **Step 2: Verify the route responds**

Start the dev server and test: `curl "http://localhost:3000/api/search?q=test"` — should return `{"results":[]}` or matching data.

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/api/search/route.ts
git commit -m "feat(search): add global people search API route"
```

---

### Task 2: Create the Command Search Component

**Files:**
- Create: `apps/web/components/command-search.tsx`

- [ ] **Step 1: Create the CommandSearch component**

Create `apps/web/components/command-search.tsx`:

```tsx
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, X, GraduationCap, Users } from "lucide-react";

interface SearchResult {
  id: string;
  type: "student" | "teacher";
  name: string;
  detail: string;
}

interface CommandSearchProps {
  userRole: string;
}

export function CommandSearch({ userRole }: CommandSearchProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const rolePrefix = userRole === "teacher" ? "/teacher" : userRole === "principal" ? "/principal" : "/admin";

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen(true);
      }
      if (e.key === "Escape") {
        setOpen(false);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery("");
      setResults([]);
      setActiveIndex(0);
    }
  }, [open]);

  useEffect(() => {
    if (!query || query.length < 2) {
      setResults([]);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    fetch(`/api/search?q=${encodeURIComponent(query)}`, { signal: controller.signal })
      .then((res) => res.json())
      .then((data) => {
        setResults(data.results ?? []);
        setActiveIndex(0);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [query]);

  const navigate = useCallback(
    (result: SearchResult) => {
      setOpen(false);
      if (result.type === "student") {
        router.push(`${rolePrefix}/students/${result.id}`);
      } else {
        router.push(`${rolePrefix}/teachers/${result.id}`);
      }
    },
    [rolePrefix, router]
  );

  function handleKeyNav(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && results[activeIndex]) {
      navigate(results[activeIndex]);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-lg border border-border bg-muted/50 px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted"
      >
        <Search className="h-3.5 w-3.5" />
        <span>Search...</span>
        <kbd className="ml-4 hidden rounded border border-border bg-background px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground sm:inline">
          ⌘K
        </kbd>
      </button>
    );
  }

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/50" onClick={() => setOpen(false)} />
      <div className="fixed left-1/2 top-[20%] z-50 w-full max-w-lg -translate-x-1/2 rounded-xl border border-border bg-background shadow-2xl">
        <div className="flex items-center gap-2 border-b border-border px-4 py-3">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyNav}
            placeholder="Search students or teachers..."
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="max-h-72 overflow-y-auto p-2">
          {loading && (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">Searching...</p>
          )}
          {!loading && query.length >= 2 && results.length === 0 && (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">No results found.</p>
          )}
          {!loading && results.map((result, i) => (
            <button
              key={`${result.type}-${result.id}`}
              onClick={() => navigate(result)}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors ${
                i === activeIndex ? "bg-muted" : "hover:bg-muted/50"
              }`}
            >
              {result.type === "student" ? (
                <GraduationCap className="h-4 w-4 shrink-0 text-emerald-600" />
              ) : (
                <Users className="h-4 w-4 shrink-0 text-indigo-600" />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">{result.name}</p>
                <p className="truncate text-xs text-muted-foreground">{result.detail}</p>
              </div>
              <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground capitalize">
                {result.type}
              </span>
            </button>
          ))}
          {!loading && query.length < 2 && (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">
              Type at least 2 characters to search...
            </p>
          )}
        </div>
      </div>
    </>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/components/command-search.tsx
git commit -m "feat(search): add CommandSearch spotlight component with Cmd+K"
```

---

### Task 3: Redesign TopBar with Search Integration

**Files:**
- Modify: `apps/web/components/top-bar.tsx`

- [ ] **Step 1: Rewrite the TopBar component**

Replace the entire contents of `apps/web/components/top-bar.tsx` with:

```tsx
"use client";

import { usePathname } from "next/navigation";
import { ChevronRight, Bell } from "lucide-react";
import { CommandSearch } from "@/components/command-search";

interface TopBarProps {
  userName: string;
  userRole: string;
  brandColor?: string;
}

const ROLE_LABELS: Record<string, string> = {
  school_admin: "School Admin",
  teacher: "Teacher",
  principal: "Principal",
  super_admin: "Platform Admin",
};

function formatSegment(segment: string): string {
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(segment)) {
    return "Detail";
  }
  return segment
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function TopBar({ userName, userRole, brandColor }: TopBarProps) {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);

  const initials = userName
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const avatarBg = brandColor ?? "#4f46e5";

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b bg-white px-6">
      <nav className="flex items-center gap-1.5 text-sm">
        {segments.length === 0 ? (
          <span className="font-semibold text-foreground">Dashboard</span>
        ) : (
          segments.map((seg, i) => (
            <span key={i} className="flex items-center gap-1.5">
              {i > 0 && <ChevronRight className="h-3.5 w-3.5 text-border" />}
              <span
                className={
                  i === segments.length - 1
                    ? "font-semibold text-foreground"
                    : "text-muted-foreground/60"
                }
              >
                {formatSegment(seg)}
              </span>
            </span>
          ))
        )}
      </nav>
      <div className="flex items-center gap-4">
        <CommandSearch userRole={userRole} />
        <button className="relative rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
          <Bell className="h-4 w-4" />
        </button>
        <div className="flex items-center gap-2.5">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-medium leading-none text-foreground">
              {userName}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {ROLE_LABELS[userRole] ?? userRole}
            </p>
          </div>
          <div
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
            style={{ backgroundColor: avatarBg }}
          >
            {initials}
          </div>
        </div>
      </div>
    </header>
  );
}
```

- [ ] **Step 2: Verify in browser**

Navigate to any page. Confirm:
- Search bar appears in the top bar with "⌘K" hint
- Clicking it opens the spotlight modal
- Pressing Cmd+K opens it
- Typing a student/teacher name shows results
- Clicking a result navigates to the correct page
- Pressing Escape closes the modal

- [ ] **Step 3: Commit**

```bash
git add apps/web/components/top-bar.tsx
git commit -m "feat(topbar): redesign with global search and notifications placeholder"
```
