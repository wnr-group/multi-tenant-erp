# Phone + OTP Authentication via MSG91

**Date:** 2026-06-01
**Status:** Approved
**Scope:** Replace email/password login with phone + OTP for all user types (parent, teacher, principal, school_admin, super_admin) on both web and mobile.

---

## 1. Architecture

```
User enters phone
  → supabase.auth.signInWithOtp({ phone })
  → Supabase generates 6-digit OTP (1hr expiry, built-in rate limiting)
  → Supabase calls POST /functions/v1/send-sms with { phone, otp }
  → Edge function calls MSG91 Flow API with OTP as template variable
  → MSG91 sends SMS to user

User enters OTP
  → supabase.auth.verifyOtp({ phone, token, type: 'sms' })
  → Supabase validates → returns JWT session
  → App routes by role (middleware + mobile layout unchanged)
```

**Guiding principle:** Supabase owns OTP generation, expiry, rate limiting, and session creation. MSG91 is purely the SMS transport. The `send-sms` edge function is a thin adapter (~30 lines).

**No self-registration.** `enable_phone_signup = false` in config. Only admin-provisioned accounts can receive an OTP. Unknown phone numbers are silently rejected by Supabase.

---

## 2. Data Model

### `profiles.phone`
- Already exists as `TEXT` nullable.
- New migration: add `NOT NULL` constraint + `UNIQUE` constraint.
- Format: E.164 — `+91XXXXXXXXXX`. The UI prepends `+91`; the DB stores the full international format.

### `auth.users.phone` (Supabase internal)
- Supabase sets this when a user is created via `admin.createUser({ phone, phone_confirm: true })`.
- This is the field Supabase matches against during `verifyOtp`.

### `handle_new_user` trigger
- Already fires on `auth.users` insert.
- No change needed — `profiles` row is created by the trigger; `phone` is passed via `phone_confirm: true` flow and is already set on `auth.users`.
- Admin provisioning server action writes `profiles.phone` explicitly after user creation to keep both in sync.

### No new tables required.
Roles (`user_roles`), school linkage, and profile structure are all unchanged.

---

## 3. User Provisioning

Admin creates all users — no self-registration.

```
Admin fills: full_name + phone number (+ role assignment)
  → Server action: supabase.auth.admin.createUser({
      phone: "+91XXXXXXXXXX",
      phone_confirm: true,       // admin vouches — skips OTP for creation
      user_metadata: { full_name, school_id }
    })
  → handle_new_user trigger fires → profiles row created
  → Server action: INSERT INTO user_roles (user_id, school_id, role)
  → Server action: UPDATE profiles SET phone = '+91XXXXXXXXXX' WHERE id = user_id
```

`phone_confirm: true` marks the number as verified at creation time. The user's first interaction is simply: enter phone → receive OTP → enter OTP → logged in.

**Affected admin forms:**
- Add teacher (`/admin/teachers`)
- Add parent (via student form — `parent_phone` field already exists; this becomes the auth phone)
- Create user flows under `/platform-admin`
- In all forms: replace or supplement email field with required phone field (E.164, 10-digit input with `+91` prepended automatically)

---

## 4. Edge Function: `send-sms`

**Location:** `supabase/functions/send-sms/index.ts`

**Trigger:** Supabase calls this automatically on every `signInWithOtp({ phone })` call.

**Request (from Supabase):**
```json
{ "phone": "+919876543210", "otp": "123456" }
```

**Logic:**
1. Validate `phone` and `otp` present in body.
2. POST to MSG91 Flow API:
   ```
   POST https://api.msg91.com/api/v5/flow/
   Headers: authkey: MSG91_AUTH_KEY
   Body: { flow_id: MSG91_FLOW_ID, sender: MSG91_SENDER_ID, mobiles: "919876543210", otp: "123456" }
   ```
   Note: MSG91 expects phone without leading `+`.
3. Return `200 OK` on success. Any non-2xx causes Supabase to surface an error to the client.

**Supabase secrets required:**
- `MSG91_AUTH_KEY` — from MSG91 dashboard
- `MSG91_FLOW_ID` — ID of the OTP flow in MSG91
- `MSG91_SENDER_ID` — 6-character DLT-registered sender ID

**MSG91 one-time setup:**
1. Register DLT-approved SMS template (mandatory for Indian numbers): e.g., `Your OTP for SchoolERP login is {{otp}}. Valid for 10 minutes.`
2. Create a Flow in MSG91 using that template with `{{otp}}` as variable.
3. Note the Flow ID and Sender ID.

---

## 5. Supabase Config Changes (`supabase/config.toml`)

```toml
[auth.sms]
enable_signup = false
enable_confirmations = true
provider = "http"

[auth.sms.http]
url = "https://<project-ref>.supabase.co/functions/v1/send-sms"
```

- `enable_signup = false` — prevents unknown phones from creating accounts
- `enable_confirmations = true` — OTP verification required on every login
- `provider = "http"` — Supabase calls our edge function instead of Twilio/Vonage
- Remove or disable existing `[auth.email]` signup settings (email login no longer used)

---

## 6. UI Changes

### Web login (`apps/web/app/(auth)/login/login-form.tsx`)

Replace email + password with a two-step flow:

**Step 1 — Phone entry**
```
[ +91  [__________]  ]   [Send OTP]
```
- Input: 10-digit number; `+91` prefix shown as static label
- Validation: exactly 10 digits, numeric only
- On submit: `supabase.auth.signInWithOtp({ phone: '+91' + input })`
- Transitions to Step 2 on success

**Step 2 — OTP entry**
```
[ _ _ _ _ _ _ ]   [Verify]
Resend OTP (enabled after 30s cooldown)
```
- Input: 6-digit numeric code
- On submit: `supabase.auth.verifyOtp({ phone, token, type: 'sms' })`
- On success: `router.push('/')` — existing role-based routing takes over
- Error states: "Phone not registered", "Invalid or expired OTP"

School branding (name, primary_color) fetched same as today — no change.

### Mobile login (`apps/mobile/app/(auth)/login.tsx`)

Same two-step flow using:
- `keyboardType="phone-pad"` for phone input
- `keyboardType="number-pad"` for OTP input
- `Alert.alert()` for errors (same as current pattern)
- Same Supabase calls as web

### Admin user creation forms (web)

Replace email field with phone field in:
- Add teacher form
- Student add/edit form (parent phone → becomes auth phone; `parent_phone` column already in schema)
- Platform admin user creation

Phone field: required, 10-digit input, `+91` prepended on save.

---

## 7. What Does NOT Change

- Middleware role-routing logic — unchanged
- Mobile layout role-routing (`_layout.tsx`) — unchanged
- `user_roles` table and RLS policies — unchanged
- All other Supabase auth (JWT, session refresh, Bearer token for API routes) — unchanged
- `profiles`, `teacher_profiles`, `student_profiles` structure — unchanged (except `profiles.phone` constraint)

---

## 8. Out of Scope

- Multi-number or number-change flow (admin deletes + recreates user)
- WhatsApp OTP fallback
- OTP retry analytics
- Non-Indian phone numbers (assumed `+91` throughout)
