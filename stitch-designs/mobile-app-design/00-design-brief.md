# School ERP Design Specification

## Overview
A multi-tenant, white-labeled school ERP mobile app designed for parents and teachers. The aesthetic is inspired by premium fintech apps (CRED, Slice), prioritizing speed, clarity, and trust.

## Design System Tokens

### Colors (Reference: Blue Theme)
- **Primary:** #2563EB (Dynamic/Dynamic per school)
- **Primary Light:** rgba(37, 99, 235, 0.15) (15% opacity tint)
- **Surface:** #FFFFFF
- **Surface Raised:** #F8FAFC
- **Background:** #F1F5F9
- **Text Primary:** #0F172A
- **Text Secondary:** #64748B
- **Text Muted:** #94A3B8
- **Border:** #E2E8F0
- **Success:** #10B981
- **Warning:** #F59E0B
- **Danger:** #EF4444
- **Info:** #3B82F6

### Typography (Inter)
- **Display:** 28px / Bold / #0F172A
- **Heading:** 20px / SemiBold / #0F172A
- **Subheading:** 16px / SemiBold / #0F172A
- **Body:** 14px / Regular / #0F172A
- **Caption:** 12px / Regular / #64748B
- **Label:** 11px / Medium / Uppercase / #94A3B8

### Spacing & Radius
- **Spacing:** 4, 8, 12, 16, 20, 24, 32, 40px
- **Radius:** 
  - Cards: 16px
  - Buttons: 12px
  - Chips/Badges: 100px
  - Inputs: 10px
- **Shadows:** 0 2px 12px rgba(0,0,0,0.06)

## Screen List
1. **Login Screen:** Welcome flow with dynamic branding.
2. **Parent Dashboard:** Stats, quick actions, and announcements.
3. **Teacher Dashboard:** Schedule, quick actions, and tasks.
4. **Attendance (Parent):** Visual summary and calendar grid.
5. **Mark Attendance (Teacher):** Student list with status toggles.
6. **Fees (Parent):** Balance, breakdown, and history.
7. **More Screen:** Categorized list navigation.

## Component Library
- **Stat Card:** Icon + Number + Label
- **List Item:** Icon + Title + Subtitle + Chevron
- **Status Badge:** Paid, Pending, Overdue, Present, Absent
- **Primary Button:** Full width and compact
- **Input Field:** With iconography
- **Section Header:** With "See all" link
- **Empty State:** Illustration + Message + CTA
- **Avatar:** Initials fallback
