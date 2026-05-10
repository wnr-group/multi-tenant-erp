import { AbsoluteFill, useCurrentFrame, interpolate } from "remotion";
import { colors, fonts } from "../theme";
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
      style={{ background: colors.bgDark, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 48 }}
    >
      <div style={{ display: "flex", gap: 40, alignItems: "center" }}>
        {FEATURES.map((f, i) => (
          <PopIn key={i} startFrame={10 + i * 12}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
              <div style={{ width: 64, height: 64, borderRadius: 16, background: "rgba(99,102,241,0.15)", border: "1px solid rgba(99,102,241,0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28 }}>
                {f.icon}
              </div>
              <span style={{ color: colors.textSecondary, fontSize: 13, fontWeight: 600, fontFamily: fonts.ui, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                {f.label}
              </span>
            </div>
          </PopIn>
        ))}
      </div>

      <div style={{ opacity: taglineOpacity, textAlign: "center" }}>
        <TypedText
          text="Your school. Fully managed."
          startFrame={100}
          perWord={12}
          style={{ color: colors.textPrimary, fontSize: 56, fontWeight: 800, fontFamily: fonts.display }}
        />
      </div>

      <div style={{ opacity: interpolate(frame, [160, 180], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }), display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
        <div style={{ background: colors.primary, borderRadius: 12, padding: "12px 32px", color: "white", fontSize: 18, fontWeight: 700, fontFamily: fonts.ui }}>
          Book a Demo
        </div>
        <span style={{ color: colors.textSecondary, fontSize: 14, fontFamily: fonts.ui }}>School ERP</span>
      </div>
    </AbsoluteFill>
  );
};
