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

*Atualizar quando novas espécies, biomas ou armas forem adicionados.*
