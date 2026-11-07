# video-edit skill

A Claude Code skill for editing pre-cut talking-head video into a finished,
captioned, graphics-rich short (9:16). Tuned for shorts/reels — see the
sibling `video-edit-longform` skill for 16:9 long-form.

## What's inside

- `SKILL.md` — the prompt Claude uses to orchestrate edits
- `knowledge/` — recipes, style guides, editing rules, music library reference
- `scripts/` — Python + bash helpers Claude calls (transcript polish, b-roll fetch, render, etc.)
- `assets/` — brand assets used in renders (logos)
- `remotion/` — the Remotion render engine and graphic templates

## Setup

1. **Drop the folder into `~/.claude/skills/`** so Claude Code picks it up:
   ```
   cp -r video-edit ~/.claude/skills/
   cd video-edit/remotion && npm install
   ```

2. **Environment variables** the scripts expect (set in your shell or `.env`):
   - `ASSEMBLYAI_API_KEY` **or** `OPENAI_API_KEY` — transcription (either works; see repo root `SETUP.md`)
   - `PEXELS_API_KEY` — free at https://www.pexels.com/api/ (b-roll stock footage)
   - `ANTHROPIC_API_KEY` — for `polish_transcript.py`'s context-aware correction pass

3. **Brand setup** — this skill ships with an example "Visual OS" color/font
   preset (`remotion/src/templates/hfBrand.ts`). On first use, ask Claude to
   walk you through picking your own primary/secondary/accent colors and
   fonts — see the repo root `SETUP.md`'s "Brand setup" section.

4. **NOT included:**
   - `music/`, most of `sfx/` — bring your own royalty-free library
   - Any YouTube upload credentials — generate your own via Google Cloud Console + the YouTube Data API OAuth flow if you wire up uploading

5. **Quick test:** in Claude Code, invoke the skill with a video path and see what happens.
