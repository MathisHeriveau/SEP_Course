/**
 * pr_terminal — an instruction becomes an interface (motion-style §12):
 * a mac-traffic-light window on the paper grid where prompt lines TYPE in
 * (reuses useTypewriter), each at its own `at`. A line with `bad: true`
 * gets struck through right after it finishes; `accent: true` renders in
 * the brand blue. Off-center with seeded rotation; blinking cursor keeps
 * the scene alive between events (§22).
 */
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { PR } from "./paperBrand";
import { PrGridBg } from "./PrScribble";
import { useTypeBase, useTypewriter, useProg, useWipe } from "./motion";
import { PrAnnotation, PrBoxedLabel, jit, CornerPos } from "./PrLayers";

export type PrTerminalLine = { text: string; at: number; bad?: boolean; accent?: boolean };

export type PrTerminalProps = {
  lines: PrTerminalLine[];
  title?: string; // window titlebar text
  boxed_label?: string;
  boxed_label_at?: number;
  annotation?: string;
  annotation_pos?: CornerPos;
  annotation_at?: number;
  seed?: number;
};

const TermLine: React.FC<{ line: PrTerminalLine; t: number; last: boolean }> = ({ line, t, last }) => {
  const { fps } = useVideoConfig();
  const frame = useCurrentFrame();
  const typed = useTypewriter(line.text, line.at, 34);
  const done = typed.length >= line.text.length;
  const strike = useWipe(line.at + line.text.length / 34 + 0.25, 0.3);
  const cursorOn = Math.floor(frame / (fps * 0.45)) % 2 === 0;
  if (frame < Math.round(line.at * fps)) return null;
  return (
    <div
      style={{
        position: "relative",
        display: "inline-block",
        alignSelf: "flex-start",
        fontFamily: PR.fontMono,
        fontSize: Math.round(t * 0.026),
        lineHeight: 1.7,
        color: line.accent ? PR.accent : line.bad ? PR.muted : PR.ink,
        fontWeight: line.accent ? 700 : 500,
        whiteSpace: "pre-wrap",
      }}
    >
      <span style={{ color: PR.muted }}>{"> "}</span>
      {typed}
      {last && (!done || cursorOn) ? (
        <span style={{ color: PR.accent, fontWeight: 700 }}>▌</span>
      ) : null}
      {line.bad ? (
        <div
          style={{
            position: "absolute", left: Math.round(t * 0.03), right: `${(1 - strike) * 100}%`,
            top: "50%", height: 3, background: PR.accentAlt, transform: "translateY(-50%)",
          }}
        />
      ) : null}
    </div>
  );
};

export const PrTerminal: React.FC<PrTerminalProps> = ({
  lines,
  title = "claude",
  boxed_label,
  boxed_label_at = 0.2,
  annotation,
  annotation_pos = "tr",
  annotation_at = 1.2,
  seed = 9,
}) => {
  const { width } = useVideoConfig();
  const t = useTypeBase();
  const win = useProg(0.06, 0.28);

  return (
    <AbsoluteFill style={{ fontFamily: PR.font }}>
      <PrGridBg />
      <div
        style={{
          position: "absolute",
          left: Math.round(t * 0.07),
          top: Math.round(t * 0.42),
          width: Math.round(width * 0.86),
          opacity: win,
          transform: `translateY(${(1 - win) * 26}px) rotate(${jit(seed, 1.1)}deg)`,
        }}
      >
        {boxed_label ? (
          <div style={{ marginBottom: Math.round(t * 0.012) }}>
            <PrBoxedLabel text={boxed_label} at={boxed_label_at} seed={seed} />
          </div>
        ) : null}
        <div
          style={{
            background: PR.white,
            borderRadius: Math.round(t * 0.014),
            boxShadow: PR.cardShadow,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              display: "flex", alignItems: "center", gap: 7,
              padding: `${Math.round(t * 0.012)}px ${Math.round(t * 0.018)}px`,
              background: "rgba(14,27,61,0.05)",
            }}
          >
            {["#FF5F57", "#FEBC2E", "#28C840"].map((c) => (
              <span key={c} style={{ width: 11, height: 11, borderRadius: "50%", background: c }} />
            ))}
            <span
              style={{
                marginLeft: 8, fontFamily: PR.fontMono, fontSize: Math.round(t * 0.016),
                letterSpacing: "0.1em", color: PR.muted, textTransform: "uppercase",
              }}
            >
              {title}
            </span>
          </div>
          <div
            style={{
              display: "flex", flexDirection: "column",
              padding: `${Math.round(t * 0.02)}px ${Math.round(t * 0.024)}px`,
              minHeight: Math.round(t * 0.16),
            }}
          >
            {lines.map((l, i) => (
              <TermLine key={i} line={l} t={t} last={i === lines.length - 1} />
            ))}
          </div>
        </div>
      </div>
      {annotation ? (
        <PrAnnotation text={annotation} pos={annotation_pos} at={annotation_at} seed={seed} />
      ) : null}
    </AbsoluteFill>
  );
};
