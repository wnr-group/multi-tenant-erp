import { AbsoluteFill, useCurrentFrame, interpolate } from "remotion";
import { colors, fonts } from "../theme";
import { easings } from "../easings";
import { TypedText } from "../primitives/TypedText";
import { PopIn } from "../primitives/PopIn";

export const BrandReveal: React.FC = () => {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill
      style={{ background: colors.bgDark, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 24 }}
    >
      <PopIn startFrame={5}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 48, height: 48, background: colors.primary, borderRadius: 10 }} />
          <span style={{ color: colors.textPrimary, fontSize: 32, fontWeight: 700, fontFamily: fonts.display, letterSpacing: "0.06em", textTransform: "uppercase" }}>
            School ERP
          </span>
        </div>
      </PopIn>

      <TypedText
        text="One platform. Everything managed."
        startFrame={30}
        perWord={10}
        style={{ color: colors.textPrimary, fontSize: 56, fontWeight: 800, fontFamily: fonts.display, textAlign: "center" }}
      />

      <div
        style={{
          width: interpolate(frame, [60, 90], [0, 200], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: easings.maskReveal }),
          height: 4,
          background: colors.primary,
          borderRadius: 2,
        }}
      />
    </AbsoluteFill>
  );
};
