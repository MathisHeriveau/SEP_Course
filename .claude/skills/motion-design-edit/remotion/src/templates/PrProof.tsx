/**
 * pr_proof — a taped index-card / polaroid on the paper grid: a screenshot,
 * logo, or photo (`src`, already resolved by EditedVideo via resolveSrc,
 * same convention as ImageCard) rotated a few degrees with a washi-tape
 * corner. Without `src` it renders as a blank card — used for a pure-text
 * "proof" moment. Optional `tag` eyebrow above the card ("DELHI · A SHOP
 * COUNTER") and `caption` line below it (the payoff, e.g. "$4.5B valuation.").
 */
import { AbsoluteFill, Img, useCurrentFrame, useVideoConfig } from "remotion";
import { PR } from "./paperBrand";
import { PrGridBg } from "./PrScribble";
import { useTypeBase, useFadeRise, useSpringIn, useSettleZoom } from "./motion";

export type PrProofProps = {
  tag?: string;
  src?: string;
  caption?: string;
  rotate?: number;
};

export const PrProof: React.FC<PrProofProps> = ({
  tag,
  src,
  caption,
  rotate = -3,
}) => {
  const { width } = useVideoConfig();
  useCurrentFrame();
  const t = useTypeBase();

  const tg = useFadeRise(0.06, 0.3, 10);
  const cardIn = useSpringIn(0.18, 0.55);
  const cap = useFadeRise(0.6, 0.4, 14);
  const settle = useSettleZoom(0.18, 2.6, 1.04);

  return (
    <AbsoluteFill
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: PR.font,
        paddingLeft: Math.round(width * 0.08),
        paddingRight: Math.round(width * 0.08),
        transform: `scale(${settle})`,
      }}
    >
      <PrGridBg />
      {tag ? (
        <div
          style={{
            color: PR.muted,
            fontFamily: PR.fontMono,
            fontWeight: 600,
            fontSize: Math.round(t * 0.024),
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            marginBottom: Math.round(t * 0.04),
            opacity: tg.opacity,
            transform: `translateY(${tg.ty}px)`,
          }}
        >
          {tag}
        </div>
      ) : null}

      <div
        style={{
          position: "relative",
          background: PR.white,
          borderRadius: Math.round(t * 0.012),
          boxShadow: PR.cardShadow,
          padding: Math.round(t * 0.02),
          paddingBottom: Math.round(t * 0.05),
          width: Math.round(width * 0.62),
          opacity: cardIn,
          transform: `rotate(${rotate}deg) scale(${0.9 + cardIn * 0.1})`,
        }}
      >
        <div
          style={{
            position: "absolute",
            top: Math.round(t * -0.02),
            left: "50%",
            width: Math.round(t * 0.11),
            height: Math.round(t * 0.045),
            background: PR.tape,
            transform: "translateX(-50%) rotate(-4deg)",
            boxShadow: "0 2px 4px rgba(0,0,0,0.08)",
          }}
        />
        {src ? (
          <Img
            src={src}
            style={{
              width: "100%",
              display: "block",
              borderRadius: Math.round(t * 0.004),
              objectFit: "cover",
            }}
          />
        ) : (
          <div style={{ width: "100%", aspectRatio: "4 / 3", background: PR.bg }} />
        )}
      </div>

      {caption ? (
        <div
          style={{
            color: PR.ink,
            fontWeight: 800,
            fontSize: Math.round(t * 0.048),
            textAlign: "center",
            marginTop: Math.round(t * 0.045),
            opacity: cap.opacity,
            transform: `translateY(${cap.ty}px)`,
          }}
        >
          {caption}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};
