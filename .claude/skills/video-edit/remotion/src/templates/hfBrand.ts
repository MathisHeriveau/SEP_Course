/**
 * "Visual OS" — an EXAMPLE brand preset for the `hf_*` graphic set.
 * Single source of truth for the ported HyperFrames graphic set (kinds `hf_*`).
 * This is a shipped example, not a fixed identity — see SETUP.md's "Brand
 * setup" section for the question-by-question flow to replace it with your
 * own colors/fonts. Change values HERE to re-brand the whole set.
 *
 * TYPE SYSTEM (roles matter more than the specific fonts below):
 *   fontDisplay (serif by default) → headlines, section titles, cover copy, product names
 *   font (sans by default)         → body, captions, footer labels, card text
 *   fontMono                       → technical labels, tags, step numbers, annotations
 *
 * COLOR: background always light in this preset. Pick one clear accent color
 * (used for CTAs/active states) and one punch/execution color distinct from
 * it — avoid using more than ~2 strong hues per frame.
 */
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import { loadFont as loadMono } from "@remotion/google-fonts/JetBrainsMono";

const { fontFamily: INTER } = loadInter("normal", {
  weights: ["400", "500", "600", "700", "800", "900"],
});
const { fontFamily: MONO } = loadMono("normal", { weights: ["400", "500", "700"] });

export const HF = {
  // ── Fonts (Type System) ───────────────────────────────────────────
  fontDisplay: `Georgia, "Times New Roman", serif`, // headlines / values / names
  font: `${INTER}, system-ui, sans-serif`, // body / labels / descriptions
  fontMono: `${MONO}, ui-monospace, SFMono-Regular, monospace`, // eyebrows / step numbers / tags

  // ── Background (always light) ─────────────────────────────────────
  bg: "#F5F6FB",

  // ── Structural anchors ────────────────────────────────────────────
  ink: "#0E1B3D", // deep navy — headlines / primary text
  cobalt: "#1A3A8F", // Deep Cobalt — dark bars / footer / authority anchor
  accent: "#2563EB", // Electric Blue — CTAs, active states, primary accent/emphasis
  accentDeep: "#1A3A8F", // deep end of the accent — gradient tails, pressed states
  warm: "#EE6C34", // Claude Orange — execution / process / mascot
  muted: "#5A6A8A", // slate blue-grey — sublabels
  accentLt: "#4F7BFF", // light end of the blue gradient

  white: "#FFFFFF",
  cream: "#FFF3EC", // mascot warm halo

  // ── Surfaces / glass ──────────────────────────────────────────────
  cardOpaque: "rgba(255,255,255,0.96)",
  glassFill: "rgba(255,255,255,0.66)",
  glassBorder: "rgba(255,255,255,0.85)",
  darkGlass: "rgba(14,27,61,0.74)", // navy-tinted dark glass

  // ── Shadows ───────────────────────────────────────────────────────
  cardShadow: "0 16px 44px rgba(14,27,61,0.12)",
  glassShadow: "0 24px 70px rgba(14,27,61,0.20)",
  barShadow: "0 8px 20px rgba(37,99,235,0.28)",

  // ── Gradients (signature blue → deep cobalt) ──────────────────────
  barGradient: "linear-gradient(180deg,#4F7BFF,#2563EB)",
  badgeGradient: "linear-gradient(150deg,#2563EB,#1A3A8F)",

  // ── Expanded accent palette (categorical: workflow stages, cards) ──
  palette: {
    coral: "#F26A4B",
    amber: "#F5A623",
    emerald: "#1FA971",
    teal: "#0E9E92",
    mint: "#6EE7B7",
    slate: "#64748B",
    claudeOrange: "#EE6C34",
  },
} as const;
