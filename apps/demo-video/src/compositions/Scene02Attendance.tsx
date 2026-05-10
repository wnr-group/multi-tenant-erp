import { AbsoluteFill, useCurrentFrame, interpolate } from "remotion";
import { colors, fonts } from "../theme";
import { easings } from "../easings";
import { TypedText } from "../primitives/TypedText";
import { FeatureLabel } from "../primitives/FeatureLabel";
import { SlideIn } from "../primitives/SlideIn";
import { PopIn } from "../primitives/PopIn";
import { PhoneFrame } from "../primitives/DeviceFrame";
import { Screenshot } from "../primitives/Screenshot";

export const Scene02Attendance: React.FC = () => {
  const frame = useCurrentFrame();

  const parentOpacity = interpolate(frame, [120, 140], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ background: colors.bgDark, display: "flex" }}>
      <div style={{ width: "38%", display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 60px", gap: 16 }}>
        <FeatureLabel label="Feature 2" startFrame={5} />
        <TypedText
          text="Mark attendance in one tap"
          startFrame={15}
          perWord={10}
          style={{ color: colors.textPrimary, fontSize: 42, fontWeight: 800, fontFamily: fonts.display, lineHeight: 1.2 }}
        />
        <TypedText
          text="Parents see it instantly on their phone."
          startFrame={60}
          perWord={8}
          style={{ color: colors.textSecondary, fontSize: 18, fontWeight: 400, fontFamily: fonts.ui, lineHeight: 1.5 }}
        />
        <div style={{ width: 48, height: 3, background: colors.primary, borderRadius: 2, marginTop: 8, opacity: interpolate(frame, [80, 95], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) }} />
      </div>

      <div style={{ width: "62%", display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
        <SlideIn startFrame={10} direction="up" distance={60}>
          <PhoneFrame width={280} height={580}>
            <Screenshot src="mobile-11-attendance.png" />
          </PhoneFrame>
        </SlideIn>

        <div style={{ position: "absolute", right: 40, bottom: 60, opacity: parentOpacity }}>
          <PopIn startFrame={120}>
            <div style={{ position: "relative" }}>
              <PhoneFrame width={220} height={460}>
                <Screenshot src="mobile-parent-02-attendance.png" />
              </PhoneFrame>
              <div style={{ position: "absolute", top: -16, right: -8, background: colors.success, borderRadius: 20, padding: "4px 12px", fontSize: 11, fontWeight: 700, color: "white", fontFamily: fonts.ui }}>
                Parents see it instantly
              </div>
            </div>
          </PopIn>
        </div>
      </div>
    </AbsoluteFill>
  );
};
