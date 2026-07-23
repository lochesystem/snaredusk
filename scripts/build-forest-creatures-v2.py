#!/usr/bin/env python3
"""Build the 64px forest enemy sheets from generated 4x2 source grids."""

from __future__ import annotations

import json
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "public" / "assets" / "creatures"
FRAME_SIZE = 64
GROUND_Y = 60

CREATURES = {
    "esporo_dorminhoco": {
        "asset": "esporo_dorminhoco-v4",
        "source": "esporo_dorminhoco-v4-source-alpha.png",
        "max_size": (52, 46),
        "native_facing": "right",
    },
    "lumimorcego": {
        "asset": "lumimorcego-v2",
        "source": "lumimorcego-v2-source-alpha.png",
        "max_size": (60, 52),
        "native_facing": "left",
    },
    "carapaca_musgo": {
        "asset": "carapaca_musgo-v2",
        "source": "carapaca_musgo-v2-source-alpha.png",
        "max_size": (62, 52),
        "native_facing": "left",
    },
}


def crop_cell(sheet: Image.Image, index: int) -> Image.Image:
    cell_w = sheet.width // 4
    cell_h = sheet.height // 2
    x = (index % 4) * cell_w
    y = (index // 4) * cell_h
    cell = sheet.crop((x, y, x + cell_w, y + cell_h))
    bbox = cell.getbbox()
    if bbox is None:
        raise RuntimeError(f"empty animation cell {index}")
    return cell.crop(bbox)


def fit(sprite: Image.Image, max_size: tuple[int, int]) -> Image.Image:
    max_w, max_h = max_size
    scale = min(max_w / sprite.width, max_h / sprite.height)
    size = (max(1, round(sprite.width * scale)), max(1, round(sprite.height * scale)))
    return sprite.resize(size, Image.Resampling.NEAREST)


def build_creature(species_id: str, config: dict[str, object]) -> None:
    asset = str(config["asset"])
    source = Image.open(ASSETS / str(config["source"])).convert("RGBA")
    max_size = config["max_size"]
    assert isinstance(max_size, tuple)

    sheet = Image.new("RGBA", (FRAME_SIZE * 4, FRAME_SIZE * 2), (0, 0, 0, 0))
    frames: dict[str, object] = {}
    animations = {"idle": [], "walk": []}

    for index in range(8):
        animation = "idle" if index < 4 else "walk"
        frame_index = index % 4
        name = f"{species_id}_{animation}_{frame_index}"
        sprite = fit(crop_cell(source, index), max_size)
        frame = Image.new("RGBA", (FRAME_SIZE, FRAME_SIZE), (0, 0, 0, 0))
        frame.alpha_composite(sprite, ((FRAME_SIZE - sprite.width) // 2, GROUND_Y - sprite.height))
        x = frame_index * FRAME_SIZE
        y = 0 if animation == "idle" else FRAME_SIZE
        sheet.alpha_composite(frame, (x, y))
        frames[name] = {
            "frame": {"x": x, "y": y, "w": FRAME_SIZE, "h": FRAME_SIZE},
            "rotated": False,
            "trimmed": False,
            "spriteSourceSize": {"x": 0, "y": 0, "w": FRAME_SIZE, "h": FRAME_SIZE},
            "sourceSize": {"w": FRAME_SIZE, "h": FRAME_SIZE},
        }
        animations[animation].append(name)

    png_path = ASSETS / f"{asset}.png"
    json_path = ASSETS / f"{asset}.json"
    sheet.save(png_path)
    json_path.write_text(json.dumps({
        "frames": frames,
        "animations": animations,
        "meta": {
            "app": "Snaredusk",
            "version": "2.0",
            "image": png_path.name,
            "format": "RGBA8888",
            "size": {"w": sheet.width, "h": sheet.height},
            "scale": "1",
            "snaredusk": {
                "frameSize": FRAME_SIZE,
                "anchorX": 0.5,
                "anchorY": GROUND_Y / FRAME_SIZE,
                "shadowY": 0,
                "nativeFacing": config["native_facing"],
            },
        },
    }, ensure_ascii=False, indent=2) + "\n")


def main() -> None:
    for species_id, config in CREATURES.items():
        build_creature(species_id, config)


if __name__ == "__main__":
    main()
