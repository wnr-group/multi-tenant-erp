import { AbsoluteFill, useCurrentFrame, interpolate } from "remotion";
import { colors, fonts } from "../theme";
import { easings } from "../easings";
import { TypedText } from "../primitives/TypedText";
import { SlideIn } from "../primitives/SlideIn";
import { BrowserFrame } from "../primitives/DeviceFrame";
import { Screenshot } from "../primitives/Screenshot";

export const HookScene: React.FC = () => {
  const frame = useCurrentFrame();

  const painOpacity = interpolate(frame, [100, 130], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const solutionOpacity = interpolate(frame, [120, 150], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: easings.soft,
  });

  return (
    <AbsoluteFill style={{ background: colors.bgDark }}>
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
          style={{ color: colors.textPrimary, fontSize: 52, fontWeight: 800, fontFamily: fonts.display, textAlign: "center" }}
        />
        <div style={{ height: 24 }} />
        <TypedText
          text="On WhatsApp groups?"
          startFrame={50}
          perWord={8}
          style={{ color: colors.error, fontSize: 44, fontWeight: 700, fontFamily: fonts.display, textAlign: "center" }}
        />
      </AbsoluteFill>

      <AbsoluteFill
        style={{ display: "flex", alignItems: "center", justifyContent: "center", opacity: solutionOpacity }}
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
