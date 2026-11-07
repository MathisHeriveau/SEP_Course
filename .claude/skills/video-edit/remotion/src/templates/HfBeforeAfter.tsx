/**
 * hf_before_after — ported from HyperFrames before-after.html.
 * Two labeled panels: a BEFORE card (ink heading, dark placeholder frame) and
 * an AFTER card (gold heading, white placeholder frame). Landscape lays them
 * side by side; portrait stacks them. Fullscreen takeover on the brand bg.
 * BEFORE slides in from the left, AFTER slides in from the right (overshoot).
 */
import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { HF } from "./hfBrand";
import { useTypeBase, useSpringIn } from "./motion";
import { HfGridBg } from "./HfGridBg";

export type HfBeforeAfterProps = {
  /** Label under the BEFORE frame (required). */
  before_label: string;
  /** Label under the AFTER frame (required). */
  after_label: string;
};

export const HfBeforeAfter: React.FC<HfBeforeAfterProps> = ({
  before_label,
  after_label,
}) => {
  const { width, height } = useVideoConfig();
  useCurrentFrame();
  const t = useTypeBase();

  const isPortrait = height > width;

  // Slide offsets: BEFORE from left, AFTER from right.
  const off = width * 0.075;
  const beforeS = useSpringIn(0.2, 0.6);
  const afterS = useSpringIn(0.5, 0.6);
  const beforeX = interpolate(beforeS, [0, 1], [-off, 0]);
  const afterX = interpolate(afterS, [0, 1], [off, 0]);

  const frameW = isPortrait ? width * 0.72 : width * 0.3;
  const frameH = isPortrait ? height * 0.22 : height * 0.37;

  const cardStyle: React.CSSProperties = {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: Math.round(t * 0.022),
    fontFamily: HF.font,
  };

  const headingStyle: React.CSSProperties = {
    fontWeight: 900,
    fontSize: Math.round(t * 0.06),
    lineHeight: 1,
    fontFamily: HF.font,
    hyphens: "manual",
  };

  const frameBase: React.CSSProperties = {
    width: Math.round(frameW),
    height: Math.round(frameH),
    borderRadius: Math.round(t * 0.018),
    borderStyle: "solid",
    borderWidth: Math.round(t * 0.007),
  };

  return (
    <AbsoluteFill
      style={{
        backgroundColor: HF.bg,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: Math.round(t * 0.05),
        fontFamily: HF.font,
      }}
    >
      <HfGridBg />
      <div
        style={{
          display: "flex",
          flexDirection: isPortrait ? "column" : "row",
          alignItems: "center",
          justifyContent: "center",
          gap: isPortrait ? Math.round(height * 0.04) : Math.round(width * 0.05),
        }}
      >
        {/* BEFORE */}
        <div
          style={{
            ...cardStyle,
            opacity: beforeS,
            transform: `translateX(${beforeX}px)`,
          }}
        >
          <div style={{ ...headingStyle, color: HF.ink, fontFamily: HF.fontDisplay }}>{before_label}</div>
          <div
            style={{
              ...frameBase,
              background: "#1a1a2e",
              borderColor: HF.ink,
            }}
          />
        </div>

        {/* AFTER */}
        <div
          style={{
            ...cardStyle,
            opacity: afterS,
            transform: `translateX(${afterX}px)`,
          }}
        >
          <div style={{ ...headingStyle, color: HF.accent, fontFamily: HF.fontDisplay }}>{after_label}</div>
          <div
            style={{
              ...frameBase,
              background: HF.white,
              borderColor: "#ddd",
            }}
          />
        </div>
      </div>
    </AbsoluteFill>
  );
};
