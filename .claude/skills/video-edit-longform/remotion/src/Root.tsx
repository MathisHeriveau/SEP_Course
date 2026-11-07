import { AbsoluteFill, Composition, staticFile } from "remotion";
import { EditedVideo, type EditedVideoProps } from "./EditedVideo";
import { StyleShowcase } from "./StyleShowcase";
import { DarkGridBg, LightGridBg } from "./templates/Backgrounds";
import { Plan, planDuration } from "./motion/Plan";
import demoPlan from "./motion/showcase-plan.json";
import overlayPlan from "./motion/overlay-plan.json";
import props from "./props.json";

const demoScenes = (demoPlan as { scenes: { durationInFrames: number }[] }).scenes;
const overlayScenes = (overlayPlan as { scenes: { durationInFrames: number }[] }).scenes;

const DarkGridFrame = () => <AbsoluteFill><DarkGridBg /></AbsoluteFill>;
const LightGridFrame = () => <AbsoluteFill><LightGridBg /></AbsoluteFill>;

const typed = props as unknown as EditedVideoProps & {
  fps: number;
  width: number;
  height: number;
  durationInFrames: number;
};

export const Root: React.FC = () => {
  return (
    <>
      <Composition
        id="EditedVideo"
        component={EditedVideo}
        durationInFrames={typed.durationInFrames}
        fps={typed.fps}
        width={typed.width}
        height={typed.height}
        defaultProps={typed}
      />
      <Composition
        id="CinematicDemo"
        component={Plan as never}
        durationInFrames={planDuration(demoScenes)}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{ scenes: demoScenes } as never}
      />
      <Composition
        id="OverlayDemo"
        component={Plan as never}
        durationInFrames={planDuration(overlayScenes, false)}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{ scenes: overlayScenes, transparent: true } as never}
      />
      <Composition
        id="StyleShowcase"
        component={StyleShowcase}
        durationInFrames={30 * 125}
        fps={30}
        width={1080}
        height={1920}
      />
      {/* 16:9 variant for verifying landscape templates side-by-side. */}
      <Composition
        id="StyleShowcaseLandscape"
        component={StyleShowcase}
        durationInFrames={30 * 125}
        fps={30}
        width={1920}
        height={1080}
      />
      <Composition
        id="DarkGridFrame"
        component={DarkGridFrame}
        durationInFrames={1}
        fps={30}
        width={1080}
        height={1920}
      />
      <Composition
        id="LightGridFrame"
        component={LightGridFrame}
        durationInFrames={1}
        fps={30}
        width={1080}
        height={1920}
      />
    </>
  );
};

// Re-exported so Remotion picks it up
export { staticFile };
