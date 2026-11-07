#!/usr/bin/env python3
"""Parse an on-screen-text captions file (raw/captions.txt) into JSON.

Format (see the header comment this script writes into new captions.txt
files, or projects/claude-code-edit/raw/captions.txt for a worked example):

    LABEL:
    line of on-screen text
    {word or phrase}   <- wrapped span renders in the accent color

Labels group lines into motion-phrases, in chronological (top-to-bottom)
order. `#`-prefixed and blank lines are ignored. This file is authoritative
for WORDING — when authoring a video, use these lines verbatim as on-screen
text; only layout/timing/motion are Claude's call.

Usage:
    python3 scripts/parse_captions.py <path/to/captions.txt>
    -> JSON to stdout: [{"label": "HOOK", "lines": [{"text": "...", "plain": "...", "accent": "..."}]}, ...]

`text`   — the line as written, braces intact (pass straight into any
           component that already implements the `{}` accent-span parser,
           e.g. AccentText in PrCard.tsx).
`plain`  — the line with braces stripped (for typewriter/plain-text
           contexts that shouldn't render literal braces).
`accent` — the bracketed span's inner text, or null if the line has none.
"""
from __future__ import annotations
import json
import re
import sys
from pathlib import Path

LABEL_RE = re.compile(r"^([A-Z0-9_]+):\s*$")
ACCENT_RE = re.compile(r"\{([^}]+)\}")


def parse(path: Path) -> list[dict]:
    blocks: list[dict] = []
    current: dict | None = None
    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#"):
            continue
        m = LABEL_RE.match(line)
        if m:
            current = {"label": m.group(1), "lines": []}
            blocks.append(current)
            continue
        if current is None:
            raise SystemExit(f"caption line before any LABEL: — {raw_line!r}")
        accents = ACCENT_RE.findall(line)
        current["lines"].append({
            "text": line,
            "plain": ACCENT_RE.sub(lambda mm: mm.group(1), line),
            "accent": accents[0] if accents else None,
        })
    return blocks


def main() -> None:
    if len(sys.argv) != 2:
        raise SystemExit("usage: parse_captions.py <captions.txt>")
    path = Path(sys.argv[1])
    if not path.exists():
        raise SystemExit(f"no such file: {path}")
    print(json.dumps(parse(path), indent=2))


if __name__ == "__main__":
    main()
