/**
 * pr_stack — the cinematic accumulating-lines scene:
 * ONE continuous shot where VO lines STACK on screen instead of cutting to a
 * new card per sentence. Each line enters dim + slightly risen at its spoken
 * moment (`at`, seconds relative to the beat start) and pops to full
 * brightness — earlier lines stay on screen, so the scene reads as live
 * captioning over a moving background, not a slideshow.
 *
 * Background is an animated deep-navy field: two drifting radial glows in the
 * brand blues plus a slow seeded particle float — always moving, never a
 * static frame. Optional `chyron` renders the small persistent mono label
 * (top-left) that stitches scene changes together in the reference edits.
 *
 * All motion derives from useCurrentFrame() — deterministic and seek-safe.
 */
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { PR } from "./paperBrand";
import { useTypeBase, SMOOTH_EASE } from "./motion";

export type PrStackLine = { text: string; at: number };

export type PrStackProps = {
  lines: PrStackLine[];
  chyron?: string;
};

const StackAccent: React.FC<{ text: string }> = ({ text }) => {
  const parts = text.split(/(\{[^}]+\})/g).filter(Boolean);
  return (
    <>
      {parts.map((part, i) => {
        const m = part.match(/^\{([^}]+)\}$/);
        return m ? (
          <span
            key={i}
            style={{
              backgroundImage: PR.accentTextGradDark,
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

/** Deterministic pseudo-random in [0,1) from an integer seed. */
const rnd = (seed: number): number => {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

export const Particles: React.FC<{ count?: number }> = ({ count = 26 }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {Array.from({ length: count }, (_, i) => {
        const x = rnd(i) * width;
        const size = 2 + rnd(i + 100) * 5;
        const speed = 0.25 + rnd(i + 200) * 0.6; // px per frame, upward
        const y = ((rnd(i + 300) * height + height - frame * speed) % (height + 40)) - 20;
        const flicker = 0.25 + 0.35 * (0.5 + 0.5 * Math.sin(frame * 0.05 + i * 2.4));
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: x,
              top: y,
              width: size,
              height: size,
              borderRadius: "50%",
              background: PR.accentLt,
              opacity: flicker,
              filter: "blur(1px)",
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};

export const PrStack: React.FC<PrStackProps> = ({ lines, chyron }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = useTypeBase();

  // Slow orbiting glow centers — the background never sits still.
  const g1x = 30 + 14 * Math.sin(frame * 0.008);
  const g1y = 30 + 10 * Math.cos(frame * 0.006);
  const g2x = 72 - 12 * Math.sin(frame * 0.007 + 2);
  const g2y = 74 - 9 * Math.cos(frame * 0.009 + 1);
  // Continuous slow push-in across the whole scene.
  const push = 1 + Math.min(frame / (fps * 8), 1) * 0.06;

  return (
    <AbsoluteFill style={{ backgroundColor: "#0E1B3D", overflow: "hidden" }}>
      <AbsoluteFill
        style={{
          background:
            `radial-gradient(ellipse 60% 45% at ${g1x}% ${g1y}%, rgba(79,123,255,0.34), transparent 70%),` +
            `radial-gradient(ellipse 55% 42% at ${g2x}% ${g2y}%, rgba(37,99,235,0.30), transparent 70%),` +
            `radial-gradient(ellipse 90% 80% at 50% 50%, rgba(26,58,143,0.25), transparent 100%)`,
          transform: `scale(${push})`,
        }}
      />
      <Particles />

      {chyron ? (
        <div
          style={{
            position: "absolute",
            top: Math.round(t * 0.06),
            left: Math.round(t * 0.07),
            fontFamily: PR.fontMono,
            fontWeight: 500,
            fontSize: Math.round(t * 0.019),
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            color: "rgba(255,255,255,0.55)",
            opacity: interpolate(frame, [0, Math.round(0.4 * fps)], [0, 1], {
              extrapolateRight: "clamp",
            }),
          }}
        >
          {chyron}
        </div>
      ) : null}

      <AbsoluteFill
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "center",
          gap: Math.round(t * 0.018),
          paddingLeft: Math.round(t * 0.1),
          paddingRight: Math.round(t * 0.1),
          transform: `scale(${push})`,
        }}
      >
        {lines.map((line, i) => {
          const start = Math.round(line.at * fps);
          // Dim pre-entrance (line ghosts in), then pops to full white on cue.
          const appear = interpolate(frame, [start - Math.round(0.15 * fps), start], [0, 0.3], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });
          const bright = interpolate(
            frame,
            [start, start + Math.round(0.28 * fps)],
            [0.3, 1],
            { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: SMOOTH_EASE },
          );
          const opacity = frame < start ? appear : bright;
          const rise = interpolate(
            frame,
            [start - Math.round(0.15 * fps), start + Math.round(0.28 * fps)],
            [18, 0],
            { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: SMOOTH_EASE },
          );
          return (
            <div
              key={i}
              style={{
                fontFamily: PR.font,
                fontWeight: 800,
                fontSize: Math.round(t * 0.062),
                lineHeight: 1.14,
                letterSpacing: "-0.01em",
                color: "#FFFFFF",
                opacity,
                transform: `translateY(${rise}px)`,
                textShadow: "0 4px 26px rgba(14,27,61,0.65)",
                whiteSpace: "pre-line",
              }}
            >
              <StackAccent text={line.text} />
            </div>
          );
        })}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
