# School ERP Demo Video Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a 60-second beat-synced product demo video using Remotion 4.x, showcasing real UI screenshots from the School ERP app (web admin + mobile teacher/parent).

**Architecture:** Remotion project at `apps/demo-video/` within the existing pnpm monorepo. 8 scenes sequenced in a master composition, each reading timing from a centralized constants object derived from beat detection. Screenshots are served from `public/screenshots/` and rendered inside device frame components.

**Tech Stack:** Remotion 4.0.448, React 19, TypeScript, @remotion/google-fonts (Inter), librosa (Python, for beat detection)

---

### Task 1: Project Scaffold

**Files:**
- Create: `apps/demo-video/package.json`
- Create: `apps/demo-video/tsconfig.json`
- Create: `apps/demo-video/remotion.config.ts`
- Create: `apps/demo-video/src/index.ts`
- Create: `apps/demo-video/.gitignore`

- [ ] **Step 1: Create the project directory**

```bash
mkdir -p apps/demo-video/src apps/demo-video/public/screenshots
```

- [ ] **Step 2: Write package.json**

```json
{
  "name": "demo-video",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "remotion studio",
    "build": "remotion render Master out/demo.mp4 --image-format=png --crf=14",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@remotion/cli": "4.0.448",
    "@remotion/google-fonts": "4.0.448",
    "@remotion/shapes": "4.0.448",
    "react": "19.0.0",
    "react-dom": "19.0.0",
    "remotion": "4.0.448"
  },
  "devDependencies": {
    "@types/react": "19.0.0",
    "@types/web": "0.0.166",
    "typescript": "5.8.2"
  }
}
```

- [ ] **Step 3: Write tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "types": ["@types/react", "@types/web"]
  },
  "include": ["src/**/*"]
}
```

- [ ] **Step 4: Write remotion.config.ts**

```typescript
import { Config } from "@remotion/cli/config";

Config.setEntryPoint("./src/index.ts");
Config.setPublicDir("./public");
Config.setConcurrency(8);
Config.setVideoImageFormat("png");
```

- [ ] **Step 5: Write src/index.ts**

```typescript
import { registerRoot } from "remotion";
import { RemotionRoot } from "./Root";

registerRoot(RemotionRoot);
```

- [ ] **Step 6: Write .gitignore**

```
node_modules/
out/
.DS_Store
```

- [ ] **Step 7: Copy screenshots into public/**

```bash
cp .superpowers/brainstorm/screenshots/02-students.png apps/demo-video/public/screenshots/
cp .superpowers/brainstorm/screenshots/08-add-student-form.png apps/demo-video/public/screenshots/
cp .superpowers/brainstorm/screenshots/mobile-11-attendance.png apps/demo-video/public/screenshots/
cp .superpowers/brainstorm/screenshots/mobile-parent-02-attendance.png apps/demo-video/public/screenshots/
cp .superpowers/brainstorm/screenshots/06-academics.png apps/demo-video/public/screenshots/
cp .superpowers/brainstorm/screenshots/mobile-parent-04b-homework-detail.png apps/demo-video/public/screenshots/
cp .superpowers/brainstorm/screenshots/mobile-parent-03-academics.png apps/demo-video/public/screenshots/
cp .superpowers/brainstorm/screenshots/mobile-parent-05-fees.png apps/demo-video/public/screenshots/
cp .superpowers/brainstorm/screenshots/01-dashboard.png apps/demo-video/public/screenshots/
cp .superpowers/brainstorm/screenshots/07-announcements.png apps/demo-video/public/screenshots/
cp .superpowers/brainstorm/screenshots/mobile-parent-07-announcements.png apps/demo-video/public/screenshots/
cp .superpowers/brainstorm/screenshots/mobile-parent-01-dashboard.png apps/demo-video/public/screenshots/
cp .superpowers/brainstorm/screenshots/mobile-10-home.png apps/demo-video/public/screenshots/
```

- [ ] **Step 8: Install dependencies**

```bash
cd apps/demo-video && pnpm install
```

- [ ] **Step 9: Verify typecheck passes**

```bash
cd apps/demo-video && pnpm typecheck
```

Expected: passes with no errors (src/index.ts imports Root which doesn't exist yet - we'll create it in Task 2).

- [ ] **Step 10: Commit**

```bash
git add apps/demo-video/
git commit -m "feat(demo-video): scaffold Remotion project with screenshots"
```

---

### Task 2: Theme, Easings, and Timing Constants

**Files:**
- Create: `apps/demo-video/src/theme.ts`
- Create: `apps/demo-video/src/easings.ts`

- [ ] **Step 1: Write src/theme.ts**

This contains colors, fonts, video constants, and scene timing. Scene timing is placeholder until beat detection runs (Task 3), but we use 120 BPM math (15 frames/beat) to set reasonable defaults that land on snares.

```typescript
import { Easing } from "remotion";

export const VIDEO = {
  width: 1920,
  height: 1080,
  fps: 30,
  totalFrames: 1800, // 60s at 30fps
} as const;

export const colors = {
  bgDark: "#0F172A",
  bgMid: "#1E293B",
  primary: "#6366F1",
  success: "#10B981",
  warning: "#F59E0B",
  error: "#EF4444",
  textPrimary: "#F8FAFC",
  textSecondary: "#94A3B8",
  border: "#334155",
} as const;

export const fonts = {
  display: "Inter, system-ui, sans-serif",
  ui: "Inter, system-ui, sans-serif",
} as const;

// Scene timing - 60s total = 1800 frames at 30fps
// All starts on snare frames (multiples of 30, offset by SNARE_PHASE)
export const SCENES = {
  hookStart: 0,        hookDur: 240,      // 0-8s
  brandStart: 240,     brandDur: 120,     // 8-12s
  scene1Start: 360,    scene1Dur: 240,    // 12-20s (Students)
  scene2Start: 600,    scene2Dur: 240,    // 20-28s (Attendance)
  scene3Start: 840,    scene3Dur: 240,    // 28-36s (Homework)
  scene4Start: 1080,   scene4Dur: 240,    // 36-44s (Fees)
  scene5Start: 1320,   scene5Dur: 240,    // 44-52s (Announcements)
  closeStart: 1560,    closeDur: 240,     // 52-60s

  // Sum: 240+120+240+240+240+240+240+240 = 1800 ✓
} as const;

// Beat-sync helpers (120 BPM at 30fps)
export const FRAMES_PER_BEAT = 15;
export const SNARE_PHASE = 30;
export const KICK_PHASE = 15;

export const isSnare = (masterFrame: number): boolean =>
  masterFrame >= SNARE_PHASE &&
  (masterFrame - SNARE_PHASE) % (FRAMES_PER_BEAT * 2) === 0;

export const isKick = (masterFrame: number): boolean =>
  masterFrame >= KICK_PHASE &&
  (masterFrame - KICK_PHASE) % (FRAMES_PER_BEAT * 2) === 0;
```

- [ ] **Step 2: Write src/easings.ts**

```typescript
import { Easing } from "remotion";

export const easings = {
  standard: Easing.bezier(0.4, 0, 0.2, 1),
  soft: Easing.bezier(0.25, 0.46, 0.45, 0.94),
  slowInLand: Easing.bezier(0.2, 0.9, 0.1, 1),
  maskReveal: Easing.bezier(0.33, 1, 0.68, 1),
  violentPush: Easing.bezier(0.7, 0, 0.1, 1),
};
```

- [ ] **Step 3: Commit**

```bash
git add apps/demo-video/src/theme.ts apps/demo-video/src/easings.ts
git commit -m "feat(demo-video): add theme constants and easing presets"
```

---

### Task 3: Soundtrack Selection and Beat Detection

**Files:**
- Create: `apps/demo-video/public/soundtrack.mp3`
- Create: `apps/demo-video/beats.json`
- Modify: `apps/demo-video/src/theme.ts` (update timing if BPM differs from 120)

- [ ] **Step 1: Verify Python + librosa are available**

```bash
python3 -c "import librosa; print('librosa', librosa.__version__)"
```

If not installed:
```bash
pip install --break-system-packages librosa numpy soundfile
```

- [ ] **Step 2: Select and download a royalty-free soundtrack**

Requirements:
- ~120 BPM, clear kick/snare pattern
- Minimum 62 seconds long
- Modern, minimal electronic feel
- Royalty-free (Pixabay, Uppbeat, or similar)

Save to `apps/demo-video/public/soundtrack.mp3`.

- [ ] **Step 3: Run beat detection**

```bash
python3 scripts/detect-beats.py apps/demo-video/public/soundtrack.mp3 --fps 30 --out apps/demo-video/beats.json
```

If `scripts/detect-beats.py` doesn't exist in the repo, use the skill's version:

```bash
python3 ~/.claude/skills/saas-product-demo-video/scripts/detect-beats.py apps/demo-video/public/soundtrack.mp3 --fps 30 --out apps/demo-video/beats.json
```

- [ ] **Step 4: Update theme.ts timing constants**

Read `beats.json` and update `SCENES` constants so every scene start lands on a snare frame from the detected beat grid. Update `FRAMES_PER_BEAT`, `SNARE_PHASE`, and `KICK_PHASE` if the BPM differs from 120.

- [ ] **Step 5: Commit**

```bash
git add apps/demo-video/public/soundtrack.mp3 apps/demo-video/beats.json apps/demo-video/src/theme.ts
git commit -m "feat(demo-video): add soundtrack and beat-sync timing constants"
```

---

### Task 4: Animation Primitives

**Files:**
- Create: `apps/demo-video/src/primitives/TypedText.tsx`
- Create: `apps/demo-video/src/primitives/PopIn.tsx`
- Create: `apps/demo-video/src/primitives/SlideIn.tsx`
- Create: `apps/demo-video/src/primitives/Counter.tsx`
- Create: `apps/demo-video/src/primitives/DeviceFrame.tsx`
- Create: `apps/demo-video/src/primitives/FeatureLabel.tsx`
- Create: `apps/demo-video/src/primitives/Screenshot.tsx`

- [ ] **Step 1: Write TypedText.tsx**

```tsx
import { useCurrentFrame, interpolate } from "remotion";
import { easings } from "../easings";

export const TypedText: React.FC<{
  text: string;
  startFrame: number;
  perWord?: number;
  style?: React.CSSProperties;
}> = ({ text, startFrame, perWord = 10, style }) => {
  const frame = useCurrentFrame();
  const words = text.split(" ");
  const overlap = perWord * 0.6;

  return (
    <span style={style}>
      {words.map((w, i) => {
        const local = frame - startFrame - i * overlap;
        const p = interpolate(local, [0, perWord], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
          easing: easings.maskReveal,
        });
        return (
          <span
            key={i}
            style={{
              display: "inline-block",
              opacity: p,
              transform: `translateY(${(1 - p) * 12}px)`,
              marginRight: "0.25em",
            }}
          >
            {w}
          </span>
        );
      })}
    </span>
  );
};
```

- [ ] **Step 2: Write PopIn.tsx**

```tsx
import { spring, useCurrentFrame, useVideoConfig } from "remotion";

export const PopIn: React.FC<{
  startFrame: number;
  children: React.ReactNode;
  config?: { damping?: number; stiffness?: number; mass?: number };
}> = ({ startFrame, children, config = {} }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const s = spring({
    frame: frame - startFrame,
    fps,
    config: { damping: 12, stiffness: 180, mass: 0.7, ...config },
  });

  return (
    <div style={{ transform: `scale(${s})`, opacity: s, transformOrigin: "center" }}>
      {children}
    </div>
  );
};
```

- [ ] **Step 3: Write SlideIn.tsx**

```tsx
import { useCurrentFrame, interpolate } from "remotion";
import { easings } from "../easings";

export const SlideIn: React.FC<{
  startFrame: number;
  duration?: number;
  direction?: "left" | "right" | "up" | "down";
  distance?: number;
  children: React.ReactNode;
}> = ({ startFrame, duration = 15, direction = "up", distance = 40, children }) => {
  const frame = useCurrentFrame();
  const p = interpolate(frame - startFrame, [0, duration], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: easings.slowInLand,
  });

  const transforms: Record<string, string> = {
    left: `translateX(${(1 - p) * -distance}px)`,
    right: `translateX(${(1 - p) * distance}px)`,
    up: `translateY(${(1 - p) * distance}px)`,
    down: `translateY(${(1 - p) * -distance}px)`,
  };

  return (
    <div style={{ transform: transforms[direction], opacity: p }}>
      {children}
    </div>
  );
};
```

- [ ] **Step 4: Write Counter.tsx**

```tsx
import { useCurrentFrame, interpolate } from "remotion";
import { easings } from "../easings";

export const Counter: React.FC<{
  startFrame: number;
  duration?: number;
  from?: number;
  to: number;
  prefix?: string;
  suffix?: string;
  style?: React.CSSProperties;
}> = ({ startFrame, duration = 30, from = 0, to, prefix = "", suffix = "", style }) => {
  const frame = useCurrentFrame();
  const p = interpolate(frame - startFrame, [0, duration], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: easings.slowInLand,
  });

  const value = Math.round(from + (to - from) * p);

  return <span style={style}>{prefix}{value}{suffix}</span>;
};
```

- [ ] **Step 5: Write DeviceFrame.tsx**

```tsx
import { AbsoluteFill } from "remotion";

export const PhoneFrame: React.FC<{
  children: React.ReactNode;
  width?: number;
  height?: number;
}> = ({ children, width = 280, height = 580 }) => {
  return (
    <div
      style={{
        width,
        height,
        borderRadius: 24,
        border: "3px solid #334155",
        background: "#1E293B",
        overflow: "hidden",
        boxShadow: "0 25px 50px rgba(0,0,0,0.25)",
        position: "relative",
      }}
    >
      {/* Status bar area */}
      <div style={{ height: 24, background: "#0F172A" }} />
      {/* Content */}
      <div style={{ flex: 1, overflow: "hidden", height: height - 24 }}>
        {children}
      </div>
    </div>
  );
};

export const BrowserFrame: React.FC<{
  children: React.ReactNode;
  width?: number;
  height?: number;
  url?: string;
}> = ({ children, width = 800, height = 500, url = "school1.erp.app" }) => {
  return (
    <div
      style={{
        width,
        height,
        borderRadius: 12,
        border: "2px solid #334155",
        background: "#1E293B",
        overflow: "hidden",
        boxShadow: "0 25px 50px rgba(0,0,0,0.25)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Browser chrome */}
      <div
        style={{
          height: 36,
          background: "#0F172A",
          display: "flex",
          alignItems: "center",
          padding: "0 12px",
          gap: 8,
        }}
      >
        <div style={{ display: "flex", gap: 6 }}>
          <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#EF4444" }} />
          <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#F59E0B" }} />
          <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#10B981" }} />
        </div>
        <div
          style={{
            flex: 1,
            background: "#1E293B",
            borderRadius: 6,
            padding: "4px 12px",
            fontSize: 11,
            color: "#94A3B8",
            fontFamily: "Inter, system-ui, sans-serif",
          }}
        >
          {url}
        </div>
      </div>
      {/* Page content */}
      <div style={{ flex: 1, overflow: "hidden" }}>
        {children}
      </div>
    </div>
  );
};
```

- [ ] **Step 6: Write FeatureLabel.tsx**

```tsx
import { useCurrentFrame, interpolate } from "remotion";
import { colors, fonts } from "../theme";
import { easings } from "../easings";

export const FeatureLabel: React.FC<{
  label: string;
  startFrame: number;
}> = ({ label, startFrame }) => {
  const frame = useCurrentFrame();
  const p = interpolate(frame - startFrame, [0, 12], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: easings.maskReveal,
  });

  return (
    <div
      style={{
        color: colors.primary,
        fontSize: 14,
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: "0.12em",
        fontFamily: fonts.display,
        opacity: p,
        transform: `translateY(${(1 - p) * 8}px)`,
      }}
    >
      {label}
    </div>
  );
};
```

- [ ] **Step 7: Write Screenshot.tsx**

```tsx
import { Img, staticFile } from "remotion";

export const Screenshot: React.FC<{
  src: string;
  width?: number;
  height?: number;
  style?: React.CSSProperties;
}> = ({ src, width, height, style }) => {
  return (
    <Img
      src={staticFile(`screenshots/${src}`)}
      style={{
        width: width ?? "100%",
        height: height ?? "100%",
        objectFit: "cover",
        ...style,
      }}
    />
  );
};
```

- [ ] **Step 8: Commit**

```bash
git add apps/demo-video/src/primitives/
git commit -m "feat(demo-video): add animation primitives (TypedText, PopIn, SlideIn, Counter, DeviceFrame, FeatureLabel, Screenshot)"
```

---

### Task 5: Root Composition Registry

**Files:**
- Create: `apps/demo-video/src/Root.tsx`
- Create: `apps/demo-video/src/compositions/Master.tsx` (placeholder)

- [ ] **Step 1: Write Root.tsx with font loading and composition registry**

```tsx
import { Composition } from "remotion";
import { loadFont } from "@remotion/google-fonts/Inter";
import { VIDEO, SCENES } from "./theme";
import { Master } from "./compositions/Master";

loadFont("normal", { weights: ["400", "500", "600", "700", "800"], subsets: ["latin"] });

export const RemotionRoot: React.FC = () => (
  <>
    <Composition
      id="Master"
      component={Master}
      durationInFrames={VIDEO.totalFrames}
      fps={VIDEO.fps}
      width={VIDEO.width}
      height={VIDEO.height}
    />
    {/* Per-scene debug compositions added as scenes are built */}
  </>
);
```

- [ ] **Step 2: Write a placeholder Master.tsx**

```tsx
import { AbsoluteFill } from "remotion";
import { colors, fonts } from "../theme";

export const Master: React.FC = () => (
  <AbsoluteFill style={{ background: colors.bgDark, display: "flex", alignItems: "center", justifyContent: "center" }}>
    <h1 style={{ color: colors.textPrimary, fontFamily: fonts.display, fontSize: 48 }}>
      School ERP Demo - Building...
    </h1>
  </AbsoluteFill>
);
```

- [ ] **Step 3: Verify Remotion Studio launches**

```bash
cd apps/demo-video && pnpm dev
```

Expected: Remotion Studio opens at localhost:3000 (or 3030), showing the "Master" composition in the left panel. The preview shows the placeholder text on a dark background.

- [ ] **Step 4: Commit**

```bash
git add apps/demo-video/src/Root.tsx apps/demo-video/src/compositions/Master.tsx
git commit -m "feat(demo-video): add Root composition registry with placeholder Master"
```

---

### Task 6: Hook Scene (0-8s)

**Files:**
- Create: `apps/demo-video/src/compositions/HookScene.tsx`
- Modify: `apps/demo-video/src/Root.tsx` (add debug composition)

- [ ] **Step 1: Write HookScene.tsx**

Pain statement transitioning to clean UI. Shows chaotic text fading out, replaced by calm product UI screenshot.

```tsx
import { AbsoluteFill, useCurrentFrame, interpolate, Sequence } from "remotion";
import { colors, fonts, SCENES } from "../theme";
import { easings } from "../easings";
import { TypedText } from "../primitives/TypedText";
import { SlideIn } from "../primitives/SlideIn";
import { BrowserFrame } from "../primitives/DeviceFrame";
import { Screenshot } from "../primitives/Screenshot";

export const HookScene: React.FC = () => {
  const frame = useCurrentFrame();
  const dur = SCENES.hookDur;

  // Phase 1: Pain text (frames 0-120, 0-4s)
  const painOpacity = interpolate(frame, [100, 130], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Phase 2: Solution preview (frames 120-240, 4-8s)
  const solutionOpacity = interpolate(frame, [120, 150], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: easings.soft,
  });

  return (
    <AbsoluteFill style={{ background: colors.bgDark }}>
      {/* Pain phase */}
      <AbsoluteFill
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          opacity: painOpacity,
        }}
      >
        <TypedText
          text="Managing your school on paper?"
          startFrame={10}
          perWord={8}
          style={{
            color: colors.textPrimary,
            fontSize: 52,
            fontWeight: 800,
            fontFamily: fonts.display,
            textAlign: "center",
          }}
        />
        <div style={{ height: 24 }} />
        <TypedText
          text="On WhatsApp groups?"
          startFrame={50}
          perWord={8}
          style={{
            color: colors.error,
            fontSize: 44,
            fontWeight: 700,
            fontFamily: fonts.display,
            textAlign: "center",
          }}
        />
      </AbsoluteFill>

      {/* Solution preview */}
      <AbsoluteFill
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          opacity: solutionOpacity,
        }}
      >
        <SlideIn startFrame={120} direction="up" distance={60}>
          <BrowserFrame width={900} height={560}>
            <Screenshot src="01-dashboard.png" />
          </BrowserFrame>
        </SlideIn>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
```

- [ ] **Step 2: Add debug composition to Root.tsx**

Add import and composition registration:

```tsx
import { HookScene } from "./compositions/HookScene";

// Inside RemotionRoot, after Master:
<Composition
  id="v2-Hook"
  component={HookScene}
  durationInFrames={SCENES.hookDur}
  fps={VIDEO.fps}
  width={VIDEO.width}
  height={VIDEO.height}
/>
```

- [ ] **Step 3: Preview in Remotion Studio**

Select "v2-Hook" in the composition list. Verify:
- Pain text types in during first 4 seconds
- Cross-dissolves to dashboard screenshot in a browser frame during seconds 4-8

- [ ] **Step 4: Commit**

```bash
git add apps/demo-video/src/compositions/HookScene.tsx apps/demo-video/src/Root.tsx
git commit -m "feat(demo-video): add Hook scene with pain-to-solution transition"
```

---

### Task 7: Brand Reveal Scene (8-12s)

**Files:**
- Create: `apps/demo-video/src/compositions/BrandReveal.tsx`
- Modify: `apps/demo-video/src/Root.tsx` (add debug composition)

- [ ] **Step 1: Write BrandReveal.tsx**

```tsx
import { AbsoluteFill, useCurrentFrame, interpolate } from "remotion";
import { colors, fonts } from "../theme";
import { easings } from "../easings";
import { TypedText } from "../primitives/TypedText";
import { PopIn } from "../primitives/PopIn";

export const BrandReveal: React.FC = () => {
  const frame = useCurrentFrame();

  const lineOpacity = interpolate(frame, [0, 10], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        background: colors.bgDark,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 24,
      }}
    >
      {/* Wordmark */}
      <PopIn startFrame={5}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <div
            style={{
              width: 48,
              height: 48,
              background: colors.primary,
              borderRadius: 10,
            }}
          />
          <span
            style={{
              color: colors.textPrimary,
              fontSize: 32,
              fontWeight: 700,
              fontFamily: fonts.display,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
            }}
          >
            School ERP
          </span>
        </div>
      </PopIn>

      {/* Tagline */}
      <TypedText
        text="One platform. Everything managed."
        startFrame={30}
        perWord={10}
        style={{
          color: colors.textPrimary,
          fontSize: 56,
          fontWeight: 800,
          fontFamily: fonts.display,
          textAlign: "center",
        }}
      />

      {/* Accent line */}
      <div
        style={{
          width: interpolate(frame, [60, 90], [0, 200], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: easings.maskReveal,
          }),
          height: 4,
          background: colors.primary,
          borderRadius: 2,
          opacity: lineOpacity,
        }}
      />
    </AbsoluteFill>
  );
};
```

- [ ] **Step 2: Add debug composition to Root.tsx**

```tsx
import { BrandReveal } from "./compositions/BrandReveal";

<Composition
  id="v2-Brand"
  component={BrandReveal}
  durationInFrames={SCENES.brandDur}
  fps={VIDEO.fps}
  width={VIDEO.width}
  height={VIDEO.height}
/>
```

- [ ] **Step 3: Preview and verify**

- [ ] **Step 4: Commit**

```bash
git add apps/demo-video/src/compositions/BrandReveal.tsx apps/demo-video/src/Root.tsx
git commit -m "feat(demo-video): add Brand Reveal scene with wordmark and tagline"
```

---

### Task 8: Scene 1 - Student Management (12-20s)

**Files:**
- Create: `apps/demo-video/src/compositions/Scene01Students.tsx`
- Modify: `apps/demo-video/src/Root.tsx`

- [ ] **Step 1: Write Scene01Students.tsx**

Split layout: headline left (38%), product UI right (62%). Web screenshot of student list cross-fading to add-student form.

```tsx
import { AbsoluteFill, useCurrentFrame, interpolate, Sequence } from "remotion";
import { colors, fonts, SCENES } from "../theme";
import { easings } from "../easings";
import { TypedText } from "../primitives/TypedText";
import { FeatureLabel } from "../primitives/FeatureLabel";
import { SlideIn } from "../primitives/SlideIn";
import { BrowserFrame } from "../primitives/DeviceFrame";
import { Screenshot } from "../primitives/Screenshot";

export const Scene01Students: React.FC = () => {
  const frame = useCurrentFrame();
  const dur = SCENES.scene1Dur;

  // Cross-fade between student list and add form at midpoint
  const formOpacity = interpolate(frame, [120, 150], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: easings.soft,
  });

  return (
    <AbsoluteFill style={{ background: colors.bgDark, display: "flex" }}>
      {/* Left panel - 38% */}
      <div
        style={{
          width: "38%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "0 60px",
          gap: 16,
        }}
      >
        <FeatureLabel label="Feature 1" startFrame={5} />
        <TypedText
          text="Add & manage every student"
          startFrame={15}
          perWord={10}
          style={{
            color: colors.textPrimary,
            fontSize: 42,
            fontWeight: 800,
            fontFamily: fonts.display,
            lineHeight: 1.2,
          }}
        />
        <TypedText
          text="Name, class, parent contact. Onboarded in seconds."
          startFrame={60}
          perWord={8}
          style={{
            color: colors.textSecondary,
            fontSize: 18,
            fontWeight: 400,
            fontFamily: fonts.ui,
            lineHeight: 1.5,
          }}
        />
        <div
          style={{
            width: 48,
            height: 3,
            background: colors.primary,
            borderRadius: 2,
            marginTop: 8,
            opacity: interpolate(frame, [80, 95], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
          }}
        />
      </div>

      {/* Right panel - 62% */}
      <div
        style={{
          width: "62%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
        }}
      >
        <SlideIn startFrame={10} direction="right" distance={80}>
          <div style={{ position: "relative" }}>
            {/* Student list */}
            <BrowserFrame width={720} height={480}>
              <Screenshot src="02-students.png" />
            </BrowserFrame>

            {/* Add student form overlays on top */}
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                opacity: formOpacity,
              }}
            >
              <BrowserFrame width={720} height={480}>
                <Screenshot src="08-add-student-form.png" />
              </BrowserFrame>
            </div>
          </div>
        </SlideIn>
      </div>
    </AbsoluteFill>
  );
};
```

- [ ] **Step 2: Register debug composition in Root.tsx**

```tsx
import { Scene01Students } from "./compositions/Scene01Students";

<Composition
  id="v2-Scene01"
  component={Scene01Students}
  durationInFrames={SCENES.scene1Dur}
  fps={VIDEO.fps}
  width={VIDEO.width}
  height={VIDEO.height}
/>
```

- [ ] **Step 3: Preview and verify**

- [ ] **Step 4: Commit**

```bash
git add apps/demo-video/src/compositions/Scene01Students.tsx apps/demo-video/src/Root.tsx
git commit -m "feat(demo-video): add Scene 1 - Student Management"
```

---

### Task 9: Scene 2 - Attendance (20-28s)

**Files:**
- Create: `apps/demo-video/src/compositions/Scene02Attendance.tsx`
- Modify: `apps/demo-video/src/Root.tsx`

- [ ] **Step 1: Write Scene02Attendance.tsx**

Teacher mobile attendance on the right, with parent calendar sliding in as smaller overlay.

```tsx
import { AbsoluteFill, useCurrentFrame, interpolate } from "remotion";
import { colors, fonts, SCENES } from "../theme";
import { easings } from "../easings";
import { TypedText } from "../primitives/TypedText";
import { FeatureLabel } from "../primitives/FeatureLabel";
import { SlideIn } from "../primitives/SlideIn";
import { PopIn } from "../primitives/PopIn";
import { PhoneFrame } from "../primitives/DeviceFrame";
import { Screenshot } from "../primitives/Screenshot";

export const Scene02Attendance: React.FC = () => {
  const frame = useCurrentFrame();

  // Parent overlay appears at frame 120 (4s in)
  const parentScale = interpolate(frame, [120, 150], [0.8, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: easings.slowInLand,
  });
  const parentOpacity = interpolate(frame, [120, 140], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ background: colors.bgDark, display: "flex" }}>
      {/* Left panel */}
      <div
        style={{
          width: "38%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "0 60px",
          gap: 16,
        }}
      >
        <FeatureLabel label="Feature 2" startFrame={5} />
        <TypedText
          text="Mark attendance in one tap"
          startFrame={15}
          perWord={10}
          style={{
            color: colors.textPrimary,
            fontSize: 42,
            fontWeight: 800,
            fontFamily: fonts.display,
            lineHeight: 1.2,
          }}
        />
        <TypedText
          text="Parents see it instantly on their phone."
          startFrame={60}
          perWord={8}
          style={{
            color: colors.textSecondary,
            fontSize: 18,
            fontWeight: 400,
            fontFamily: fonts.ui,
            lineHeight: 1.5,
          }}
        />
        <div
          style={{
            width: 48,
            height: 3,
            background: colors.primary,
            borderRadius: 2,
            marginTop: 8,
            opacity: interpolate(frame, [80, 95], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
          }}
        />
      </div>

      {/* Right panel */}
      <div
        style={{
          width: "62%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
        }}
      >
        {/* Teacher attendance phone */}
        <SlideIn startFrame={10} direction="up" distance={60}>
          <PhoneFrame width={280} height={580}>
            <Screenshot src="mobile-11-attendance.png" />
          </PhoneFrame>
        </SlideIn>

        {/* Parent calendar overlay - smaller, offset */}
        <div
          style={{
            position: "absolute",
            right: 40,
            bottom: 60,
            opacity: parentOpacity,
            transform: `scale(${parentScale})`,
          }}
        >
          <PopIn startFrame={120}>
            <div style={{ position: "relative" }}>
              <PhoneFrame width={220} height={460}>
                <Screenshot src="mobile-parent-02-attendance.png" />
              </PhoneFrame>
              <div
                style={{
                  position: "absolute",
                  top: -16,
                  right: -8,
                  background: colors.success,
                  borderRadius: 20,
                  padding: "4px 12px",
                  fontSize: 11,
                  fontWeight: 700,
                  color: "white",
                  fontFamily: fonts.ui,
                }}
              >
                Parents see it instantly
              </div>
            </div>
          </PopIn>
        </div>
      </div>
    </AbsoluteFill>
  );
};
```

- [ ] **Step 2: Register debug composition**

```tsx
import { Scene02Attendance } from "./compositions/Scene02Attendance";

<Composition
  id="v2-Scene02"
  component={Scene02Attendance}
  durationInFrames={SCENES.scene2Dur}
  fps={VIDEO.fps}
  width={VIDEO.width}
  height={VIDEO.height}
/>
```

- [ ] **Step 3: Preview and verify**

- [ ] **Step 4: Commit**

```bash
git add apps/demo-video/src/compositions/Scene02Attendance.tsx apps/demo-video/src/Root.tsx
git commit -m "feat(demo-video): add Scene 2 - Attendance with teacher/parent dual view"
```

---

### Task 10: Scene 3 - Homework & Academics (28-36s)

**Files:**
- Create: `apps/demo-video/src/compositions/Scene03Homework.tsx`
- Modify: `apps/demo-video/src/Root.tsx`

- [ ] **Step 1: Write Scene03Homework.tsx**

Shows teacher assigning homework on one side, parent receiving on the other. Counter animates the score.

```tsx
import { AbsoluteFill, useCurrentFrame, interpolate } from "remotion";
import { colors, fonts, SCENES } from "../theme";
import { easings } from "../easings";
import { TypedText } from "../primitives/TypedText";
import { FeatureLabel } from "../primitives/FeatureLabel";
import { SlideIn } from "../primitives/SlideIn";
import { PopIn } from "../primitives/PopIn";
import { Counter } from "../primitives/Counter";
import { PhoneFrame, BrowserFrame } from "../primitives/DeviceFrame";
import { Screenshot } from "../primitives/Screenshot";

export const Scene03Homework: React.FC = () => {
  const frame = useCurrentFrame();

  // Arrow animation
  const arrowX = interpolate(frame, [90, 120], [0, 60], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: easings.standard,
  });
  const arrowOpacity = interpolate(frame, [85, 95], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Results card appears
  const resultsOpacity = interpolate(frame, [150, 170], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ background: colors.bgDark, display: "flex" }}>
      {/* Left panel */}
      <div
        style={{
          width: "38%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "0 60px",
          gap: 16,
        }}
      >
        <FeatureLabel label="Feature 3" startFrame={5} />
        <TypedText
          text="Assign homework. Track results."
          startFrame={15}
          perWord={10}
          style={{
            color: colors.textPrimary,
            fontSize: 42,
            fontWeight: 800,
            fontFamily: fonts.display,
            lineHeight: 1.2,
          }}
        />
        {/* Score counter */}
        <div style={{ opacity: resultsOpacity, marginTop: 16 }}>
          <div style={{ color: colors.textSecondary, fontSize: 14, fontFamily: fonts.ui, marginBottom: 4 }}>
            Mid-Term Score
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
            <Counter
              startFrame={155}
              duration={30}
              to={416}
              style={{ color: colors.primary, fontSize: 48, fontWeight: 800, fontFamily: fonts.display }}
            />
            <span style={{ color: colors.textSecondary, fontSize: 24, fontFamily: fonts.ui }}>/500</span>
          </div>
          <div style={{ color: colors.success, fontSize: 16, fontWeight: 600, fontFamily: fonts.ui, marginTop: 4 }}>
            Rank 3 of 11
          </div>
        </div>
      </div>

      {/* Right panel - homework flow */}
      <div
        style={{
          width: "62%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 24,
          position: "relative",
        }}
      >
        {/* Teacher web view */}
        <SlideIn startFrame={10} direction="left" distance={60}>
          <BrowserFrame width={380} height={320} url="school1.erp.app/academics">
            <Screenshot src="06-academics.png" />
          </BrowserFrame>
        </SlideIn>

        {/* Arrow */}
        <div
          style={{
            fontSize: 32,
            color: colors.primary,
            opacity: arrowOpacity,
            transform: `translateX(${arrowX - 30}px)`,
          }}
        >
          →
        </div>

        {/* Parent homework view */}
        <SlideIn startFrame={90} direction="right" distance={60}>
          <PhoneFrame width={220} height={460}>
            <Screenshot src="mobile-parent-04b-homework-detail.png" />
          </PhoneFrame>
        </SlideIn>
      </div>
    </AbsoluteFill>
  );
};
```

- [ ] **Step 2: Register debug composition**

```tsx
import { Scene03Homework } from "./compositions/Scene03Homework";

<Composition
  id="v2-Scene03"
  component={Scene03Homework}
  durationInFrames={SCENES.scene3Dur}
  fps={VIDEO.fps}
  width={VIDEO.width}
  height={VIDEO.height}
/>
```

- [ ] **Step 3: Preview and verify**

- [ ] **Step 4: Commit**

```bash
git add apps/demo-video/src/compositions/Scene03Homework.tsx apps/demo-video/src/Root.tsx
git commit -m "feat(demo-video): add Scene 3 - Homework & Academics with score counter"
```

---

### Task 11: Scene 4 - Fees & Payments (36-44s)

**Files:**
- Create: `apps/demo-video/src/compositions/Scene04Fees.tsx`
- Modify: `apps/demo-video/src/Root.tsx`

- [ ] **Step 1: Write Scene04Fees.tsx**

```tsx
import { AbsoluteFill, useCurrentFrame, interpolate } from "remotion";
import { colors, fonts, SCENES } from "../theme";
import { easings } from "../easings";
import { TypedText } from "../primitives/TypedText";
import { FeatureLabel } from "../primitives/FeatureLabel";
import { SlideIn } from "../primitives/SlideIn";
import { PopIn } from "../primitives/PopIn";
import { Counter } from "../primitives/Counter";
import { PhoneFrame } from "../primitives/DeviceFrame";
import { Screenshot } from "../primitives/Screenshot";

export const Scene04Fees: React.FC = () => {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill style={{ background: colors.bgDark, display: "flex" }}>
      {/* Left panel */}
      <div
        style={{
          width: "38%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "0 60px",
          gap: 16,
        }}
      >
        <FeatureLabel label="Feature 4" startFrame={5} />
        <TypedText
          text="Fees collected. Parents notified."
          startFrame={15}
          perWord={10}
          style={{
            color: colors.textPrimary,
            fontSize: 42,
            fontWeight: 800,
            fontFamily: fonts.display,
            lineHeight: 1.2,
          }}
        />
        <TypedText
          text="Track every payment. Zero outstanding."
          startFrame={60}
          perWord={8}
          style={{
            color: colors.textSecondary,
            fontSize: 18,
            fontWeight: 400,
            fontFamily: fonts.ui,
            lineHeight: 1.5,
          }}
        />
        {/* Fee counter */}
        <div style={{ marginTop: 16 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
            <span style={{ color: colors.textSecondary, fontSize: 14, fontFamily: fonts.ui }}>Collected</span>
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
            <span style={{ color: colors.success, fontSize: 16, fontFamily: fonts.ui }}>₹</span>
            <Counter
              startFrame={90}
              duration={30}
              from={0}
              to={22500}
              style={{ color: colors.success, fontSize: 40, fontWeight: 800, fontFamily: fonts.display }}
            />
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div
        style={{
          width: "62%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
        }}
      >
        <SlideIn startFrame={10} direction="up" distance={60}>
          <PhoneFrame width={300} height={620}>
            <Screenshot src="mobile-parent-05-fees.png" />
          </PhoneFrame>
        </SlideIn>

        {/* "Paid" badges pop in */}
        {[0, 1, 2].map((i) => (
          <PopIn key={i} startFrame={120 + i * 15}>
            <div
              style={{
                position: "absolute",
                right: 80 + i * 20,
                top: 180 + i * 70,
                background: colors.success,
                borderRadius: 12,
                padding: "4px 10px",
                fontSize: 11,
                fontWeight: 700,
                color: "white",
                fontFamily: fonts.ui,
              }}
            >
              Paid ✓
            </div>
          </PopIn>
        ))}
      </div>
    </AbsoluteFill>
  );
};
```

- [ ] **Step 2: Register debug composition**

```tsx
import { Scene04Fees } from "./compositions/Scene04Fees";

<Composition
  id="v2-Scene04"
  component={Scene04Fees}
  durationInFrames={SCENES.scene4Dur}
  fps={VIDEO.fps}
  width={VIDEO.width}
  height={VIDEO.height}
/>
```

- [ ] **Step 3: Preview and verify**

- [ ] **Step 4: Commit**

```bash
git add apps/demo-video/src/compositions/Scene04Fees.tsx apps/demo-video/src/Root.tsx
git commit -m "feat(demo-video): add Scene 4 - Fees & Payments with paid badges"
```

---

### Task 12: Scene 5 - Announcements (44-52s)

**Files:**
- Create: `apps/demo-video/src/compositions/Scene05Announcements.tsx`
- Modify: `apps/demo-video/src/Root.tsx`

- [ ] **Step 1: Write Scene05Announcements.tsx**

Web announcements sending to parent mobile. Notification pop animation.

```tsx
import { AbsoluteFill, useCurrentFrame, interpolate } from "remotion";
import { colors, fonts, SCENES } from "../theme";
import { easings } from "../easings";
import { TypedText } from "../primitives/TypedText";
import { FeatureLabel } from "../primitives/FeatureLabel";
import { SlideIn } from "../primitives/SlideIn";
import { PopIn } from "../primitives/PopIn";
import { PhoneFrame, BrowserFrame } from "../primitives/DeviceFrame";
import { Screenshot } from "../primitives/Screenshot";

export const Scene05Announcements: React.FC = () => {
  const frame = useCurrentFrame();

  // Notification bell animation
  const bellScale = interpolate(
    frame,
    [130, 135, 140, 145, 150],
    [1, 1.2, 0.9, 1.1, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  return (
    <AbsoluteFill style={{ background: colors.bgDark, display: "flex" }}>
      {/* Left panel */}
      <div
        style={{
          width: "38%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "0 60px",
          gap: 16,
        }}
      >
        <FeatureLabel label="Feature 5" startFrame={5} />
        <TypedText
          text="Keep everyone in the loop"
          startFrame={15}
          perWord={10}
          style={{
            color: colors.textPrimary,
            fontSize: 42,
            fontWeight: 800,
            fontFamily: fonts.display,
            lineHeight: 1.2,
          }}
        />
        <TypedText
          text="Announcements reach every parent instantly."
          startFrame={60}
          perWord={8}
          style={{
            color: colors.textSecondary,
            fontSize: 18,
            fontWeight: 400,
            fontFamily: fonts.ui,
            lineHeight: 1.5,
          }}
        />
        <div
          style={{
            width: 48,
            height: 3,
            background: colors.primary,
            borderRadius: 2,
            marginTop: 8,
            opacity: interpolate(frame, [80, 95], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
          }}
        />
      </div>

      {/* Right panel */}
      <div
        style={{
          width: "62%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 32,
          position: "relative",
        }}
      >
        {/* Web announcements */}
        <SlideIn startFrame={10} direction="left" distance={60}>
          <BrowserFrame width={400} height={340} url="school1.erp.app/announcements">
            <Screenshot src="07-announcements.png" />
          </BrowserFrame>
        </SlideIn>

        {/* Arrow with notification bell */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
          <div
            style={{
              fontSize: 24,
              transform: `scale(${bellScale})`,
              opacity: interpolate(frame, [125, 135], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              }),
            }}
          >
            🔔
          </div>
          <div
            style={{
              fontSize: 28,
              color: colors.primary,
              opacity: interpolate(frame, [100, 110], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              }),
            }}
          >
            →
          </div>
        </div>

        {/* Parent mobile view */}
        <SlideIn startFrame={100} direction="right" distance={60}>
          <PhoneFrame width={220} height={460}>
            <Screenshot src="mobile-parent-07-announcements.png" />
          </PhoneFrame>
        </SlideIn>
      </div>
    </AbsoluteFill>
  );
};
```

- [ ] **Step 2: Register debug composition**

```tsx
import { Scene05Announcements } from "./compositions/Scene05Announcements";

<Composition
  id="v2-Scene05"
  component={Scene05Announcements}
  durationInFrames={SCENES.scene5Dur}
  fps={VIDEO.fps}
  width={VIDEO.width}
  height={VIDEO.height}
/>
```

- [ ] **Step 3: Preview and verify**

- [ ] **Step 4: Commit**

```bash
git add apps/demo-video/src/compositions/Scene05Announcements.tsx apps/demo-video/src/Root.tsx
git commit -m "feat(demo-video): add Scene 5 - Announcements with notification pop"
```

---

### Task 13: Close Scene (52-60s)

**Files:**
- Create: `apps/demo-video/src/compositions/CloseScene.tsx`
- Modify: `apps/demo-video/src/Root.tsx`

- [ ] **Step 1: Write CloseScene.tsx**

Summary of all 5 features in a row, then tagline and CTA.

```tsx
import { AbsoluteFill, useCurrentFrame, interpolate } from "remotion";
import { colors, fonts, SCENES } from "../theme";
import { easings } from "../easings";
import { TypedText } from "../primitives/TypedText";
import { PopIn } from "../primitives/PopIn";

const FEATURES = [
  { icon: "👨‍🎓", label: "Students" },
  { icon: "📋", label: "Attendance" },
  { icon: "📚", label: "Homework" },
  { icon: "💰", label: "Fees" },
  { icon: "📢", label: "Alerts" },
];

export const CloseScene: React.FC = () => {
  const frame = useCurrentFrame();

  const taglineOpacity = interpolate(frame, [100, 120], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        background: colors.bgDark,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 48,
      }}
    >
      {/* Feature icons row */}
      <div style={{ display: "flex", gap: 40, alignItems: "center" }}>
        {FEATURES.map((f, i) => (
          <PopIn key={i} startFrame={10 + i * 12}>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 8,
              }}
            >
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 16,
                  background: "rgba(99,102,241,0.15)",
                  border: "1px solid rgba(99,102,241,0.3)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 28,
                }}
              >
                {f.icon}
              </div>
              <span
                style={{
                  color: colors.textSecondary,
                  fontSize: 13,
                  fontWeight: 600,
                  fontFamily: fonts.ui,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                }}
              >
                {f.label}
              </span>
            </div>
          </PopIn>
        ))}
      </div>

      {/* Tagline */}
      <div style={{ opacity: taglineOpacity, textAlign: "center" }}>
        <TypedText
          text="Your school. Fully managed."
          startFrame={100}
          perWord={12}
          style={{
            color: colors.textPrimary,
            fontSize: 56,
            fontWeight: 800,
            fontFamily: fonts.display,
          }}
        />
      </div>

      {/* CTA */}
      <div
        style={{
          opacity: interpolate(frame, [160, 180], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 8,
        }}
      >
        <div
          style={{
            background: colors.primary,
            borderRadius: 12,
            padding: "12px 32px",
            color: "white",
            fontSize: 18,
            fontWeight: 700,
            fontFamily: fonts.ui,
          }}
        >
          Book a Demo
        </div>
        <span
          style={{
            color: colors.textSecondary,
            fontSize: 14,
            fontFamily: fonts.ui,
          }}
        >
          School ERP
        </span>
      </div>
    </AbsoluteFill>
  );
};
```

- [ ] **Step 2: Register debug composition**

```tsx
import { CloseScene } from "./compositions/CloseScene";

<Composition
  id="v2-Close"
  component={CloseScene}
  durationInFrames={SCENES.closeDur}
  fps={VIDEO.fps}
  width={VIDEO.width}
  height={VIDEO.height}
/>
```

- [ ] **Step 3: Preview and verify**

- [ ] **Step 4: Commit**

```bash
git add apps/demo-video/src/compositions/CloseScene.tsx apps/demo-video/src/Root.tsx
git commit -m "feat(demo-video): add Close scene with feature summary and CTA"
```

---

### Task 14: Wire Master Composition

**Files:**
- Modify: `apps/demo-video/src/compositions/Master.tsx`

- [ ] **Step 1: Rewrite Master.tsx with all scenes sequenced**

```tsx
import { AbsoluteFill, Audio, Sequence, interpolate, staticFile } from "remotion";
import { VIDEO, SCENES } from "../theme";
import { HookScene } from "./HookScene";
import { BrandReveal } from "./BrandReveal";
import { Scene01Students } from "./Scene01Students";
import { Scene02Attendance } from "./Scene02Attendance";
import { Scene03Homework } from "./Scene03Homework";
import { Scene04Fees } from "./Scene04Fees";
import { Scene05Announcements } from "./Scene05Announcements";
import { CloseScene } from "./CloseScene";

export const Master: React.FC = () => (
  <AbsoluteFill>
    <Audio
      src={staticFile("soundtrack.mp3")}
      volume={(f) =>
        interpolate(f, [VIDEO.totalFrames - 18, VIDEO.totalFrames], [0.6, 0], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        })
      }
    />

    <Sequence from={SCENES.hookStart} durationInFrames={SCENES.hookDur}>
      <HookScene />
    </Sequence>

    <Sequence from={SCENES.brandStart} durationInFrames={SCENES.brandDur}>
      <BrandReveal />
    </Sequence>

    <Sequence from={SCENES.scene1Start} durationInFrames={SCENES.scene1Dur}>
      <Scene01Students />
    </Sequence>

    <Sequence from={SCENES.scene2Start} durationInFrames={SCENES.scene2Dur}>
      <Scene02Attendance />
    </Sequence>

    <Sequence from={SCENES.scene3Start} durationInFrames={SCENES.scene3Dur}>
      <Scene03Homework />
    </Sequence>

    <Sequence from={SCENES.scene4Start} durationInFrames={SCENES.scene4Dur}>
      <Scene04Fees />
    </Sequence>

    <Sequence from={SCENES.scene5Start} durationInFrames={SCENES.scene5Dur}>
      <Scene05Announcements />
    </Sequence>

    <Sequence from={SCENES.closeStart} durationInFrames={SCENES.closeDur}>
      <CloseScene />
    </Sequence>
  </AbsoluteFill>
);
```

- [ ] **Step 2: Verify typecheck passes**

```bash
cd apps/demo-video && pnpm typecheck
```

- [ ] **Step 3: Preview full Master composition in Studio**

Scrub through the entire 60 seconds. Verify scenes transition at correct timestamps.

- [ ] **Step 4: Commit**

```bash
git add apps/demo-video/src/compositions/Master.tsx
git commit -m "feat(demo-video): wire all scenes into Master composition with audio"
```

---

### Task 15: Final Render and Polish

**Files:**
- Modify: various scene files for timing tweaks
- Output: `apps/demo-video/out/demo.mp4`

- [ ] **Step 1: Run a test render at lower quality**

```bash
cd apps/demo-video && npx remotion render Master out/demo-preview.mp4 --crf=28
```

Watch the output. Check for:
- Scene transitions landing on beat
- Screenshots rendering correctly (no blank frames)
- Text readable at all sizes
- No visual glitches

- [ ] **Step 2: Adjust timing if needed**

If scenes feel too fast or too slow, adjust constants in `theme.ts`. All changes propagate automatically.

- [ ] **Step 3: Final HD render**

```bash
cd apps/demo-video && npx remotion render Master out/demo.mp4 --image-format=png --crf=14
```

- [ ] **Step 4: Commit final state**

```bash
git add apps/demo-video/
git commit -m "feat(demo-video): final render-ready state with all scenes polished"
```

---

## Dependency Graph

```
Task 1 (scaffold)
  → Task 2 (theme/easings)
    → Task 3 (soundtrack/beats) [requires human: pick soundtrack]
    → Task 4 (primitives)
      → Task 5 (Root + placeholder Master)
        → Tasks 6-13 (scenes, can be parallelized)
          → Task 14 (wire Master)
            → Task 15 (render + polish)
```

Tasks 6-13 (individual scenes) are independent once primitives exist and can be built in parallel.
