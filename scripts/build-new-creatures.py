#!/usr/bin/env python3
"""Build 64 px animation sheets for the six remaining MVP creatures."""

from __future__ import annotations

import json
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "public" / "assets" / "creatures"
FRAME_SIZE = 64
GROUND_Y = 60

CREATURES = {
    "cogumante": {
        "source": "cogumante-v1-source-alpha.png",
        "max_size": (52, 56),
    },
    "ferrao_fungico": {
        "source": "ferrao_fungico-v1-source-alpha.png",
        "max_size": (62, 43),
    },
    "gema_viva": {
        "source": "gema_viva-v1-source-alpha.png",
        "max_size": (60, 52),
    },
    "refrator": {
        "source": "refrator-v1-source-alpha.png",
        "max_size": (62, 36),
    },
    "lodo_vivo": {
        "source": "lodo_vivo-v1-source-alpha.png",
        "max_size": (62, 46),
    },
    "fenix_bruma": {
        "source": "fenix_bruma-v1-source-alpha.png",
        "max_size": (62, 52),
    },
}


def occupied_bands(sheet: Image.Image, axis: str, expected: int) -> list[tuple[int, int]]:
    alpha = sheet.getchannel("A")
    axis_len = sheet.width if axis == "x" else sheet.height
    cross_len = sheet.height if axis == "x" else sheet.width
    occupied: list[bool] = []
    for pos in range(axis_len):
        count = 0
        for cross in range(cross_len):
            pixel = alpha.getpixel((pos, cross) if axis == "x" else (cross, pos))
            if pixel >= 64:
                count += 1
                if count >= 6:
                    break
        occupied.append(count >= 6)

    bands: list[tuple[int, int]] = []
    start: int | None = None
    for pos, is_occupied in enumerate(occupied + [False]):
        if is_occupied and start is None:
            start = pos
        elif not is_occupied and start is not None:
            bands.append((start, pos))
            start = None

    if len(bands) != expected:
        raise RuntimeError(f"expected {expected} occupied {axis}-bands, found {len(bands)}")
    return bands


def crop_cell(
    sheet: Image.Image,
    index: int,
    columns: list[tuple[int, int]],
    rows: list[tuple[int, int]],
) -> Image.Image:
    x0, x1 = columns[index % 4]
    y0, y1 = rows[index // 4]
    cell = sheet.crop((x0, y0, x1, y1))
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
    source = Image.open(ASSETS / str(config["source"])).convert("RGBA")
    columns = occupied_bands(source, "x", 4)
    rows = occupied_bands(source, "y", 2)
    max_size = config["max_size"]
    assert isinstance(max_size, tuple)

    sheet = Image.new("RGBA", (FRAME_SIZE * 4, FRAME_SIZE * 2), (0, 0, 0, 0))
    frames: dict[str, object] = {}
    animations = {"idle": [], "walk": []}

    for index in range(8):
        animation = "idle" if index < 4 else "walk"
        frame_index = index % 4
        name = f"{species_id}_{animation}_{frame_index}"
        sprite = fit(crop_cell(source, index, columns, rows), max_size)
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

    asset_id = f"{species_id}-v1"
    png_path = ASSETS / f"{asset_id}.png"
    json_path = ASSETS / f"{asset_id}.json"
    sheet.save(png_path)
    json_path.write_text(json.dumps({
        "frames": frames,
        "animations": animations,
        "meta": {
            "app": "Snaredusk",
            "version": "1.0",
            "image": png_path.name,
            "format": "RGBA8888",
            "size": {"w": sheet.width, "h": sheet.height},
            "scale": "1",
            "snaredusk": {
                "frameSize": FRAME_SIZE,
                "anchorX": 0.5,
                "anchorY": GROUND_Y / FRAME_SIZE,
                "shadowY": 0,
                "nativeFacing": "left",
            },
        },
    }, ensure_ascii=False, indent=2) + "\n")


def main() -> None:
    for species_id, config in CREATURES.items():
        build_creature(species_id, config)


if __name__ == "__main__":
    main()
