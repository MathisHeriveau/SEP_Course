/**
 * hf_stat — ported from HyperFrames stat.html.
 * A white rounded card holding a big number: accent eyebrow, huge ink value,
 * and a muted label. The whole card springs in with a back-overshoot.
 * Partial overlay — renders over the speaker, no takeover.
 * Landscape: anchored right, vertically centered. Portrait: upper third,
 * centered (clears the face which sits centered/right in the lower frame).
 */
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { HF } from "./hfBrand";
import { useTypeBase, useSpringIn } from "./motion";

export type HfStatProps = {
  /** Small uppercase accent label above the number (optional). */
  eyebrow?: string;
  /** The big number / stat (required). Static text — no count-up. */
  value: string;
  /** Muted sub text under the number (optional). */
  label?: string;
};

export const HfStat: React.FC<HfStatProps> = ({ eyebrow, value, label }) => {
  const { width, height } = useVideoConfig();
  useCurrentFrame();
  const t = useTypeBase();
  const isLandscape = width >= height;

  // Whole-card entrance: back-overshoot spring, scale 0.7 -> 1, opacity 0 -> 1.
  const s = useSpringIn(0.2, 0.6);
  const scale = 0.7 + 0.3 * s;
  const opacity = s;

  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <AbsoluteFill
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: isLandscape ? "flex-end" : "center",
          justifyContent: isLandscape ? "center" : "flex-start",
          paddingTop: isLandscape ? 0 : Math.round(height * 0.12),
          paddingLeft: Math.round(width * 0.06),
          paddingRight: Math.round(width * 0.06),
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: isLandscape ? "flex-end" : "center",
            textAlign: isLandscape ? "right" : "center",
            width: isLandscape
              ? Math.round(width * 0.25)
              : Math.round(width * 0.8),
            background: HF.white,
            borderRadius: Math.round(t * 0.022),
            padding: `${Math.round(t * 0.037)}px ${Math.round(t * 0.041)}px`,
            boxShadow: HF.cardShadow,
            fontFamily: HF.font,
            opacity,
            transform: `scale(${scale})`,
          }}
        >
          {eyebrow ? (
            <div
              style={{
                color: HF.accent,
                fontFamily: HF.fontMono,
                fontWeight: 800,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                fontSize: Math.round(t * 0.024),
                marginBottom: Math.round(t * 0.012),
                hyphens: "manual",
              }}
            >
              {eyebrow}
            </div>
          ) : null}

          <div
            style={{
              color: HF.ink,
              fontFamily: HF.fontDisplay,
              fontWeight: 800,
              lineHeight: 1,
              fontSize: Math.round(t * (isLandscape ? 0.11 : 0.14)),
              hyphens: "manual",
            }}
          >
            {value}
          </div>

          {label ? (
            <div
              style={{
                color: HF.muted,
                fontSize: Math.round(t * 0.026),
                marginTop: Math.round(t * 0.01),
                hyphens: "manual",
              }}
            >
              {label}
            </div>
          ) : null}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
