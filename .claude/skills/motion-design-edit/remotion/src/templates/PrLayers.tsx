/**
 * PrLayers — the shared layer vocabulary for the timed-layer pr_* scene
 * system (motion-style.md §6 asymmetry, §8 layering, §19 imperfection).
 * Every pr scene composes from these so the video reads as one design
 * system while no two scenes share a layout.
 *
 * Every layer takes `at` (seconds relative to the beat start) and enters
 * with a fast ease-out (§17) — no springs, no bounce.
 */
import React from "react";
import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { PR } from "./paperBrand";
import { useTypeBase, useProg, ENTRANCE_EASE } from "./motion";

/** Deterministic pseudo-random in [0,1) from an integer seed (seek-safe). */
export const rnd = (seed: number): number => {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};
/** Jitter: signed value in [-range, range], stable per seed (§19). */
export const jit = (seed: number, range: number): number => (rnd(seed) * 2 - 1) * range;

export type PrLayout = "left" | "upper-left" | "right" | "low" | "center";

/** Flex/padding preset per layout anchor — center must be asked for (§6). */
export const layoutStyle = (layout: PrLayout, t: number): React.CSSProperties => {
  const pad = Math.round(t * 0.09);
  const base: React.CSSProperties = {
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "flex-start",
    textAlign: "left",
    paddingLeft: pad,
    paddingRight: pad,
  };
  switch (layout) {
    case "left":
      return base;
    case "upper-left":
      return { ...base, justifyContent: "flex-start", paddingTop: Math.round(t * 0.30) };
    case "right":
      return { ...base, alignItems: "flex-end", textAlign: "right" };
    case "low":
      return { ...base, justifyContent: "flex-end", paddingBottom: Math.round(t * 0.34) };
    case "center":
      return { ...base, alignItems: "center", textAlign: "center" };
  }
};

export type CornerPos = "tl" | "tr" | "bl" | "br";

const cornerStyle = (pos: CornerPos, t: number, seed: number): React.CSSProperties => {
  const edge = Math.round(t * 0.075) + Math.round(jit(seed + 41, t * 0.02));
  const vert = Math.round(t * 0.16) + Math.round(jit(seed + 42, t * 0.03));
  return {
    position: "absolute",
    ...(pos.includes("l") ? { left: edge } : { right: edge, textAlign: "right" as const }),
    ...(pos.includes("t") ? { top: vert } : { bottom: vert }),
  };
};

/** Tiny JBM mono annotation, placed FAR from the headline (§8 detail layer). */
export const PrAnnotation: React.FC<{
  text: string;
  pos?: CornerPos;
  at?: number;
  seed?: number;
  dark?: boolean;
}> = ({ text, pos = "br", at = 0.5, seed = 1, dark }) => {
  const t = useTypeBase();
  const p = useProg(at, 0.22);
  return (
    <div
      style={{
        ...cornerStyle(pos, t, seed),
        fontFamily: PR.fontMono,
        fontWeight: 500,
        fontSize: Math.round(t * PR.typeScale.xs),
        letterSpacing: "0.16em",
        textTransform: "uppercase",
        color: dark ? "rgba(255,255,255,0.6)" : PR.muted,
        opacity: p,
        transform: `translateY(${(1 - p) * 8}px) rotate(${jit(seed + 7, 1.2)}deg)`,
        whiteSpace: "pre-line",
      }}
    >
      {text}
    </div>
  );
};

/** Thin rule lines that DRAW across the composition at staggered times. */
export const PrRuleLines: React.FC<{
  lines: Array<{ y: number; at: number; from?: "left" | "right"; w?: number }>;
  dark?: boolean;
}> = ({ lines, dark }) => {
  const { width, fps } = useVideoConfig();
  const frame = useCurrentFrame();
  const prog = (at: number) =>
    interpolate(frame, [Math.round(at * fps), Math.round((at + 0.5) * fps)], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: ENTRANCE_EASE,
    });
  return (
    <>
      {lines.map((l, i) => {
        const p = prog(l.at);
        const w = (l.w ?? 0.42) * width * p;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              top: `${l.y}%`,
              height: 2,
              width: w,
              ...(l.from === "right" ? { right: 0 } : { left: 0 }),
              background: dark ? "rgba(255,255,255,0.28)" : "rgba(14,27,61,0.22)",
            }}
          />
        );
      })}
    </>
  );
};

/** Small solid-bg pill label ("IN YOUR CLAUDE SUB" style). */
export const PrBoxedLabel: React.FC<{
  text: string;
  at?: number;
  seed?: number;
  color?: string;
}> = ({ text, at = 0.3, seed = 3, color = PR.accent }) => {
  const t = useTypeBase();
  const p = useProg(at, 0.2);
  return (
    <div
      style={{
        display: "inline-block",
        fontFamily: PR.fontMono,
        fontWeight: 700,
        fontSize: Math.round(t * 0.022),
        letterSpacing: "0.1em",
        textTransform: "uppercase",
        color: PR.white,
        background: color,
        padding: `${Math.round(t * 0.008)}px ${Math.round(t * 0.016)}px`,
        marginTop: Math.round(t * 0.025),
        boxShadow: PR.offsetShadow,
        opacity: p,
        transform: `translateX(${(1 - p) * -20}px) rotate(${jit(seed + 11, 1.5)}deg)`,
      }}
    >
      {text}
    </div>
  );
};

/** Asymmetric partial background block sliding in — §13, the background
 *  participates. Doubles as the parked wipe panel for continuity (§15). */
export const PrBgPanel: React.FC<{
  side?: "left" | "right" | "top";
  size?: number; // fraction of the axis, default 0.38
  at?: number;
}> = ({ side = "left", size = 0.38, at = 0 }) => {
  const p = useProg(at, 0.3);
  const pct = `${size * 100}%`;
  const off = `${(1 - p) * -100}%`;
  const pos: React.CSSProperties =
    side === "top"
      ? { top: 0, left: 0, right: 0, height: pct, transform: `translateY(${off})` }
      : side === "left"
        ? { top: 0, bottom: 0, left: 0, width: pct, transform: `translateX(${off})` }
        : { top: 0, bottom: 0, right: 0, width: pct, transform: `translateX(${(1 - p) * 100}%)` };
  return <div style={{ position: "absolute", ...pos, background: PR.accentGrad }} />;
};

/** Small persistent corner stat — the landing spot of the chart's numeral
 *  handoff (§15 object continuity). Always top-right. */
export const PrCornerStat: React.FC<{ text: string; dark?: boolean }> = ({ text, dark }) => {
  const t = useTypeBase();
  return (
    <div
      style={{
        position: "absolute",
        top: Math.round(t * 0.155),
        right: Math.round(t * 0.075),
        fontFamily: PR.fontDisplay,
        fontWeight: 800,
        fontSize: Math.round(t * 0.038),
        color: dark ? PR.white : PR.accent,
      }}
    >
      {text}
    </div>
  );
};

/** Persistent mono chyron, top-left — survives every cut. */
export const PrChyron: React.FC<{ text: string; dark?: boolean }> = ({ text, dark }) => {
  const t = useTypeBase();
  const p = useProg(0, 0.3);
  return (
    <div
      style={{
        position: "absolute",
        top: Math.round(t * 0.06),
        left: Math.round(t * 0.07),
        fontFamily: PR.fontMono,
        fontWeight: 500,
        fontSize: Math.round(t * PR.typeScale.xs),
        letterSpacing: "0.16em",
        textTransform: "uppercase",
        color: dark ? "rgba(255,255,255,0.55)" : "rgba(90,106,138,0.85)",
        opacity: p,
      }}
    >
      {text}
    </div>
  );
};
