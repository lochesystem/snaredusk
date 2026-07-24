#!/usr/bin/env python3
"""Deriva capuzes temáticos sem redesenhar o personagem ou suas animações."""

from __future__ import annotations

import colorsys
import json
from collections import deque
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
PLAYER_DIR = ROOT / "public" / "assets" / "player"
SKIN_DIR = PLAYER_DIR / "skins"
ICON_DIR = ROOT / "public" / "assets" / "hoods"

SHEETS = {
    "idle": ("player-idle-v7.png", "idle"),
    "walk": ("player-walk-v5.png", "walk"),
    "attack-faca": ("player-attack-faca-enferrujada-v4.png", "attack"),
    "attack-picareta": ("player-attack-picareta-combate-v4.png", "attack"),
    "attack-lanca": ("player-attack-lanca-esporo-v5.png", "attack"),
}

PALETTES = {
    "fungico": {
        "name": "Capuz do Micélio",
        "colors": ((28, 48, 20), (48, 76, 28), (79, 113, 42), (137, 164, 69)),
        "accent": (220, 229, 143),
    },
    "prismatico": {
        "name": "Capuz Prismático",
        "colors": ((27, 24, 72), (47, 40, 116), (72, 59, 163), (52, 185, 220)),
        "accent": (164, 238, 255),
    },
    "termal": {
        "name": "Capuz da Brasa",
        "colors": ((53, 18, 28), (91, 28, 39), (139, 43, 47), (224, 91, 25)),
        "accent": (255, 174, 43),
    },
}


def is_face_pixel(rgba: tuple[int, int, int, int]) -> bool:
    r, g, b, a = rgba
    return a > 0 and r >= 220 and g >= 175 and 95 <= b <= 190 and r - b >= 45


def largest_face_component(frame: Image.Image) -> tuple[int, int, int, int]:
    pixels = frame.load()
    visited: set[tuple[int, int]] = set()
    components: list[list[tuple[int, int]]] = []
    for y in range(frame.height):
        for x in range(frame.width):
            if (x, y) in visited or not is_face_pixel(pixels[x, y]):
                continue
            queue = deque([(x, y)])
            visited.add((x, y))
            component: list[tuple[int, int]] = []
            while queue:
                px, py = queue.popleft()
                component.append((px, py))
                for nx, ny in ((px - 1, py), (px + 1, py), (px, py - 1), (px, py + 1)):
                    if not (0 <= nx < frame.width and 0 <= ny < frame.height):
                        continue
                    if (nx, ny) in visited or not is_face_pixel(pixels[nx, ny]):
                        continue
                    visited.add((nx, ny))
                    queue.append((nx, ny))
            components.append(component)
    if not components:
        raise RuntimeError("Rosto não encontrado no frame")
    face = max(components, key=len)
    xs = [point[0] for point in face]
    ys = [point[1] for point in face]
    return min(xs), min(ys), max(xs), max(ys)


def is_hood_fabric(rgba: tuple[int, int, int, int]) -> bool:
    r, g, b, a = rgba
    if a == 0:
        return False
    h, s, v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
    return 0.045 <= h <= 0.19 and s >= 0.62 and 0.18 <= v <= 1


def palette_color(
    rgba: tuple[int, int, int, int],
    palette: tuple[tuple[int, int, int], ...],
) -> tuple[int, int, int, int]:
    r, g, b, a = rgba
    luminance = (r * 0.24 + g * 0.68 + b * 0.08) / 255
    if luminance < 0.23:
        color = palette[0]
    elif luminance < 0.43:
        color = palette[1]
    elif luminance < 0.68:
        color = palette[2]
    else:
        color = palette[3]
    return (*color, a)


def transform_frame(frame: Image.Image, skin_id: str) -> Image.Image:
    result = frame.copy()
    source = frame.load()
    target = result.load()
    face_x0, face_y0, face_x1, face_y1 = largest_face_component(frame)
    hood_x0 = max(0, face_x0 - 8)
    hood_y0 = max(0, face_y0 - 10)
    hood_x1 = min(frame.width - 1, face_x1 + 10)
    hood_y1 = min(frame.height - 1, face_y1 + 6)
    palette = PALETTES[skin_id]["colors"]

    for y in range(hood_y0, hood_y1 + 1):
        for x in range(hood_x0, hood_x1 + 1):
            # O interior do rosto, cabelo e olhos é invariável.
            inside_face = (
                face_x0 - 1 <= x <= face_x1 + 1
                and face_y0 - 2 <= y <= face_y1 + 1
            )
            if inside_face:
                continue
            if is_hood_fabric(source[x, y]):
                target[x, y] = palette_color(source[x, y], palette)

    # Um detalhe de um único pixel mantém a leitura temática sem mudar silhueta.
    accent = PALETTES[skin_id]["accent"]
    accent_x = min(hood_x1 - 1, face_x1 + 5)
    accent_y = max(hood_y0 + 2, face_y0 - 4)
    if target[accent_x, accent_y][3] > 0 and is_hood_fabric(source[accent_x, accent_y]):
        target[accent_x, accent_y] = (*accent, 255)
    return result


def transform_sheet(source_path: Path, skin_id: str) -> Image.Image:
    source = Image.open(source_path).convert("RGBA")
    result = Image.new("RGBA", source.size, (0, 0, 0, 0))
    for frame_y in (0, 48):
        for frame_x in (0, 48):
            frame = source.crop((frame_x, frame_y, frame_x + 48, frame_y + 48))
            result.alpha_composite(transform_frame(frame, skin_id), (frame_x, frame_y))
    return result


def write_sheet_metadata(output: Path, animation: str, image_name: str, prefix: str) -> None:
    frames = {}
    animation_frames = []
    index = 0
    for y in (0, 48):
        for x in (0, 48):
            frame_id = f"{prefix}_{index}"
            frames[frame_id] = {
                "frame": {"x": x, "y": y, "w": 48, "h": 48},
                "rotated": False,
                "trimmed": False,
                "spriteSourceSize": {"x": 0, "y": 0, "w": 48, "h": 48},
                "sourceSize": {"w": 48, "h": 48},
            }
            animation_frames.append(frame_id)
            index += 1
    payload = {
        "frames": frames,
        "animations": {animation: animation_frames},
        "meta": {
            "app": "Snaredusk",
            "version": "hood-1.0",
            "image": image_name,
            "format": "RGBA8888",
            "size": {"w": 96, "h": 96},
            "scale": "1",
            "snaredusk": {"anchorX": 0.5, "anchorY": 0.92, "shadowY": 0},
        },
    }
    output.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n")


def main() -> None:
    ICON_DIR.mkdir(parents=True, exist_ok=True)
    for skin_id in PALETTES:
        output_dir = SKIN_DIR / skin_id
        output_dir.mkdir(parents=True, exist_ok=True)
        idle_sheet: Image.Image | None = None
        for asset_id, (source_name, animation) in SHEETS.items():
            image_name = f"player-{asset_id}.png"
            image_path = output_dir / image_name
            sheet = transform_sheet(PLAYER_DIR / source_name, skin_id)
            sheet.save(image_path, optimize=True)
            write_sheet_metadata(
                image_path.with_suffix(".json"),
                animation,
                image_name,
                f"player_{skin_id}_{asset_id}",
            )
            if asset_id == "idle":
                idle_sheet = sheet
        if idle_sheet is not None:
            idle_sheet.crop((0, 0, 48, 48)).save(ICON_DIR / f"{skin_id}.png", optimize=True)


if __name__ == "__main__":
    main()
