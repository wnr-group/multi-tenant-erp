export const VIDEO = {
  width: 1920,
  height: 1080,
  fps: 30,
  totalFrames: 1800,
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

export const SCENES = {
  hookStart: 0,        hookDur: 240,
  brandStart: 240,     brandDur: 120,
  scene1Start: 360,    scene1Dur: 240,
  scene2Start: 600,    scene2Dur: 240,
  scene3Start: 840,    scene3Dur: 240,
  scene4Start: 1080,   scene4Dur: 240,
  scene5Start: 1320,   scene5Dur: 240,
  closeStart: 1560,    closeDur: 240,
  // Sum: 240+120+240+240+240+240+240+240 = 1800 ✓
} as const;

export const FRAMES_PER_BEAT = 15;
export const SNARE_PHASE = 30;
export const KICK_PHASE = 15;

export const isSnare = (masterFrame: number): boolean =>
  masterFrame >= SNARE_PHASE &&
  (masterFrame - SNARE_PHASE) % (FRAMES_PER_BEAT * 2) === 0;

export const isKick = (masterFrame: number): boolean =>
  masterFrame >= KICK_PHASE &&
  (masterFrame - KICK_PHASE) % (FRAMES_PER_BEAT * 2) === 0;
