import { AbsoluteFill, useCurrentFrame, interpolate } from "remotion";
import { colors, fonts } from "../theme";
import { easings } from "../easings";
import { TypedText } from "../primitives/TypedText";
import { FeatureLabel } from "../primitives/FeatureLabel";
import { SlideIn } from "../primitives/SlideIn";
import { BrowserFrame } from "../primitives/DeviceFrame";
import { Screenshot } from "../primitives/Screenshot";

export const Scene01Students: React.FC = () => {
  const frame = useCurrentFrame();

  const formOpacity = interpolate(frame, [120, 150], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: easings.soft,
  });

  return (
    <AbsoluteFill style={{ background: colors.bgDark, display: "flex" }}>
      <div style={{ width: "38%", display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 60px", gap: 16 }}>
        <FeatureLabel label="Feature 1" startFrame={5} />
        <TypedText
          text="Add & manage every student"
          startFrame={15}
          perWord={10}
          style={{ color: colors.textPrimary, fontSize: 42, fontWeight: 800, fontFamily: fonts.display, lineHeight: 1.2 }}
        />
        <TypedText
          text="Name, class, parent contact. Onboarded in seconds."
          startFrame={60}
          perWord={8}
          style={{ color: colors.textSecondary, fontSize: 18, fontWeight: 400, fontFamily: fonts.ui, lineHeight: 1.5 }}
        />
        <div style={{ width: 48, height: 3, background: colors.primary, borderRadius: 2, marginTop: 8, opacity: interpolate(frame, [80, 95], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) }} />
      </div>

      <div style={{ width: "62%", display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
        <SlideIn startFrame={10} direction="right" distance={80}>
          <div style={{ position: "relative" }}>
            <BrowserFrame width={720} height={480}>
              <Screenshot src="02-students.png" />
            </BrowserFrame>
            <div style={{ position: "absolute", top: 0, left: 0, opacity: formOpacity }}>
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
