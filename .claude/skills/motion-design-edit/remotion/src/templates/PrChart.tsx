/**
 * pr_chart — a number becomes a picture (motion-style §12/§21): parts
 * animate independently — baseline draws, bars land one-by-one (the drop
 * bar collapses), the XL numeral scales in beside them, annotation enters
 * late. With `handoff` the numeral retreats toward the top-right corner at
 * the end of the beat, where the NEXT scene renders a matching
 * `corner_stat` (§15 object continuity).
 */
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { PR } from "./paperBrand";
import { PrGridBg } from "./PrScribble";
import { useTypeBase, useProg, EXIT_EASE } from "./motion";
import { PrAnnotation, jit, CornerPos } from "./PrLayers";

export type PrChartBar = { label: string; v: number; accent?: boolean; at: number; color?: string };

export type PrChartProps = {
  value: string; // the XL numeral, e.g. "80%"
  bars: PrChartBar[]; // v in 0..1 of full height
  label?: string;
  value_grad?: string; // optional gradient override for the XL numeral
  annotation?: string;
  annotation_pos?: CornerPos;
  annotation_at?: number;
  handoff?: boolean;
  handoff_at?: number; // sec — when the numeral starts retreating
  seed?: number;
};

export const PrChart: React.FC<PrChartProps> = ({
  value,
  bars,
  label,
  value_grad,
  annotation,
  annotation_pos = "bl",
  annotation_at = 1.4,
  handoff,
  handoff_at = 99,
  seed = 5,
}) => {
  const { fps } = useVideoConfig();
  const frame = useCurrentFrame();
  const t = useTypeBase();

  const axis = useProg(0.08, 0.4);
  const num = useProg(0.55, 0.3);
  const away = handoff
    ? interpolate(frame, [Math.round(handoff_at * fps), Math.round((handoff_at + 0.45) * fps)],
        [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: EXIT_EASE })
    : 0;

  const chartH = t * 0.42;
  const barW = Math.round(t * 0.11);
  const prog = (at: number, dur: number) =>
    interpolate(frame, [Math.round(at * fps), Math.round((at + dur) * fps)], [0, 1], {
      extrapolateLeft: "clamp", extrapolateRight: "clamp",
    });

  return (
    <AbsoluteFill style={{ fontFamily: PR.font }}>
      <PrGridBg />
      {/* chart block — lower left (asymmetric) */}
      <div style={{ position: "absolute", left: Math.round(t * 0.09), bottom: Math.round(t * 0.30) }}>
        <div style={{ display: "flex", alignItems: "flex-end", gap: Math.round(t * 0.045), height: chartH }}>
          {bars.map((b, i) => {
            const p = prog(b.at, 0.5);
            return (
              <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
                <div
                  style={{
                    width: barW,
                    height: Math.max(4, chartH * b.v * p),
                    background: b.color ?? (b.accent ? PR.accentGrad : PR.ink),
                    boxShadow: b.accent ? PR.offsetShadow : undefined,
                    transform: `rotate(${jit(seed + i, 0.6)}deg)`,
                  }}
                />
                <div
                  style={{
                    fontFamily: PR.fontMono, fontSize: Math.round(t * 0.017),
                    letterSpacing: "0.1em", textTransform: "uppercase",
                    color: PR.muted, opacity: p,
                  }}
                >
                  {b.label}
                </div>
              </div>
            );
          })}
        </div>
        {/* baseline draws with the axis */}
        <div style={{ height: 3, width: `${axis * 100}%`, background: PR.ink, marginTop: 6 }} />
      </div>

      {/* XL numeral — upper right, retreats to corner on handoff */}
      <div
        style={{
          position: "absolute",
          right: Math.round(t * 0.08),
          top: Math.round(t * 0.30),
          textAlign: "right",
          opacity: num,
          transform: `translate(${away * t * 0.02}px, ${-away * t * 0.16}px) scale(${
            (0.9 + num * 0.1) * (1 - away * 0.72)
          })`,
          transformOrigin: "top right",
        }}
      >
        {label ? (
          <div style={{ fontWeight: 700, fontSize: Math.round(t * PR.typeScale.body), color: PR.muted }}>
            {label}
          </div>
        ) : null}
        <div
          style={{
            fontFamily: PR.fontDisplay, fontWeight: 900, lineHeight: 0.95,
            fontSize: Math.round(t * PR.typeScale.xl),
            backgroundImage: value_grad ?? PR.accentTextGrad,
            WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent",
          }}
        >
          {value}
        </div>
      </div>

      {annotation ? (
        <PrAnnotation text={annotation} pos={annotation_pos} at={annotation_at} seed={seed} />
      ) : null}
    </AbsoluteFill>
  );
};
