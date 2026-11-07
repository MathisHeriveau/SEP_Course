> **READ FIRST: `motion-style.md` at the repo root** — the permanent motion
> doctrine (visual concepts not captions, motion density, asymmetry, layer
> counts, typography scales, hard cuts, editorial imperfection). It OVERRIDES
> anything here on philosophy; this file keeps the pr_*-specific mechanics.

# Paper-reel style (`pr_*` kinds)

A second, independent graphic set — sibling to the `hf_*` ported HyperFrames kit — for **fully faceless** motion-graphics reels: cream paper grid, hand-drawn connector line, solid punch-color interrupts, taped index-card "proof" shots. The register is pure typographic motion graphics over a voiceover, with no camera in the shot at all.

Brand tokens live in [paperBrand.ts](../remotion/src/templates/paperBrand.ts) (`PR` object) — change values there to re-skin the whole set. Components: [PrCard.tsx](../remotion/src/templates/PrCard.tsx), [PrPunch.tsx](../remotion/src/templates/PrPunch.tsx), [PrProof.tsx](../remotion/src/templates/PrProof.tsx), background/line in [PrScribble.tsx](../remotion/src/templates/PrScribble.tsx). QA composition: [PrShowcase.tsx](../remotion/src/PrShowcase.tsx) (`npx remotion still src/index.ts PrShowcase out.png --frame=N`, no source video needed).

**This set is for beats with no speaker underneath.** Unlike `hf_*`/the rest of the library, `pr_*` beats assume nothing is visible behind them — they're built for videos where every beat, start to finish, is one of these three kinds back to back, muxed with a narration track. Don't mix `pr_*` into a talking-head edit; use `hf_*` or the base library for that.

**Check `raw/captions.txt` before authoring on-screen text.** If the user has provided one, it's authoritative for wording — parse it with `scripts/parse_captions.py` and use its lines verbatim; don't paraphrase or re-compress them. It only supplies WORDS, not layout/timing/motion — the labeled blocks give phrase grouping, `{word}` marks the accent span, but composition and choreography are still yours to design. See `projects/claude-code-edit/raw/captions.txt` for the format. No captions.txt → compress the transcript into on-screen text yourself, as before.

## The three kinds

| Kind | Fields | When to use |
|---|---|---|
| `pr_card` | `eyebrow?`, `headline` (required), `strike?`, `align?` | The default "idea" beat. Eyebrow is a small caps mono label ("TIP 01", "STRAIGHT FROM THE SOURCE"). Headline supports `{word}` bracket syntax — the same convention as `word_pop` — to color one sub-span in punch orange; don't wrap the whole line. `strike` renders a second line already struck through (the "correction" reveal: "tell it {why}." / strike: "not just what"). |
| `pr_punch` | `value` (required), `label?`, `pr_color?`, `pr_fullbleed?` (default true) | Solid-color interrupt. `pr_fullbleed=true` (default): whole frame fills with color, huge `value` (a word or number — "3", "CRO", "7 days"). `pr_fullbleed=false`: a centered rounded color box on the paper grid holding 1-2 lines — the "reframe" beat ("discovery isn't earned anymore. it's engineered."). |
| `pr_proof` | `tag?`, `image_path?`, `caption?`, `rotate?` | A taped index-card/polaroid on the grid. With `image_path` it shows a screenshot/logo/photo, rotated a few degrees with a washi-tape corner (same `image_path` → `resolveSrc` resolution as every other image kind). Without it, renders as a blank card — use when `caption` alone carries the beat. `tag` is the small mono label above the card ("DELHI · A SHOP COUNTER"); `caption` is the payoff line below it ("$4.5B valuation."). |

All three are full-frame takeovers — registered in `TAKEOVER_KINDS` (EditedVideo.tsx) and `VALID_KINDS`/`REQUIRED_FIELDS`/`OPENER_KINDS` (lint_plan.py). `pr_card` and `pr_punch` are valid openers (same bucket as `hook_title`/`hf_title`).

## The story structure (author beats in this shape)

The five-part arc this set is built around:

1. **Hook (0–3s)** — a bold, counter-intuitive claim, no greeting. `pr_card` (eyebrow + headline) or `pr_punch` fullbleed.
2. **Credibility drop** — introduce the source via blunt numbers (valuation, revenue, follower count). `pr_proof` with a `tag` + `caption`, or `pr_punch` for a single huge stat.
3. **Reframe** — the twist that turns the hook into a lesson. `pr_punch` with `pr_fullbleed=false` (the orange box).
4. **Numbered tactical list** — "3 things," each its own beat: `pr_card` with `eyebrow: "TIP 0N"` + `headline`, optionally followed by a `pr_proof` for a concrete example (screenshot/prompt/logo).
5. **CTA loop-back** — pivot to the creator's own product/ask. `pr_card`, no eyebrow, direct address.

New cuts every 1–3s. Alternate `pr_card` (reading beat) with `pr_punch`/`pr_proof` (visual interrupt) so pacing breathes — don't run three `pr_card`s in a row.

## What this set deliberately doesn't do

No speaker matte, no follow-cam, no "text never overlays the face" rule (rule 4al in SKILL.md) — none of that applies because there's no camera in the shot at all. If a job needs both a talking-head cold-open AND a faceless mid-section, that's two separate edits, not one plan mixing `hf_*`/base kinds with `pr_*`.
