/**
 * hf_title — ported from HyperFrames title.html.
 * Fullscreen opaque title card: small accent eyebrow above a big ink headline,
 * centered on the brand background. Full takeover, no speaker behind it.
 */
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { HF } from "./hfBrand";
import { useTypeBase, useFadeRise } from "./motion";
import { HfGridBg } from "./HfGridBg";

export type HfTitleProps = {
  /** Small uppercase accent eyebrow shown ABOVE the headline (optional). */
  subhead?: string;
  /** Big headline shown below (required). */
  headline: string;
};

export const HfTitle: React.FC<HfTitleProps> = ({ subhead, headline }) => {
  const { width, height } = useVideoConfig();
  useCurrentFrame();
  const t = useTypeBase();

  const isPortrait = height >= width;

  const sub = useFadeRise(0.2, 0.5, 20);
  const head = useFadeRise(0.5, 0.6, 30);

  return (
    <AbsoluteFill
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: HF.bg,
        paddingLeft: Math.round(width * 0.06),
        paddingRight: Math.round(width * 0.06),
        fontFamily: HF.font,
      }}
    >
      <HfGridBg />
      {subhead ? (
        <div
          style={{
            color: HF.accent,
            fontFamily: HF.fontMono,
            fontWeight: 600,
            fontSize: Math.round(t * 0.03),
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            textAlign: "center",
            marginBottom: Math.round(t * 0.022),
            opacity: sub.opacity,
            transform: `translateY(${sub.ty}px)`,
            hyphens: "manual",
          }}
        >
          {subhead}
        </div>
      ) : null}

      <div
        style={{
          color: HF.ink,
          fontFamily: HF.fontDisplay,
          fontWeight: 900,
          lineHeight: 1.05,
          fontSize: Math.round(t * (isPortrait ? 0.09 : 0.075)),
          textAlign: "center",
          opacity: head.opacity,
          transform: `translateY(${head.ty}px)`,
          hyphens: "manual",
        }}
      >
        {headline}
      </div>
    </AbsoluteFill>
  );
};
