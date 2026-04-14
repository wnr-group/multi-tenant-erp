# Multi-School ERP Platform — System Design Specification

**Project:** Balaji Multi-School ERP
**Client:** Balaji
**Service Provider:** WnR Advisory
**Date:** 2026-04-10 (revised 2026-04-13)
**MSA Reference:** MSA - Balaji ERP (signed 01/04/2026)
**Timeline:** 40 calendar days (Apr 15 – May 24, 2026)

---

## 1. Overview

A SaaS multi-tenant school ERP platform owned and operated by WnR Advisory. The platform is resold to multiple schools. Each school gets:

- Their own web URL (subdomain like `greenvalley.balajierp.com` or a fully custom domain like `app.greenvalleyschool.com`)
- Their own white-labeled mobile app on the Play Store / App Store — separate listing, separate APK, school's own name and branding
- A completely isolated data experience — no awareness of other tenants

WnR acts as the platform-level super admin, operating from a separate admin URL (`admin.balajierp.com`).

### Deliverables (per MSA)
- Fully functional Web Application (per-school URL)
- Mobile Applications — white-labeled APK per school (separate Play Store listing per school)
- Backend APIs & Database setup
- Report card template integration

---

## 2. Architecture

### 2.1 High-Level Stack

| Layer | Technology |
|-------|-----------|
| Monorepo | Turborepo |
| Web | Next.js 14+ (App Router), Tailwind CSS, shadcn/ui |
| Mobile | Expo SDK 52+ (Expo Router), NativeWind |
| Backend-as-a-Service | Supabase (Postgres, Auth, Storage, Realtime, Edge Functions) |
| DB Types | Auto-generated via `supabase gen types` |
| Validation | Zod (shared schemas) |
| PDF Generation | Supabase Edge Function (Deno) — HTML template → PDF |
| Push Notifications | Expo Push Notifications |
| File Storage | Supabase Storage |
| Web Deployment | Vercel — one deployment, custom domain per school via Vercel domain config |
| Mobile Deployment | EAS Build — one build profile per school, separate Play Store listing |

### 2.2 Monorepo Structure

```
multi-tenant-erp/
├── apps/
│   ├── web/                → Next.js 14+ (App Router)
│   └── mobile/             → Expo SDK 52+ (Expo Router)
├── packages/
│   ├── shared/             → TypeScript types, Supabase client, Zod validation, business logic
│   ├── ui/                 → Shared React components (web + mobile platform-specific exports)
│   └── supabase/           → DB types (generated), RLS policies, migrations, seed data, edge functions
├── schools/
│   └── configs/
│       ├── greenvalley.json   → Per-school build config (name, slug, schoolId, primaryColor, etc.)
│       └── suncity.json
├── turbo.json
├── package.json
└── tsconfig.base.json
```

### 2.3 Team Strategy
- One developer (Dinesh) + Claude Code — fully autonomous build
- Shared packages keep web and mobile in sync; types and Supabase queries written once
- Per-school configs in `schools/configs/` drive both EAS builds and Vercel domain routing

---

## 3. Multi-Tenancy Model

### 3.1 SaaS Three-Tier Hierarchy

| Level | Role | Visibility | Access | URL |
|-------|------|-----------|--------|-----|
| Platform | WnR Super Admin | All schools, all data | Web only | `admin.balajierp.com` |
| School | School Admin / Principal | Only their own school | Web only | `school.balajierp.com` or custom domain |
| Users | Teachers | Only their school, their class/section data | **Web + Mobile** | Same school URL / school's own APK |
| Users | Students / Parents | Only their school, their class/section data | Mobile only | School's own APK |

### 3.2 Tenant Isolation Strategy
- Single Supabase project, single Postgres database
- Every data table includes a `school_id` column
- **School is resolved from the incoming domain** on web — not from a user-entered value
- Row Level Security (RLS) enforces isolation at the database level:
  - Platform admins: `WHERE true` (unrestricted)
  - School users: `WHERE school_id = (SELECT school_id FROM user_roles WHERE user_id = auth.uid())`
- Mobile: `SCHOOL_ID` is baked into the app at build time via EAS build config — no school selection at login
- Even raw API calls return zero data from other schools

### 3.3 Domain-to-School Resolution (Web)

Each school record in the database has a `domain` field (e.g. `greenvalley.balajierp.com` or `app.greenvalleyschool.com`).

On every web request:
1. Next.js middleware reads `request.headers.get('host')`
2. Looks up `schools` table by `domain` field
3. Attaches `schoolId` to the request context
4. All subsequent queries in that request are scoped to that `schoolId`

The WnR platform admin app runs on `admin.balajierp.com` — middleware detects this domain and routes to the platform admin portal instead.

### 3.4 Per-School Mobile App (White-Label APK)

Each school gets their own EAS build profile in `eas.json`. A school config file (`schools/configs/<slug>.json`) contains:

```json
{
  "slug": "greenvalley",
  "name": "Green Valley School",
  "schoolId": "aaaaaaaa-0000-0000-0000-000000000001",
  "primaryColor": "#1E6B3C",
  "bundleIdentifier": "com.greenvalleyschool.app",
  "playStorePackage": "com.greenvalleyschool.app",
  "iconPath": "./schools/assets/greenvalley/icon.png",
  "splashPath": "./schools/assets/greenvalley/splash.png"
}
```

EAS build process:
1. WnR runs `eas build --profile greenvalley --platform android`
2. Build script reads `schools/configs/greenvalley.json` and injects values as Expo build-time constants
3. App opens with Green Valley branding and `SCHOOL_ID` pre-configured — no school selection needed at login
4. APK uploaded to Play Store under "Green Valley School" listing

### 3.5 School Onboarding Flow
1. WnR Super Admin creates a school record in the platform admin dashboard (includes domain field)
2. WnR configures DNS: points school's domain/subdomain to Vercel
3. WnR adds domain to Vercel project (via Vercel dashboard)
4. WnR creates `schools/configs/<slug>.json` and adds school assets (icon, splash)
5. System generates an invite for the School Admin
6. School Admin accepts invite, sets password
7. School Admin configures: classes, sections, subjects, academic year
8. School Admin invites teachers (who then invite/add students)
9. WnR runs EAS build for that school's APK and publishes to Play Store

### 3.6 School Deactivation
- `schools.is_active` flag — when set to `false`, RLS blocks all access for that school's users
- Domain still resolves but all authenticated queries return empty
- No in-app billing or subscription management — commercial terms handled offline

---

## 4. Data Architecture

### 4.1 Core Tables

#### Tenancy & Configuration
- **schools** — `id`, `name`, `domain` (**unique**, used for domain-to-school resolution), `logo_url`, `is_active`, `features_enabled` (JSONB), `max_students`, `contact_email`, `contact_phone`, `address`, `primary_color`, `created_at`
- **academic_years** — `id`, `school_id`, `name`, `start_date`, `end_date`, `is_current`
- **classes** — `id`, `school_id`, `name` (e.g., "Class 10"), `order`
- **sections** — `id`, `class_id`, `school_id`, `name` (e.g., "A", "B")
- **subjects** — `id`, `school_id`, `class_id`, `name`, `code`

#### Users & Roles
- **profiles** — `id` (references auth.users), `school_id`, `full_name`, `email`, `phone`, `avatar_url`, `push_token`, `created_at`
- **user_roles** — `id`, `user_id`, `school_id`, `role` (enum: super_admin, school_admin, principal, teacher, student, parent), `is_active`
- **student_profiles** — `id`, `profile_id`, `school_id`, `class_id`, `section_id`, `roll_number`, `admission_number`, `parent_profile_id`
- **teacher_profiles** — `id`, `profile_id`, `school_id`, `subjects` (array), `class_teacher_of` (section_id, nullable)

#### Attendance
- **attendance_records** — `id`, `school_id`, `student_id`, `date`, `status` (enum: present, absent, late, half_day), `marked_by`, `section_id`, `created_at`

#### Academics
- **homework** — `id`, `school_id`, `class_id`, `section_id`, `subject_id`, `teacher_id`, `title`, `description`, `due_date`, `attachment_url`, `created_at`
- **syllabus** — `id`, `school_id`, `class_id`, `subject_id`, `file_url`, `academic_year_id`
- **timetable** — `id`, `school_id`, `section_id`, `day_of_week`, `period`, `subject_id`, `teacher_id`

#### Results & Report Cards
- **exams** — `id`, `school_id`, `academic_year_id`, `name` (e.g., "FA1", "SA1"), `start_date`, `end_date`
- **exam_results** — `id`, `school_id`, `exam_id`, `student_id`, `subject_id`, `marks_obtained`, `max_marks`, `grade`, `teacher_id`
- **report_card_templates** — `id`, `school_id`, `name`, `html_template`, `is_default`

#### Fee Management
- **fee_structures** — `id`, `school_id`, `class_id`, `academic_year_id`, `fee_type` (tuition, transport, lab, etc.), `amount`, `due_date`
- **fee_payments** — `id`, `school_id`, `student_id`, `fee_structure_id`, `amount_paid`, `payment_date`, `payment_method`, `receipt_number`, `status` (paid, partial, overdue)

#### Communication
- **announcements** — `id`, `school_id`, `title`, `content`, `attachment_url`, `target_type` (school, class, section), `target_id`, `created_by`, `created_at`
- **notifications** — `id`, `school_id`, `user_id`, `title`, `body`, `type`, `is_read`, `created_at`
- **feedback** — `id`, `school_id`, `from_user_id`, `to_role`, `subject`, `message`, `response`, `status` (open, responded, closed), `created_at`

#### Discipline
- **discipline_records** — `id`, `school_id`, `student_id`, `category` (behavioral, academic, attendance), `severity` (verbal, written, suspension), `description`, `recorded_by`, `parent_notified`, `created_at`

#### Audit
- **audit_log** — `id`, `school_id` (nullable), `performed_by` (auth.users), `acting_as_role` (app_role), `action` (TEXT), `entity_type` (TEXT), `entity_id` (UUID), `metadata` (JSONB), `created_at`

### 4.2 Auth Flow

**Web:**
1. User visits `greenvalley.balajierp.com/login`
2. Middleware resolves `school_id` from the domain
3. Login page passes `school_id` as context (displayed as school name/logo)
4. User logs in via Supabase Auth (email/password)
5. Middleware checks `user_roles` to verify user belongs to this school's `school_id`
6. Redirects to role-appropriate portal

**Mobile:**
1. App opens — `SCHOOL_ID` already baked in at build time
2. Login screen shows school's name and branding (no school picker)
3. User logs in via Supabase Auth
4. App checks `user_roles` for role → routes to teacher or parent tabs

---

## 5. Web Application

### 5.1 URL Structure

| URL | Portal |
|-----|--------|
| `admin.balajierp.com` | WnR Platform Admin (Super Admin only) |
| `greenvalley.balajierp.com` | Green Valley School — all school roles |
| `app.greenvalleyschool.com` | Same, via custom domain (Vercel alias) |

All school portals run the same Next.js app. The domain determines which school's data is loaded. Role determines which portal (admin/principal/teacher) is shown after login.

### 5.2 Route Structure

```
apps/web/app/
├── (platform-admin)/           → WnR Super Admin dashboard (admin.balajierp.com only)
│   ├── dashboard/              → Platform-wide analytics (total schools, users, activity)
│   ├── schools/                → List, create, activate/deactivate schools
│   ├── schools/[id]/           → School detail, configuration, domain management
│   └── layout.tsx              → Platform admin layout with sidebar
├── (school)/                   → School-scoped portals (all school domains)
│   ├── admin/                  → School Admin portal
│   │   ├── dashboard/          → School overview (students, teachers, fees collected)
│   │   ├── classes/            → Manage classes, sections
│   │   ├── teachers/           → Manage teachers
│   │   ├── students/           → Manage students
│   │   ├── fees/               → Fee structures, payment tracking, mark payments
│   │   ├── announcements/      → Create/manage announcements
│   │   └── settings/           → School settings, branding
│   ├── principal/              → Principal portal
│   │   ├── dashboard/          → Attendance overview, exam performance
│   │   ├── reports/            → Report cards, attendance reports
│   │   ├── discipline/         → Review/manage discipline records
│   │   └── announcements/      → Create announcements
│   ├── teacher/                → Teacher portal (web; mirrors mobile teacher experience)
│   │   ├── dashboard/          → My classes, today's schedule
│   │   ├── attendance/         → Mark attendance (class → section → date → student list)
│   │   ├── homework/           → Create/manage homework
│   │   ├── results/            → Enter exam marks
│   │   ├── discipline/         → Record discipline issues
│   │   └── feedback/           → View/respond to parent feedback
│   └── layout.tsx              → School layout with role-based sidebar
├── (auth)/                     → Login (school-branded), invite acceptance, password reset
└── layout.tsx                  → Root layout, domain context provider
```

### 5.3 Domain Context

A `DomainContext` is established in the root layout by reading the `host` header server-side and resolving the `school_id` from the `schools` table. This context is available to all server and client components throughout the request.

```
Request: greenvalley.balajierp.com/admin/dashboard
  → middleware reads host header
  → looks up schools WHERE domain = 'greenvalley.balajierp.com'
  → attaches schoolId to request headers (x-school-id)
  → all Supabase queries for this request use that schoolId
```

### 5.4 Key Web Features
- **Server Components** where possible for fast initial loads
- **Domain-based school resolution** — school determined from URL, never from user input
- **School-branded login page** — shows school name, logo, and primary color from DB
- **Role-based middleware** — checks auth + role on every request, redirects unauthorized users
- **Data tables** with pagination, search, filtering (shadcn/ui table component)
- **Bulk attendance marking** — select all present, tap exceptions
- **Report card PDF preview** — render HTML template with student data, download as PDF
- **Real-time notifications** — Supabase Realtime subscription for announcements

---

## 6. Mobile Application

### 6.1 Per-School Build System

Each school has a config file at `schools/configs/<slug>.json`:

```json
{
  "slug": "greenvalley",
  "name": "Green Valley School",
  "schoolId": "aaaaaaaa-0000-0000-0000-000000000001",
  "primaryColor": "#1E6B3C",
  "bundleIdentifier": "com.greenvalleyschool.app",
  "playStorePackage": "com.greenvalleyschool.app",
  "iconPath": "../../schools/assets/greenvalley/icon.png",
  "splashPath": "../../schools/assets/greenvalley/splash.png"
}
```

`eas.json` has one build profile per school:

```json
{
  "build": {
    "greenvalley": {
      "android": { "buildType": "apk" },
      "env": {
        "EXPO_PUBLIC_SCHOOL_ID": "aaaaaaaa-0000-0000-0000-000000000001",
        "EXPO_PUBLIC_SCHOOL_NAME": "Green Valley School",
        "EXPO_PUBLIC_PRIMARY_COLOR": "#1E6B3C",
        "EXPO_PUBLIC_BUNDLE_ID": "com.greenvalleyschool.app"
      }
    }
  }
}
```

A build script (`scripts/generate-eas-config.js`) reads all `schools/configs/*.json` files and auto-generates the `eas.json` profiles so WnR only needs to add a new JSON file to onboard a new school's APK.

### 6.2 Route Structure

```
apps/mobile/app/
├── (auth)/                     → Login screen (school name from EXPO_PUBLIC_SCHOOL_NAME)
├── (teacher)/                  → Teacher experience
│   ├── dashboard/              → Today's schedule, pending tasks
│   ├── attendance/             → Mark attendance (class → section → student list with toggles)
│   ├── homework/               → Create/manage homework assignments
│   ├── results/                → Enter marks
│   ├── discipline/             → Record incidents
│   └── profile/                → Teacher profile
├── (parent)/                   → Parent/Student experience
│   ├── dashboard/              → Child overview (attendance %, upcoming exams, fees due)
│   ├── attendance/             → View attendance history
│   ├── results/                → View report cards, download PDF
│   ├── fees/                   → Fee status, payment history
│   ├── homework/               → View assignments
│   ├── announcements/          → School happenings feed
│   ├── feedback/               → Send feedback to school
│   ├── discipline/             → View warnings/records
│   └── profile/                → Student/parent profile
└── _layout.tsx                 → Root layout — reads EXPO_PUBLIC_SCHOOL_ID, role-based tab routing
```

### 6.3 Key Mobile Features
- **Per-school APK** — separate EAS build + separate Play Store listing per school
- **White-labeled** — app name, icon, splash screen, primary color all from school config
- **School pre-configured** — `EXPO_PUBLIC_SCHOOL_ID` baked in at build time; no school selector at login
- **Single codebase, multiple builds** — `schools/configs/*.json` + `eas.json` profiles drive everything
- **Expo Push Notifications** — attendance alerts, homework reminders, fee due dates, announcements
- **Offline-first attendance** — teachers can mark attendance offline; syncs when connectivity returns
- **Report card download** — view + save PDF to device
- **Supabase Realtime** — live announcement feed without polling

---

## 7. Module Specifications

### 7.1 Attendance Management
- Teacher selects class → section → date
- Student list shown with toggle: Present / Absent / Late / Half-day
- "Mark all present" button, then tap exceptions
- Daily summary visible to Principal & School Admin
- Parent receives push notification if child is absent
- Historical attendance reports with percentage calculations

### 7.2 Result & Report Card Management
- Admin defines exam structure per academic year (FA1, FA2, SA1, SA2, etc.)
- Teacher enters marks per subject per exam
- Auto-generated report cards: HTML/CSS template stored in DB, rendered with student data via Supabase Edge Function, converted to PDF
- Principal can review/approve before publishing to parents
- Parent views and downloads report card from mobile app

### 7.3 Fee Management
- Admin defines fee structures per class (tuition, transport, lab, etc.)
- System generates fee records per student per term
- Payment recording is manual — admin marks as paid after receiving offline payment (bank transfer, cash, Razorpay link)
- No in-app payment gateway integration
- Track status: paid, partial, overdue
- Overdue fee reminders via push notification

### 7.4 School Happenings & Notifications
- Admin/Principal creates announcements with text + optional image/attachment
- Target audience: whole school, specific class, or specific section
- Push notification sent to targeted users
- In-app feed with Supabase Realtime for live updates

### 7.5 Academic Content (Homework, Syllabus)
- Teacher creates homework: title, description, due date, optional file attachment (Supabase Storage)
- Syllabus uploaded as PDF per subject per class
- Parent/student views in mobile app with due date tracking

### 7.6 Parent Interaction & Feedback
- Parent submits feedback/query to school (categorized)
- School admin or teacher can respond
- Simple threaded messaging — not a full chat system
- Status tracking: open, responded, closed

### 7.7 Discipline & Warning Management
- Teacher/Principal creates discipline record against a student
- Categories: behavioral, academic, attendance-based
- Severity levels: verbal → written → suspension
- Parent notified via push notification
- Escalation tracking with history

---

## 8. Platform Admin (WnR Super Admin)

### 8.1 URL
`admin.balajierp.com` — completely separate from all school URLs. Only accessible to `super_admin` role.

### 8.2 Capabilities
- **School management** — create, view, edit, activate/deactivate schools
- **Domain management** — set/update each school's web domain
- **School onboarding** — create school record + invite School Admin
- **User overview** — view all users across schools
- **Feature toggles** — enable/disable features per school via `features_enabled` JSONB
- **Usage monitoring** — student count, active users per school
- **APK build trigger** — view school config status (manual EAS build run separately)
- **No billing/subscription UI** — commercial terms managed offline

### 8.3 Isolation Guarantee
- Platform admin area only loads when `host === admin.balajierp.com`
- Middleware blocks access to platform admin routes from any school domain
- School-level users have zero access or visibility into this area

---

## 9. Recurring Infrastructure (Not in MSA cost)

Estimated baseline: ₹6,000+/month

| Service | Purpose |
|---------|---------|
| Supabase (Pro plan) | Database, Auth, Storage, Realtime, Edge Functions |
| Vercel (Pro plan) | Web hosting — one deployment, multiple custom domains |
| Expo EAS | Mobile builds — one build per school per release |
| Domain + SSL | `balajierp.com` + per-school custom domains (SSL via Vercel) |
| Push notification service | Expo Push (free tier likely sufficient initially) |
| Play Store / App Store | Developer accounts — one listing per school |

Actual costs based on third-party invoices. Costs scale with number of schools.

---

## 10. Phase Mapping (MSA Alignment)

| Phase | Timeline | Deliverables | What Gets Built |
|-------|----------|-------------|----------------|
| Phase 1 | Day 1–10 (Apr 15–24) | UI/UX, Architecture, Wireframes | Monorepo setup, Supabase project, DB schema + RLS, auth flow with domain resolution, wireframes, shared packages, per-school config system |
| Phase 2 | Day 11–20 (Apr 25–May 4) | Backend, Database, Authentication | All Supabase migrations, RLS policies, Edge Functions, domain-aware auth with role-based routing, seed data, platform admin CRUD |
| Phase 3 | Day 21–30 (May 5–14) | Core Modules Development | Attendance, Results, Fees, Announcements, Homework, Feedback, Discipline — web portals complete |
| Phase 4 | Day 31–40 (May 15–24) | Mobile Apps, Testing, Deployment | Per-school white-label Expo builds (teacher + parent), push notifications, report card PDF, EAS build system, Vercel multi-domain deploy, testing |

---

## 11. Non-Functional Requirements

- **Performance:** Pages load in < 2s on 3G connections
- **Security:** RLS on every table, no direct DB access, HTTPS everywhere, input validation via Zod
- **Scalability:** Multi-tenant design supports adding schools without architecture changes; new school = new JSON config file + Vercel domain alias + EAS build profile
- **Accessibility:** WCAG 2.1 AA compliance for web portals
- **Offline support:** Attendance marking works offline on mobile, syncs when online
- **White-labeling:** Each school's web and mobile experience uses their own branding with zero WnR/Balaji ERP branding visible to end users

---

## 12. Adding a New School (Operational Runbook)

When WnR onboards a new school:

1. **In platform admin dashboard:** Create school record — name, domain, contact email, primary color
2. **DNS:** Add CNAME record pointing `schoolname.balajierp.com` → Vercel
3. **Vercel:** Add domain alias to the web project
4. **Repo:** Create `schools/configs/<slug>.json` with school details + add icon/splash to `schools/assets/<slug>/`
5. **Run:** `node scripts/generate-eas-config.js` to update `eas.json`
6. **EAS Build:** `eas build --profile <slug> --platform android`
7. **Play Store:** Upload APK to new listing under school's name
8. **Invite:** Send School Admin invite from platform dashboard

New school is live on web immediately after steps 1–3. Mobile APK follows after steps 4–7.

---

## 13. Role Capabilities

### 13.1 Full Capability Matrix

| Capability | Platform Admin | School Admin | Principal | Teacher | Student/Parent |
|------------|:--------------:|:------------:|:---------:|:-------:|:--------------:|
| Manage schools (create/deactivate) | ✅ | — | — | — | — |
| Manage school domains | ✅ | — | — | — | — |
| View all schools & users | ✅ | — | — | — | — |
| Feature toggles per school | ✅ | — | — | — | — |
| Invite School Admin | ✅ | — | — | — | — |
| Manage classes & sections | — | ✅ | — | — | — |
| Invite/manage teachers | — | ✅ | — | — | — |
| Add/manage students | — | ✅ | — | — | — |
| Define fee structures | — | ✅ | — | — | — |
| Record fee payments | — | ✅ | — | — | — |
| School settings (name, logo, color) | — | ✅ | — | — | — |
| Post announcements | — | ✅ | ✅ | — | — |
| View attendance summary | — | ✅ | ✅ | — | — |
| View all discipline records | — | ✅ | ✅ | — | — |
| Create/manage exams | — | ✅ | ✅ | — | — |
| Approve/publish report cards | — | — | ✅ | — | — |
| View school-wide reports | — | — | ✅ | — | — |
| Mark student attendance | — | — | — | ✅ | — |
| Create homework | — | — | — | ✅ | — |
| Enter exam marks | — | — | — | ✅ | — |
| Record discipline incidents | — | — | ✅ | ✅ | — |
| Respond to parent feedback | — | — | — | ✅ | — |
| View own child's attendance | — | — | — | — | ✅ |
| View own child's results | — | — | — | — | ✅ |
| View fee status | — | — | — | — | ✅ |
| View homework | — | — | — | — | ✅ |
| View announcements | — | — | — | — | ✅ |
| Submit feedback to school | — | — | — | — | ✅ |
| View discipline records (own child) | — | — | — | — | ✅ |

### 13.2 Role Hierarchy (Top to Bottom)

```
Platform Admin (WnR)
  └── School Admin
        ├── Principal
        │     └── Teacher
        └── Teacher
              └── Student / Parent
```

- A higher role can **switch context** into any role below them
- A role can never switch into a role above their level
- Platform Admin can switch into any role in any school
- School Admin can switch into Principal or Teacher within their own school
- Principal can switch into Teacher within their own school

---

## 14. Role Context Switching + Audit Log

### 14.1 Context Switching (Not Impersonation)

When a higher-privilege user switches into a lower role's view:
- They remain logged in as themselves — no account switching, no session change
- The system renders the portal for the target role using the real user's session
- A **persistent banner** appears at the top of every page: `"Viewing as [Role] in [School Name] — Exit"`
- Clicking Exit returns them to their own portal
- All actions taken in context-switched mode are fully functional (not read-only)
- Actions are recorded in the audit log under the real user's identity + the role context they were acting as

**Context switch is stored in session (cookie or URL param — cookie preferred):**
```
acting_as_role: "teacher"
acting_in_school: "aaaaaaaa-0000-0000-0000-000000000001"
```

Middleware reads this cookie and renders the appropriate portal. The cookie is cleared on Exit.

### 14.2 Context Switch Entry Points

| Who | Where they switch | Available switch targets |
|-----|-------------------|--------------------------|
| Platform Admin | School detail page (`/platform-admin/schools/[id]`) | School Admin view, Principal view, Teacher view |
| School Admin | Their own dashboard (`/admin/dashboard`) | Principal view, Teacher view |
| Principal | Their own dashboard (`/principal/dashboard`) | Teacher view |

### 14.3 Audit Log

Every write action in the system records who did it and what role context they were acting under.

**Table: `audit_log`**
- `id` UUID
- `school_id` UUID (nullable — null for platform-level actions)
- `performed_by` UUID — the real authenticated user
- `acting_as_role` app_role — the role context at time of action (may differ from real role if context-switched)
- `action` TEXT — e.g. `"attendance.mark"`, `"homework.create"`, `"fee.record_payment"`
- `entity_type` TEXT — e.g. `"attendance_records"`, `"homework"`
- `entity_id` UUID — the record that was created/updated
- `metadata` JSONB — any extra context (previous values, diff summary)
- `created_at` TIMESTAMPTZ

**RLS on audit_log:**
- Platform Admin: reads all
- School Admin / Principal: reads their school's log only
- Teachers and below: no access

**What gets logged:**
- Attendance marked
- Homework created/updated
- Exam marks entered
- Fee payment recorded
- Discipline record created
- Announcement posted
- Student/teacher added
- School settings changed
- Context switch entered/exited
