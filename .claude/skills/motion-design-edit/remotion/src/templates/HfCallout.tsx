/**
 * hf_callout — ported from HyperFrames callout.html.
 * Bottom-left compact "bug": muted eyebrow (with a warm dot), big ink headline,
 * and a pill (warm by default, accent-blue when pill_color="accent").
 * Partial overlay — renders over the speaker, no takeover.
 */
import {
  AbsoluteFill,
  Img,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { HF } from "./hfBrand";
import { useTypeBase, useFadeRise, useSpringIn } from "./motion";

export type HfCalloutProps = {
  /** Small uppercase label above the headline (optional). */
  eyebrow?: string;
  /** Main line (required). */
  headline: string;
  /** Optional pill chip at the end of the headline row. */
  pill?: string;
  /** "accent" = blue pill; anything else = warm/orange pill (default). */
  pill_color?: string;
};

export const HfCallout: React.FC<HfCalloutProps> = ({
  eyebrow,
  headline,
  pill,
  pill_color,
}) => {
  const { width, height } = useVideoConfig();
  useCurrentFrame();
  const t = useTypeBase();

  const row = useFadeRise(0.1, 0.5, Math.round(height * 0.037)); // ~40px @1080
  const pillIn = useSpringIn(0.45, 0.4);
  const pillScale = 0.6 + 0.4 * pillIn;
  const mascotIn = useSpringIn(0.25, 0.5);
  const mascotRot = interpolate(mascotIn, [0, 1], [-12, 0]);

  const pillBg = pill_color === "accent" ? HF.accent : HF.warm;

  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <AbsoluteFill
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "flex-end",
          paddingLeft: Math.round(width * 0.04),
          paddingRight: Math.round(width * 0.04),
          paddingBottom: Math.round(height * 0.22),
        }}
      >
        <div
          style={{
            display: "inline-flex",
            flexDirection: "row",
            alignItems: "flex-end",
            gap: Math.round(t * 0.018),
            maxWidth: "94%",
            opacity: row.opacity,
            transform: `translateY(${row.ty}px)`,
          }}
        >
          <Img
            src={staticFile("claude-mascot.png")}
            // No mascot art ships with the repo (see SETUP.md "Assets"). An
            // onError handler keeps a missing file from failing the render —
            // the callout just loses the mascot and keeps its copy.
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = "none";
            }}
            style={{
              width: Math.round(t * 0.11),
              height: "auto",
              objectFit: "contain",
              flexShrink: 0,
              filter: "drop-shadow(0 10px 22px rgba(205,120,80,0.30))",
              transform: `scale(${mascotIn}) rotate(${mascotRot}deg)`,
              transformOrigin: "bottom center",
            }}
          />
        <div
          style={{
            display: "inline-flex",
            flexDirection: "column",
            alignItems: "flex-start",
            background: HF.cardOpaque,
            border: `1px solid rgba(255,255,255,0.9)`,
            borderRadius: Math.round(t * 0.024),
            padding: `${Math.round(t * 0.02)}px ${Math.round(t * 0.031)}px`,
            boxShadow: "0 20px 60px rgba(20,30,80,0.22)",
            fontFamily: HF.font,
          }}
        >
          {eyebrow ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: Math.round(t * 0.011),
                color: HF.muted,
                fontSize: Math.round(t * 0.025),
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                marginBottom: Math.round(t * 0.008),
                whiteSpace: "nowrap",
                fontFamily: HF.fontMono,
              }}
            >
              <span
                style={{
                  width: Math.round(t * 0.013),
                  height: Math.round(t * 0.013),
                  borderRadius: "50%",
                  background: HF.warm,
                  display: "inline-block",
                }}
              />
              {eyebrow}
            </div>
          ) : null}

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: Math.round(t * 0.016),
              color: HF.ink,
              fontSize: Math.round(t * 0.059),
              fontWeight: 800,
              lineHeight: 1,
              hyphens: "manual",
              overflowWrap: "break-word",
              fontFamily: HF.fontDisplay,
            }}
          >
            <span>{headline}</span>
            {pill ? (
              <span
                style={{
                  background: pillBg,
                  color: "#fff",
                  fontWeight: 800,
                  fontSize: Math.round(t * 0.044),
                  borderRadius: 999,
                  padding: `${Math.round(t * 0.006)}px ${Math.round(
                    t * 0.024
                  )}px`,
                  transform: `scale(${pillScale})`,
                  opacity: pillIn,
                  whiteSpace: "nowrap",
                }}
              >
                {pill}
              </span>
            ) : null}
          </div>
        </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
