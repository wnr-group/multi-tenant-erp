# Manual Testing Checklist

Run through this checklist before delivery. Test against production Supabase + Vercel deployment.

## Platform Admin (Super Admin)

- [ ] Login on admin domain → lands on dashboard with correct stats
- [ ] Create school with domain + primary color → school appears in list
- [ ] Invite school admin → verify invite email sent
- [ ] Toggle school active → badge changes
- [ ] Toggle school inactive → school domain returns 404
- [ ] Context switch into school as School Admin → banner appears
- [ ] Context switch into school as Principal → banner appears
- [ ] Context switch into school as Teacher → banner appears
- [ ] Exit context switch → returns to platform admin dashboard
- [ ] Audit log records context switch entries

## School Admin

- [ ] Login on school domain → branded login page (school name + primary color)
- [ ] Dashboard shows teacher + student counts
- [ ] Add class → appears in class list
- [ ] Add section to class → appears under class
- [ ] Add subject to class → appears in subject list
- [ ] Create timetable slot → appears in timetable
- [ ] Create academic year → appears in academics page
- [ ] Create exam → appears in academics page
- [ ] Create fee structure → appears in fee structures list
- [ ] Record manual fee payment (cash) → record appears with correct status
- [ ] Record partial payment → status shows "partial"
- [ ] Record full payment → status shows "paid"
- [ ] Invite teacher → invite email sent, teacher appears after accepting
- [ ] Add student → student appears in student list
- [ ] Upload syllabus PDF → file accessible via download link
- [ ] Post announcement → appears in announcements list
- [ ] Update school settings (name, email) → changes persist

## Principal

- [ ] Dashboard shows today's attendance stats (present/absent/total)
- [ ] Discipline page lists all school discipline records
- [ ] Reports page lists all exams
- [ ] Post announcement → appears in list
- [ ] Context switch to Teacher view → teacher sidebar appears

## Teacher (Web)

- [ ] Dashboard shows today's timetable (or "no classes" message)
- [ ] Attendance: select section + date → see student list
- [ ] Attendance: mark statuses + save → records persist
- [ ] Attendance: re-open same date → previous marks pre-filled
- [ ] Homework: create with class/section/subject/due date → appears in list
- [ ] Results: select exam → see students → enter marks → save
- [ ] Results: re-open same exam → previous marks pre-filled
- [ ] Discipline: record incident → appears in list
- [ ] Feedback: see parent feedback → respond → status changes to "responded"

## Teacher (Mobile)

- [ ] Dashboard shows today's timetable
- [ ] Attendance: select section → mark students → save → success alert
- [ ] Homework: list shows assigned homework
- [ ] Results: list shows exams
- [ ] Discipline: list shows recorded incidents
- [ ] Profile: shows name/email, sign out works

## Parent/Student (Mobile)

- [ ] Dashboard shows attendance %, pending fees count
- [ ] Attendance: see date-wise history with status colors
- [ ] Results: see exam results (marks/max per subject)
- [ ] Fees: see fee list with paid/partial/overdue badges
- [ ] Fees: tap "Pay Now" → Razorpay checkout opens
- [ ] Fees: complete payment → status updates to "paid"
- [ ] Fees: cancel payment → no status change, can retry
- [ ] Homework: see homework for their section
- [ ] Announcements: see school announcements
- [ ] Announcements: new announcement appears in real-time
- [ ] Feedback: submit feedback → success alert
- [ ] Discipline: see discipline records (if any)
- [ ] Profile: shows name/email, sign out works

## Cross-Cutting

- [ ] RLS isolation: login as School A user → cannot query School B data
- [ ] Push notification: app registers token → test notification received
- [ ] Report card PDF: edge function returns correct HTML with student data
- [ ] Invite flow: new user receives email → sets password → can login
- [ ] Auth: unauthenticated user redirected to /login on all protected routes
- [ ] Context switch: all actions logged under real user identity in audit_log
- [ ] Razorpay webhook: payment captured → fee_payments record updated automatically
