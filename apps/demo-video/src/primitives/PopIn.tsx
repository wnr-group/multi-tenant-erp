import { spring, useCurrentFrame, useVideoConfig } from "remotion";

export const PopIn: React.FC<{
  startFrame: number;
  children: React.ReactNode;
  config?: { damping?: number; stiffness?: number; mass?: number };
}> = ({ startFrame, children, config = {} }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const s = spring({
    frame: frame - startFrame,
    fps,
    config: { damping: 12, stiffness: 180, mass: 0.7, ...config },
  });

  return (
    <div style={{ transform: `scale(${s})`, opacity: s, transformOrigin: "center" }}>
      {children}
    </div>
  );
};
