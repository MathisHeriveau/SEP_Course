# Bespoke Intro — the method for hero 16:9 intros

**This REPLACES the template path (`intro_recipe.md`) for any hero intro.** A hero intro is a hand-written
Remotion composition designed for THIS script — a one-off piece of motion design worth $5k. Template plans
were rejected twice ("super boring"); so was over-reusing a previous comp's look. **The deliverable of this
doc is a METHOD, not a style.** Every new video gets its own concept; only the principles below carry over.

---

## Part 1 — Principles (style-agnostic; these never change)

### Concept
1. **Concept before code.** Read the transcript yourself and find the 4–7 semantic beats. Then invent ONE
   environment or visual thesis that can hold the entire intro — derived from what THIS script is about,
   not recycled from the last video. (A video about editing became an editor's note-canvas; a video about
   design became the speaker's own footage as the stage. The next one should surprise us.)
2. **Every visual must MEAN the sentence.** Per beat, write one line: what appears and why it means exactly
   this spoken moment. If the answer is decoration or vibes, cut it. "Boring" feedback almost always means
   "this visual doesn't mean anything," not "add more motion."
3. **Receipts beat graphics.** Real artifacts (real thumbnails, real metrics, real file paths, real product UI)
   are always stronger than invented illustrations. When claiming proof, show the actual thing.
   **This includes brand marks: the moment a company/product is named in the script, fetch its REAL logo
   unprompted** (apple-touch-icon, /icon.svg, docs press assets — verify by viewing, and tight-crop padded
   icons so they read at small sizes). A drawn stand-in glyph for a real brand is a polish gap the user
   will catch every time.

### Structure
4. **Anchor everything to speech.** Every visual event lands on an exact word-start from words.json.
   Nothing is timed by feel.
5. **The first 2 seconds are the most important shot in the video.** Give the hook a deliberate, crafted
   entrance (the register of a film title: focus, settle, an element that draws on, a title moment) —
   whatever form fits the concept. Never open on an untreated frame.
6. **One persistent element ties the whole runtime together.** Something (a frame, a thread, a mark) that
   survives every scene change, so the intro reads as one designed object instead of a sequence of effects.
7. **The speaker is the show.** Everything else supports him. Maintain a contrast hierarchy where the eye
   goes to him first; visuals may take over the frame only briefly and for a reason.
8. **Rhythm needs breaks — and breaks need content.** A mid-intro register change (e.g. environment →
   fullscreen → environment) keeps 25s alive, but the break must carry its own meaningful content, styled
   in the intro's own language — never floating stock chrome/boxes that "don't match the vibe."

### Motion
9. **Clean > aggressive.** Fades and settles, not slams, pops, shakes, or explosions. At most one hard
   transition (e.g. a flash-out) at the very end.
9b. **Connector arrows are STRAIGHT lines with attached heads.** Wavy/squiggle arrows were rejected across
    multiple videos ("ugly", "weird curves"). A connector = straight stroke, round caps, arrowhead fading in
    as the line arrives. Decorative curved paths (dotted flight arcs, threads) are fine — but anything with
    an arrowHEAD is straight.
10. **The camera is a narrator, not an effect.** It never fully rests (micro-drift on holds) and never makes
    two moves where one continuous move works. Each camera intention = exactly one move.
11. **Sound follows visual physics.** Cues fire when things LAND, not when they start moving. Counting/serial
    visuals get soft per-item ticks. Few, quiet, purposeful — sound design is felt, not noticed.

### Process
12. **Iterate: preview render → stills you personally view → hand to the user → STOP.** Never auto-final.
    Final render only on explicit approval.
13. **Every scripted patch must assert it changed the file.** Silent no-op edits have shipped unchanged
    renders twice.
14. **Re-pacing = remap, don't eyeball.** When a tighter cut of the same script arrives: re-transcribe, build
    a piecewise-linear old→new map from word boundaries, push every time constant through it, update the comp
    duration. The whole design re-lands on the new pacing automatically.
15. **Feedback names a symptom; find the violated principle.** "More quality" → the hook isn't crafted (P5).
    "Doesn't match the vibe" → foreign chrome in the intro's language (P8). "Looks off" (camera) → two moves
    where one belongs (P10). "Too aggressive" → P9. "Boring" → P2. Fix the principle, not just the pixel.

---

## Part 2 — Building your own execution kit

The original bundle's shipped example compositions and their specific palette/music/asset choices were
removed when this skill was cleaned up for general reuse (they were bespoke pieces built for one creator's
specific videos, not reusable templates). Part 1's principles are the durable part — apply them fresh to
your own brand and content rather than looking for a "current style" to copy. As you build bespoke intros
for your own videos, consider keeping your own running notes here (brand tokens, a signature persistent
element, a music/SFX default, render settings, recurring gotchas) so future videos in your style don't
re-derive the same decisions. A few craft notes worth carrying over regardless of style:

- **Straight-line connectors only.** Arrows/connectors should be straight strokes with an arrowhead that
  fades in as the line arrives — wavy/squiggle connectors read cheap. Decorative curved paths with no
  arrowhead are fine as passive threads.
- **World-canvas register for hero pieces.** For a full-frame designed canvas with a world camera
  (`[frame, x, y, zoom]`), open near-fullscreen (speaker large, rounded corners, a sliver of canvas at the
  edges) and choreograph the speaker card to a new position each beat rather than parking it in one static
  corner — 6–8 eased moves over 45s reads as "interactive" instead of static.
- **Set pieces at world scale, not overlay scale.** If a visual could be called "an overlay", it's too
  small for a hero piece — let numbers/documents/diagrams bleed the frame.
- **Real things must look like the real thing.** Geographic data uses real border geometry, not a random
  scatter; an invoice uses a real bill layout (header, itemized table, underlined total, terms footer).
  Receipts logic extends to layout formats, not just data.
- **Animated elements must not strobe.** Keep oscillation to ≤~2 cycles/sec, modest amplitude — fast
  per-frame jitter reads as glitchy rather than alive.
- **If a clip demonstrates something audible, play its actual audio** rather than muting it under
  narration — a silent demo of an audio/voice product defeats the point of showing it.
