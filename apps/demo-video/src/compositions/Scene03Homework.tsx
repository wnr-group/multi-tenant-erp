import { AbsoluteFill, useCurrentFrame, interpolate } from "remotion";
import { colors, fonts } from "../theme";
import { easings } from "../easings";
import { TypedText } from "../primitives/TypedText";
import { FeatureLabel } from "../primitives/FeatureLabel";
import { SlideIn } from "../primitives/SlideIn";
import { Counter } from "../primitives/Counter";
import { PhoneFrame, BrowserFrame } from "../primitives/DeviceFrame";
import { Screenshot } from "../primitives/Screenshot";

export const Scene03Homework: React.FC = () => {
  const frame = useCurrentFrame();

  const arrowOpacity = interpolate(frame, [85, 95], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const resultsOpacity = interpolate(frame, [150, 170], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ background: colors.bgDark, display: "flex" }}>
      <div style={{ width: "38%", display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 60px", gap: 16 }}>
        <FeatureLabel label="Feature 3" startFrame={5} />
        <TypedText
          text="Assign homework. Track results."
          startFrame={15}
          perWord={10}
          style={{ color: colors.textPrimary, fontSize: 42, fontWeight: 800, fontFamily: fonts.display, lineHeight: 1.2 }}
        />
        <div style={{ opacity: resultsOpacity, marginTop: 16 }}>
          <div style={{ color: colors.textSecondary, fontSize: 14, fontFamily: fonts.ui, marginBottom: 4 }}>Mid-Term Score</div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
            <Counter startFrame={155} duration={30} to={416} style={{ color: colors.primary, fontSize: 48, fontWeight: 800, fontFamily: fonts.display }} />
            <span style={{ color: colors.textSecondary, fontSize: 24, fontFamily: fonts.ui }}>/500</span>
          </div>
          <div style={{ color: colors.success, fontSize: 16, fontWeight: 600, fontFamily: fonts.ui, marginTop: 4 }}>Rank 3 of 11</div>
        </div>
      </div>

      <div style={{ width: "62%", display: "flex", alignItems: "center", justifyContent: "center", gap: 24 }}>
        <SlideIn startFrame={10} direction="left" distance={60}>
          <BrowserFrame width={380} height={320} url="school1.erp.app/academics">
            <Screenshot src="06-academics.png" />
          </BrowserFrame>
        </SlideIn>

        <div style={{ fontSize: 32, color: colors.primary, opacity: arrowOpacity }}>→</div>

        <SlideIn startFrame={90} direction="right" distance={60}>
          <PhoneFrame width={220} height={460}>
            <Screenshot src="mobile-parent-04b-homework-detail.png" />
          </PhoneFrame>
        </SlideIn>
      </div>
    </AbsoluteFill>
  );
};
