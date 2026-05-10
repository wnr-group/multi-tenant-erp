import { AbsoluteFill } from "remotion";
import { colors, fonts } from "../theme";

export const Master: React.FC = () => (
  <AbsoluteFill style={{ background: colors.bgDark, display: "flex", alignItems: "center", justifyContent: "center" }}>
    <h1 style={{ color: colors.textPrimary, fontFamily: fonts.display, fontSize: 48 }}>
      School ERP Demo - Building...
    </h1>
  </AbsoluteFill>
);
