#!/usr/bin/env python3
"""Build stable 4-frame interactable atlases from generated 2x2 source sheets."""

from __future__ import annotations

import json
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
ASSET_DIR = ROOT / "public" / "assets" / "interactables"
FRAME_SIZE = 64

SPECS = {
    "rest": {"content_width": 52, "content_height": 52, "anchor_y": 58},
    "event": {"content_width": 56, "content_height": 56, "anchor_y": 59},
    "merchant": {"content_width": 60, "content_height": 60, "anchor_y": 61},
}


def opaque_bbox(cell: Image.Image) -> tuple[int, int, int, int]:
    alpha = cell.getchannel("A")
    mask = alpha.point(lambda value: 255 if value >= 64 else 0)
    bbox = mask.getbbox()
    if bbox is None:
        raise ValueError("Generated frame contains no visible pixels")
    return bbox


def clean_alpha(image: Image.Image) -> Image.Image:
    rgba = image.convert("RGBA")
    pixels = rgba.load()
    for y in range(rgba.height):
        for x in range(rgba.width):
            r, g, b, a = pixels[x, y]
            # A hard alpha edge is intentional: these assets are rendered with
            # nearest-neighbour filtering and should not retain magenta fringes.
            pixels[x, y] = (r, g, b, 255 if a >= 96 else 0)
    return rgba


def remove_event_chroma() -> Image.Image:
    """Remove only the bright magenta key, preserving the violet rune itself."""
    source = Image.open(ASSET_DIR / "source" / "event-source.png").convert("RGBA")
    pixels = source.load()
    for y in range(source.height):
        for x in range(source.width):
            r, g, b, _ = pixels[x, y]
            is_key = r >= 220 and g <= 42 and b >= 210
            pixels[x, y] = (r, g, b, 0 if is_key else 255)
    return source


def build(kind: str, spec: dict[str, int]) -> None:
    if kind == "event":
        source = remove_event_chroma()
    else:
        source_path = ASSET_DIR / "source" / f"{kind}-source-alpha.png"
        source = Image.open(source_path).convert("RGBA")
    cell_w = source.width // 2
    cell_h = source.height // 2

    cells: list[Image.Image] = []
    bboxes: list[tuple[int, int, int, int]] = []
    for row in range(2):
        for column in range(2):
            cell = source.crop(
                (
                    column * cell_w,
                    row * cell_h,
                    (column + 1) * cell_w,
                    (row + 1) * cell_h,
                )
            )
            cells.append(cell)
            bboxes.append(opaque_bbox(cell))

    max_width = max(right - left for left, top, right, bottom in bboxes)
    max_height = max(bottom - top for left, top, right, bottom in bboxes)
    scale = min(
        spec["content_width"] / max_width,
        spec["content_height"] / max_height,
    )

    atlas = Image.new("RGBA", (FRAME_SIZE * 4, FRAME_SIZE), (0, 0, 0, 0))
    for index, (cell, bbox) in enumerate(zip(cells, bboxes, strict=True)):
        cropped = cell.crop(bbox)
        width = max(1, round(cropped.width * scale))
        height = max(1, round(cropped.height * scale))
        frame_art = clean_alpha(cropped.resize((width, height), Image.Resampling.NEAREST))
        x = index * FRAME_SIZE + (FRAME_SIZE - width) // 2
        y = spec["anchor_y"] - height
        atlas.alpha_composite(frame_art, (x, y))

    png_name = f"{kind}.png"
    atlas.save(ASSET_DIR / png_name, optimize=True)

    frames = {}
    for index in range(4):
        frame = {"x": index * FRAME_SIZE, "y": 0, "w": FRAME_SIZE, "h": FRAME_SIZE}
        frames[f"{kind}_{index}"] = {
            "frame": frame,
            "rotated": False,
            "trimmed": False,
            "spriteSourceSize": {"x": 0, "y": 0, "w": FRAME_SIZE, "h": FRAME_SIZE},
            "sourceSize": {"w": FRAME_SIZE, "h": FRAME_SIZE},
        }

    atlas_data = {
        "frames": frames,
        "animations": {kind: [f"{kind}_{index}" for index in range(4)]},
        "meta": {
            "app": "Snaredusk",
            "version": "1.0",
            "image": png_name,
            "format": "RGBA8888",
            "size": {"w": FRAME_SIZE * 4, "h": FRAME_SIZE},
            "scale": "1",
            "snaredusk": {
                "kind": kind,
                "frameSize": FRAME_SIZE,
                "anchorX": 0.5,
                "anchorY": spec["anchor_y"] / FRAME_SIZE,
            },
        },
    }
    (ASSET_DIR / f"{kind}.json").write_text(
        json.dumps(atlas_data, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )


def main() -> None:
    ASSET_DIR.mkdir(parents=True, exist_ok=True)
    for kind, spec in SPECS.items():
        build(kind, spec)


if __name__ == "__main__":
    main()
