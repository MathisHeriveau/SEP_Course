#!/usr/bin/env python3
"""Transcribe any media file into the video-edit workdir format.

This is the scripted version of the "transcription bridge" that EXECUTION.md
§1 used to describe as a manual conversion: it writes the SAME flat
words.json (`[{"word", "start", "end"}, ...]`, seconds) into the SAME workdir
that `transcribe.py` (WhisperX) would use — `~/.cache/video-edit/<stem>_<sha1[:12]>/`
— so lint_plan / align_to_speech / render.sh downstream are unchanged. It then
touches `.polished` so a later WhisperX/polish run won't overwrite the result.

Needs ONE of two cloud transcription API keys (no heavy local install
either way — the WhisperX venv is ~1.3GB, this needs none of that):
  - ASSEMBLYAI_API_KEY  — used if set (checked first; disfluencies=True
    keeps "um"/"uh" with timestamps, useful for filler-word rough-cuts)
  - OPENAI_API_KEY      — used if ASSEMBLYAI_API_KEY isn't set (Whisper API,
    word-level timestamps via timestamp_granularities=["word"])
Set --provider to force one over the other when both keys are present.
Audio is uploaded to whichever provider you use; don't use either for
sensitive clips — fall back to the local WhisperX `transcribe.py` for those.

Usage:
    python3 scripts/transcribe_assemblyai_bridge.py <media file> [--lang en] [--provider assemblyai|openai]

Reads keys from the repo-root .env (shell export overrides).
FORCE=1 re-transcribes even if a fresh words.json exists.
"""
from __future__ import annotations
import argparse
import hashlib
import json
import os
import subprocess
import sys
from pathlib import Path

# scripts/ -> make-video/ -> skills/ -> .claude/ -> repo root
REPO_ROOT = Path(__file__).resolve().parents[4]


def load_env() -> None:
    """Load repo-root .env (existing env vars win)."""
    env_path = REPO_ROOT / ".env"
    if not env_path.exists():
        return
    for line in env_path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, val = line.partition("=")
        os.environ.setdefault(key.strip(), val.strip().strip('"').strip("'"))


def workdir_for(media_path: Path) -> Path:
    """Same convention as transcribe.py: ~/.cache/video-edit/<stem>_<sha1[:12]>/
    keyed on the resolved source path, outside Downloads/Documents (macOS TCC)."""
    digest = hashlib.sha1(str(media_path.resolve()).encode()).hexdigest()[:12]
    base = Path.home() / ".cache" / "video-edit" / f"{media_path.stem[:40]}_{digest}"
    base.mkdir(parents=True, exist_ok=True)
    return base


def extract_audio(media_path: Path, audio_path: Path) -> None:
    # Re-extract when the source is newer than the cached audio (stale-cache bug).
    if audio_path.exists() and audio_path.stat().st_mtime >= media_path.stat().st_mtime:
        return
    subprocess.run(
        ["ffmpeg", "-y", "-i", str(media_path), "-ac", "1", "-ar", "16000",
         "-vn", str(audio_path)],
        check=True, capture_output=True,
    )


def transcribe_assemblyai(audio_path: Path, key: str, lang: str) -> list[dict]:
    import assemblyai as aai  # lazy import so --help works without the dep

    aai.settings.api_key = key
    config = aai.TranscriptionConfig(
        language_code=lang,
        disfluencies=True,  # keep um/uh (with timestamps) so cuts can target them
        punctuate=True,
        format_text=True,
    )
    print("uploading + transcribing with AssemblyAI…", flush=True)
    transcript = aai.Transcriber().transcribe(str(audio_path), config)
    if transcript.status == aai.TranscriptStatus.error:
        raise SystemExit(f"AssemblyAI error: {transcript.error}")

    # AssemblyAI reports ms; downstream expects seconds.
    return [
        {"word": w.text, "start": w.start / 1000.0, "end": w.end / 1000.0}
        for w in (transcript.words or [])
    ]


def transcribe_openai(audio_path: Path, key: str, lang: str) -> list[dict]:
    from openai import OpenAI  # lazy import so --help works without the dep

    client = OpenAI(api_key=key)
    print("uploading + transcribing with OpenAI Whisper…", flush=True)
    with open(audio_path, "rb") as f:
        transcript = client.audio.transcriptions.create(
            model="whisper-1",
            file=f,
            language=lang,
            response_format="verbose_json",
            timestamp_granularities=["word"],
        )
    # transcript.words is already [{"word", "start", "end"}, ...] in seconds.
    return [
        {"word": w.word, "start": w.start, "end": w.end}
        for w in (transcript.words or [])
    ]


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("media", help="video or audio file to transcribe")
    ap.add_argument("--lang", default="en")
    ap.add_argument("--provider", choices=["assemblyai", "openai"], default=None,
                     help="force a provider; default picks ASSEMBLYAI_API_KEY "
                          "if set, else OPENAI_API_KEY")
    args = ap.parse_args()

    load_env()
    assemblyai_key = os.environ.get("ASSEMBLYAI_API_KEY")
    openai_key = os.environ.get("OPENAI_API_KEY")

    provider = args.provider
    if provider is None:
        provider = "assemblyai" if assemblyai_key else ("openai" if openai_key else None)
    if provider == "assemblyai" and not assemblyai_key:
        raise SystemExit("--provider assemblyai requires ASSEMBLYAI_API_KEY")
    if provider == "openai" and not openai_key:
        raise SystemExit("--provider openai requires OPENAI_API_KEY")
    if provider is None:
        raise SystemExit(
            "No transcription API key set — add ONE of ASSEMBLYAI_API_KEY or "
            "OPENAI_API_KEY to the repo-root .env (see SETUP.md)."
        )

    media_path = Path(args.media)
    if not media_path.exists():
        raise SystemExit(f"no such file: {media_path}")

    wd = workdir_for(media_path)
    words_json = wd / "words.json"
    print(f"workdir: {wd}", flush=True)

    if (words_json.exists()
            and words_json.stat().st_mtime >= media_path.stat().st_mtime
            and os.environ.get("FORCE") != "1"):
        print(f"words.json exists and is fresh, skipping: {words_json}")
        return

    audio_path = wd / "audio.wav"
    extract_audio(media_path, audio_path)

    if provider == "assemblyai":
        words = transcribe_assemblyai(audio_path, assemblyai_key, args.lang)
    else:
        words = transcribe_openai(audio_path, openai_key, args.lang)

    if not words:
        raise SystemExit("transcription returned no words — check the audio")

    words_json.write_text(json.dumps(words, indent=2), encoding="utf-8")
    # Mark as polished so a WhisperX/polish rerun won't clobber this result.
    (wd / ".polished").touch()
    print(f"wrote {len(words)} words ({provider}) -> {words_json}")
    print("REMINDER: read the transcript back against the actual audio and "
          "hand-patch mistranscribed words (keep start/end).")


if __name__ == "__main__":
    main()
