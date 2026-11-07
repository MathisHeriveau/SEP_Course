/**
 * hf_listicle — ported from HyperFrames listicle.html.
 * Fullscreen numbered feature list: optional centered accent eyebrow above a
 * column of white cards, each with a gradient number badge and an ink label.
 * The eyebrow fades+rises; each row slides in from the left with a subtle
 * overshoot, staggered top to bottom.
 */
import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { HF } from "./hfBrand";
import { useTypeBase, useFadeRise, useSpringIn } from "./motion";
import { HfGridBg } from "./HfGridBg";

export type HfListicleProps = {
  /** Small uppercase accent label above the list (optional). */
  eyebrow?: string;
  /** Comma-separated rows, e.g. "Row one,Row two,Row three" (required). */
  items: string;
};

export const HfListicle: React.FC<HfListicleProps> = ({ eyebrow, items }) => {
  const { width } = useVideoConfig();
  useCurrentFrame();
  const t = useTypeBase();

  const rows = items
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const eb = useFadeRise(0.15, 0.4, 0);

  return (
    <AbsoluteFill
      style={{
        backgroundColor: HF.bg,
        display: "flex",
        flexDirection: "column",
        alignItems: "stretch",
        justifyContent: "center",
        paddingLeft: Math.round(width * 0.06),
        paddingRight: Math.round(width * 0.06),
        fontFamily: HF.font,
      }}
    >
      <HfGridBg />
      {eyebrow ? (
        <div
          style={{
            color: HF.accent,
            fontWeight: 800,
            textTransform: "uppercase",
            letterSpacing: "0.09em",
            fontFamily: HF.fontMono,
            fontSize: Math.round(t * 0.034),
            marginBottom: Math.round(t * 0.05),
            textAlign: "center",
            opacity: eb.opacity,
            transform: `translateY(${eb.ty}px)`,
            hyphens: "manual",
          }}
        >
          {eyebrow}
        </div>
      ) : null}

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: Math.round(t * 0.024),
        }}
      >
        {rows.map((label, i) => (
          <Row key={i} index={i} label={label} t={t} width={width} />
        ))}
      </div>
    </AbsoluteFill>
  );
};

const Row: React.FC<{
  index: number;
  label: string;
  t: number;
  width: number;
}> = ({ index, label, t, width }) => {
  const s = useSpringIn(0.4 + index * 0.18, 0.5);
  const x = interpolate(s, [0, 1], [-width * 0.06, 0]);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        gap: Math.round(t * 0.028),
        background: HF.white,
        borderRadius: Math.round(t * 0.024),
        padding: `${Math.round(t * 0.028)}px ${Math.round(t * 0.034)}px`,
        boxShadow: HF.cardShadow,
        opacity: s,
        transform: `translateX(${x}px)`,
      }}
    >
      <div
        style={{
          flex: "0 0 auto",
          width: Math.round(t * 0.09),
          height: Math.round(t * 0.09),
          borderRadius: Math.round(t * 0.02),
          background: HF.badgeGradient,
          color: "#fff",
          fontWeight: 900,
          fontFamily: HF.fontMono,
          fontSize: Math.round(t * 0.038),
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {index + 1}
      </div>
      <div
        style={{
          color: HF.ink,
          fontWeight: 800,
          fontFamily: HF.fontDisplay,
          fontSize: Math.round(t * 0.05),
          hyphens: "manual",
          overflowWrap: "break-word",
        }}
      >
        {label}
      </div>
    </div>
  );
};
