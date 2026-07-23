#!/usr/bin/env python3
"""Build the directional base-furniture atlas from four 2x2 chroma-key sheets."""

from __future__ import annotations

import json
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
ASSET_DIR = ROOT / "public" / "assets" / "base"
FRAME = 96

SHEETS = {
    "base_workbench": (ASSET_DIR / "workbench-directions-v3-source-alpha.png", ((72, 60), (42, 68), (72, 52), (42, 68))),
    "base_chest": (ASSET_DIR / "chest-directions-v3-source-alpha.png", ((50, 46), (42, 50), (50, 46), (42, 50))),
    "base_bed": (ASSET_DIR / "bed-directions-v3-source-alpha.png", ((40, 68), (68, 46), (40, 68), (68, 46))),
    "shop_ladder": (ASSET_DIR / "ladder-directions-v3-source-alpha.png", ((36, 68), (68, 46), (36, 68), (68, 46))),
}


def trim_quadrant(sheet: Image.Image, index: int) -> Image.Image:
    half_w = sheet.width // 2
    half_h = sheet.height // 2
    x = (index % 2) * half_w
    y = (index // 2) * half_h
    tile = sheet.crop((x, y, x + half_w, y + half_h))
    bbox = tile.getbbox()
    if bbox is None:
        raise RuntimeError(f"quadrant {index} is empty")
    return tile.crop(bbox)


def fit_sprite(sprite: Image.Image, target: tuple[int, int]) -> Image.Image:
    target_w, target_h = target
    scale = min(target_w / sprite.width, target_h / sprite.height)
    size = (max(1, round(sprite.width * scale)), max(1, round(sprite.height * scale)))
    return sprite.resize(size, Image.Resampling.NEAREST)


def main() -> None:
    atlas = Image.new("RGBA", (FRAME * 4, FRAME * len(SHEETS)), (0, 0, 0, 0))
    frames: dict[str, object] = {}

    for row, (name, (path, targets)) in enumerate(SHEETS.items()):
        sheet = Image.open(path).convert("RGBA")
        for rotation in range(4):
            sprite = fit_sprite(trim_quadrant(sheet, rotation), targets[rotation])
            frame = Image.new("RGBA", (FRAME, FRAME), (0, 0, 0, 0))
            # Bottom-centre anchoring keeps every orientation planted on the same grid edge.
            frame.alpha_composite(sprite, ((FRAME - sprite.width) // 2, FRAME - sprite.height - 5))
            x = rotation * FRAME
            y = row * FRAME
            atlas.alpha_composite(frame, (x, y))
            frames[f"{name}_{rotation}"] = {
                "frame": {"x": x, "y": y, "w": FRAME, "h": FRAME},
                "rotated": False,
                "trimmed": False,
                "spriteSourceSize": {"x": 0, "y": 0, "w": FRAME, "h": FRAME},
                "sourceSize": {"w": FRAME, "h": FRAME},
            }

    png_path = ASSET_DIR / "stations-v3.png"
    json_path = ASSET_DIR / "stations-v3.json"
    atlas.save(png_path)
    json_path.write_text(json.dumps({
        "frames": frames,
        "meta": {
            "app": "snaredusk",
            "version": "3",
            "image": png_path.name,
            "format": "RGBA8888",
            "size": {"w": atlas.width, "h": atlas.height},
            "scale": "1",
            "snaredusk": {
                "frameSize": FRAME,
                "kind": "base-furniture-directions",
                "rotationOrder": ["south", "east", "north", "west"],
            },
        },
    }, ensure_ascii=False, indent=2) + "\n")


if __name__ == "__main__":
    main()
