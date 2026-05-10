import { Composition } from "remotion";
import { loadFont } from "@remotion/google-fonts/Inter";
import { VIDEO, SCENES } from "./theme";
import { Master } from "./compositions/Master";

loadFont("normal", { weights: ["400", "500", "600", "700", "800"], subsets: ["latin"] });

export const RemotionRoot: React.FC = () => (
  <>
    <Composition
      id="Master"
      component={Master}
      durationInFrames={VIDEO.totalFrames}
      fps={VIDEO.fps}
      width={VIDEO.width}
      height={VIDEO.height}
    />
  </>
);
