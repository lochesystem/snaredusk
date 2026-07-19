# Prompts de sprite — Snaredusk

Guia para gerar pixel art com IA (Sprite AI, SpriteCook, SEELE, etc.) alinhada ao [art-bible.md](art-bible.md).

---

## Regras gerais (cole no final de todo prompt)

```
pixel art game sprite, side view,
32x32 pixels per frame, simple silhouette, limited color palette (max 8 colors),
transparent background, no anti-aliasing, crisp pixels,
Stardew Valley style, cozy underground fantasy,
no text, no watermark, no blur
```

### Tamanhos e export

| Asset | Tamanho | Frames | Arquivo |
|-------|---------|--------|---------|
| Criatura pequena | 32×32 | idle ×4 | `{id}.png` + `{id}.json` |
| Jogador idle | 32×32 | idle ×4 | `player-idle.png` + `player-idle.json` |
| Jogador walk | 32×32 | walk ×8 | `player-walk.png` + `player-walk.json` |
| Chefe | 64×64 | idle ×4 | `rei_esporas.png` |
| Ícone de arma | 16×16 ou 32×32 | 1 | `weapons/{id}.png` |
| Projétil | 16×16 | 1 | `projectiles/{id}.png` |

### Spritesheet (criaturas)

- Grade **2×2** = 64×64 px total (4 frames de idle).
- Salvar em `public/assets/creatures/{id}.png`.
- O jogo fatia com `{id}.json` — copie `carapaca_musgo.json` como modelo.

### Paleta — Floresta Fúngica (bioma 1)

| Cor | Hex | Uso |
|-----|-----|-----|
| Sombra | `#1a2e1a` | Contorno, fundo |
| Base | `#3d5c3a` | Corpo, musgo |
| Mid | `#5dbb63` | Vegetação |
| Highlight | `#8fd894` | Detalhes |
| Acento | `#c4f082` | Bioluminescência, olhos |
| Luz | `#f0d060` | Reflexos quentes |

---

## Bloco base (copiar/colar)

```
pixel art game sprite, side view, cute [SUJEITO],
32x32 pixels, simple silhouette, limited color palette,
dark green and bioluminescent lime, transparent background,
no anti-aliasing, crisp pixels, Stardew Valley style
```

Substitua `[SUJEITO]` pela descrição de cada seção abaixo.

---

## Jogador

**Arquivos (validados):**
- `public/assets/player/player-idle.png` — grade **2×2**, 64×64 px total, 4 frames idle
- `public/assets/player/player-walk.png` — grade **3×3**, 96×96 px total, 8 frames walk (célula inferior-direita vazia)
- JSONs: `player-idle.json`, `player-walk.json` com `meta.snaredusk.anchorY: 0.88`

**Silhueta:** aventureiro subterrâneo, casaco âmbar, capuz ou cabelo curto, silhueta legível em 32 px.

### Idle (4 frames, 2×2)

```
pixel art game sprite, side view, young underground explorer adventurer,
wearing amber brown cloak and simple tunic, warm skin tone,
32x32 pixels per frame, 4-frame idle animation sprite sheet 2x2 grid,
subtle breathing bounce, simple silhouette, limited color palette,
dark green cave palette accents, transparent background,
no anti-aliasing, crisp pixels, Stardew Valley style, cozy fantasy
```

### Walk (8 frames, 3×3)

```
pixel art game sprite, side view, same underground explorer adventurer,
amber cloak, 8-frame walk cycle sprite sheet 3x3 grid 96x96 pixels,
32x32 per frame, bottom-right cell empty, simple silhouette,
limited color palette, transparent background,
no anti-aliasing, crisp pixels, Stardew Valley style, cozy fantasy
```

**Cores sugeridas:** corpo `#e8a84a`, contorno `#8a5a20`, pele `#f0d060`.

---

## Criaturas (inimigos / capturáveis)

### Carapaça de Musgo — `carapaca_musgo` ✅ (testado)

Cogumelo tartaruga, casco de musgo, lento, defensivo.

```
pixel art game sprite, side view, cute mushroom creature,
round mossy shell on back, small friendly face, turtle-like silhouette,
32x32 pixels, simple silhouette, limited color palette,
dark green and bioluminescent lime, transparent background,
no anti-aliasing, crisp pixels, Stardew Valley style
```

**Spritesheet idle (4 frames):**

```
pixel art game sprite sheet, side view, cute moss mushroom creature with shell,
4 idle animation frames in 2x2 grid, 64x64 total, 32x32 per frame,
subtle idle bob or blink variation, dark green and bioluminescent lime,
transparent background, crisp pixels, Stardew Valley style
```

**`meta.snaredusk` no JSON** (ajuste se os pés não baterem no chão):

```json
"snaredusk": { "anchorX": 0.5, "anchorY": 0.78, "shadowY": 0 }
```

---

### Lumimorcego — `lumimorcego`

Morcego bioluminescente, ranged, ágil.

```
pixel art game sprite, side view, cute small glowing bat creature,
membrane wings folded or half open, big luminous green eyes,
32x32 pixels, simple silhouette, limited color palette,
dark green body #3d5c3a, bioluminescent lime glow #c4f082,
transparent background, no anti-aliasing, crisp pixels, Stardew Valley style
```

**Spritesheet:**

```
pixel art sprite sheet, side view, cute bioluminescent bat creature,
4 idle frames 2x2 grid 64x64, wing twitch and glow pulse,
dark green and lime bioluminescence, transparent background, Stardew Valley style
```

---

### Esporo Dorminhoco — `esporo_dorminhoco`

Bolha de esporo sonolenta, melee lento.

```
pixel art game sprite, side view, sleepy spore blob creature,
round soft body, half-closed eyes, tiny feet, drowsy expression,
32x32 pixels, simple silhouette, limited color palette,
muted forest green #3d5c3a, pale green highlights #8fd894,
transparent background, no anti-aliasing, crisp pixels, Stardew Valley style
```

**Spritesheet:**

```
pixel art sprite sheet, side view, sleepy spore creature,
4 idle frames 2x2 grid, gentle squash and stretch breathing,
muted green palette, transparent background, Stardew Valley style
```

---

### Rei das Esporas — `rei_esporas` (chefe)

Chefe grande, coroa de esporos, rajada de projéteis.

```
pixel art game sprite, side view, fungal spore king boss creature,
large mushroom crown with glowing spores, imposing but cute,
64x64 pixels, simple silhouette, limited color palette,
purple cap #6b4a8a, bioluminescent lime accents #c4f082,
transparent background, no anti-aliasing, crisp pixels, Stardew Valley style
```

**Spritesheet (chefe 64×64):**

```
pixel art sprite sheet, side view, fungal spore king boss,
4 idle frames 2x2 grid 128x128 total, 64x64 per frame,
crown spores pulsing, purple and lime palette,
transparent background, crisp pixels, Stardew Valley style
```

---

## Armas

Ícones para oficina/arsenal e referência visual. **16×16** ou **32×32**, **1 frame**, fundo transparente.

Pasta sugerida: `public/assets/weapons/`

### Faca enferrujada — `faca_enferrujada`

```
pixel art game icon, side view, rusty iron dagger knife,
short blade, worn wooden handle, simple readable silhouette,
16x16 pixels, limited color palette, rust brown and dull silver,
transparent background, no anti-aliasing, crisp pixels, Stardew Valley style
```

### Picareta de combate — `picareta_combate`

```
pixel art game icon, side view, combat pickaxe tool weapon,
wooden handle, metal head with two points, sturdy silhouette,
16x16 pixels, limited color palette, wood brown and gold metal #c4a040,
transparent background, no anti-aliasing, crisp pixels, Stardew Valley style
```

### Lança esporo — `lanca_esporo`

```
pixel art game icon, side view, organic spore lance spear,
wooden shaft, glowing green fungal spearhead, bioluminescent tip,
16x16 pixels, limited color palette, wood and lime green #c4f082,
transparent background, no anti-aliasing, crisp pixels, Stardew Valley style
```

---

## Projéteis (opcional)

Pasta sugerida: `public/assets/projectiles/`

### Lança esporo (voando)

```
pixel art game sprite, side view, small organic spore spear projectile,
wood shaft, glowing green tip, 16x16 pixels,
transparent background, crisp pixels, no anti-aliasing
```

### Esporo inimigo (Lumimorcego)

```
pixel art game sprite, glowing green spore orb projectile,
round bioluminescent blob, 16x16 pixels,
transparent background, crisp pixels, lime #c4f082
```

---

## Dicas para IA

1. **Uma espécie por vez** — mantenha o mesmo sufixo de estilo em todas.
2. **Peça “sprite sheet”** explicitamente para animação (2×2 ou faixa horizontal).
3. **Revise no Piskel** (grátis) — apague fundo residual, alinhe os 4 frames na grade.
4. **Pés na parte de baixo do frame** — deixa a sombra bater certo (ou ajuste `anchorY` no JSON).
5. **Substituir arte:** mesmo nome de arquivo em `public/assets/creatures/` → recarregar o jogo (Ctrl+F5).

### Negativos úteis (se a ferramenta aceitar)

```
blurry, anti-aliased, realistic, 3d render, photograph, isometric top-down,
white background, jpeg artifacts, text, logo, watermark, multiple characters
```

---

## Checklist antes de importar

- [ ] 32×32 por frame (64×64 para chefe)
- [ ] Fundo transparente
- [ ] Side view (não top-down)
- [ ] Contorno escuro `#1a2e1a` ou 20% mais escuro que a base
- [ ] Máximo ~8 cores por sprite
- [ ] Arquivo em `public/assets/creatures/{id}.png`
- [ ] JSON atlas copiado de `carapaca_musgo.json` com `id` correto
- [ ] Testar na masmorra e ajustar `anchorY` se flutuar

---

## Cenário — tiles 32×32 (MVP)

Tiles quadrados alinhados ao grid do jogo (masmorra e base). Substitua os placeholders gerados por `npm run sprites:environment`.

Referência: [Pixel art tiles that don't look terrible (Sprite-AI, 2026)](https://www.sprite-ai.art/blog/seamless-pixel-art-tiles) — regras de tile seamless aplicadas abaixo.

### Pastas

| Contexto | Caminho |
|----------|---------|
| Masmorra bioma 1 | `public/assets/biomes/floresta/tileset.png` + `tileset.json` |
| Props bioma 1 | `public/assets/biomes/floresta/props.png` + `props.json` |
| Base subterrânea | `public/assets/base/tileset.png` + `tileset.json` |

Biomas `cristal` e `termal` usam a mesma estrutura em `public/assets/biomes/{id}/`.

**Exemplo visual (Floresta):** gere com `npm run sprites:environment` e abra `docs/examples/floresta-tileset-example.png`.

**Paredes (técnico):** ver [wall-tiles.md](wall-tiles.md) — recorte 14 px, tileado, quinas e depuração.

### Frames obrigatórios — tileset de masmorra

| Frame | Descrição | Área visível no jogo |
|-------|-----------|----------------------|
| `floor` | Chão caminhável com musgo/cristal/vapor conforme bioma | **32×32** (tileado) |
| `wall_h` | Parede horizontal N/S | Faixa **32×14** no topo do frame 32×32 |
| `wall_v` | Parede vertical L/O | Faixa **14×32** à esquerda do frame 32×32 |
| `void` | Fundo escuro fora das salas | **32×32** (tileado) |
| `hole` | Buraco no chão (opcional; fallback vector) | **32×32** |
| `ceiling_band` | Sombra no topo da sala | **32×22** — desenhe nos **22 px superiores**; repete na largura da sala (tileado) |
| `wall_corner` | Quina externa + ombreiras de porta | Bloco **14×14** no canto sup.-esq. do frame 32×32 |

### Frames obrigatórios — props de masmorra

| Frame | Uso |
|-------|-----|
| `mushroom_a` / `mushroom_b` | Decoração Floresta |
| `crystal_a` / `crystal_b` | Decoração Cristal |
| `thermal_a` / `thermal_b` | Decoração Termal |
| `rock` | Obstáculo |
| `chest` / `chest_epic` / `chest_open` | Baús |

### Frames — tileset da base

| Frame | Célula |
|-------|--------|
| `floor` | Chão escavado |
| `rock` | Rocha |
| `wall` | Parede de sala |
| `corridor` | Corredor (opcional) |

---

### Regras de prompt para tiles (leia antes de gerar)

Baseado no guia de tiles seamless — o que **funciona** vs o que **não funciona** em IA:

| Faça | Evite |
|------|-------|
| Descreva a **superfície/textura**, não uma cena | "cave floor in a dungeon room with torches" |
| Inclua `seamless`, `tileable`, `top-down view` | Pedir só "grass tile" sem contexto de repetição |
| Iluminação plana: `flat even lighting`, `uniform color distribution` | Cenas com luz central ou gradiente escuro nas bordas (vignette) |
| Detalhe distribuído: `small scattered moss spots`, `tiny pebbles evenly spread` | Foco visual só no centro do tile |
| Props = sprite separado com fundo transparente | Objetos desenhados dentro do tile de chão |
| Tamanho **32×32 no export** (Aseprite/ferramenta), não no prompt de IA | Escrever "32x32" no prompt — modelos interpretam como conceito, não pixels |

**Negativos úteis** (cole no final do prompt ou campo "negative"):

```
vignette, dark corners, dark border, brightness falloff from center to edge,
visible grid lines, checkerboard pattern, scene composition, characters, objects,
landscape, perspective horizon, anti-aliasing, blur, watermark, text
```

**Validação antes de importar:**

1. Monte um grid **3×3** com o tile — costura visível = refazer.
2. Desloque meio tile (offset 50%) — expõe emendas escondidas.
3. Se a IA gerou vignette nas bordas: recorte no Aseprite ou use modo tile/offset (Filter → Other → Offset) e pinte a costura no centro.

**Tamanho no jogo:** `floor` e `void` = **32×32** tileado. Paredes = faixas **14 px** recortadas do frame (`wall_h` / `wall_v` / `wall_corner`). Detalhes: [wall-tiles.md](wall-tiles.md).

---

### Sufixo padrão — tiles de chão/void (cole em todo prompt de superfície)

```
seamless tileable game texture, top-down view, flat even lighting,
uniform color distribution, no gradients from center to edge,
pixel art, limited palette max 8 colors, crisp pixels, no anti-aliasing,
cozy underground fantasy, Stardew Valley style,
surface texture only, no characters, no objects, no scene
```

### Sufixo padrão — props (não são tiles)

```
pixel art game prop sprite, side view, transparent background,
1px dark outline, limited palette max 8 colors, crisp pixels,
no anti-aliasing, cozy underground fantasy, single object centered
```

---

### Prompt — `floor` (Floresta Fúngica)

Descreva só a superfície musgosa — não a masmorra inteira.

```
seamless tileable mossy underground cave floor texture,
dark green stone with small scattered bioluminescent moss spots
and tiny pebbles evenly distributed across the whole surface,
flat even lighting, uniform color distribution,
top-down view, pixel art game tile,
limited palette: #1a2e1a #3d5c3a #5dbb63 #8fd894,
surface texture only, no characters, no objects, no vignette, no dark borders
```

+ sufixo padrão de tiles, se a ferramenta aceitar blocos separados.

### Prompt — `floor` (Caverna de Cristal)

```
seamless tileable crystal cave floor texture,
blue-gray stone with small scattered prism light flecks
evenly distributed, flat even lighting, uniform color distribution,
top-down view, pixel art game tile,
limited palette: #1c2848 #3a5282 #7ab8e8 #c8e8ff,
surface texture only, no vignette, no dark corners
```

### Prompt — `floor` (Pântano Termal)

```
seamless tileable thermal swamp cave floor texture,
warm brown mud with small scattered orange heat cracks
and tiny bubbles evenly distributed, flat even lighting,
top-down view, pixel art game tile,
limited palette: #3a2818 #744830 #c06030 #ffc080,
surface texture only, no vignette
```

### Prompt — `void` (fundo fora das salas)

```
seamless tileable dark void cave texture,
very dark purple-black stone noise, minimal detail,
flat even lighting, uniform color, top-down view,
pixel art game tile, almost no highlights,
surface texture only, no vignette, no gradient to black at edges
```

### Prompt — `wall_h` (Floresta)

Faixa **horizontal 32×14** no topo do frame 32×32. Highlight no **topo** (lado externo em paredes norte). Resto transparente.

```
pixel art underground cave wall horizontal strip, 32x14 pixels in top of tile,
dark green-brown rock with moss highlight along top outer edge,
flat even lighting, tileable left-right repeat,
limited palette max 8 colors, transparent padding below
```

### Prompt — `wall_v` (Floresta)

Faixa **vertical 14×32** na esquerda do frame 32×32. Highlight na **esquerda** (lado externo em paredes oeste). Resto transparente.

```
pixel art underground cave wall vertical strip, 14x32 pixels on left of tile,
dark green-brown rock with moss highlight along left outer edge,
flat even lighting, tileable top-bottom repeat,
limited palette max 8 colors, transparent padding on right
```

### Paredes — guia de pintura

Diagrama, regras de costura, espelhamento e depuração: **[wall-tiles.md](wall-tiles.md)**.

### Prompt — `wall_corner` (Floresta)

```
pixel art game wall outer corner tile, 14x14 block in top-left of 32x32 canvas,
dark green-brown rock, moss highlight along top AND left outer edges forming L-shape,
flat even lighting, limited palette max 8 colors, transparent padding elsewhere
```

### Prompt — `rock` (prop — obstáculo)

```
pixel art game prop sprite, medium mossy boulder on ground,
side view, wider than tall, transparent background,
limited palette max 8 colors, 1px dark outline,
single object, cozy underground fantasy
```

### Prompt — `mushroom_a` (prop — decor)

```
pixel art game prop sprite, small bioluminescent mushroom,
green glowing cap, short stem, side view on ground,
transparent background, max 8 colors, crisp pixels,
single object centered, evenly lit, no vignette
```

### Prompt — `chest` (prop)

```
pixel art game prop sprite, small wooden treasure chest closed,
golden trim, side view, transparent background,
max 8 colors, 1px outline, single object, no scene
```

### Prompt — `floor` (Base subterrânea)

```
seamless tileable dug underground base floor texture,
packed earth with small scattered tool marks and pebbles
evenly distributed, warm brown-green tones,
flat even lighting, top-down view, pixel art game tile,
surface texture only, no vignette, no dark borders
```

---

### Export

1. Gere ou desenhe em **32×32** no Aseprite (props: 32×48 ou 32×32).
2. **Teste 3×3** antes de exportar — costura visível = offset + pintar centro (modo Tile no Aseprite).
3. Exporte atlas PNG + JSON (TexturePacker ou export nativo).
4. Nomes de frame **exatamente** como na tabela acima.
5. `meta.snaredusk.tileSize: 32` no JSON.
6. Coloque em `public/assets/...` e recarregue o jogo (Ctrl+F5).

### Ordem sugerida de produção

1. `floor` + `wall` + `void` → muda ~80% da sensação visual
2. `mushroom_a/b` (ou crystal/thermal conforme bioma)
3. `rock` + `chest` / `chest_epic` / `chest_open`
4. Repetir tileset para `base/`

---

*Atualizar quando novas espécies, biomas ou armas forem adicionados.*
