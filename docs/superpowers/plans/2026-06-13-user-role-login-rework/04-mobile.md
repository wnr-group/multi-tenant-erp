# Sub-plan 4: Mobile Scope, Switching & Login Gating

> Part of [User/Role Login Rework](../2026-06-13-user-role-login-rework.md). Depends on Sub-plan 1.
> REQUIRED SUB-SKILL: superpowers:subagent-driven-development or superpowers:executing-plans.

**Goal:** One app build = one school (baked `SCHOOL_ID`). After login, the app loads all of the user's roles AT THIS SCHOOL, lets a teacher-parent switch role and a parent switch student via a single header chip + bottom-sheet, persists last-used context, sends `x-school-id` / `x-active-role` headers on every request, and shows a no-access screen when the phone has no role at this school. A pre-OTP check avoids sending SMS to users without access.

**Architecture:**
- `SCHOOL_ID` baked via `app.config` `extra` + `EXPO_PUBLIC_SCHOOL_ID`.
- Supabase client sets `global.headers` `x-school-id` (always) and a mutable `x-active-role` updated on role switch.
- An `ActiveContextProvider` holds `{ role, studentId }`, derived from the user's roles at the baked school, persisted via AsyncStorage.
- Root layout routes into `(teacher)` or `(parent)` stacks based on active role; no-access screen when zero roles.
- A `ContextSwitcher` (header chip + bottom-sheet) drives changes.

**Tech Stack:** Expo Router, React Native, `@supabase/supabase-js`, AsyncStorage.

---

### Task 1: Bake `SCHOOL_ID` into the build and the Supabase client headers

**Files:**
- Modify: `apps/mobile/app.json` (convert to `app.config.ts` OR add `extra.schoolId`)
- Modify: `apps/mobile/.env`
- Modify: `apps/mobile/lib/supabase.ts`

- [ ] **Step 1: Add the school id to env + expo extra**

In `apps/mobile/.env` add:
```
EXPO_PUBLIC_SCHOOL_ID=00000000-0000-0000-0000-000000000000
```
(Replace with the real demo school UUID from the seed. Each per-school build overrides this value.)

In `apps/mobile/app.json`, add a `schoolId` under `expo.extra` (create `extra` if absent):
```json
"extra": {
  "schoolId": "00000000-0000-0000-0000-000000000000"
}
```

- [ ] **Step 2: Expose `SCHOOL_ID` and attach headers in the Supabase client**

Edit `apps/mobile/lib/supabase.ts`. After `supabaseAnonKey` is resolved, add:

```typescript
export const SCHOOL_ID =
  process.env.EXPO_PUBLIC_SCHOOL_ID ??
  (Constants.expoConfig?.extra?.schoolId as string) ??
  "";

// Mutable active role header; updated by the context switcher.
let activeRole = "";
export function setActiveRoleHeader(role: string) {
  activeRole = role;
  // supabase-js reads global.headers by reference at request time when using a getter,
  // but to be safe we recreate the header object on the client.
  (supabase as unknown as { rest: { headers: Record<string, string> } }).rest.headers[
    "x-active-role"
  ] = role;
}
```

Change the `createClient` call to include global headers:

```typescript
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
  global: {
    headers: {
      "x-school-id": SCHOOL_ID,
    },
  },
});
```

> `x-school-id` is constant for the whole app (baked school). `x-active-role` is set at login/switch via `setActiveRoleHeader`. The `scope_pre_request` hook (Sub-plan 1) validates the `(user, x-school-id, x-active-role)` triple.

- [ ] **Step 3: Typecheck**

Run: `cd "/Users/dineshlearning/Documents/make money/erp/apps/mobile" && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/.env apps/mobile/app.json apps/mobile/lib/supabase.ts
git commit -m "feat(mobile): bake SCHOOL_ID and send x-school-id/x-active-role headers"
```

---

### Task 2: Create the `ActiveContextProvider` (roles for this school + persistence)

**Files:**
- Create: `apps/mobile/lib/active-context.tsx`

- [ ] **Step 1: Write the provider**

```tsx
import { createContext, useContext, useEffect, useState, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase, SCHOOL_ID, setActiveRoleHeader } from "./supabase";

export type MobileRole = "teacher" | "parent";

export interface StudentRef {
  id: string;          // student_profiles.id
  fullName: string;
  className?: string | null;
}

interface ActiveContextValue {
  loading: boolean;
  roles: MobileRole[];          // roles the user holds at this school (teacher/parent only)
  students: StudentRef[];       // children for the parent role
  role: MobileRole | null;      // current active role
  studentId: string | null;    // current active student (parent only)
  setRole: (r: MobileRole) => void;
  setStudent: (id: string) => void;
  hasAccess: boolean;           // false → show no-access screen
}

const Ctx = createContext<ActiveContextValue | null>(null);
const STORAGE_KEY = "active_context_v1";

export function ActiveContextProvider({
  userId,
  children,
}: {
  userId: string | null;
  children: React.ReactNode;
}) {
  const [loading, setLoading] = useState(true);
  const [roles, setRoles] = useState<MobileRole[]>([]);
  const [students, setStudents] = useState<StudentRef[]>([]);
  const [role, setRoleState] = useState<MobileRole | null>(null);
  const [studentId, setStudentId] = useState<string | null>(null);

  const persist = useCallback(async (r: MobileRole | null, s: string | null) => {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ role: r, studentId: s }));
  }, []);

  const setRole = useCallback((r: MobileRole) => {
    setRoleState(r);
    setActiveRoleHeader(r);
    persist(r, r === "parent" ? studentId : null);
  }, [studentId, persist]);

  const setStudent = useCallback((id: string) => {
    setStudentId(id);
    persist(role, id);
  }, [role, persist]);

  useEffect(() => {
    if (!userId) { setLoading(false); return; }
    let cancelled = false;

    (async () => {
      // Roles at THIS school only (teacher/parent are the mobile roles).
      const { data: roleRows } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .eq("school_id", SCHOOL_ID)
        .eq("is_active", true);

      const mobileRoles = (roleRows ?? [])
        .map((r) => r.role as string)
        .filter((r): r is MobileRole => r === "teacher" || r === "parent");

      // Children for the parent role.
      const { data: kids } = await supabase
        .from("student_profiles")
        .select("id, full_name")
        .eq("parent_profile_id", userId)
        .eq("school_id", SCHOOL_ID);

      if (cancelled) return;

      const studentRefs: StudentRef[] = (kids ?? []).map((k) => ({
        id: k.id as string,
        fullName: k.full_name as string,
      }));
      setRoles(mobileRoles);
      setStudents(studentRefs);

      // Restore last-used context if still valid; else default to teacher, then parent.
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      const parsed = stored ? (JSON.parse(stored) as { role: MobileRole | null; studentId: string | null }) : null;

      let nextRole: MobileRole | null = null;
      if (parsed?.role && mobileRoles.includes(parsed.role)) nextRole = parsed.role;
      else if (mobileRoles.includes("teacher")) nextRole = "teacher";
      else if (mobileRoles.includes("parent")) nextRole = "parent";

      let nextStudent: string | null = null;
      if (nextRole === "parent") {
        const validStored = parsed?.studentId && studentRefs.some((s) => s.id === parsed.studentId);
        nextStudent = validStored ? parsed!.studentId : (studentRefs[0]?.id ?? null);
      }

      setRoleState(nextRole);
      setStudentId(nextStudent);
      if (nextRole) setActiveRoleHeader(nextRole);
      setLoading(false);
    })();

    return () => { cancelled = true; };
  }, [userId]);

  const hasAccess = roles.length > 0;

  return (
    <Ctx.Provider
      value={{ loading, roles, students, role, studentId, setRole, setStudent, hasAccess }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useActiveContext() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useActiveContext must be used within ActiveContextProvider");
  return v;
}
```

- [ ] **Step 2: Ensure AsyncStorage is installed**

Run: `cd "/Users/dineshlearning/Documents/make money/erp/apps/mobile" && grep -q "@react-native-async-storage/async-storage" package.json && echo present || npx expo install @react-native-async-storage/async-storage`
Expected: `present`, or the package installs.

- [ ] **Step 3: Typecheck**

Run: `cd "/Users/dineshlearning/Documents/make money/erp/apps/mobile" && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/lib/active-context.tsx apps/mobile/package.json
git commit -m "feat(mobile): add ActiveContextProvider for school-scoped roles and student switching"
```

---

### Task 3: Rewrite root layout to use baked school + active context + no-access

**Files:**
- Modify: `apps/mobile/app/_layout.tsx`

- [ ] **Step 1: Replace `fetchSchoolId`/`profiles.school_id` with baked `SCHOOL_ID`**

Remove the `fetchSchoolId` function and the `schoolId` state entirely. Import `SCHOOL_ID` and pass it directly to `ThemeProvider`:

```tsx
import { supabase, SCHOOL_ID } from "../lib/supabase";
import { ActiveContextProvider, useActiveContext } from "../lib/active-context";
// remove: const [schoolId, setSchoolId] = useState(...) and fetchSchoolId
```

In the auth effect, drop the `fetchSchoolId(session.user.id)` calls (keep `tryRegisterPush`).

- [ ] **Step 2: Wrap the app in `ActiveContextProvider` and gate routing on it**

Replace the role-based redirect effect (the `user_roles ... .single() → router.replace` block) with routing driven by `useActiveContext`. Restructure so the provider wraps a `Gate` component:

```tsx
return (
  <ThemeProvider schoolId={SCHOOL_ID}>
    <StatusBar style="dark" />
    <ActiveContextProvider userId={session?.user.id ?? null}>
      <Gate session={session} initialized={initialized}>
        <View style={{ flex: 1 }}>
          <Stack screenOptions={{ headerShown: false }} />
          {!splashDone && <AnimatedSplash onFinish={() => setSplashDone(true)} />}
        </View>
      </Gate>
    </ActiveContextProvider>
  </ThemeProvider>
);
```

Add the `Gate` component in the same file:

```tsx
function Gate({
  session,
  initialized,
  children,
}: {
  session: Session | null;
  initialized: boolean;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const segments = useSegments();
  const { loading, hasAccess, role } = useActiveContext();

  useEffect(() => {
    if (!initialized) return;
    const inAuthGroup = segments[0] === "(auth)";

    if (!session && !inAuthGroup) {
      router.replace("/(auth)/login");
      return;
    }
    if (!session) return;
    if (loading) return;

    if (!hasAccess) {
      if (segments[0] !== "no-access") router.replace("/no-access");
      return;
    }

    // Route based on active role when leaving the auth group.
    if (inAuthGroup || segments[0] === "no-access") {
      router.replace(role === "teacher" ? "/(teacher)/dashboard" : "/(parent)/dashboard");
    }
  }, [session, initialized, loading, hasAccess, role, segments]);

  return <>{children}</>;
}
```

- [ ] **Step 3: Typecheck**

Run: `cd "/Users/dineshlearning/Documents/make money/erp/apps/mobile" && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/app/_layout.tsx
git commit -m "feat(mobile): route via baked SCHOOL_ID and active context, add no-access gating"
```

---

### Task 4: Add the no-access screen

**Files:**
- Create: `apps/mobile/app/no-access.tsx`

- [ ] **Step 1: Write the screen**

```tsx
import { View, Text, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "../lib/supabase";

export default function NoAccessScreen() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 24 }}>
        <Text style={{ fontSize: 20, fontWeight: "700", marginBottom: 8, textAlign: "center" }}>
          No access to this school
        </Text>
        <Text style={{ fontSize: 14, color: "#6b7280", textAlign: "center", marginBottom: 24 }}>
          This account isn’t registered with this school. Please contact your school administrator.
        </Text>
        <TouchableOpacity
          onPress={() => supabase.auth.signOut()}
          style={{ backgroundColor: "#4f46e5", paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 }}
        >
          <Text style={{ color: "#fff", fontWeight: "600" }}>Sign out</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
```

- [ ] **Step 2: Typecheck + visual**

Run: `cd "/Users/dineshlearning/Documents/make money/erp/apps/mobile" && npx tsc --noEmit`
Then run the app and log in with a phone that has no role at the baked school.
Expected: the no-access screen renders with a working sign-out.

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/app/no-access.tsx
git commit -m "feat(mobile): add no-access screen for phones without a role at this school"
```

---

### Task 5: Build the context switcher (header chip + bottom-sheet)

**Files:**
- Create: `apps/mobile/components/ContextSwitcher.tsx`

- [ ] **Step 1: Write the component**

```tsx
import { useState } from "react";
import { View, Text, TouchableOpacity, Modal, Pressable, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useActiveContext, type MobileRole } from "../lib/active-context";

export function ContextSwitcher() {
  const { roles, students, role, studentId, setRole, setStudent } = useActiveContext();
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const hasRoleChoice = roles.includes("teacher") && roles.includes("parent");
  const hasStudentChoice = role === "parent" && students.length > 1;

  // Nothing to switch → render nothing (no chip).
  if (!hasRoleChoice && !hasStudentChoice) return null;

  const activeStudent = students.find((s) => s.id === studentId);
  const label =
    role === "teacher"
      ? "Teacher"
      : `Parent${activeStudent ? ` · ${activeStudent.fullName}` : ""}`;

  function chooseRole(r: MobileRole) {
    setRole(r);
    setOpen(false);
    router.replace(r === "teacher" ? "/(teacher)/dashboard" : "/(parent)/dashboard");
  }

  function chooseStudent(id: string) {
    setStudent(id);
    setOpen(false);
  }

  return (
    <>
      <TouchableOpacity
        onPress={() => setOpen(true)}
        style={{
          flexDirection: "row", alignItems: "center", gap: 6,
          backgroundColor: "#eef2ff", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999,
        }}
      >
        <Text style={{ color: "#4f46e5", fontWeight: "600", fontSize: 13 }}>{label}</Text>
        <Ionicons name="chevron-down" size={14} color="#4f46e5" />
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <Pressable style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.3)" }} onPress={() => setOpen(false)} />
        <View style={{ backgroundColor: "#fff", borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 36 }}>
          <Text style={{ fontSize: 16, fontWeight: "700", marginBottom: 12 }}>Switch context</Text>
          <ScrollView style={{ maxHeight: 360 }}>
            {roles.includes("teacher") && (
              <Row
                label="Teacher"
                active={role === "teacher"}
                onPress={() => chooseRole("teacher")}
              />
            )}
            {roles.includes("parent") && (
              <>
                <Text style={{ fontSize: 12, color: "#9ca3af", marginTop: 12, marginBottom: 4 }}>PARENT</Text>
                {students.map((s) => (
                  <Row
                    key={s.id}
                    label={s.fullName}
                    active={role === "parent" && studentId === s.id}
                    onPress={() => {
                      if (role !== "parent") setRole("parent");
                      chooseStudent(s.id);
                      router.replace("/(parent)/dashboard");
                    }}
                  />
                ))}
              </>
            )}
          </ScrollView>
        </View>
      </Modal>
    </>
  );
}

function Row({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 12 }}
    >
      <Text style={{ fontSize: 15, color: active ? "#4f46e5" : "#111827", fontWeight: active ? "700" : "400" }}>
        {label}
      </Text>
      {active && <Ionicons name="checkmark" size={18} color="#4f46e5" />}
    </TouchableOpacity>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `cd "/Users/dineshlearning/Documents/make money/erp/apps/mobile" && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/components/ContextSwitcher.tsx
git commit -m "feat(mobile): add context switcher chip + bottom-sheet for role/student"
```

---

### Task 6: Mount the switcher in both stacks; scope parent screens to active student

**Files:**
- Modify: `apps/mobile/app/(teacher)/_layout.tsx`
- Modify: `apps/mobile/app/(parent)/_layout.tsx`
- Modify: parent screens that query the child (e.g. `apps/mobile/app/(parent)/dashboard.tsx`, `attendance.tsx`, `academics.tsx`, `fees.tsx`)

- [ ] **Step 1: Render the chip in each stack header**

In both `_layout.tsx` files, render `<ContextSwitcher />` in the header area (e.g. as a `headerRight` or inside the existing top bar). Match the file's existing header pattern. Import from `../../components/ContextSwitcher`.

- [ ] **Step 2: Replace `.single()` child lookups with the active student**

Find parent screens that currently do `.eq("parent_profile_id", user.id).single()`. Run:
`grep -rn "parent_profile_id\|\.single()" "apps/mobile/app/(parent)"`
For each, replace the implicit single-child fetch with the active student from context:

```tsx
import { useActiveContext } from "../../lib/active-context";
// ...
const { studentId } = useActiveContext();
// then query by the chosen student id:
const { data } = await supabase
  .from("student_profiles")
  .select("...")
  .eq("id", studentId)
  .maybeSingle();
```

For downstream queries that filtered by the old single child, use `studentId` as the filter key.

- [ ] **Step 3: Typecheck + manual verification**

Run: `cd "/Users/dineshlearning/Documents/make money/erp/apps/mobile" && npx tsc --noEmit`
Then with the app running, log in as a teacher-parent with two children:
- Expected: lands on teacher dashboard (default), chip shows "Teacher".
- Tap chip → select a child → parent dashboard scoped to that child.
- Switch to the other child → data updates.
- Kill and relaunch → returns to last-used context.

- [ ] **Step 4: Commit**

```bash
git add "apps/mobile/app/(teacher)/_layout.tsx" "apps/mobile/app/(parent)/_layout.tsx" "apps/mobile/app/(parent)"
git commit -m "feat(mobile): mount context switcher and scope parent screens to active student"
```

---

### Task 7: Pre-OTP access check on the login screen

**Files:**
- Modify: `apps/mobile/app/(auth)/login.tsx`

- [ ] **Step 1: Call `check_phone_has_access` before sending OTP**

In `handleSendOtp`, before `supabase.auth.signInWithOtp`, add the gate:

```tsx
import { supabase, SCHOOL_ID } from "../../lib/supabase";
// ...
async function handleSendOtp() {
  const digits = phone.replace(/\D/g, "");
  if (digits.length !== 10) {
    Alert.alert("Invalid number", "Enter a valid 10-digit mobile number.");
    return;
  }
  setLoading(true);
  const fullPhone = `+91${digits}`;

  const { data: allowed, error: checkError } = await supabase.rpc("check_phone_has_access", {
    p_phone: fullPhone,
    p_school_id: SCHOOL_ID,
  });

  if (checkError) {
    setLoading(false);
    Alert.alert("Error", "Could not verify access. Please try again.");
    return;
  }
  if (!allowed) {
    setLoading(false);
    Alert.alert(
      "No access",
      "This number isn’t registered with this school. Please contact your school administrator.",
    );
    return;
  }

  const { error } = await supabase.auth.signInWithOtp({ phone: fullPhone });
  setLoading(false);
  if (error) { Alert.alert("Error", error.message); return; }
  setStep("otp");
  setResendCooldown(30);
}
```

> Keep the post-login no-access gate (Task 3/4) as defense-in-depth — this RPC is advisory only.

- [ ] **Step 2: Typecheck + manual**

Run: `cd "/Users/dineshlearning/Documents/make money/erp/apps/mobile" && npx tsc --noEmit`
Then enter a phone with no role at this school.
Expected: "No access" alert, NO OTP SMS sent. A valid phone proceeds to the OTP step.

- [ ] **Step 3: Commit**

```bash
git add "apps/mobile/app/(auth)/login.tsx"
git commit -m "feat(mobile): pre-OTP access check to avoid SMS for users without access"
```

---

## Sub-plan 4 done when

- One build = one baked school; `x-school-id` + `x-active-role` go out on every request.
- A teacher-parent defaults to teacher, can switch to parent and between children via the chip/sheet, and last-used context survives relaunch.
- A phone with no role at this school is blocked before OTP and shown the no-access screen if it somehow authenticates.

Proceed to [Sub-plan 5: Re-seed](05-reseed.md).
