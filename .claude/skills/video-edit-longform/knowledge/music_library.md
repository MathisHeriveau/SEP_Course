# Background music library

> **No music ships with this repo.** `music/` is empty except for its
> `.gitkeep` — bring your own licensed tracks (see "Recommended sources"
> below) and drop them in. `score.sh` picks from whatever is present, so with
> an empty dir the render simply has no bed. This file is the spec for *what
> to put there*, not an index of bundled files.

**Two vibes by mode:**

- **Shorts (9:16, ≤90s)** — calm instrumental, texture only, you should NOT notice it. Name these `bg-ambient-*.mp3`. Mix weight 0.22, -38 LUFS.
- **YT longform / intro (16:9)** — feel-good acoustic-instrumental with rhythmic drive. Name these `bg-feelgood-*.mp3`. Mix weight 0.30, -32 LUFS. **Music is audible, sits as a bed under the voice.**

**Both modes:** NO electronic / synth bass / lo-fi-with-808s / "epic cinematic" trailer / elevator-corny. NO twee music-box / kids-show / overly-cute acoustic.

**What got rejected (do NOT replicate):**
- Generic bundled demo tracks — electronic dance / synth → "annoying and corny"
- Any "lofi tech pulse", "ambient corporate", "tech background", "driving electronic groove", "punchy electronic" — all rejected as too prominent and the wrong genre

**What works:** the bed exists to mask room-tone gaps and add a faint emotional texture under the speaker's authority. It should NEVER call attention to itself.

## File layout

Tracks live in `video-edit/music/` as `.mp3` files.

Selection logic in [render.sh](../scripts/render.sh):

- **MUSIC_TRACK env var** — explicit per-render override, wins over everything (`MUSIC_TRACK=bg-ambient-5.mp3 bash render.sh ...`)
- **16:9 source** → the first `bg-feelgood-*.mp3` present (the YT longform/intro register)
- **9:16 source** → deterministic SHA1(input)%track-count pick across the `bg-ambient-*` set (the shorts register)

The deterministic pick keeps one source video on one track across re-renders, so a preview and its final sound the same.

## Naming convention

There is no bundled track list — `score.sh` reads the directory. Name what you
add so the selection logic can route it:

| Pattern | Register | Target |
|---|---|---|
| `bg-feelgood-*.mp3` | longform / intro (16:9) | 90–110 BPM, light kit, major key |
| `bg-ambient-*.mp3` | shorts (9:16) | ≤80 BPM, solo piano / soft strings, no percussion |

Anything else in `music/` is still selectable via an explicit
`MUSIC_TRACK=<file>` override, it just won't be auto-picked by register.

## Mix levels — TWO REGISTERS

`score.sh` uses one set of constants for both modes; the difference is the chosen track. Constants (locked May 9 2026):

- Music loudness target: **-32 LUFS** (was -38 in the locked-shorts register; bumped May 9 because the longform register needs the music to be perceptible, not subliminal)
- Mix weight: **0.30** (was 0.22 in the original shorts register; bumped to 0.40, dialed back to 0.30 as the user-confirmed sweet spot)
- Sidechain ducking: ~10 dB further during voice activity, recovers in 400 ms
- `atempo` speed: configurable via `MUSIC_SPEED` env var (default 1.0; raise to 1.10–1.30 for slower source tracks)

The 0.30 weight + -32 LUFS sits the music as a clear-but-not-competing bed under the voice. You'll hear it; it won't distract.

**Mode-specific tuning (defaults, override with env vars):**

| | Shorts register | Longform/intro register |
|---|---|---|
| Track | `bg-ambient-*.mp3` (deterministic pick) | `bg-feelgood-*.mp3` |
| `MUSIC_SPEED` | 1.0 | 1.0 for a 90-110 BPM bed; raise for slower sources |
| Effective LUFS / weight | -32 / 0.30 (same constants, source track is calmer so feels softer) | -32 / 0.30 |

If shorts feel too loud at the new constants, override per-render: `MUSIC_VOLUME=0.22` (would need a small score.sh edit to read this — not currently wired; if it becomes an issue, add it).

## Selection criteria (HARD RULES)

**For shorts (calm register):**

1. **Instrumental only.** No vocals.
2. **No drums or percussion** beyond the softest brushed kit.
3. **No bass.**
4. **Acceptable:** solo piano, piano + soft strings, light acoustic guitar, ambient piano w/ mild reverb, classical chamber.
5. **Unacceptable:** synth leads, EDM, lo-fi hip-hop, cinematic trailer pads, anything that says "tech startup explainer".
6. **Slow tempo.** ≤80 BPM.
7. **Loopable.**

**For YT longform/intro (feel-good register):**

1. **Instrumental only.** No vocals.
2. **Light percussion OK** if it's brushed/shaker level — must not compete with voice.
3. **Light bass OK** if it's not sub-heavy.
4. **Acceptable:** acoustic guitar w/ light kit, soundtrack-genre instrumentals, chamber-pop, jazz-piano leaning. Major key.
5. **Unacceptable:**
   - Music-box / glockenspiel / heavy ukulele lead → reads as "twee / kids show / girly"
   - Slow classical (≤70 BPM) → reads as "depressive" / wedding-music
   - Cinematic build-and-release → corny
   - Synth leads / EDM / lo-fi hip-hop → off-vibe
6. **Tempo 90–110 BPM.** Energetic enough to add drive, calm enough not to compete.
7. **Loopable.**

## Recommended sources (in order)

1. **Pixabay Music** (https://pixabay.com/music/) — free for commercial use, no attribution. Search prompts that work: `"calm piano"`, `"ambient piano"`, `"soft strings instrumental"`, `"classical solo piano"`.
2. **archive.org** — public-domain classical recordings (pre-1929 compositions and PD-licensed performances).
3. **Free Music Archive** (https://freemusicarchive.org/) — CC0 / Public Domain filter. Favor the calm acoustic/piano end; skip anything synth-led (off-vibe).

## NOT acceptable sources

- Bundled-sample "demo" tracks that ship with audio libraries — usually electronic dance, always the wrong vibe.
- Any "lo-fi study beats" library — too informal, dates the content.
- "Corporate / inspirational" stock music with build-and-release structure — corny.
- Stock-library "Indie Vlog" / "ambient corporate" categories — these terms are a red flag, the result is always the wrong vibe.

## Verification before adding a track

1. **Listen at the actual mix level (-38 LUFS, weight 0.22) under a voiceover.** If you can hear the music as music, it's too loud or too busy.
2. **The cornyness test:** does it sound corny if you describe what it is in plain words? "Solo piano arpeggios" → safe. "Inspirational tech build-up" → reject. "Ambient corporate" → reject.
3. Check it doesn't have a vocal hook hiding in the back third of the track (some "instrumental" tracks include vocals after 90s).
4. Verify the file is ≥30s and ≥200 KB so loops don't start chopping mid-render.

## Audio ducking implementation

Implemented in `scripts/score.sh` via ffmpeg sidechain compression (no Python needed):

```
[1:a]loudnorm=I=-38:TP=-1.5:LRA=7,asplit=2[sc][mix];
[0:a]loudnorm=I=-16:TP=-1.5:LRA=11[voice];
[voice][sc]sidechaincompress=threshold=0.05:ratio=8:attack=20:release=400:makeup=1[duckctrl];
[mix][duckctrl]sidechaincompress=...[ducked];
[voice][ducked]amix=inputs=2:duration=first:weights=1 0.22[aout]
```

The first sidechaincompress builds a control signal from the voice; the second uses that signal to duck the music. Two-stage so the music stays smooth when the voice is mid-sentence.

## Rotation policy

`score.sh` picks one track deterministically by SHA1(input filename) % track-count. Same scene always gets the same track (idempotent renders), but 15 scenes spread across N tracks distribute roughly evenly. Manual override: pass the track path as the second argument to `score.sh`.
