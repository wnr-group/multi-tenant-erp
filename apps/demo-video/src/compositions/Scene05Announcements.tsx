import { AbsoluteFill, useCurrentFrame, interpolate } from "remotion";
import { colors, fonts } from "../theme";
import { easings } from "../easings";
import { TypedText } from "../primitives/TypedText";
import { FeatureLabel } from "../primitives/FeatureLabel";
import { SlideIn } from "../primitives/SlideIn";
import { PhoneFrame, BrowserFrame } from "../primitives/DeviceFrame";
import { Screenshot } from "../primitives/Screenshot";

export const Scene05Announcements: React.FC = () => {
  const frame = useCurrentFrame();

  const bellScale = interpolate(
    frame,
    [130, 135, 140, 145, 150],
    [1, 1.2, 0.9, 1.1, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  return (
    <AbsoluteFill style={{ background: colors.bgDark, display: "flex" }}>
      <div style={{ width: "38%", display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 60px", gap: 16 }}>
        <FeatureLabel label="Feature 5" startFrame={5} />
        <TypedText
          text="Keep everyone in the loop"
          startFrame={15}
          perWord={10}
          style={{ color: colors.textPrimary, fontSize: 42, fontWeight: 800, fontFamily: fonts.display, lineHeight: 1.2 }}
        />
        <TypedText
          text="Announcements reach every parent instantly."
          startFrame={60}
          perWord={8}
          style={{ color: colors.textSecondary, fontSize: 18, fontWeight: 400, fontFamily: fonts.ui, lineHeight: 1.5 }}
        />
        <div style={{ width: 48, height: 3, background: colors.primary, borderRadius: 2, marginTop: 8, opacity: interpolate(frame, [80, 95], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) }} />
      </div>

      <div style={{ width: "62%", display: "flex", alignItems: "center", justifyContent: "center", gap: 32 }}>
        <SlideIn startFrame={10} direction="left" distance={60}>
          <BrowserFrame width={400} height={340} url="school1.erp.app/announcements">
            <Screenshot src="07-announcements.png" />
          </BrowserFrame>
        </SlideIn>

        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
          <div style={{ fontSize: 24, transform: `scale(${bellScale})`, opacity: interpolate(frame, [125, 135], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) }}>
            🔔
          </div>
          <div style={{ fontSize: 28, color: colors.primary, opacity: interpolate(frame, [100, 110], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) }}>
            →
          </div>
        </div>

        <SlideIn startFrame={100} direction="right" distance={60}>
          <PhoneFrame width={220} height={460}>
            <Screenshot src="mobile-parent-07-announcements.png" />
          </PhoneFrame>
        </SlideIn>
      </div>
    </AbsoluteFill>
  );
};
