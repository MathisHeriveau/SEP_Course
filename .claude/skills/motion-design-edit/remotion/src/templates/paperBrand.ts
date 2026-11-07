/**
 * Paper-Reel — the paper-grid / punch-color / taped-proof-card style (faint
 * grid, hand-drawn connector line between beats, solid punch-color interrupt
 * cards, taped index-card proof shots). Single source of truth for the
 * ported graphic set (kinds `pr_*`). Fully independent from `HF` — swap
 * values here to re-skin the whole set without touching any `Pr*` component.
 *
 * Two selectable styles, resolved from `props.json`'s `prStyle` field
 * (set per-render via the `PR_STYLE` env var — see render.sh):
 *   "paper"      (default) — cream / ink / punch-orange, the original
 *                 paper-reel look. Sans-serif throughout.
 *   "visual-os"  — the "Visual OS" example brand preset (see hfBrand.ts):
 *                 light bg, deep-navy ink, electric-blue accent, Georgia
 *                 headlines. Swap either preset's values for your own brand
 *                 — see SETUP.md's "Brand setup" section.
 *
 * TYPE SYSTEM (paper style — never swap): Inter for everything except
 * JetBrains Mono peripheral chrome (eyebrows/tags/annotations).
 * TYPE SYSTEM (visual-os style — never swap): Georgia headlines · Inter body
 * · JetBrains Mono chrome only.
 */
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import { loadFont as loadMono } from "@remotion/google-fonts/JetBrainsMono";
import props from "../props.json";

const { fontFamily: INTER } = loadInter("normal", {
  weights: ["400", "600", "700", "800", "900"],
});
const { fontFamily: MONO } = loadMono("normal", { weights: ["400", "500", "700"] });

const FONT = `${INTER}, system-ui, sans-serif`;
const FONT_MONO = `${MONO}, ui-monospace, SFMono-Regular, monospace`;

// Fraction of the type base; motion-style §9–10 — shared by both styles,
// pure layout, not a brand choice.
const TYPE_SCALE = { xs: 0.019, body: 0.03, m: 0.05, l: 0.072, xl: 0.17 };

const PAPER = {
  // ── Fonts ──────────────────────────────────────────────────────────
  fontDisplay: FONT, // no separate serif — bold sans-serif throughout
  font: FONT,
  fontMono: FONT_MONO,

  // ── Background (cream paper) ────────────────────────────────────────
  bg: "#F1ECE0",
  gridLine: "rgba(35,31,27,0.08)",

  // ── Structural anchors ─────────────────────────────────────────────
  ink: "#231F1B", // near-black ink — headlines / primary text
  muted: "#8C8577", // warm gray — eyebrows / sublabels / struck-through text
  accent: "#E8622C", // punch orange — THE brand accent
  accentAlt: "#00875A", // forest green — secondary punch (positive data/checkmarks)
  accentDeep: "#B94B1F", // deep end of the punch orange — gradient tails, pressed states
  accentLt: "#F3894F", // light end of the punch orange — gradient heads, highlights

  // ── Gradients (punch orange, light → deep) ──────────────────────────
  accentGrad: "linear-gradient(155deg, #F3894F 0%, #E8622C 52%, #B94B1F 100%)",
  accentTextGrad: "linear-gradient(115deg, #F3894F 0%, #E8622C 55%, #B94B1F 100%)",
  accentTextGradDark: "linear-gradient(115deg, #FFB088 0%, #F3894F 45%, #E8622C 100%)",

  white: "#FFFFFF",
  tape: "rgba(232,202,140,0.65)", // washi-tape corner on proof cards (warm tan)

  // ── Shadows ─────────────────────────────────────────────────────────
  cardShadow: "0 18px 44px rgba(40,30,20,0.16)",
  offsetShadow: "7px 7px 0 rgba(35,31,27,0.16)",

  typeScale: TYPE_SCALE,
} as const;

const VISUAL_OS = {
  // ── Fonts ──────────────────────────────────────────────────────────
  fontDisplay: `Georgia, "Times New Roman", serif`, // headlines / punch values
  font: FONT,
  fontMono: FONT_MONO,

  // ── Background (Visual OS light paper) ─────────────────────────────
  bg: "#F5F6FB",
  gridLine: "rgba(14,27,61,0.08)",

  // ── Structural anchors ─────────────────────────────────────────────
  ink: "#0E1B3D", // deep navy — headlines / primary text
  muted: "#5A6A8A", // slate blue-grey — eyebrows / sublabels / struck-through text
  accent: "#2563EB", // electric blue — THE brand accent: highlights, strike-line, punch cards
  accentAlt: "#EE6C34", // Claude orange — deliberate secondary punch only (never the through-line)
  accentDeep: "#1A3A8F", // deep end of the accent blue — gradient tails, pressed states
  accentLt: "#4F7BFF", // light end of the accent blue — gradient heads, highlights

  // ── Gradients (the brand blues mixed light → deep) ─────────────────
  accentGrad: "linear-gradient(155deg, #4F7BFF 0%, #2563EB 52%, #1A3A8F 100%)", // punch/card surfaces
  accentTextGrad: "linear-gradient(115deg, #4F7BFF 0%, #2563EB 55%, #1A3A8F 100%)", // clipped word highlights
  accentTextGradDark: "linear-gradient(115deg, #8FB0FF 0%, #4F7BFF 45%, #2563EB 100%)",

  white: "#FFFFFF",
  tape: "rgba(79,123,255,0.32)", // washi-tape corner on proof cards (translucent blue)

  // ── Shadows ─────────────────────────────────────────────────────────
  cardShadow: "0 18px 44px rgba(14,27,61,0.14)",
  offsetShadow: "7px 7px 0 rgba(14,27,61,0.16)", // editorial offset (motion-style §19)

  typeScale: TYPE_SCALE,
} as const;

export const PR = (props as { prStyle?: string }).prStyle === "visual-os" ? VISUAL_OS : PAPER;
