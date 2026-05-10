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
