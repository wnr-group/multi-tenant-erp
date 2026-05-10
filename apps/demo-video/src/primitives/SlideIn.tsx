import { useCurrentFrame, interpolate } from "remotion";
import { easings } from "../easings";

export const SlideIn: React.FC<{
  startFrame: number;
  duration?: number;
  direction?: "left" | "right" | "up" | "down";
  distance?: number;
  children: React.ReactNode;
}> = ({ startFrame, duration = 15, direction = "up", distance = 40, children }) => {
  const frame = useCurrentFrame();
  const p = interpolate(frame - startFrame, [0, duration], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: easings.slowInLand,
  });

  const transforms: Record<string, string> = {
    left: `translateX(${(1 - p) * -distance}px)`,
    right: `translateX(${(1 - p) * distance}px)`,
    up: `translateY(${(1 - p) * distance}px)`,
    down: `translateY(${(1 - p) * -distance}px)`,
  };

  return (
    <div style={{ transform: transforms[direction], opacity: p }}>
      {children}
    </div>
  );
};
