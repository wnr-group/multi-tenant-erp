# School ERP Product Demo Video - Design Spec

## Overview

A 60-second 16:9 product demo video for face-to-face sales pitches to school owners. Uses real product UI screenshots (web admin + mobile teacher/parent) with motion graphics overlays. Beat-synced to a royalty-free soundtrack.

**Target audience:** Small school owners/principals being pitched in person
**Delivery format:** 1920x1080 MP4, played from a laptop during meetings
**No voiceover** - silent with soundtrack (presenter talks over it)

---

## Narrative Arc: Problem to Solution

### Structure (60 seconds)

| Segment | Time | Content |
|---------|------|---------|
| Hook | 0-8s | Pain statement: "Managing your school on paper? On WhatsApp?" with visual chaos (scattered papers, message floods) transitioning to clean UI |
| Solution Intro | 8-12s | Brand reveal: "One platform. Everything managed." with logo/wordmark |
| Feature Tour | 12-52s | 5 feature scenes (~8s each) showing real product workflows |
| Close | 52-60s | Summary of all features + "Your school. Fully managed." + contact/CTA |

### Feature Scenes (12-52s)

Each scene uses a **split layout**: headline/feature name on the left (38%), live product UI screenshot(s) on the right (62%). Screenshots animate in with subtle slide + scale. Internal events (highlights, pointer movements) land on beats.

#### Scene 1: Student Management (12-20s)
- **Left:** "Add & manage every student"
- **Right:** Web screenshot of student list (02-students.png) cross-fading to add-student form (08-add-student-form.png)
- **Motion:** Cursor fills form fields with type-in effect, clicks "Enroll"

#### Scene 2: Attendance (20-28s)
- **Left:** "Mark attendance in one tap"
- **Right:** Teacher mobile attendance screen (mobile-11-attendance.png) showing the class list with present/absent toggles
- **Secondary:** Parent mobile attendance calendar (mobile-parent-02-attendance.png) sliding in as a smaller overlay showing "Parents see it instantly"
- **Motion:** Toggle switches flip to present (green), calendar dot appears on parent side

#### Scene 3: Homework & Academics (28-36s)
- **Left:** "Assign homework. Track results."
- **Right:** Split showing teacher assigns (web timetable/academics) and parent receives (mobile-parent-04b-homework-detail.png)
- **Secondary:** Parent results view (mobile-parent-03-academics.png) with score "416/500 - Rank 3 of 11" counter animating up
- **Motion:** Homework card slides from teacher side to parent side with arrow animation

#### Scene 4: Fees & Payments (36-44s)
- **Left:** "Fees collected. Parents notified."
- **Right:** Parent fees screen (mobile-parent-05-fees.png) showing payment history with "Paid" badges
- **Secondary:** Web admin fee dashboard (implied from 01-dashboard.png stats)
- **Motion:** Payment amounts count up, "Paid" badges pop in one by one

#### Scene 5: Announcements & Communication (44-52s)
- **Left:** "Keep everyone in the loop"
- **Right:** Web announcements page (07-announcements.png) showing creation
- **Secondary:** Parent mobile announcements (mobile-parent-07-announcements.png) showing received notifications
- **Motion:** Announcement card "sends" from web to mobile with notification pop animation

### Close (52-60s)
- All 5 feature icons summarize in a row
- Tagline: "Your school. Fully managed."
- Contact info / QR code / "Book a demo" CTA

---

## Visual Style: Calm Confidence

### Color Palette
| Role | Hex | Usage |
|------|-----|-------|
| Background (dark) | #0F172A | Scene backgrounds, frames |
| Background (mid) | #1E293B | Card backgrounds, UI frames |
| Primary accent | #6366F1 | Headlines, progress bars, feature labels |
| Secondary accent | #10B981 | Success states, "present", "paid" |
| Warning/attention | #F59E0B | Pending states |
| Error/absent | #EF4444 | Pain section, "absent" indicators |
| Text primary | #F8FAFC | Headlines, key copy |
| Text secondary | #94A3B8 | Descriptions, labels |
| Border subtle | #334155 | UI element borders |

### Typography
- **Display (headlines):** Inter 800, 48-64px
- **Feature labels:** Inter 700, uppercase, letter-spacing 0.12em, 14-18px
- **Body/descriptions:** Inter 400, 18-24px
- **UI text (inside screenshots):** Native from screenshots

### Motion Language
- **Scene transitions:** Cross-dissolve with subtle scale (1.0 to 1.02) on outgoing, slide-in from right on incoming
- **Screenshots:** Slide up + fade in (0.3s ease-out)
- **Internal events:** Snap to nearest beat within +/-6 frames
- **Cursor:** Smooth bezier path, 200ms settle before click, click pulse effect
- **Counters:** Count up on beat, ease-out at target value
- **Cards/badges:** PopIn spring animation (scale 0 to 1.0, overshoot 1.05)

### Screenshot Treatment
- Screenshots displayed in device frames (phone mockup for mobile, browser chrome for web)
- Subtle drop shadow: `0 25px 50px rgba(0,0,0,0.25)`
- Border radius 12px on device frames
- Screenshots at native resolution, scaled to fit frame without pixelation

---

## Asset Requirements

### Already Captured
- 9 web admin screenshots (1920x1080 via Chrome DevTools)
- 6 teacher mobile screenshots (1080x2424 from Pixel 9a emulator)
- 7 parent mobile screenshots (1080x2424 from Pixel 9a emulator)

### Still Needed
- **Logo:** Not available yet (use text wordmark "School ERP" in Inter 700 as placeholder)
- **Soundtrack:** Royalty-free, 120 BPM, clear kick/snare pattern, minimum 62 seconds. Will select from stock library.
- **Device frames:** Phone mockup (Pixel-style, dark) and browser chrome (minimal, dark theme)

---

## Technical Implementation

### Stack
- **Remotion 4.x** with React 19
- **@remotion/google-fonts** for Inter loading
- **TypeScript** throughout
- **30fps** render target

### Project Structure
```
apps/demo-video/
  src/
    Root.tsx              # Composition registry
    theme.ts             # Colors, timing constants, easings
    beats.json           # Beat detection output
    compositions/
      Master.tsx         # Full 60s composition
      Scene01-Students.tsx
      Scene02-Attendance.tsx
      Scene03-Homework.tsx
      Scene04-Fees.tsx
      Scene05-Announcements.tsx
      HookScene.tsx      # 0-8s pain/hook
      BrandReveal.tsx    # 8-12s
      CloseScene.tsx     # 52-60s
    primitives/
      TypedText.tsx
      PopIn.tsx
      SlideIn.tsx
      Cursor.tsx
      Counter.tsx
      DeviceFrame.tsx
      FeatureLabel.tsx
      Screenshot.tsx     # Handles loading + scale + shadow
    assets/
      screenshots/       # Symlink to brainstorm/screenshots
      soundtrack.mp3
```

### Timing Constants (derived from beat detection)
All scene starts land on snare hits. Internal events (cursor clicks, badge pops, counter starts) land on kicks or snares within the scene. Exact frame numbers determined after beat detection on the selected soundtrack.

### Per-Scene Debug Compositions
Each scene registered independently in Root.tsx for isolated scrubbing during development.

---

## Render Settings

| Setting | Value |
|---------|-------|
| Resolution | 1920x1080 |
| FPS | 30 |
| Duration | 60s (1800 frames) |
| CRF | 14 |
| Image format | PNG (for quality) |
| Codec | H.264 |

---

## Open Questions

1. **Soundtrack selection** - need to pick a royalty-free track. Preference: modern, minimal electronic with clear beat structure. ~120 BPM.
2. **Logo** - placeholder wordmark for now; swap when available.
3. **CTA content** - what contact info / URL / QR to show in the close?
