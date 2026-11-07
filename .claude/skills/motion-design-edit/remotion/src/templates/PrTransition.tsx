/**
 * PrEnter — scene-connection layer for the pr_* graphic set.
 *
 * The slideshow killer: when consecutive pr_* beats butt together,
 * EditedVideo keeps the OUTGOING scene alive ~0.5s past its end (extended
 * Sequence duration, still animating underneath) while the INCOMING scene —
 * wrapped in this component — travels in over it. All motion is HORIZONTAL,
 * left → right (reference-reel language; never bottom-up).
 *
 * Modes (picked per incoming kind in EditedVideo):
 *   "push" — scene slides in from the left edge, traveling rightward
 *            (paper cards / proof)
 *   "wipe" — the flagship connector of this set: a brand-
 *            gradient panel sweeps left→right across the frame, covering
 *            the old scene with its leading edge and revealing the new one
 *            behind its trailing edge (punches / stack scenes)
 *   null   — no chaining (first beat / after a gap): render as-is
 *
 * PrProgressBar — persistent thin gradient bar along the bottom edge for
 * the whole composition; the continuity anchor (and completion-bias nudge)
 * this set keeps on screen across every cut.
 */
import { AbsoluteFill, Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { PR } from "./paperBrand";
import { SMOOTH_EASE } from "./motion";

export type PrEnterMode = "push" | "wipe" | null;

const PUSH_SEC = 0.25;
const WIPE_SEC = 0.35;
const EXIT_SEC = 0.4;
const PANEL_W = 46; // wipe panel width, % of frame

export const PrEnter: React.FC<{ mode: PrEnterMode; children: React.ReactNode }> = ({
  mode,
  children,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  if (!mode) return <>{children}</>;

  if (mode === "push") {
    const p = interpolate(frame, [0, Math.round(PUSH_SEC * fps)], [0, 1], {
      extrapolateRight: "clamp",
      easing: SMOOTH_EASE,
    });
    // Velocity blur: strongest mid-travel, sharp on arrival (rack-focus feel).
    const blur = 6 * (1 - Math.abs(2 * p - 1));
    return (
      <AbsoluteFill
        style={{
          transform: `translateX(${(p - 1) * 104}%)`,
          filter: p < 1 ? `blur(${blur.toFixed(2)}px)` : undefined,
          // trailing-edge shadow on the right while in flight — sells the
          // "new scene sliding over the old one" depth read
          boxShadow: p < 1 ? "40px 0 90px rgba(14,27,61,0.5)" : undefined,
        }}
      >
        {children}
      </AbsoluteFill>
    );
  }

  // wipe — gradient panel sweeps L→R; new scene revealed behind its trail,
  // arriving soft-focus and racking sharp as the panel clears.
  const p = interpolate(frame, [0, Math.round(WIPE_SEC * fps)], [0, 1], {
    extrapolateRight: "clamp",
    easing: SMOOTH_EASE,
  });
  const lead = p * (100 + PANEL_W); // panel leading edge, % from left
  const reveal = Math.min(100, Math.max(0, lead - PANEL_W)); // trailing edge
  const focus = 5 * (1 - p); // rack focus in as the wipe completes
  return (
    <AbsoluteFill>
      <AbsoluteFill
        style={{
          clipPath: `inset(0 ${100 - reveal}% 0 0)`,
          filter: p < 1 ? `blur(${focus.toFixed(2)}px)` : undefined,
        }}
      >
        {children}
      </AbsoluteFill>
      {p < 1 ? (
        <div
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            left: `${lead - PANEL_W}%`,
            width: `${PANEL_W}%`,
            background: PR.accentGrad,
            boxShadow: "30px 0 70px rgba(14,27,61,0.45)",
          }}
        />
      ) : null}
    </AbsoluteFill>
  );
};

/**
 * PrExit — the other half of the conveyor. When a beat chains into the next,
 * the outgoing scene doesn't sit frozen under the incoming one: from its real
 * end (`at`, frames) it ACCELERATES off the right edge with velocity blur,
 * while the next scene travels in — both moving at once, like a camera
 * panning across one continuous world (the reference-reel flow).
 */
export const PrExit: React.FC<{ at: number; active: boolean; children: React.ReactNode }> = ({
  at,
  active,
  children,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  if (!active) return <>{children}</>;
  const p = interpolate(frame, [at, at + Math.round(EXIT_SEC * fps)], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.in(Easing.quad), // accelerate away
  });
  if (p === 0) return <>{children}</>;
  const blur = 7 * Math.min(1, p * 1.6);
  return (
    <AbsoluteFill
      style={{
        transform: `translateX(${(p * 106).toFixed(2)}%)`,
        filter: `blur(${blur.toFixed(2)}px)`,
      }}
    >
      {children}
    </AbsoluteFill>
  );
};

export const PrProgressBar: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames, height } = useVideoConfig();
  const w = Math.min(100, (frame / Math.max(1, durationInFrames - 1)) * 100);
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        bottom: 0,
        height: Math.max(4, Math.round(height * 0.004)),
        width: `${w}%`,
        background: PR.accentGrad,
        zIndex: 50,
      }}
    />
  );
};
