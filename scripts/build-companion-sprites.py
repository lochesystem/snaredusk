#!/usr/bin/env python3
"""Build compact companion atlases from the approved biome concept sheets."""

from __future__ import annotations

from collections import deque
import json
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
ASSET_DIR = ROOT / "public" / "assets" / "companions"
SOURCE_DIR = ASSET_DIR / "source"
FRAME_SIZE = 40

BIOMES = {
    "forest": (
        "forest-companion-concepts.png",
        (
            "lumimorcego",
            "esporo_dorminhoco",
            "carapaca_musgo",
            "cogumante",
            "ferrao_fungico",
            "rei_esporas",
        ),
    ),
    "crystal": (
        "crystal-companion-concepts.png",
        (
            "prismarin",
            "lumicascalho",
            "eco_quartzo",
            "gema_viva",
            "refrator",
            "matriarca_prismatica",
        ),
    ),
    "thermal": (
        "thermal-companion-concepts.png",
        (
            "salamandra",
            "vaporoso",
            "caranguejo_termal",
            "lodo_vivo",
            "fenix_bruma",
            "salamandra_ancia",
        ),
    ),
}


def is_background(pixel: tuple[int, int, int, int]) -> bool:
    r, g, b, _ = pixel
    return min(r, g, b) >= 212 and max(r, g, b) - min(r, g, b) <= 20


def remove_connected_background(image: Image.Image) -> Image.Image:
    rgba = image.convert("RGBA")
    pixels = rgba.load()
    width, height = rgba.size
    queue: deque[tuple[int, int]] = deque()
    seen: set[tuple[int, int]] = set()

    for x in range(width):
        queue.append((x, 0))
        queue.append((x, height - 1))
    for y in range(height):
        queue.append((0, y))
        queue.append((width - 1, y))

    while queue:
        x, y = queue.popleft()
        if (x, y) in seen:
            continue
        seen.add((x, y))
        if not is_background(pixels[x, y]):
            continue
        r, g, b, _ = pixels[x, y]
        pixels[x, y] = (r, g, b, 0)
        if x > 0:
            queue.append((x - 1, y))
        if x + 1 < width:
            queue.append((x + 1, y))
        if y > 0:
            queue.append((x, y - 1))
        if y + 1 < height:
            queue.append((x, y + 1))

    # Generation may let a few pixels from the neighboring row cross a cell
    # boundary. Keep the main body and nearby particles/projectiles, but discard
    # distant fragments so they never become horizontal artifacts in the atlas.
    components = alpha_components(rgba)
    if components:
        main = max(components, key=lambda component: component[4])
        main_cx = (main[0] + main[2]) / 2
        main_cy = (main[1] + main[3]) / 2
        for component in components:
            cx = (component[0] + component[2]) / 2
            cy = (component[1] + component[3]) / 2
            close_to_body = (
                abs(cx - main_cx) <= width * 0.72
                and abs(cy - main_cy) <= height * 0.42
            )
            if component is main or close_to_body:
                continue
            for y in range(component[1], component[3]):
                for x in range(component[0], component[2]):
                    if pixels[x, y][3] > 0:
                        pixels[x, y] = (*pixels[x, y][:3], 0)

    bbox = rgba.getbbox()
    if bbox is None:
        raise RuntimeError("Empty concept cell after background removal")
    return rgba.crop(bbox)


def alpha_components(image: Image.Image) -> list[tuple[int, int, int, int, int]]:
    pixels = image.load()
    width, height = image.size
    visited: set[tuple[int, int]] = set()
    components: list[tuple[int, int, int, int, int]] = []

    for seed_y in range(height):
        for seed_x in range(width):
            if (seed_x, seed_y) in visited or pixels[seed_x, seed_y][3] == 0:
                continue
            queue = deque([(seed_x, seed_y)])
            visited.add((seed_x, seed_y))
            min_x = max_x = seed_x
            min_y = max_y = seed_y
            count = 0
            while queue:
                x, y = queue.popleft()
                count += 1
                min_x, max_x = min(min_x, x), max(max_x, x)
                min_y, max_y = min(min_y, y), max(max_y, y)
                for nx, ny in (
                    (x - 1, y),
                    (x + 1, y),
                    (x, y - 1),
                    (x, y + 1),
                    (x - 1, y - 1),
                    (x + 1, y - 1),
                    (x - 1, y + 1),
                    (x + 1, y + 1),
                ):
                    if (
                        0 <= nx < width
                        and 0 <= ny < height
                        and (nx, ny) not in visited
                        and pixels[nx, ny][3] > 0
                    ):
                        visited.add((nx, ny))
                        queue.append((nx, ny))
            components.append((min_x, min_y, max_x + 1, max_y + 1, count))
    return components


def normalize_pose(pose: Image.Image) -> Image.Image:
    components = alpha_components(pose)
    main = max(components, key=lambda component: component[4])
    main_width = main[2] - main[0]
    main_height = main[3] - main[1]
    scale = min(34 / main_width, 30 / main_height)
    target = (max(1, round(pose.width * scale)), max(1, round(pose.height * scale)))
    resized = pose.resize(target, Image.Resampling.NEAREST)
    body_center_x = round(((main[0] + main[2]) / 2) * scale)
    body_bottom = round(main[3] * scale)
    frame = Image.new("RGBA", (FRAME_SIZE, FRAME_SIZE))
    frame.alpha_composite(resized, (FRAME_SIZE // 2 - body_center_x, FRAME_SIZE - 3 - body_bottom))
    return frame


def shift_upper(frame: Image.Image, dx: int = 0, dy: int = 0) -> Image.Image:
    """Move the torso while preserving the grounded bottom pixels."""
    result = frame.copy()
    split = FRAME_SIZE - 9
    upper = frame.crop((0, 0, FRAME_SIZE, split))
    result.paste((0, 0, 0, 0), (0, 0, FRAME_SIZE, split))
    result.alpha_composite(upper, (dx, dy))
    return result


def shifted(frame: Image.Image, dx: int = 0, dy: int = 0) -> Image.Image:
    result = Image.new("RGBA", frame.size)
    result.alpha_composite(frame, (dx, dy))
    return result


def build_frames(idle: Image.Image, walk: Image.Image, attack: Image.Image) -> list[Image.Image]:
    # Subtle breathing keeps the feet planted. Walking alternates two genuinely
    # different generated poses; attack includes anticipation, impact and recoil.
    idle_frames = [
        idle,
        shift_upper(idle, dy=-1),
        shift_upper(idle, dy=1),
        shift_upper(idle, dx=-1),
    ]
    walk_frames = [
        idle.copy(),
        shifted(walk, dy=-1),
        shift_upper(idle, dx=1),
        walk.copy(),
    ]
    attack_frames = [
        shift_upper(idle, dx=1),
        shifted(walk, dx=1),
        attack,
        shifted(attack, dx=-1, dy=1),
    ]
    return idle_frames + walk_frames + attack_frames


def write_atlas(species_id: str, frames: list[Image.Image]) -> None:
    atlas = Image.new("RGBA", (FRAME_SIZE * 4, FRAME_SIZE * 3))
    frame_data: dict[str, dict[str, object]] = {}
    animation_names = ("idle", "walk", "attack")

    for index, frame in enumerate(frames):
        row, column = divmod(index, 4)
        x = column * FRAME_SIZE
        y = row * FRAME_SIZE
        atlas.alpha_composite(frame, (x, y))
        frame_data[f"{animation_names[row]}_{column}"] = {
            "frame": {"x": x, "y": y, "w": FRAME_SIZE, "h": FRAME_SIZE},
            "rotated": False,
            "trimmed": False,
            "spriteSourceSize": {"x": 0, "y": 0, "w": FRAME_SIZE, "h": FRAME_SIZE},
            "sourceSize": {"w": FRAME_SIZE, "h": FRAME_SIZE},
        }

    atlas.save(ASSET_DIR / f"{species_id}.png", optimize=True)
    data = {
        "frames": frame_data,
        "animations": {
            name: [f"{name}_{index}" for index in range(4)]
            for name in animation_names
        },
        "meta": {
            "app": "Snaredusk companion sprite builder",
            "version": "1.0",
            "image": f"{species_id}.png",
            "format": "RGBA8888",
            "size": {"w": FRAME_SIZE * 4, "h": FRAME_SIZE * 3},
            "scale": "1",
            "snaredusk": {
                "anchorX": 0.5,
                "anchorY": 1,
                "shadowY": 0,
                "nativeFacing": "left",
            },
        },
    }
    (ASSET_DIR / f"{species_id}.json").write_text(
        json.dumps(data, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )


def main() -> None:
    for _, (source_name, species_ids) in BIOMES.items():
        source = Image.open(SOURCE_DIR / source_name).convert("RGBA")
        cell_width = source.width // 3
        for row, species_id in enumerate(species_ids):
            y0 = round(row * source.height / 6)
            y1 = round((row + 1) * source.height / 6)
            poses = []
            for column in range(3):
                x0 = column * cell_width
                x1 = source.width if column == 2 else (column + 1) * cell_width
                cell = source.crop((x0, y0, x1, y1))
                poses.append(normalize_pose(remove_connected_background(cell)))
            write_atlas(species_id, build_frames(*poses))

    print(f"Built {sum(len(ids) for _, ids in BIOMES.values())} companion atlases")


if __name__ == "__main__":
    main()
