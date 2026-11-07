/**
 * pr_card — a timed-layer editorial composition (motion-style.md §4–§10),
 * NOT a centered caption card. Layers enter at their own `*_at` moments
 * (sec, relative to the beat) with fast ease-outs, anchored off-center by
 * default, with seeded jitter for controlled imperfection (§19).
 *
 * Layers: bg_panel · eyebrow · headline (scale m/l/xl) · strike ·
 * boxed_label · rule_lines · annotation · corner_stat — all optional.
 */
import { AbsoluteFill, useVideoConfig } from "remotion";
import { PR } from "./paperBrand";
import { PrGridBg } from "./PrScribble";
import { useTypeBase, useProg, useWipe, useSettleZoom } from "./motion";
import {
  PrAnnotation, PrBgPanel, PrBoxedLabel, PrCornerStat, PrRuleLines,
  layoutStyle, jit, PrLayout, CornerPos,
} from "./PrLayers";

const AccentText: React.FC<{ text: string; accentGrad?: string; highlightBg?: string }> = ({ text, accentGrad, highlightBg }) => {
  const parts = text.split(/(\{[^}]+\}|\[\[[^\]]+\]\])/g).filter(Boolean);
  return (
    <>
      {parts.map((part, i) => {
        const grad = part.match(/^\{([^}]+)\}$/);
        const pill = part.match(/^\[\[([^\]]+)\]\]$/);
        if (grad) return (
          <span key={i} style={{
            backgroundImage: accentGrad ?? PR.accentTextGrad,
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            color: "transparent",
          }}>{grad[1]}</span>
        );
        if (pill) return (
          <span key={i} style={{
            backgroundColor: highlightBg ?? PR.accent,
            color: PR.white,
            borderRadius: "0.12em",
            padding: "0.03em 0.2em",
            display: "inline",
          }}>{pill[1]}</span>
        );
        return <span key={i}>{part}</span>;
      })}
    </>
  );
};

export type PrCardProps = {
  headline: string;
  headline_at?: number;
  scale?: "m" | "l" | "xl";
  eyebrow?: string;
  eyebrow_at?: number;
  strike?: string;
  strike_at?: number;
  annotation?: string;
  annotation_pos?: CornerPos;
  annotation_at?: number;
  boxed_label?: string;
  boxed_label_at?: number;
  rule_lines?: Array<{ y: number; at: number; from?: "left" | "right"; w?: number }>;
  bg_panel?: { side?: "left" | "right" | "top"; size?: number; at?: number };
  corner_stat?: string;
  layout?: PrLayout;
  seed?: number;
  /** override the {word} accent gradient (e.g. blue instead of orange) */
  accent_grad?: string;
  /** override the [[word]] highlight pill background color */
  highlight_bg?: string;
  /** legacy alias — old plans used `align: "center"` */
  align?: "center" | "left";
};

export const PrCard: React.FC<PrCardProps> = ({
  headline,
  headline_at = 0.12,
  scale = "l",
  eyebrow,
  eyebrow_at = 0.02,
  strike,
  strike_at = 0.9,
  annotation,
  annotation_pos = "br",
  annotation_at = 0.55,
  boxed_label,
  boxed_label_at = 0.45,
  rule_lines,
  bg_panel,
  corner_stat,
  layout,
  seed = 0,
  accent_grad,
  highlight_bg,
  align,
}) => {
  useVideoConfig();
  const t = useTypeBase();
  const resolvedLayout: PrLayout = layout ?? (align === "center" ? "center" : "left");

  const eb = useProg(eyebrow_at, 0.2);
  const head = useProg(headline_at, 0.26);
  const strikeIn = useProg(strike_at, 0.2);
  const strikeWipe = useWipe(strike_at + 0.12, 0.3);
  const settle = useSettleZoom(headline_at, 2.6, 1.04);

  return (
    <AbsoluteFill style={{ fontFamily: PR.font, transform: `scale(${settle})` }}>
      <PrGridBg />
      {bg_panel ? <PrBgPanel {...bg_panel} /> : null}
      {rule_lines ? <PrRuleLines lines={rule_lines} /> : null}

      <AbsoluteFill style={layoutStyle(resolvedLayout, t)}>
        {eyebrow ? (
          <div
            style={{
              color: PR.muted,
              fontFamily: PR.fontMono,
              fontWeight: 600,
              fontSize: Math.round(t * PR.typeScale.xs),
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              marginBottom: Math.round(t * 0.028),
              opacity: eb,
              transform: `translateX(${(1 - eb) * -14}px)`,
            }}
          >
            {eyebrow}
          </div>
        ) : null}
        <div
          style={{
            color: PR.ink,
            fontFamily: PR.fontDisplay,
            fontWeight: 800,
            lineHeight: 1.06,
            fontSize: Math.round(t * PR.typeScale[scale]),
            opacity: head,
            transform: `translateY(${(1 - head) * 16}px) rotate(${jit(seed + 1, 0.7)}deg)`,
            hyphens: "manual",
            whiteSpace: "pre-line",
          }}
        >
          <AccentText text={headline} accentGrad={accent_grad} highlightBg={highlight_bg} />
        </div>
        {strike ? (
          <div
            style={{
              position: "relative",
              display: "inline-block",
              color: PR.muted,
              fontWeight: 700,
              fontSize: Math.round(t * PR.typeScale.body * 1.35),
              marginTop: Math.round(t * 0.02),
              opacity: strikeIn,
              transform: `translateY(${(1 - strikeIn) * 8}px) rotate(${jit(seed + 2, 1)}deg)`,
            }}
          >
            {strike}
            <div
              style={{
                position: "absolute",
                left: 0,
                right: `${(1 - strikeWipe) * 100}%`,
                top: "50%",
                height: 3,
                background: PR.accent,
                transform: "translateY(-50%)",
              }}
            />
          </div>
        ) : null}
        {boxed_label ? <PrBoxedLabel text={boxed_label} at={boxed_label_at} seed={seed} /> : null}
      </AbsoluteFill>

      {annotation ? (
        <PrAnnotation text={annotation} pos={annotation_pos} at={annotation_at} seed={seed} />
      ) : null}
      {corner_stat ? <PrCornerStat text={corner_stat} /> : null}
    </AbsoluteFill>
  );
};
