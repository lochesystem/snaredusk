#!/usr/bin/env python3
"""Trim generated weapon sources into crisp 32 px transparent UI icons."""

from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "public" / "assets" / "weapons"
ICON_SIZE = 32
CONTENT_SIZE = 29

WEAPONS = (
    "faca_enferrujada",
    "picareta_combate",
    "lanca_esporo",
    "foice_micelio",
    "lamina_prismatica",
    "tridente_termal",
)


def main() -> None:
    for weapon_id in WEAPONS:
        source = Image.open(ASSETS / f"{weapon_id}-source-alpha.png").convert("RGBA")
        alpha = source.getchannel("A").point(lambda value: 255 if value >= 32 else 0)
        bbox = alpha.getbbox()
        if bbox is None:
            raise RuntimeError(f"empty weapon source: {weapon_id}")
        sprite = source.crop(bbox)
        scale = min(CONTENT_SIZE / sprite.width, CONTENT_SIZE / sprite.height)
        size = (max(1, round(sprite.width * scale)), max(1, round(sprite.height * scale)))
        sprite = sprite.resize(size, Image.Resampling.NEAREST)

        icon = Image.new("RGBA", (ICON_SIZE, ICON_SIZE), (0, 0, 0, 0))
        icon.alpha_composite(
            sprite,
            ((ICON_SIZE - sprite.width) // 2, (ICON_SIZE - sprite.height) // 2),
        )
        icon.save(ASSETS / f"{weapon_id}.png")


if __name__ == "__main__":
    main()
