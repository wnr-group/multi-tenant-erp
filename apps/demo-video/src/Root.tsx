import { Composition } from "remotion";
import { loadFont } from "@remotion/google-fonts/Inter";
import { VIDEO, SCENES } from "./theme";
import { Master } from "./compositions/Master";
import { HookScene } from "./compositions/HookScene";
import { BrandReveal } from "./compositions/BrandReveal";
import { Scene01Students } from "./compositions/Scene01Students";
import { Scene02Attendance } from "./compositions/Scene02Attendance";
import { Scene03Homework } from "./compositions/Scene03Homework";
import { Scene04Fees } from "./compositions/Scene04Fees";
import { Scene05Announcements } from "./compositions/Scene05Announcements";
import { CloseScene } from "./compositions/CloseScene";

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
    <Composition id="v2-Hook" component={HookScene} durationInFrames={SCENES.hookDur} fps={VIDEO.fps} width={VIDEO.width} height={VIDEO.height} />
    <Composition id="v2-Brand" component={BrandReveal} durationInFrames={SCENES.brandDur} fps={VIDEO.fps} width={VIDEO.width} height={VIDEO.height} />
    <Composition id="v2-Scene01" component={Scene01Students} durationInFrames={SCENES.scene1Dur} fps={VIDEO.fps} width={VIDEO.width} height={VIDEO.height} />
    <Composition id="v2-Scene02" component={Scene02Attendance} durationInFrames={SCENES.scene2Dur} fps={VIDEO.fps} width={VIDEO.width} height={VIDEO.height} />
    <Composition id="v2-Scene03" component={Scene03Homework} durationInFrames={SCENES.scene3Dur} fps={VIDEO.fps} width={VIDEO.width} height={VIDEO.height} />
    <Composition id="v2-Scene04" component={Scene04Fees} durationInFrames={SCENES.scene4Dur} fps={VIDEO.fps} width={VIDEO.width} height={VIDEO.height} />
    <Composition id="v2-Scene05" component={Scene05Announcements} durationInFrames={SCENES.scene5Dur} fps={VIDEO.fps} width={VIDEO.width} height={VIDEO.height} />
    <Composition id="v2-Close" component={CloseScene} durationInFrames={SCENES.closeDur} fps={VIDEO.fps} width={VIDEO.width} height={VIDEO.height} />
  </>
);
