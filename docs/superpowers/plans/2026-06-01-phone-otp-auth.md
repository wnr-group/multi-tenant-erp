# Phone + OTP Authentication (MSG91) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace email/password login with phone + OTP for all user types (parent, teacher, principal, school_admin, super_admin) on both web and mobile, using MSG91 as the SMS transport via Supabase's HTTP SMS provider hook.

**Architecture:** Supabase owns OTP generation, expiry (1hr), rate limiting, and session creation. The new `send-sms` edge function is a thin adapter that receives `{ phone, otp }` from Supabase and forwards it to MSG91's Flow API. Admin provisions all users (no self-registration) by calling `admin.createUser({ phone, phone_confirm: true })` instead of the old email-invite flow.

**Tech Stack:** Supabase Auth (phone OTP), MSG91 Flow API, Deno edge functions, Next.js (web), Expo React Native (mobile), Zod (validation), TypeScript.

---

## File Map

| Action | File | Responsibility |
|--------|------|----------------|
| Modify | `supabase/config.toml` | Enable SMS phone auth with HTTP provider |
| Create | `supabase/migrations/20240001000027_profiles_phone_constraints.sql` | Add UNIQUE + NOT NULL to `profiles.phone` |
| Modify | `supabase/seed.sql` | Replace email+password users with phone-based users |
| Create | `supabase/functions/send-sms/index.ts` | MSG91 adapter edge function |
| Modify | `packages/shared/src/schemas/index.ts` | Replace `loginSchema` with `phoneSchema` + `otpSchema` |
| Modify | `apps/web/app/(auth)/login/login-form.tsx` | Two-step phone+OTP login UI |
| Modify | `apps/mobile/app/(auth)/login.tsx` | Two-step phone+OTP login UI |
| Modify | `apps/web/app/api/invite-user/route.ts` | Replace email invite with `createUser({ phone })` |
| Modify | `apps/web/app/api/schools/[id]/users/route.ts` | Same — platform-admin user creation |
| Modify | `apps/web/app/(school)/admin/teachers/invite-teacher-form.tsx` | Replace email field with phone field |
| Modify | `apps/web/app/platform-admin/schools/[id]/invite-user-dialog.tsx` | Replace email field with phone field |

---

## Task 1: Update `supabase/config.toml` — enable phone/OTP auth

**Files:**
- Modify: `supabase/config.toml`

- [ ] **Step 1: Update the `[auth.sms]` block**

Replace the existing `[auth.sms]` block and `[auth.sms.twilio]` block with the following. The `[auth.sms.twilio]` block is removed entirely since we use the HTTP provider.

In `supabase/config.toml`, find and replace:

```toml
[auth.sms]
# Allow/disallow new user signups via SMS to your project.
enable_signup = false
# If enabled, users need to confirm their phone number before signing in.
enable_confirmations = false
# Template for sending OTP to users
template = "Your code is {{ .Code }}"
# Controls the minimum amount of time that must pass before sending another sms otp.
max_frequency = "5s"

# Use pre-defined map of phone number to OTP for testing.
# [auth.sms.test_otp]
# 4152127777 = "123456"
```

with:

```toml
[auth.sms]
enable_signup = false
enable_confirmations = true
template = "Your code is {{ .Code }}"
max_frequency = "5s"
provider = "http"

[auth.sms.http]
url = "http://host.docker.internal:54321/functions/v1/send-sms"

# Use pre-defined map of phone number to OTP for testing.
[auth.sms.test_otp]
# Add your test phone (without +) mapped to a fixed OTP for local dev
# 919999999999 = "123456"
```

Note: `host.docker.internal:54321` is the correct local Supabase URL for edge functions called from within the Supabase Docker network. In production you'll use the real `https://<project-ref>.supabase.co/functions/v1/send-sms`.

Also find and **remove** the entire Twilio block:
```toml
# Configure one of the supported SMS providers: `twilio`, `twilio_verify`, `messagebird`, `textlocal`, `vonage`.
[auth.sms.twilio]
enabled = false
account_sid = ""
message_service_sid = ""
# DO NOT commit your Twilio auth token to git. Use environment variable substitution instead:
auth_token = "env(SUPABASE_AUTH_SMS_TWILIO_AUTH_TOKEN)"
```

- [ ] **Step 2: Disable email signup (email login no longer used)**

In `supabase/config.toml`, find:
```toml
[auth.email]
# Allow/disallow new user signups via email to your project.
enable_signup = true
```

Change to:
```toml
[auth.email]
# Allow/disallow new user signups via email to your project.
enable_signup = false
```

- [ ] **Step 3: Commit**

```bash
git add supabase/config.toml
git commit -m "feat(auth): enable phone OTP via HTTP SMS provider; disable email signup"
```

---

## Task 2: DB migration — enforce `profiles.phone` constraints

**Files:**
- Create: `supabase/migrations/20240001000027_profiles_phone_constraints.sql`

- [ ] **Step 1: Create the migration file**

```sql
-- Enforce phone as required and unique on profiles.
-- All users are now provisioned with a phone number; no email-only accounts.
ALTER TABLE public.profiles
  ALTER COLUMN phone SET NOT NULL,
  ADD CONSTRAINT profiles_phone_unique UNIQUE (phone);
```

Save to `supabase/migrations/20240001000027_profiles_phone_constraints.sql`.

- [ ] **Step 2: Apply the migration locally**

```bash
supabase db reset
```

Expected output: migration applies cleanly, seed data loads without error (after seed.sql is updated in Task 3 — do this task together with Task 3).

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20240001000027_profiles_phone_constraints.sql
git commit -m "feat(db): add NOT NULL + UNIQUE constraint to profiles.phone"
```

---

## Task 3: Update `seed.sql` — phone-based dev users

**Files:**
- Modify: `supabase/seed.sql`

- [ ] **Step 1: Replace auth.users INSERT with phone-based users**

The current seed inserts users with `email` and `encrypted_password`. We need to replace those with `phone`-based users.

Find the `-- AUTH USERS` section in `supabase/seed.sql`. Replace the entire `INSERT INTO auth.users (...)` statement with:

```sql
-- AUTH USERS  (local Supabase only — never run against prod)
-- handle_new_user trigger auto-creates profiles rows
INSERT INTO auth.users (
  id, phone, phone_confirmed_at,
  raw_user_meta_data, created_at, updated_at,
  aud, role, instance_id, confirmation_token, recovery_token,
  email_change_token_new, email_change
)
VALUES
  ('aaaaaaaa-0000-0000-0000-000000000010', '+919000000001', now(),
   '{"full_name":"Dinesh (Super Admin)"}'::jsonb,
   now(), now(), 'authenticated', 'authenticated',
   '00000000-0000-0000-0000-000000000000', '', '', '', ''),

  ('aaaaaaaa-0000-0000-0000-000000000011', '+919000000002', now(),
   '{"full_name":"Arjun Sharma"}'::jsonb,
   now(), now(), 'authenticated', 'authenticated',
   '00000000-0000-0000-0000-000000000000', '', '', '', ''),

  ('aaaaaaaa-0000-0000-0000-000000000012', '+919000000003', now(),
   '{"full_name":"Dr. Meena Iyer"}'::jsonb,
   now(), now(), 'authenticated', 'authenticated',
   '00000000-0000-0000-0000-000000000000', '', '', '', ''),

  ('aaaaaaaa-0000-0000-0000-000000000013', '+919000000004', now(),
   '{"full_name":"Ravi Kumar"}'::jsonb,
   now(), now(), 'authenticated', 'authenticated',
   '00000000-0000-0000-0000-000000000000', '', '', '', ''),

  ('aaaaaaaa-0000-0000-0000-000000000014', '+919000000005', now(),
   '{"full_name":"Sunita Patel"}'::jsonb,
   now(), now(), 'authenticated', 'authenticated',
   '00000000-0000-0000-0000-000000000000', '', '', '', ''),

  ('aaaaaaaa-0000-0000-0000-000000000015', '+919000000006', now(),
   '{"full_name":"Kavitha Nair"}'::jsonb,
   now(), now(), 'authenticated', 'authenticated',
   '00000000-0000-0000-0000-000000000000', '', '', '', ''),

  ('aaaaaaaa-0000-0000-0000-000000000016', '+919000000007', now(),
   '{"full_name":"Mohan Das"}'::jsonb,
   now(), now(), 'authenticated', 'authenticated',
   '00000000-0000-0000-0000-000000000000', '', '', '', ''),

  ('aaaaaaaa-0000-0000-0000-000000000017', '+919000000008', now(),
   '{"full_name":"Priya Singh"}'::jsonb,
   now(), now(), 'authenticated', 'authenticated',
   '00000000-0000-0000-0000-000000000000', '', '', '', ''),

  ('aaaaaaaa-0000-0000-0000-000000000018', '+919000000009', now(),
   '{"full_name":"Anil Verma"}'::jsonb,
   now(), now(), 'authenticated', 'authenticated',
   '00000000-0000-0000-0000-000000000000', '', '', '', ''),

  ('aaaaaaaa-0000-0000-0000-000000000019', '+919000000010', now(),
   '{"full_name":"Geeta Rao"}'::jsonb,
   now(), now(), 'authenticated', 'authenticated',
   '00000000-0000-0000-0000-000000000000', '', '', '', ''),

  ('aaaaaaaa-0000-0000-0000-000000000020', '+919000000011', now(),
   '{"full_name":"Parent One"}'::jsonb,
   now(), now(), 'authenticated', 'authenticated',
   '00000000-0000-0000-0000-000000000000', '', '', '', '');
```

- [ ] **Step 2: Update profiles rows to set phone**

Find the `UPDATE public.profiles` statements (or the section that sets profile data) in `seed.sql` and add phone values. If profiles are created via the trigger (which reads `raw_user_meta_data`), add explicit phone updates after the trigger fires:

```sql
-- Sync phone into profiles (trigger doesn't copy phone from auth.users)
UPDATE public.profiles SET phone = '+919000000001' WHERE id = 'aaaaaaaa-0000-0000-0000-000000000010';
UPDATE public.profiles SET phone = '+919000000002' WHERE id = 'aaaaaaaa-0000-0000-0000-000000000011';
UPDATE public.profiles SET phone = '+919000000003' WHERE id = 'aaaaaaaa-0000-0000-0000-000000000012';
UPDATE public.profiles SET phone = '+919000000004' WHERE id = 'aaaaaaaa-0000-0000-0000-000000000013';
UPDATE public.profiles SET phone = '+919000000005' WHERE id = 'aaaaaaaa-0000-0000-0000-000000000014';
UPDATE public.profiles SET phone = '+919000000006' WHERE id = 'aaaaaaaa-0000-0000-0000-000000000015';
UPDATE public.profiles SET phone = '+919000000007' WHERE id = 'aaaaaaaa-0000-0000-0000-000000000016';
UPDATE public.profiles SET phone = '+919000000008' WHERE id = 'aaaaaaaa-0000-0000-0000-000000000017';
UPDATE public.profiles SET phone = '+919000000009' WHERE id = 'aaaaaaaa-0000-0000-0000-000000000018';
UPDATE public.profiles SET phone = '+919000000010' WHERE id = 'aaaaaaaa-0000-0000-0000-000000000019';
UPDATE public.profiles SET phone = '+919000000011' WHERE id = 'aaaaaaaa-0000-0000-0000-000000000020';
```

- [ ] **Step 3: Apply and verify**

```bash
supabase db reset
```

Expected: no errors. Verify:
```bash
supabase db reset && supabase db diff
```
Should show no pending schema changes.

- [ ] **Step 4: Add test OTP mapping to config.toml for local dev**

In `supabase/config.toml`, uncomment and populate the `[auth.sms.test_otp]` section:

```toml
[auth.sms.test_otp]
919000000001 = "123456"
919000000002 = "123456"
919000000003 = "123456"
919000000004 = "123456"
919000000005 = "123456"
919000000006 = "123456"
919000000007 = "123456"
919000000008 = "123456"
919000000009 = "123456"
919000000010 = "123456"
919000000011 = "123456"
```

This means locally, OTP `123456` works for all test phones — no real SMS needed.

- [ ] **Step 5: Commit**

```bash
git add supabase/seed.sql supabase/config.toml
git commit -m "feat(seed): replace email/password users with phone-based dev users; add test OTP mapping"
```

---

## Task 4: Create `send-sms` edge function

**Files:**
- Create: `supabase/functions/send-sms/index.ts`

- [ ] **Step 1: Create the function**

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }

  const { phone, otp } = await req.json() as { phone: string; otp: string };

  if (!phone || !otp) {
    return new Response(JSON.stringify({ error: "phone and otp required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const authKey = Deno.env.get("MSG91_AUTH_KEY")!;
  const flowId = Deno.env.get("MSG91_FLOW_ID")!;
  const senderId = Deno.env.get("MSG91_SENDER_ID")!;

  // MSG91 expects phone without leading +
  const mobile = phone.replace(/^\+/, "");

  const res = await fetch("https://api.msg91.com/api/v5/flow/", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      authkey: authKey,
    },
    body: JSON.stringify({
      flow_id: flowId,
      sender: senderId,
      mobiles: mobile,
      otp,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    return new Response(JSON.stringify({ error: text }), {
      status: 502,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
```

Save to `supabase/functions/send-sms/index.ts`.

- [ ] **Step 2: Set secrets for local dev (using dummy values — real SMS won't fire locally due to test_otp mapping)**

```bash
supabase secrets set MSG91_AUTH_KEY=local_dummy
supabase secrets set MSG91_FLOW_ID=local_dummy
supabase secrets set MSG91_SENDER_ID=SCHOOL1
```

For production, set these in the Supabase dashboard under Project → Edge Functions → Secrets.

- [ ] **Step 3: Verify function deploys locally**

```bash
supabase functions serve send-sms --no-verify-jwt
```

Expected output: `Serving send-sms at http://localhost:54321/functions/v1/send-sms`

Test it manually:
```bash
curl -X POST http://localhost:54321/functions/v1/send-sms \
  -H "Content-Type: application/json" \
  -d '{"phone":"+919000000001","otp":"123456"}'
```

Expected response (with dummy keys, MSG91 call will fail with 502 — that's fine locally because test_otp bypasses this function):
```json
{"error":"..."}
```
or with real keys:
```json
{"ok":true}
```

Stop the serve process (`Ctrl+C`).

- [ ] **Step 4: Commit**

```bash
git add supabase/functions/send-sms/index.ts
git commit -m "feat(edge): add send-sms function as MSG91 adapter for Supabase phone OTP"
```

---

## Task 5: Update shared schemas

**Files:**
- Modify: `packages/shared/src/schemas/index.ts`

- [ ] **Step 1: Replace `loginSchema` with `phoneSchema` and `otpSchema`**

Current content of `packages/shared/src/schemas/index.ts`:
```typescript
import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export type LoginInput = z.infer<typeof loginSchema>;
```

Replace with:
```typescript
import { z } from "zod";

export const phoneSchema = z.object({
  phone: z
    .string()
    .regex(/^\d{10}$/, "Enter a valid 10-digit mobile number"),
});

export const otpSchema = z.object({
  otp: z
    .string()
    .regex(/^\d{6}$/, "Enter the 6-digit OTP"),
});

export type PhoneInput = z.infer<typeof phoneSchema>;
export type OtpInput = z.infer<typeof otpSchema>;
```

- [ ] **Step 2: Commit**

```bash
git add packages/shared/src/schemas/index.ts
git commit -m "feat(shared): replace loginSchema with phoneSchema + otpSchema"
```

---

## Task 6: Web login — two-step phone + OTP UI

**Files:**
- Modify: `apps/web/app/(auth)/login/login-form.tsx`

- [ ] **Step 1: Rewrite `login-form.tsx`**

Replace the entire file content with:

```typescript
"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "../../../lib/supabase";
import { phoneSchema, otpSchema } from "@erp/shared";
import { GraduationCap } from "lucide-react";

export function LoginForm({
  schoolName,
  primaryColor,
}: {
  schoolName: string;
  primaryColor: string;
}) {
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    const params = new URLSearchParams(window.location.search);
    const reason = params.get("reason");
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session && reason === "no_access") {
        supabase.auth.signOut();
      } else if (session && !reason) {
        window.location.href = "/";
      }
    });
  }, []);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const result = phoneSchema.safeParse({ phone });
    if (!result.success) {
      setError(result.error.errors[0].message);
      return;
    }
    setLoading(true);
    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithOtp({
      phone: `+91${phone}`,
    });
    setLoading(false);
    if (authError) {
      setError(authError.message);
      return;
    }
    setStep("otp");
    setResendCooldown(30);
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const result = otpSchema.safeParse({ otp });
    if (!result.success) {
      setError(result.error.errors[0].message);
      return;
    }
    setLoading(true);
    const supabase = createClient();
    const { error: authError } = await supabase.auth.verifyOtp({
      phone: `+91${phone}`,
      token: otp,
      type: "sms",
    });
    setLoading(false);
    if (authError) {
      setError("Invalid or expired OTP. Please try again.");
      return;
    }
    window.location.href = "/";
  }

  async function handleResend() {
    if (resendCooldown > 0) return;
    setError(null);
    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithOtp({
      phone: `+91${phone}`,
    });
    if (authError) {
      setError(authError.message);
      return;
    }
    setResendCooldown(30);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-indigo-100">
      <div className="w-full max-w-md rounded-xl border border-border bg-white p-8 shadow-sm">
        <div className="mb-6 flex flex-col items-center gap-3">
          <div
            className="flex h-12 w-12 items-center justify-center rounded-xl"
            style={{ backgroundColor: primaryColor }}
          >
            <GraduationCap className="h-6 w-6 text-white" />
          </div>
          <div className="text-center">
            <h1 className="text-xl font-semibold text-foreground">{schoolName}</h1>
            <p className="mt-1 text-sm text-muted-foreground">Sign in to continue</p>
          </div>
        </div>

        {error && (
          <p className="mb-4 rounded-lg bg-red-50 px-4 py-2.5 text-sm text-red-600">
            {error}
          </p>
        )}

        {step === "phone" ? (
          <form onSubmit={handleSendOtp}>
            <div className="mb-6">
              <label className="mb-1.5 block text-sm font-medium text-foreground">
                Mobile Number
              </label>
              <div className="flex overflow-hidden rounded-lg border border-border focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20">
                <span className="flex items-center bg-muted px-3 text-sm text-muted-foreground">
                  +91
                </span>
                <input
                  type="tel"
                  inputMode="numeric"
                  pattern="\d{10}"
                  maxLength={10}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                  placeholder="9876543210"
                  required
                  className="flex-1 bg-card px-3 py-2 text-sm outline-none"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg py-2.5 text-sm font-semibold text-white transition-opacity disabled:opacity-50"
              style={{ backgroundColor: primaryColor }}
            >
              {loading ? "Sending OTP…" : "Send OTP"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp}>
            <p className="mb-4 text-sm text-muted-foreground">
              OTP sent to <span className="font-medium text-foreground">+91 {phone}</span>.{" "}
              <button
                type="button"
                onClick={() => { setStep("phone"); setOtp(""); setError(null); }}
                className="text-indigo-600 underline"
              >
                Change
              </button>
            </p>
            <div className="mb-6">
              <label className="mb-1.5 block text-sm font-medium text-foreground">
                Enter OTP
              </label>
              <input
                type="text"
                inputMode="numeric"
                pattern="\d{6}"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                placeholder="123456"
                required
                className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm tracking-widest transition-colors focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg py-2.5 text-sm font-semibold text-white transition-opacity disabled:opacity-50"
              style={{ backgroundColor: primaryColor }}
            >
              {loading ? "Verifying…" : "Verify OTP"}
            </button>
            <button
              type="button"
              onClick={handleResend}
              disabled={resendCooldown > 0}
              className="mt-3 w-full text-sm text-indigo-600 disabled:text-muted-foreground"
            >
              {resendCooldown > 0 ? `Resend OTP in ${resendCooldown}s` : "Resend OTP"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
```

- [ ] **Step 2: Verify the web app compiles**

```bash
cd apps/web && npx tsc --noEmit
```

Expected: no type errors.

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/(auth)/login/login-form.tsx
git commit -m "feat(web/auth): replace email+password login with phone+OTP two-step flow"
```

---

## Task 7: Mobile login — two-step phone + OTP UI

**Files:**
- Modify: `apps/mobile/app/(auth)/login.tsx`

- [ ] **Step 1: Rewrite `login.tsx`**

Replace the entire file content with:

```typescript
import { useState, useEffect, useRef } from "react";
import { View, Text, TextInput, KeyboardAvoidingView, Platform, ScrollView, Alert, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../../lib/supabase";
import { useTheme } from "../../lib/theme";
import { PrimaryButton } from "../../components/PrimaryButton";

export default function LoginScreen() {
  const theme = useTheme();
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  async function handleSendOtp() {
    const digits = phone.replace(/\D/g, "");
    if (digits.length !== 10) {
      Alert.alert("Invalid number", "Enter a valid 10-digit mobile number.");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({ phone: `+91${digits}` });
    setLoading(false);
    if (error) {
      Alert.alert("Error", error.message);
      return;
    }
    setStep("otp");
    setResendCooldown(30);
  }

  async function handleVerifyOtp() {
    if (otp.length !== 6) {
      Alert.alert("Invalid OTP", "Enter the 6-digit OTP.");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.verifyOtp({
      phone: `+91${phone.replace(/\D/g, "")}`,
      token: otp,
      type: "sms",
    });
    setLoading(false);
    if (error) {
      Alert.alert("Login failed", "Invalid or expired OTP. Please try again.");
    }
    // On success, _layout.tsx session listener triggers role-based navigation automatically
  }

  async function handleResend() {
    if (resendCooldown > 0) return;
    const { error } = await supabase.auth.signInWithOtp({ phone: `+91${phone.replace(/\D/g, "")}` });
    if (error) Alert.alert("Error", error.message);
    else setResendCooldown(30);
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 24, justifyContent: "center" }} keyboardShouldPersistTaps="handled">
          <View style={{ alignItems: "center", marginBottom: 40 }}>
            <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: theme.primaryLight, alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
              <Ionicons name="school" size={36} color={theme.primary} />
            </View>
            <Text style={{ fontSize: 28, fontFamily: "Inter_700Bold", color: theme.textPrimary }}>Welcome back</Text>
            <Text style={{ fontSize: 14, fontFamily: "Inter_400Regular", color: theme.textSecondary, marginTop: 4 }}>Sign in to continue</Text>
          </View>

          {step === "phone" ? (
            <>
              <View style={{ marginBottom: 24 }}>
                <Text style={{ fontSize: 13, fontFamily: "Inter_500Medium", color: theme.textSecondary, marginBottom: 6 }}>Mobile Number</Text>
                <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: theme.surface, borderRadius: 10, borderWidth: 1, borderColor: theme.border, overflow: "hidden" }}>
                  <View style={{ paddingHorizontal: 14, height: 48, alignItems: "center", justifyContent: "center", backgroundColor: theme.backgroundSecondary ?? theme.surface, borderRightWidth: 1, borderRightColor: theme.border }}>
                    <Text style={{ fontSize: 14, fontFamily: "Inter_500Medium", color: theme.textSecondary }}>+91</Text>
                  </View>
                  <TextInput
                    style={{ flex: 1, height: 48, fontSize: 14, fontFamily: "Inter_400Regular", color: theme.textPrimary, paddingHorizontal: 14 }}
                    placeholder="9876543210"
                    placeholderTextColor={theme.textMuted}
                    value={phone}
                    onChangeText={(t) => setPhone(t.replace(/\D/g, ""))}
                    keyboardType="phone-pad"
                    maxLength={10}
                  />
                </View>
              </View>
              <PrimaryButton label="Send OTP" onPress={handleSendOtp} loading={loading} />
            </>
          ) : (
            <>
              <View style={{ marginBottom: 8 }}>
                <Text style={{ fontSize: 13, fontFamily: "Inter_400Regular", color: theme.textSecondary }}>
                  OTP sent to{" "}
                  <Text style={{ fontFamily: "Inter_500Medium", color: theme.textPrimary }}>+91 {phone}</Text>
                </Text>
                <TouchableOpacity onPress={() => { setStep("phone"); setOtp(""); }}>
                  <Text style={{ fontSize: 13, fontFamily: "Inter_500Medium", color: theme.primary, marginTop: 2 }}>Change number</Text>
                </TouchableOpacity>
              </View>
              <View style={{ marginBottom: 24, marginTop: 12 }}>
                <Text style={{ fontSize: 13, fontFamily: "Inter_500Medium", color: theme.textSecondary, marginBottom: 6 }}>Enter OTP</Text>
                <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: theme.surface, borderRadius: 10, borderWidth: 1, borderColor: theme.border, paddingHorizontal: 14, gap: 10 }}>
                  <Ionicons name="keypad-outline" size={18} color={theme.textMuted} />
                  <TextInput
                    style={{ flex: 1, height: 48, fontSize: 20, fontFamily: "Inter_700Bold", color: theme.textPrimary, letterSpacing: 8 }}
                    placeholder="------"
                    placeholderTextColor={theme.textMuted}
                    value={otp}
                    onChangeText={(t) => setOtp(t.replace(/\D/g, ""))}
                    keyboardType="number-pad"
                    maxLength={6}
                  />
                </View>
              </View>
              <PrimaryButton label="Verify OTP" onPress={handleVerifyOtp} loading={loading} />
              <TouchableOpacity onPress={handleResend} disabled={resendCooldown > 0} style={{ marginTop: 16, alignItems: "center" }}>
                <Text style={{ fontSize: 13, fontFamily: "Inter_500Medium", color: resendCooldown > 0 ? theme.textMuted : theme.primary }}>
                  {resendCooldown > 0 ? `Resend OTP in ${resendCooldown}s` : "Resend OTP"}
                </Text>
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd apps/mobile && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/app/(auth)/login.tsx
git commit -m "feat(mobile/auth): replace email+password login with phone+OTP two-step flow"
```

---

## Task 8: Update user provisioning API routes

**Files:**
- Modify: `apps/web/app/api/invite-user/route.ts`
- Modify: `apps/web/app/api/schools/[id]/users/route.ts`

### 8a — `/api/invite-user` (used by school admin to add teachers/parents)

- [ ] **Step 1: Replace email-invite logic with phone-based `createUser`**

Replace the entire content of `apps/web/app/api/invite-user/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: roleRow } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .single();

  if (!roleRow || !["super_admin", "school_admin"].includes(roleRow.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { phone, fullName, schoolId, role, extraInserts } = await request.json() as {
    phone: string;
    fullName: string;
    schoolId: string;
    role: string;
    extraInserts?: { table: string; data: Record<string, unknown> }[];
  };

  if (!/^\+91\d{10}$/.test(phone)) {
    return NextResponse.json({ error: "Invalid phone number. Must be +91 followed by 10 digits." }, { status: 400 });
  }

  const adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: userData, error: createError } = await adminClient.auth.admin.createUser({
    phone,
    phone_confirm: true,
    user_metadata: { full_name: fullName },
  });

  if (createError || !userData.user) {
    return NextResponse.json(
      { error: createError?.message ?? "Failed to create user" },
      { status: 400 }
    );
  }

  const userId = userData.user.id;

  await adminClient.from("user_roles").insert({ user_id: userId, school_id: schoolId, role });
  await adminClient.from("profiles").update({ school_id: schoolId, full_name: fullName, phone }).eq("id", userId);

  if (extraInserts) {
    for (const { table, data } of extraInserts) {
      await adminClient.from(table).insert({ ...data, profile_id: userId });
    }
  }

  return NextResponse.json({ userId });
}
```

### 8b — `/api/schools/[id]/users` (used by platform admin)

- [ ] **Step 2: Replace email-invite logic with phone-based `createUser`**

Replace the entire content of `apps/web/app/api/schools/[id]/users/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: roleRow } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .single();

  if (!roleRow || roleRow.role !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id: schoolId } = await params;
  const { phone, fullName, role } = (await request.json()) as {
    phone: string;
    fullName: string;
    role: string;
  };

  if (!/^\+91\d{10}$/.test(phone)) {
    return NextResponse.json({ error: "Invalid phone number. Must be +91 followed by 10 digits." }, { status: 400 });
  }

  const adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: userData, error: createError } = await adminClient.auth.admin.createUser({
    phone,
    phone_confirm: true,
    user_metadata: { full_name: fullName },
  });

  if (createError || !userData.user) {
    return NextResponse.json(
      { error: createError?.message ?? "Failed to create user" },
      { status: 400 }
    );
  }

  const userId = userData.user.id;

  await adminClient.from("user_roles").insert({ user_id: userId, school_id: schoolId, role });
  await adminClient.from("profiles").update({ school_id: schoolId, full_name: fullName, phone }).eq("id", userId);

  if (role === "teacher") {
    await adminClient.from("teacher_profiles").insert({ profile_id: userId, school_id: schoolId });
  }

  return NextResponse.json({ userId });
}
```

- [ ] **Step 3: Compile check**

```bash
cd apps/web && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/api/invite-user/route.ts apps/web/app/api/schools/[id]/users/route.ts
git commit -m "feat(api): replace email invite with phone-based createUser in provisioning routes"
```

---

## Task 9: Update admin UI forms — phone field

**Files:**
- Modify: `apps/web/app/(school)/admin/teachers/invite-teacher-form.tsx`
- Modify: `apps/web/app/platform-admin/schools/[id]/invite-user-dialog.tsx`

### 9a — Invite Teacher form

- [ ] **Step 1: Replace email field with phone field**

Replace the entire content of `apps/web/app/(school)/admin/teachers/invite-teacher-form.tsx`:

```typescript
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface InviteTeacherFormProps {
  schoolId: string;
  onSuccess?: () => void;
}

export function InviteTeacherForm({ schoolId, onSuccess }: InviteTeacherFormProps) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!/^\d{10}$/.test(phone)) {
      setError("Enter a valid 10-digit mobile number.");
      return;
    }

    setLoading(true);

    const res = await fetch("/api/invite-user", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        phone: `+91${phone}`,
        fullName: name,
        schoolId,
        role: "teacher",
        extraInserts: [{ table: "teacher_profiles", data: { school_id: schoolId } }],
      }),
    });

    if (!res.ok) {
      const { error: msg } = await res.json();
      setError(msg ?? "Failed to add teacher");
      toast.error(msg ?? "Something went wrong. Please try again.");
      setLoading(false);
      return;
    }

    setName("");
    setPhone("");
    setLoading(false);
    toast.success("Teacher added successfully.");
    router.refresh();
    onSuccess?.();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
      {error && <p className="w-full text-sm text-red-600">{error}</p>}
      <div>
        <Label>Full Name</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} required />
      </div>
      <div>
        <Label>Mobile Number</Label>
        <div className="flex overflow-hidden rounded-lg border border-input focus-within:ring-2 focus-within:ring-ring/50">
          <span className="flex items-center bg-muted px-3 text-sm text-muted-foreground">+91</span>
          <Input
            type="tel"
            inputMode="numeric"
            pattern="\d{10}"
            maxLength={10}
            placeholder="9876543210"
            value={phone}
            onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
            required
            className="rounded-none border-0 focus-visible:ring-0"
          />
        </div>
      </div>
      <Button type="submit" disabled={loading}>{loading ? "Adding…" : "Add Teacher"}</Button>
    </form>
  );
}
```

### 9b — Platform admin invite user dialog

- [ ] **Step 2: Replace email field with phone field in `invite-user-dialog.tsx`**

Replace the entire content of `apps/web/app/platform-admin/schools/[id]/invite-user-dialog.tsx`:

```typescript
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

const ROLES = [
  { value: "school_admin", label: "School Admin" },
  { value: "principal", label: "Principal" },
  { value: "teacher", label: "Teacher" },
  { value: "parent", label: "Parent" },
] as const;

type Role = (typeof ROLES)[number]["value"];

export interface InviteUserDialogProps {
  schoolId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function InviteUserDialog({ schoolId, open, onOpenChange }: InviteUserDialogProps) {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<Role>("teacher");
  const [loading, setLoading] = useState(false);

  function clearForm() {
    setFullName("");
    setPhone("");
    setRole("teacher");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!/^\d{10}$/.test(phone)) {
      toast.error("Enter a valid 10-digit mobile number.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/schools/${schoolId}/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: `+91${phone}`, fullName, role }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error((data as { error?: string })?.error ?? "Failed to add user.");
        return;
      }

      toast.success("User added successfully.");
      clearForm();
      onOpenChange(false);
      router.refresh();
    } catch {
      toast.error("An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add User</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 pt-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="invite-full-name">Full Name</Label>
            <Input
              id="invite-full-name"
              type="text"
              placeholder="Jane Doe"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="invite-phone">Mobile Number</Label>
            <div className="flex overflow-hidden rounded-lg border border-input focus-within:ring-2 focus-within:ring-ring/50">
              <span className="flex items-center bg-muted px-3 text-sm text-muted-foreground">+91</span>
              <Input
                id="invite-phone"
                type="tel"
                inputMode="numeric"
                pattern="\d{10}"
                maxLength={10}
                placeholder="9876543210"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                required
                className="rounded-none border-0 focus-visible:ring-0"
              />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="invite-role">Role</Label>
            <select
              id="invite-role"
              value={role}
              onChange={(e) => setRole(e.target.value as Role)}
              className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              required
            >
              {ROLES.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>
          <DialogFooter>
            <Button type="submit" size="sm" disabled={loading}>
              {loading ? "Adding…" : "Add User"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 3: Compile check**

```bash
cd apps/web && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/(school)/admin/teachers/invite-teacher-form.tsx \
        apps/web/app/platform-admin/schools/[id]/invite-user-dialog.tsx
git commit -m "feat(admin): replace email invite fields with phone number fields in user creation forms"
```

---

## Task 10: Remove invite page and auth route (no longer needed)

**Files:**
- Check: `apps/web/app/(auth)/invite/page.tsx` — this handled email magic-link invite acceptance

- [ ] **Step 1: Check if invite page is still needed**

Read `apps/web/app/(auth)/invite/page.tsx`. If it only handles email magic-link invite redemption (`type=invite` in URL hash), it can be deleted since we no longer send email invites.

```bash
cat apps/web/app/\(auth\)/invite/page.tsx
```

If it only handles email invites (likely), delete it:

```bash
rm apps/web/app/\(auth\)/invite/page.tsx
```

Also remove `/invite` from the public paths in middleware if it's listed there — check `apps/web/middleware.ts` line 4 for `"/invite"` and remove it from the array.

- [ ] **Step 2: Compile check**

```bash
cd apps/web && npx tsc --noEmit
```

Expected: no errors from the deletion.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "chore(auth): remove email invite page (replaced by phone-based user creation)"
```

---

## Task 11: Production setup checklist

These are manual steps required before deploying to production — not code changes.

- [ ] **Step 1: MSG91 DLT registration**

  In MSG91 dashboard:
  1. Register DLT entity (required for Indian telecom compliance)
  2. Register SMS template: `Your OTP for SchoolERP login is ##OTP##. Valid for 10 minutes. -SCHOOL1`
  3. Create a Flow with the approved template, binding `##OTP##` to the `otp` variable
  4. Note the Flow ID and Sender ID (6 chars, e.g., SCHOOL1)

- [ ] **Step 2: Set Supabase production secrets**

  In Supabase dashboard → Project Settings → Edge Functions → Secrets:
  ```
  MSG91_AUTH_KEY=<from MSG91 dashboard>
  MSG91_FLOW_ID=<flow id from step 1>
  MSG91_SENDER_ID=<6-char sender id>
  ```

- [ ] **Step 3: Update `config.toml` HTTP URL for production**

  In `supabase/config.toml`, the `[auth.sms.http]` url is set to `host.docker.internal` for local dev. For production, Supabase cloud uses the dashboard to configure the SMS provider URL — you set it in:

  Supabase Dashboard → Authentication → Providers → Phone → Custom HTTP Provider URL:
  ```
  https://<your-project-ref>.supabase.co/functions/v1/send-sms
  ```

- [ ] **Step 4: Deploy edge function**

  ```bash
  supabase functions deploy send-sms --project-ref <your-project-ref>
  ```

- [ ] **Step 5: Apply migration to production**

  ```bash
  supabase db push --project-ref <your-project-ref>
  ```
