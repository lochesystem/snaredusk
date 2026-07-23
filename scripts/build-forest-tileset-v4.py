#!/usr/bin/env python3
"""Create forest tileset v4 with a readable, non-black ceiling band."""

from __future__ import annotations

import json
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "public" / "assets" / "biomes" / "floresta"


def main() -> None:
    source = Image.open(ASSETS / "tileset-v3.png").convert("RGBA")
    atlas = source.copy()
    floor = source.crop((32, 0, 64, 32))
    old_ceiling = source.crop((192, 0, 224, 32))
    ceiling = Image.new("RGBA", (32, 32), (0, 0, 0, 255))

    for y in range(32):
        for x in range(32):
            if y < 8:
                # Preserva a borda de musgo que identifica o topo da parede.
                pixel = old_ceiling.getpixel((x, y))
            else:
                r, g, b, a = floor.getpixel((x, y))
                # Rocha verde profunda, mas nunca próxima do preto/void externo.
                pixel = (
                    max(18, round(r * 0.48)),
                    max(29, round(g * 0.52)),
                    max(20, round(b * 0.46)),
                    a,
                )
            ceiling.putpixel((x, y), pixel)

    atlas.alpha_composite(ceiling, (192, 0))
    atlas.save(ASSETS / "tileset-v4.png")

    data = json.loads((ASSETS / "tileset-v3.json").read_text())
    data["meta"]["version"] = "4.0"
    data["meta"]["image"] = "tileset-v4.png"
    (ASSETS / "tileset-v4.json").write_text(
        json.dumps(data, ensure_ascii=False, indent=2) + "\n",
    )


if __name__ == "__main__":
    main()
