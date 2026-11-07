/**
 * HfGridBg — the brand's faint square grid, layered OVER a template's existing
 * background (transparent base, so any glow/color underneath still shows).
 * Drop as the first child of a full-screen hf_* template's root.
 */
import { AbsoluteFill } from "remotion";

const LINE = "rgba(30,45,90,0.06)"; // faint navy grid line
const CELL = 90; // px per cell (~12 columns at 1080 wide)

export const HfGridBg: React.FC = () => (
  <AbsoluteFill
    style={{
      backgroundImage:
        `linear-gradient(${LINE} 1px, transparent 1px),` +
        `linear-gradient(90deg, ${LINE} 1px, transparent 1px)`,
      backgroundSize: `${CELL}px ${CELL}px`,
      pointerEvents: "none",
    }}
  />
);
