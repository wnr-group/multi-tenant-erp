import { AbsoluteFill, Sequence } from "remotion";
import { SCENES } from "../theme";
import { HookScene } from "./HookScene";
import { BrandReveal } from "./BrandReveal";
import { Scene01Students } from "./Scene01Students";
import { Scene02Attendance } from "./Scene02Attendance";
import { Scene03Homework } from "./Scene03Homework";
import { Scene04Fees } from "./Scene04Fees";
import { Scene05Announcements } from "./Scene05Announcements";
import { CloseScene } from "./CloseScene";

export const Master: React.FC = () => (
  <AbsoluteFill>
    <Sequence from={SCENES.hookStart} durationInFrames={SCENES.hookDur}>
      <HookScene />
    </Sequence>

    <Sequence from={SCENES.brandStart} durationInFrames={SCENES.brandDur}>
      <BrandReveal />
    </Sequence>

    <Sequence from={SCENES.scene1Start} durationInFrames={SCENES.scene1Dur}>
      <Scene01Students />
    </Sequence>

    <Sequence from={SCENES.scene2Start} durationInFrames={SCENES.scene2Dur}>
      <Scene02Attendance />
    </Sequence>

    <Sequence from={SCENES.scene3Start} durationInFrames={SCENES.scene3Dur}>
      <Scene03Homework />
    </Sequence>

    <Sequence from={SCENES.scene4Start} durationInFrames={SCENES.scene4Dur}>
      <Scene04Fees />
    </Sequence>

    <Sequence from={SCENES.scene5Start} durationInFrames={SCENES.scene5Dur}>
      <Scene05Announcements />
    </Sequence>

    <Sequence from={SCENES.closeStart} durationInFrames={SCENES.closeDur}>
      <CloseScene />
    </Sequence>
  </AbsoluteFill>
);
