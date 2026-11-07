/**
 * pr_checklist — tasks become ticking checkboxes (motion-style §12):
 * items enter one-by-one at their own `at`, the box ticks with a fast
 * draw, done items sit slightly rotated (§19). Off-center card on the
 * grid; optional headline above.
 */
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { PR } from "./paperBrand";
import { PrGridBg } from "./PrScribble";
import { useTypeBase, useProg, ENTRANCE_EASE } from "./motion";
import { PrAnnotation, jit, layoutStyle, PrLayout, CornerPos } from "./PrLayers";

export type PrChecklistItem = { text: string; at: number; color?: string };

// Parses inline {word} syntax into clipped-gradient accent spans, so the key
// word in each item pops without literal braces on screen. Plain text passes
// through untouched.
const CheckAccent: React.FC<{ text: string }> = ({ text }) => {
  const parts = text.split(/(\{[^}]+\})/g).filter(Boolean);
  return (
    <>
      {parts.map((part, i) => {
        const m = part.match(/^\{([^}]+)\}$/);
        return m ? (
          <span
            key={i}
            style={{
              backgroundImage: PR.accentTextGrad,
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              color: "transparent",
            }}
          >
            {m[1]}
          </span>
        ) : (
          <span key={i}>{part}</span>
        );
      })}
    </>
  );
};

export type PrChecklistProps = {
  items: PrChecklistItem[];
  headline?: string;
  headline_at?: number;
  annotation?: string;
  annotation_pos?: CornerPos;
  annotation_at?: number;
  layout?: PrLayout;
  seed?: number;
};

export const PrChecklist: React.FC<PrChecklistProps> = ({
  items,
  headline,
  headline_at = 0.06,
  annotation,
  annotation_pos = "br",
  annotation_at = 1.6,
  layout = "left",
  seed = 13,
}) => {
  const { fps } = useVideoConfig();
  const frame = useCurrentFrame();
  const t = useTypeBase();
  const head = useProg(headline_at, 0.24);
  const prog = (at: number, dur: number) =>
    interpolate(frame, [Math.round(at * fps), Math.round((at + dur) * fps)], [0, 1], {
      extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ENTRANCE_EASE,
    });

  return (
    <AbsoluteFill style={{ fontFamily: PR.font }}>
      <PrGridBg />
      <AbsoluteFill style={layoutStyle(layout, t)}>
        {headline ? (
          <div
            style={{
              color: PR.ink, fontFamily: PR.fontDisplay, fontWeight: 800,
              fontSize: Math.round(t * PR.typeScale.m), lineHeight: 1.08,
              marginBottom: Math.round(t * 0.045),
              opacity: head, transform: `translateY(${(1 - head) * 12}px)`,
              whiteSpace: "pre-line",
            }}
          >
            {headline}
          </div>
        ) : null}
        <div style={{ display: "flex", flexDirection: "column", gap: Math.round(t * 0.026) }}>
          {items.map((it, i) => {
            const inP = prog(it.at, 0.22);
            const tick = prog(it.at + 0.18, 0.25);
            const box = Math.round(t * 0.036);
            return (
              <div
                key={i}
                style={{
                  display: "flex", alignItems: "center", gap: Math.round(t * 0.024),
                  opacity: inP,
                  transform: `translateX(${(1 - inP) * -26}px) rotate(${jit(seed + i, 0.9)}deg)`,
                }}
              >
                <div
                  style={{
                    width: box, height: box, flex: "0 0 auto",
                    background: tick > 0 ? (it.color ?? PR.accent) : PR.white,
                    border: `3px solid ${tick > 0 ? (it.color ?? PR.accent) : PR.ink}`,
                    boxShadow: PR.offsetShadow,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: PR.white, fontWeight: 900, fontSize: box * 0.72,
                  }}
                >
                  <span style={{ opacity: tick, transform: `scale(${0.5 + tick * 0.5})` }}>✓</span>
                </div>
                <div
                  style={{
                    fontWeight: 800, fontSize: Math.round(t * 0.042), color: PR.ink,
                    textDecoration: "none",
                  }}
                >
                  <CheckAccent text={it.text} />
                </div>
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
      {annotation ? (
        <PrAnnotation text={annotation} pos={annotation_pos} at={annotation_at} seed={seed} />
      ) : null}
    </AbsoluteFill>
  );
};
