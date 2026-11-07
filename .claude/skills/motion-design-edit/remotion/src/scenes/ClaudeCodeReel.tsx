/**
 * Bespoke directed scenes — the "kind: custom" extensibility hook.
 *
 * EditedVideo.tsx looks up `CC_SCENES[b.custom_id]` whenever a beat has
 * `kind: "custom"` and renders that component in place of the usual
 * `pr_*` template rendering. This is how you hand-write a fully custom,
 * frame-choreographed scene for one specific video instead of composing
 * it from the generic `pr_*` kinds — useful for a hero moment worth
 * treating as bespoke motion design rather than a templated beat.
 *
 * The original example scenes built for one specific past project were
 * removed when this skill was cleaned up for general reuse (they were
 * one-off content tied to that video's script, not reusable templates).
 * Add your own here: write a React.FC scene component (see
 * PrEnter/PrExit/PR tokens used elsewhere in this skill for the shared
 * motion/brand primitives), register it in CC_SCENES below, then
 * reference it from a beat as `{ "kind": "custom", "custom_id": "<key>" }`.
 */
import React from "react";

export const CC_SCENES: Record<string, React.FC> = {};
