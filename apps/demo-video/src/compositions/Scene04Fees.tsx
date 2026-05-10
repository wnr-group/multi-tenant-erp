import { AbsoluteFill, useCurrentFrame, interpolate } from "remotion";
import { colors, fonts } from "../theme";
import { TypedText } from "../primitives/TypedText";
import { FeatureLabel } from "../primitives/FeatureLabel";
import { SlideIn } from "../primitives/SlideIn";
import { PopIn } from "../primitives/PopIn";
import { Counter } from "../primitives/Counter";
import { PhoneFrame } from "../primitives/DeviceFrame";
import { Screenshot } from "../primitives/Screenshot";

export const Scene04Fees: React.FC = () => {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill style={{ background: colors.bgDark, display: "flex" }}>
      <div style={{ width: "38%", display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 60px", gap: 16 }}>
        <FeatureLabel label="Feature 4" startFrame={5} />
        <TypedText
          text="Fees collected. Parents notified."
          startFrame={15}
          perWord={10}
          style={{ color: colors.textPrimary, fontSize: 42, fontWeight: 800, fontFamily: fonts.display, lineHeight: 1.2 }}
        />
        <TypedText
          text="Track every payment. Zero outstanding."
          startFrame={60}
          perWord={8}
          style={{ color: colors.textSecondary, fontSize: 18, fontWeight: 400, fontFamily: fonts.ui, lineHeight: 1.5 }}
        />
        <div style={{ marginTop: 16 }}>
          <div style={{ color: colors.textSecondary, fontSize: 14, fontFamily: fonts.ui }}>Collected</div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
            <span style={{ color: colors.success, fontSize: 16, fontFamily: fonts.ui }}>₹</span>
            <Counter startFrame={90} duration={30} from={0} to={22500} style={{ color: colors.success, fontSize: 40, fontWeight: 800, fontFamily: fonts.display }} />
          </div>
        </div>
      </div>

      <div style={{ width: "62%", display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
        <SlideIn startFrame={10} direction="up" distance={60}>
          <PhoneFrame width={300} height={620}>
            <Screenshot src="mobile-parent-05-fees.png" />
          </PhoneFrame>
        </SlideIn>

        {[0, 1, 2].map((i) => (
          <PopIn key={i} startFrame={120 + i * 15}>
            <div style={{ position: "absolute", right: 80 + i * 20, top: 180 + i * 70, background: colors.success, borderRadius: 12, padding: "4px 10px", fontSize: 11, fontWeight: 700, color: "white", fontFamily: fonts.ui }}>
              Paid ✓
            </div>
          </PopIn>
        ))}
      </div>
    </AbsoluteFill>
  );
};
