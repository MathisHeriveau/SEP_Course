#!/usr/bin/env bash
# series_pipeline.sh — repeatable VO -> render automation for ANY faceless
# motion-reel project (route C). Generic replacement for the old per-project
# hand-copied pipeline.sh (which hardcoded PROJECT_DIR to one project and
# couldn't be reused for the next series).
#
# Usage:
#   bash series_pipeline.sh <project> build raw/<vo>.m4a   # build base.mp4 + transcribe
#   bash series_pipeline.sh <project> preview              # lint + 720p preview (scored)
#   bash series_pipeline.sh <project> final                # 1080p final (scored, sign-off only)
#
# Run from the REPO ROOT:
#   bash .claude/skills/motion-design-edit/scripts/series_pipeline.sh claude-code-edit build raw/ep02.m4a
#
# Visual style: reads projects/<project>/.pr_style ("paper" or "visual-os",
# default "paper" if the file is absent) and exports PR_STYLE for render.sh.
#
# Audio: preview and final are both scored (music + SFX) by default, so a
# sign-off on the preview covers the full experience and final ships
# publish-ready. Override per-render with SCORE=0 to skip.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../.." && pwd)"
SKILL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BRIDGE="$REPO_ROOT/.claude/skills/make-video/scripts/transcribe_assemblyai_bridge.py"

PROJECT="${1:-}"
CMD="${2:-}"

if [ -z "$PROJECT" ]; then
  echo "usage:"
  echo "  bash series_pipeline.sh <project> build raw/<vo>.m4a   # build base + transcribe"
  echo "  bash series_pipeline.sh <project> preview              # lint + 720p preview (scored)"
  echo "  bash series_pipeline.sh <project> final                # 1080p final (scored, sign-off only)"
  exit 2
fi

PROJECT_DIR="$REPO_ROOT/projects/$PROJECT"
if [ ! -d "$PROJECT_DIR" ]; then
  echo "ERROR: no project at $PROJECT_DIR"
  exit 1
fi

OUT_DIR="$PROJECT_DIR/outputs"
WORKING="$PROJECT_DIR/working"
mkdir -p "$WORKING" "$OUT_DIR/previews"

# Visual style — persisted per-project so nobody has to remember it on every render.
PR_STYLE_FILE="$PROJECT_DIR/.pr_style"
if [ -f "$PR_STYLE_FILE" ]; then
  export PR_STYLE="$(tr -d '[:space:]' < "$PR_STYLE_FILE")"
else
  export PR_STYLE="paper"
fi

# ── BUILD: black base.mp4 + transcribe ──────────────────────────────────────
if [ "$CMD" = "build" ]; then
  VO="${3:-}"
  if [ -z "$VO" ]; then
    echo "usage: series_pipeline.sh $PROJECT build raw/<vo-file>"
    exit 2
  fi
  VO_ABS="$PROJECT_DIR/$VO"
  if [ ! -f "$VO_ABS" ]; then
    echo "ERROR: VO not found at $VO_ABS"
    exit 1
  fi

  DURATION=$(ffprobe -v quiet -show_entries format=duration \
    -of default=noprint_wrappers=1:nokey=1 "$VO_ABS")
  echo "[pipeline] VO duration: ${DURATION}s"

  BASE_MP4="$WORKING/base.mp4"
  ffmpeg -y \
    -f lavfi -i "color=c=black:s=1080x1920:r=30:d=$DURATION" \
    -i "$VO_ABS" \
    -c:v libx264 -pix_fmt yuv420p \
    -c:a aac -b:a 192k \
    -t "$DURATION" \
    "$BASE_MP4"
  echo "[pipeline] base.mp4 built: $BASE_MP4"

  echo "[pipeline] transcribing via AssemblyAI..."
  python3 "$BRIDGE" "$VO_ABS"
  echo "[pipeline] transcription complete — verify words.json, then author broll_plan.json"
  echo ""
  echo "Next: ask Claude to author working/broll_plan.json"
  echo "  → tell it to read STYLE.md (if present) and raw/captions.txt first"
fi

# ── PREVIEW: lint + 720p render, scored ─────────────────────────────────────
if [ "$CMD" = "preview" ]; then
  BASE_MP4="$WORKING/base.mp4"
  if [ ! -f "$BASE_MP4" ]; then
    echo "ERROR: no base.mp4 at $WORKING/base.mp4 — run 'build' first"
    exit 1
  fi

  python3 "$SKILL_DIR/scripts/lint_plan.py" \
    "$WORKING/broll_plan.json" \
    "$BASE_MP4"

  WORKDIR=$(python3 -c "
import hashlib
from pathlib import Path
p = Path('$BASE_MP4').resolve()
digest = hashlib.sha1(str(p).encode()).hexdigest()[:12]
print(Path.home() / '.cache' / 'video-edit' / f'{p.stem[:40]}_{digest}')
")
  mkdir -p "$WORKDIR"
  cp "$WORKING/broll_plan.json" "$WORKDIR/broll_plan.json"

  OUT_DIR="$OUT_DIR" FORCE_RENDER="${FORCE_RENDER:-0}" SCORE="${SCORE:-1}" \
    bash "$SKILL_DIR/scripts/render.sh" "$BASE_MP4"

  echo "[pipeline] preview at: $OUT_DIR/previews/base.preview.mp4  (style: $PR_STYLE, scored: ${SCORE:-1})"
fi

# ── FINAL: 1080p render, scored, publish quality ────────────────────────────
if [ "$CMD" = "final" ]; then
  BASE_MP4="$WORKING/base.mp4"
  if [ ! -f "$BASE_MP4" ]; then
    echo "ERROR: no base.mp4 at $WORKING/base.mp4 — run 'build' first"
    exit 1
  fi

  WORKDIR=$(python3 -c "
import hashlib
from pathlib import Path
p = Path('$BASE_MP4').resolve()
digest = hashlib.sha1(str(p).encode()).hexdigest()[:12]
print(Path.home() / '.cache' / 'video-edit' / f'{p.stem[:40]}_{digest}')
")
  mkdir -p "$WORKDIR"
  cp "$WORKING/broll_plan.json" "$WORKDIR/broll_plan.json"

  # No SCORE override here — render.sh's own final-mode default is DO_SCORE=1,
  # so final ships scored + 1080p/CRF20 (publish quality) unless the caller
  # explicitly passes SCORE=0.
  OUT_DIR="$OUT_DIR" QUALITY=final \
    bash "$SKILL_DIR/scripts/render.sh" "$BASE_MP4"

  echo "[pipeline] final at: $OUT_DIR/base.enhanced.mp4  (style: $PR_STYLE)"
fi

if [ -z "$CMD" ]; then
  echo "usage:"
  echo "  bash series_pipeline.sh $PROJECT build raw/<vo>.m4a   # build base + transcribe"
  echo "  bash series_pipeline.sh $PROJECT preview              # lint + 720p preview (scored)"
  echo "  bash series_pipeline.sh $PROJECT final                # 1080p final (scored, sign-off only)"
fi
