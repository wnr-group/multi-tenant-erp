# User/Role Login Rework — Implementation Plan (Index)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Each sub-plan below is self-contained and uses checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make one phone number a single human identity that can hold multiple roles across multiple schools, with verified per-request scope and clean in-app switching (mobile role/student, web role-precedence).

**Architecture:** `profiles` becomes school-agnostic; `user_roles(user_id, school_id, role)` is the single source of affiliation truth. The client *picks* an active scope (baked school on mobile / subdomain on web, plus role and optional student filter); a PostgREST `db-pre-request` hook *validates* the claimed scope against `user_roles` and sets transaction-local GUCs that RLS reads. Provisioning is find-or-create by phone. Demo data is re-seeded; no backfill.

**Tech Stack:** Supabase Postgres + RLS + PostgREST, Next.js (web middleware + API routes), Expo / React Native (mobile), phone-OTP auth.

---

## Why this index is split

Large monolithic plans are expensive to reload into context. Each sub-plan below is independently executable and should be loaded **only when working on that area**. Execute them in order — later plans depend on earlier ones.

## Execution order & dependencies

| # | Sub-plan | Depends on | Summary |
|---|----------|-----------|---------|
| 1 | [Database & RLS scope](2026-06-13-user-role-login-rework/01-db-rls-scope.md) | — | Drop `profiles.school_id`; add validated `db-pre-request` hook; rewrite `get_my_school_id()`/`get_my_role()`; `check_phone_has_access` RPC. |
| 2 | [Provisioning find-or-create](2026-06-13-user-role-login-rework/02-provisioning.md) | 1 | Shared `findOrCreateUserByPhone` helper; retrofit the 4 `createUser` call sites; link student `parent_phone` → `parent_profile_id`. |
| 3 | [Web role resolution](2026-06-13-user-role-login-rework/03-web.md) | 1 | Role precedence (`school_admin > principal > teacher`); send `x-active-role`; no-access page. |
| 4 | [Mobile scope & switching](2026-06-13-user-role-login-rework/04-mobile.md) | 1 | Baked `SCHOOL_ID`; active-context store + persistence; header chip + bottom-sheet; teacher/parent stacks; `x-active-role` header; pre-OTP check; no-access screen. |
| 5 | [Re-seed demo data](2026-06-13-user-role-login-rework/05-reseed.md) | 1,2 | Re-seed demo with school-agnostic profiles and multi-school/dual-role example users. |

## Locked design decisions (the contract every sub-plan honors)

1. **Identity:** one phone = one `auth.users` + one `profiles` row. `profiles.phone UNIQUE` and `auth.users.phone UNIQUE` stay. `profiles.school_id` is dropped.
2. **Affiliation:** lives only in `user_roles`. No `school_id` on `profiles`.
3. **No student login.** Students are data records + a parent-side filter; `student_id` is a UI filter, never a security boundary (`parent_profile_id = auth.uid()` is the real boundary).
4. **Mobile = one app build per school.** `SCHOOL_ID` baked in. No mobile school-switcher. In-app switches: role (teacher↔parent) and student (under parent only). Default landing: teacher. Last-used context persisted.
5. **Web school = subdomain.** No web school-switcher. Multiple staff roles at one school resolve by **precedence** `school_admin > principal > teacher`. Parent is never a web role.
6. **Scope enforcement:** single mechanism — `db-pre-request` hook reads request headers, validates `(user_id, school_id, role)` against `user_roles`, sets transaction-local GUCs. RLS helpers read those GUCs. Invalid scope → deny (null), surfaced as a "No access" screen/page. Never silent fallback.
7. **Provisioning:** find-or-create by phone; reuse existing identity across schools; catch `23505` race → fall back to lookup. School B can attach a role but not edit the shared global profile.
8. **Login gating:** pre-OTP `check_phone_has_access(phone, school_id)` to save SMS cost; post-login scope check kept as defense-in-depth.
9. **Data:** no backfill. Re-seed demo data to match the new model.

---

## Self-review coverage map

- Requirement "teacher can be a parent" → Sub-plan 4 (role switcher) + Sub-plan 1 (validated role scope).
- Requirement "multi-school by subdomain/build" → Sub-plan 3 (web subdomain) + Sub-plan 4 (baked SCHOOL_ID).
- Requirement "parent multiple students, switch student" → Sub-plan 4 (student switcher) + Sub-plan 1 (`parent_profile_id` RLS preserved).
- Requirement "single unique phone number identifies the human" → Sub-plan 1 (constraints) + Sub-plan 2 (find-or-create).

---

## Execution Handoff

Once you've reviewed this index, open Sub-plan 1 and proceed in order. Recommended: **subagent-driven-development** — dispatch a fresh subagent per task, review between tasks.
