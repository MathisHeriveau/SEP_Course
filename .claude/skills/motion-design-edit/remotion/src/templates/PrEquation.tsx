/**
 * pr_equation — a claim becomes a formula (motion-style §12): boxed terms
 * land one-by-one at their own `at` (each slightly rotated, offset
 * shadows), operators between them, an optional punch term in the brand
 * gradient. Left-anchored by default.
 */
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { PR } from "./paperBrand";
import { PrGridBg } from "./PrScribble";
import { useTypeBase, ENTRANCE_EASE } from "./motion";
import { PrAnnotation, jit, layoutStyle, PrLayout, CornerPos } from "./PrLayers";

export type PrEquationPart = {
  text: string;
  at: number;
  op?: boolean; // operator (≠ = × +) — rendered bare, no box
  punch?: boolean; // gradient box + white text
};

export type PrEquationProps = {
  parts: PrEquationPart[];
  eyebrow?: string;
  annotation?: string;
  annotation_pos?: CornerPos;
  annotation_at?: number;
  corner_stat?: string;
  layout?: PrLayout;
  seed?: number;
};

export const PrEquation: React.FC<PrEquationProps> = ({
  parts,
  eyebrow,
  annotation,
  annotation_pos = "tr",
  annotation_at = 1.5,
  corner_stat,
  layout = "left",
  seed = 17,
}) => {
  const { fps } = useVideoConfig();
  const frame = useCurrentFrame();
  const t = useTypeBase();
  const prog = (at: number) =>
    interpolate(frame, [Math.round(at * fps), Math.round((at + 0.24) * fps)], [0, 1], {
      extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ENTRANCE_EASE,
    });

  return (
    <AbsoluteFill style={{ fontFamily: PR.font }}>
      <PrGridBg />
      <AbsoluteFill style={layoutStyle(layout, t)}>
        {eyebrow ? (
          <div
            style={{
              color: PR.muted, fontFamily: PR.fontMono, fontWeight: 600,
              fontSize: Math.round(t * PR.typeScale.xs), letterSpacing: "0.14em",
              textTransform: "uppercase", marginBottom: Math.round(t * 0.03),
              opacity: prog(0.02),
            }}
          >
            {eyebrow}
          </div>
        ) : null}
        <div
          style={{
            display: "flex", flexWrap: "wrap", alignItems: "center",
            gap: Math.round(t * 0.022), maxWidth: "88%",
          }}
        >
          {parts.map((p, i) => {
            const k = prog(p.at);
            const common = {
              opacity: k,
              transform: `translateY(${(1 - k) * 18}px) rotate(${p.op ? 0 : jit(seed + i, 1.4)}deg) scale(${0.92 + k * 0.08})`,
            } as const;
            if (p.op) {
              return (
                <div
                  key={i}
                  style={{
                    ...common, color: PR.ink, fontWeight: 900,
                    fontFamily: PR.fontDisplay, fontSize: Math.round(t * 0.06),
                  }}
                >
                  {p.text}
                </div>
              );
            }
            return (
              <div
                key={i}
                style={{
                  ...common,
                  background: p.punch ? PR.accentGrad : PR.white,
                  color: p.punch ? PR.white : PR.ink,
                  fontWeight: 800,
                  fontFamily: p.punch ? PR.fontDisplay : PR.font,
                  fontSize: Math.round(t * (p.punch ? 0.052 : 0.038)),
                  padding: `${Math.round(t * 0.016)}px ${Math.round(t * 0.026)}px`,
                  boxShadow: PR.offsetShadow,
                  whiteSpace: "pre-line",
                }}
              >
                {p.text}
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
      {annotation ? (
        <PrAnnotation text={annotation} pos={annotation_pos} at={annotation_at} seed={seed} />
      ) : null}
      {corner_stat ? (
        <div
          style={{
            position: "absolute", top: Math.round(t * 0.155), right: Math.round(t * 0.075),
            fontFamily: PR.fontDisplay, fontWeight: 800,
            fontSize: Math.round(t * 0.038), color: PR.accent,
          }}
        >
          {corner_stat}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};
