/**
 * PrGridBg / PrScribble — the paper-reel background: a faint light grid
 * masked by a soft vignette (cloudy, never uniform graph paper — same
 * principle as HfGridBg's cloud mask, tuned to the Visual OS light bg) plus an
 * optional hand-drawn connector line that draws itself on entrance. The line
 * is the visual thread that links consecutive cuts
 * even though each beat is its own hard cut.
 */
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { PR } from "./paperBrand";

const CELL = 64;

export const PrGridBg: React.FC = () => (
  <AbsoluteFill
    style={{
      backgroundColor: PR.bg,
      backgroundImage:
        `linear-gradient(${PR.gridLine} 1px, transparent 1px),` +
        `linear-gradient(90deg, ${PR.gridLine} 1px, transparent 1px)`,
      backgroundSize: `${CELL}px ${CELL}px`,
      pointerEvents: "none",
    }}
  >
    <AbsoluteFill
      style={{
        background:
          "radial-gradient(ellipse 70% 55% at 50% 45%, transparent 0%, rgba(245,246,251,0.55) 68%, rgba(245,246,251,0.94) 100%)",
      }}
    />
  </AbsoluteFill>
);

export type PrScribbleProps = {
  /** When the line starts drawing, in seconds relative to the Sequence. */
  startSec?: number;
  durSec?: number;
  /** Mirror the curve so consecutive beats don't all draw the same way. */
  flip?: boolean;
};

const LEN = 900;

export const PrScribble: React.FC<PrScribbleProps> = ({
  startSec = 0,
  durSec = 0.9,
  flip = false,
}) => {
  const { fps, width, height } = useVideoConfig();
  const frame = useCurrentFrame();
  const startFrame = Math.round(startSec * fps);
  const dur = Math.round(durSec * fps);
  const k = interpolate(frame, [startFrame, startFrame + dur], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const w = width;
  const h = height;
  const path = flip
    ? `M ${w * 0.15},${h * 0.34} C ${w * 0.35},${h * 0.4} ${w * 0.55},${h * 0.5} ${w * 0.85},${h * 0.62}`
    : `M ${w * 0.08},${h * 0.4} C ${w * 0.28},${h * 0.46} ${w * 0.42},${h * 0.5} ${w * 0.62},${h * 0.58}`;

  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <svg width={w} height={h} style={{ position: "absolute", inset: 0 }}>
        <path
          d={path}
          fill="none"
          stroke={PR.ink}
          strokeOpacity={0.26}
          strokeWidth={2}
          strokeLinecap="round"
          strokeDasharray={LEN}
          strokeDashoffset={LEN * (1 - k)}
        />
      </svg>
    </AbsoluteFill>
  );
};
