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
