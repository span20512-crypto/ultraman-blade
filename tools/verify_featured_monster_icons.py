#!/usr/bin/env python3
"""Verify the complete approved icon sets for Baltan, Red King, and Gomora."""

from __future__ import annotations

import hashlib
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
ICON_DIR = ROOT / "assets/img/ultraman-icons/monster-moves"
MOVES = (
    "portrait", "move", "crouch", "dash",
    "light", "heavy", "clight", "cheavy",
    "airlight", "dive", "special", "super",
    "guard", "crush", "combo", "finisher",
)
MONSTERS = ("alien-baltan", "red-king", "gomora")


def main() -> None:
    failures: list[str] = []
    hashes: dict[str, str] = {}
    for monster in MONSTERS:
        for move in MOVES:
            path = ICON_DIR / f"{monster}-{move}.webp"
            if not path.is_file():
                failures.append(f"missing: {path.relative_to(ROOT)}")
                continue
            data = path.read_bytes()
            if len(data) < 16 or data[:4] != b"RIFF" or data[8:12] != b"WEBP":
                failures.append(f"invalid WebP: {path.relative_to(ROOT)}")
                continue
            digest = hashlib.sha256(data).hexdigest()
            if digest in hashes:
                failures.append(f"duplicate: {path.name} == {hashes[digest]}")
            hashes[digest] = path.name

    if failures:
        raise SystemExit("\n".join(failures))
    print(f"verified {len(hashes)} unique WebP icons for Baltan, Red King, and Gomora")


if __name__ == "__main__":
    main()
