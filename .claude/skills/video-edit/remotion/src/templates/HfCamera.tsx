/**
 * HfCamera — a subtle cinematic camera move applied to any hf_* graphic.
 * Slow push-in (scale 1.0 → 1.05) + a small upward drift over the beat's
 * duration, so the graphics feel camera-driven (like the fable-5 viz devices)
 * instead of static. Wraps the whole hf_* dispatch group; harmless (empty) for
 * non-hf beats. Runs inside each beat's <Sequence>, so useVideoConfig() gives
 * the beat-local duration and useCurrentFrame() the beat-local frame.
 */
import {
  AbsoluteFill,
  Easing,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

const SMOOTH = Easing.bezier(0.25, 0.1, 0.25, 1);

export const HfCamera: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const opts = { extrapolateLeft: "clamp" as const, extrapolateRight: "clamp" as const, easing: SMOOTH };
  const scale = interpolate(frame, [0, durationInFrames], [1.0, 1.05], opts);
  const ty = interpolate(frame, [0, durationInFrames], [0, -10], opts);
  return (
    <AbsoluteFill
      style={{ transform: `scale(${scale}) translateY(${ty}px)`, transformOrigin: "center" }}
    >
      {children}
    </AbsoluteFill>
  );
};
