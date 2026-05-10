import { useCurrentFrame, interpolate } from "remotion";
import { easings } from "../easings";

export const Counter: React.FC<{
  startFrame: number;
  duration?: number;
  from?: number;
  to: number;
  prefix?: string;
  suffix?: string;
  style?: React.CSSProperties;
}> = ({ startFrame, duration = 30, from = 0, to, prefix = "", suffix = "", style }) => {
  const frame = useCurrentFrame();
  const p = interpolate(frame - startFrame, [0, duration], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: easings.slowInLand,
  });

  const value = Math.round(from + (to - from) * p);

  return <span style={style}>{prefix}{value}{suffix}</span>;
};
