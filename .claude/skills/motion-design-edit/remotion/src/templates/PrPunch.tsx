/**
 * pr_punch — solid punch-color interrupt beat. Two modes:
 *  - `fullbleed` (default true): the whole frame fills with `color`, a big
 *    `value` (single word/number, e.g. "3", "CRO", "7 days") pops in.
 *  - `fullbleed=false`: a centered rounded color box on the paper grid,
 *    holding 1-2 lines of `value` text — the "reframe" beat (e.g. "discovery
 *    isn't earned anymore. it's engineered.").
 */
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { PR } from "./paperBrand";
import { PrGridBg } from "./PrScribble";
import { useTypeBase, useFadeRise, useSpringIn, useSettleZoom, SMOOTH_EASE } from "./motion";
import { Particles } from "./PrStack";

export type PrPunchProps = {
  value: string;
  label?: string;
  color?: string;
  fullbleed?: boolean;
};

export const PrPunch: React.FC<PrPunchProps> = ({
  value,
  label,
  color,
  fullbleed = true,
}) => {
  const { width } = useVideoConfig();
  const frame = useCurrentFrame();
  const t = useTypeBase();

  const lb = useFadeRise(0.06, 0.3, 10);
  const val = useSpringIn(0.2, 0.5);
  const settle = useSettleZoom(0.2, 2.4, 1.05);
  // Explicit pr_color keeps a flat fill; the default is the brand blue gradient,
  // slowly drifting so the solid interrupt never reads as a freeze-frame.
  const fill = color ?? PR.accentGrad;
  const drift = interpolate(frame, [0, 150], [0, 60], {
    extrapolateRight: "clamp",
    easing: SMOOTH_EASE,
  });

  return (
    <AbsoluteFill
      style={{
        background: fullbleed ? fill : PR.bg,
        ...(fullbleed && !color
          ? { backgroundSize: "170% 170%", backgroundPosition: `${drift}% ${drift}%` }
          : {}),
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {fullbleed ? <Particles count={18} /> : <PrGridBg />}
      <div
        style={{
          position: "relative",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          padding: fullbleed ? 0 : `${Math.round(t * 0.06)}px ${Math.round(t * 0.07)}px`,
          borderRadius: fullbleed ? 0 : Math.round(t * 0.03),
          background: fullbleed ? "transparent" : fill,
          boxShadow: fullbleed ? "none" : PR.cardShadow,
          width: fullbleed ? "100%" : "auto",
          maxWidth: fullbleed ? "none" : Math.round(width * 0.72),
          transform: `scale(${settle})`,
        }}
      >
        {label ? (
          <div
            style={{
              color: PR.white,
              opacity: lb.opacity,
              transform: `translateY(${lb.ty}px)`,
              fontFamily: PR.font,
              fontWeight: 700,
              fontSize: Math.round(t * 0.03),
              marginBottom: Math.round(t * 0.02),
            }}
          >
            {label}
          </div>
        ) : null}
        <div
          style={{
            color: PR.white,
            fontFamily: PR.fontDisplay,
            fontWeight: 900,
            lineHeight: 1.05,
            whiteSpace: "pre-line",
            fontSize: Math.round(t * (fullbleed ? 0.16 : 0.06)),
            opacity: val,
            transform: `scale(${0.85 + val * 0.15})`,
          }}
        >
          {value}
        </div>
      </div>
    </AbsoluteFill>
  );
};
