import { Img, staticFile } from "remotion";

export const Screenshot: React.FC<{
  src: string;
  width?: number;
  height?: number;
  style?: React.CSSProperties;
}> = ({ src, width, height, style }) => {
  return (
    <Img
      src={staticFile(`screenshots/${src}`)}
      style={{
        width: width ?? "100%",
        height: height ?? "100%",
        objectFit: "cover",
        ...style,
      }}
    />
  );
};
