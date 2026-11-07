/* "Visual OS" — an EXAMPLE design-token preset (light theme: near-white bg +
   deep-navy ink + electric-blue accent + glass). Swap the values below to
   apply your own brand — see SETUP.md's "Brand setup" section for the
   question-by-question flow. Luminance ROLES matter more than exact colors
   (RAISIN = the dark/ink pole, SILVER* = light fills/lines) so the
   token-driven viz devices don't break — keep contrast/role relationships
   intact even if you change every value. ACCENT is the "one accent per frame"
   variable every viz device reads; ACCENT_DEEP is its deep end.
   Fonts: Georgia (serif/headlines) · Inter (sans/body) · JetBrains Mono
   (labels) — also swappable per the brand-setup flow. */
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import { loadFont as loadMono } from "@remotion/google-fonts/JetBrainsMono";

const { fontFamily: INTER } = loadInter("normal", {
  weights: ["400", "500", "600", "700", "800", "900"],
});
const { fontFamily: JBM } = loadMono("normal", { weights: ["400", "500", "700"] });

export const RAISIN = "#0E1B3D"; // THE dark/ink pole — text on cards, dark blocks, axes
export const RAISIN_DEEP = "#16213F"; // deep navy surface / depth
export const STEEL = "#8896B5"; // muted slate — the "other/secondary" (non-accent) element
export const SILVER = "#E9ECED"; // light fill / hairline
export const SILVER_SOFT = "#D8DCE6"; // light border / card edge
export const SILVER_MID = "#B5BFC2"; // mid light line
export const BODY = "#5A6A8A"; // muted body / sub-label text
export const ACCENT = "#2563EB"; // THE single accent — electric blue (one per frame)
export const ACCENT_DEEP = "#1A3A8F"; // deep end of the accent — gradient tails, pressed states
export const ACCENT_LT = "#4F7BFF"; // light end of the accent — gradient heads, highlights
export const WHITE = "#FFFFFF";

export const SANS = `${INTER}, system-ui, sans-serif`;
export const MONO = `${JBM}, ui-monospace, monospace`;
export const SERIF = `Georgia, "Times New Roman", serif`;

/* two-tier radius rule */
export const R_SURFACE = 12; // cards / frames / containers
export const R_INK = 0; // buttons / badges / bars / blocks — sharp print edge

export const SHADOW_CARD = "0 1px 2px rgba(14,27,61,.05), 0 18px 40px -16px rgba(14,27,61,.22)";

/* brand background plates (full-frame, in public/brand) */
export type BgKey = "grid-dark" | "grid-light" | "riso";
