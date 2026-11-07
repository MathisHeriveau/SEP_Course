/**
 * hf_mascot — ported from HyperFrames mascot.html.
 * Fullscreen warm hero on a cream→bg radial wash with a big Georgia headline.
 * Two modes:
 *   - `clips` given  → plays the animated mascot clips in sequence (gym /
 *      confetti / dancing / flag-wave …), each filling its time-slice. The
 *      clips carry their own motion + particles, so the static sprite and
 *      sparkle dots are skipped.
 *   - no `clips`     → the static mascot sprite pops in with sparkle dots.
 */
import {
  AbsoluteFill,
  Img,
  interpolate,
  OffthreadVideo,
  Sequence,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { HF } from "./hfBrand";
import { useTypeBase, useFadeRise, useSpringIn } from "./motion";
import { HfGridBg } from "./HfGridBg";

export type HfMascotProps = {
  /** Big hero line (required). */
  headline: string;
  /** Optional uppercase warm subline below the headline. */
  sub?: string;
  /** Optional animated mascot clips (staticFile paths). When present they play
   *  in sequence and replace the static sprite + particles. */
  clips?: string[];
};

// FIXED fractional positions [x%, y%, sizeFrac] — no randomness (seek-safe).
const DOTS: ReadonlyArray<readonly [number, number, number]> = [
  [6, 20, 0.018],
  [80, 12, 0.012],
  [14, 55, 0.014],
  [86, 60, 0.02],
  [45, 8, 0.01],
  [74, 40, 0.012],
  [4, 72, 0.01],
  [50, 88, 0.016],
];

export const HfMascot: React.FC<HfMascotProps> = ({ headline, sub, clips }) => {
  const { width, height, durationInFrames } = useVideoConfig();
  useCurrentFrame();
  const t = useTypeBase();

  const mascotIn = useSpringIn(0.3, 0.55);
  const mascotRot = interpolate(mascotIn, [0, 1], [-10, 0]);
  const head = useFadeRise(0.7, 0.5, Math.round(height * 0.028));
  const subRise = useFadeRise(0.95, 0.4, Math.round(height * 0.015));

  const hasClips = !!(clips && clips.length > 0);
  const n = hasClips ? clips!.length : 0;
  const slice = hasClips ? Math.floor(durationInFrames / n) : 0;

  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(120% 90% at 50% 40%, ${HF.cream} 0%, ${HF.bg} 62%)`,
      }}
    >
      <HfGridBg />
      {hasClips ? (
        // Animated-clip mode: each clip fills its own time-slice, centered.
        clips!.map((src, i) => (
          <Sequence
            key={i}
            from={i * slice}
            durationInFrames={i === n - 1 ? durationInFrames - i * slice : slice}
          >
            <AbsoluteFill
              style={{
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",
              }}
            >
              <OffthreadVideo
                src={staticFile(src)}
                volume={0}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "contain",
                  transform: "scale(1.8) translateY(-6%)",
                }}
              />
            </AbsoluteFill>
          </Sequence>
        ))
      ) : (
        <>
          {/* Sparkle particles */}
          <AbsoluteFill style={{ pointerEvents: "none" }}>
            {DOTS.map(([xPct, yPct, sizeFrac], i) => (
              <Dot
                key={i}
                index={i}
                left={(xPct / 100) * width}
                top={(yPct / 100) * height}
                size={Math.round(t * sizeFrac)}
              />
            ))}
          </AbsoluteFill>
        </>
      )}

      {/* Content column, anchored low (headline sits below the mascot) */}
      <AbsoluteFill
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "flex-end",
          paddingBottom: Math.round(height * 0.16),
          fontFamily: HF.font,
          pointerEvents: "none",
        }}
      >
        {!hasClips ? (
          <Img
            src={staticFile("claude-mascot.png")}
            // No mascot art ships with the repo (see SETUP.md "Assets"). An
            // onError handler keeps a missing file from failing the render —
            // the beat just loses the mascot and keeps its headline.
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = "none";
            }}
            style={{
              width: Math.round(t * 0.4),
              height: "auto",
              objectFit: "contain",
              filter: "drop-shadow(0 18px 34px rgba(205,120,80,0.35))",
              transform: `scale(${mascotIn}) rotate(${mascotRot}deg)`,
              opacity: mascotIn,
            }}
          />
        ) : null}
        <div
          style={{
            color: HF.ink,
            fontFamily: HF.fontDisplay,
            fontWeight: 900,
            lineHeight: 1,
            letterSpacing: "-0.01em",
            fontSize: Math.round(t * 0.09),
            textAlign: "center",
            marginTop: Math.round(t * 0.05),
            hyphens: "manual",
            opacity: head.opacity,
            transform: `translateY(${head.ty}px)`,
          }}
        >
          {headline}
        </div>

        {sub ? (
          <div
            style={{
              color: HF.warm,
              fontFamily: HF.fontMono,
              fontWeight: 800,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              fontSize: Math.round(t * 0.035),
              marginTop: Math.round(t * 0.015),
              textAlign: "center",
              hyphens: "manual",
              opacity: subRise.opacity,
              transform: `translateY(${subRise.ty}px)`,
            }}
          >
            {sub}
          </div>
        ) : null}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const Dot: React.FC<{
  index: number;
  left: number;
  top: number;
  size: number;
}> = ({ index, left, top, size }) => {
  const s = useSpringIn(0.4 + index * 0.06, 0.5);
  return (
    <div
      style={{
        position: "absolute",
        left,
        top,
        width: size,
        height: size,
        borderRadius: "50%",
        background: HF.warm,
        transform: `scale(${s})`,
        opacity: 0.9 * s,
      }}
    />
  );
};
