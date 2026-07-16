# Art Bible — Snaredusk

Direção visual, perspectiva de câmera, pipeline de arte e técnicas WebGL para um jogo web com profundidade e personalidade — sem depender de shapes genéricos ou tiles sem graça.

---

## 1. Visão artística

### Palavras-chave

**Cozy subterrâneo · Bioluminescência · Pixel pintado · Profundidade viva**

O mundo é um subsolo acolhedor onde luz e criaturas trazem cor às cavernas. Contraste entre a **base quente** (madeira, tochas, musgo) e **masmorras frias** (cristal, vapor, sombra).

### Referências visuais

| Referência | O que tirar |
|------------|-------------|
| [Moonlighter](https://store.steampowered.com/app/606150/Moonlighter/) | Perspectiva oblíqua, loja detalhada, feedback de cliente |
| [Core Keeper](https://store.steampowered.com/app/1621690/Core_Keeper/) | Base subterrânea iluminada, estações de craft |
| [Stardew Valley](https://store.steampowered.com/app/413150/Stardew_Valley/) | Cozy pixel, personagens side-view, paleta harmônica |
| [Eastward](https://store.steampowered.com/app/977880/Eastward/) | Profundidade em pixel, iluminação dramática |
| [The Siege and the Sandfox](https://www.gamedeveloper.com/art/adding-depth-to-2d-with-hand-drawn-normal-maps-in-i-the-siege-and-the-sandfox-i-) | Normal maps pintados à mão em pixel art |

---

## 2. Perspectiva de câmera

### Nome técnico

**Projeção oblíqua / 2.5D dimetric (ratio 2:1)**

Não é isométrico verdadeiro (120° entre eixos). É a mesma família de Moonlighter, Stardew Valley e Zelda clássico: câmera inclinada que mostra o topo e a frente dos objetos, com personagens em **vista lateral**.

### Especificações

| Parâmetro | Valor | Notas |
|-----------|-------|-------|
| Inclinação da câmera | ~26–30° | Dimetric; ângulo `arctan(0.5) ≈ 26.565°` |
| Tile de chão | 64×32 px (W×H visual) | Losango oblíquo |
| Altura de tile (lógica) | 16 px | Para Y-sort |
| Personagens | Side-view 32×32 ou 48×48 | 4–8 frames por animação |
| Resolução lógica | 480×270 | Scale 2×/3×/4× integer |
| Pixel perfect | Sim | `round()` em posições; sem subpixel blur |
| Câmera | Segue jogador + lookahead 32px | Suave (lerp 0.1) |

### Diagrama de projeção

```
                    Câmera (oblíqua ~27°)
                         \
                          \   vista do jogador
                           \
    ════════════════════════╳════════════════  chão (tiles 64×32)
         topo do objeto          frente do objeto

    Personagem: sprite SIDE-VIEW em pé sobre o tile
    (não visto de cima como o chão)
```

### Y-sorting (profundidade)

```typescript
// Ordem de render: menor Y na tela = mais atrás
entity.zIndex = entity.y + entity.zOffset;
// zOffset: chão = 0, props baixos = +0.1, personagens = +0.5, props altos = +1
```

**Regra:** entidades na mesma linha Y se sobrepõem corretamente (personagem passa atrás/na frente de árvores e rochas).

### O que evitar

| Errado | Certo |
|--------|-------|
| Top-down puro (personagem visto de cima) | Side-view sobre chão oblíquo |
| Isométrico 120° (diamante alto) | Dimetric 2:1 (mais achatado, estilo Stardew) |
| Tiles 16×16 sem transição | Autotiling + bordas suaves |
| Sprites sem sombra no chão | Elipse de sombra projetada separada |

---

## 3. As 7 técnicas de polimento visual

Técnicas para HTML/WebGL que elevam o jogo além de retângulos coloridos.

### 3.1 Sprites pintados + normal maps

**O quê:** cada sprite importante (personagem, props grandes, estações) tem um par `diffuse.png` + `diffuse_n.png` (normal map).

**Por quê:** iluminação dinâmica por pixel — tochas, cristais e bioluminescência reagem em tempo real sem redesenhar sprites.

**Pipeline:**

1. Pintar sprite em Aseprite (paleta limitada)
2. Gerar ou pintar normal map (SpriteIlluminator ou manual com "normal dome")
3. Empacotar em atlas com TexturePacker (layout idêntico entre diffuse e normal)
4. No PixiJS: `Mesh` ou sprite com shader custom que sampleia ambos

**Onde usar no jogo:**

| Asset | Normal map |
|-------|------------|
| Jogador | Sim |
| Criaturas (body) | Sim |
| Estações de craft | Sim |
| Tiles de chão | Opcional (performance) |
| Partículas | Não |

**Limite de performance:** máximo **4 point lights** ativos por sala.

### 3.2 Parallax em camadas GPU

**O quê:** 4–6 camadas de fundo com `scrollFactor` diferente (0.1 a 1.0).

**Camadas padrão (masmorra):**

| Camada | scrollFactor | Conteúdo |
|--------|--------------|----------|
| 0 — Skybox caverna | 0.0 | Gradiente escuro + estalactites distantes |
| 1 — Fundo | 0.2 | Paredes, formações rochosas |
| 2 — Mid-back | 0.5 | Árvores, cristais grandes |
| 3 — Chão + gameplay | 1.0 | Tiles, entidades, colisão |
| 4 — Foreground | 1.1 | Galhos, estalactites baixas (parallax forward) |
| 5 — Partículas | 1.0 | Esporos, pó, faíscas |

**Implementação PixiJS:**

```typescript
layer.position.set(-camera.x * scrollFactor, -camera.y * scrollFactor);
```

### 3.3 Y-sort + sombras projetadas

**O quê:** elipse escura semi-transparente sob cada entidade, **não** baked na sprite.

| Propriedade | Valor |
|-------------|-------|
| Forma | Elipse |
| Cor | `#000000` @ 35% alpha |
| Escala X | `sprite.width * 0.6` |
| Escala Y | `sprite.width * 0.2` |
| Offset Y | `sprite.height * 0.45` (pés do personagem) |
| Z-index | `entity.y - 0.01` |

Sombras **encolhem** levemente quando entidade está no ar (pulo/esquiva).

### 3.4 Partículas ambientais

**O quê:** vida procedural sem sprites repetitivos — cada partícula com velocidade, vida e alpha únicos.

| Bioma | Partículas |
|-------|------------|
| Floresta Fúngica | Esporos ascendentes, pó verde, vagalumes |
| Caverna de Cristal | Brilhos prismáticos, fragmentos caindo |
| Pântano Termal | Vapor, bolhas, cinzas quentes |
| Base | Fagulhas de tocha, poeira em feixe de luz |

**PixiJS:** `ParticleContainer` ou `@pixi/particle-emitter` com max 200 partículas por sistema.

### 3.5 Tile blending (autotiling)

**O quê:** transições suaves entre tipos de terreno — nunca borda dura de grid.

**Regras:**

- Usar wang tiles ou blob 47-tile set por bioma
- Bordas com tile de transição (ex: musgo → pedra)
- Shader opcional: soft edge em tiles adjacentes a void

**Alternativa leve (MVP):** 16 tiles base + 8 bordas por bioma, suficiente para vertical slice.

### 3.6 Post-processing leve

Pipeline de pós-processamento em `RenderTexture`:

| Efeito | Intensidade | Onde |
|--------|-------------|------|
| **Bloom** | Threshold 0.7, blur 2px | Fontes de luz, cristais |
| **Vignette** | 15% escurecimento bordas | Sempre (cozy) |
| **Color grading** | LUT por bioma | Uniform 3×3 matrix |
| **Chromatic aberration** | 0 | Desligado (não combina com pixel) |

**Color grading por bioma:**

| Bioma | Matiz dominante | Saturação |
|-------|-----------------|-----------|
| Floresta | +verde, leve | 1.1 |
| Cristal | +azul, frio | 0.95 |
| Termal | +laranja, quente | 1.05 |
| Base | +âmbar, quente | 1.0 |

### 3.7 Composição modular de criaturas

Inspirado no padrão [vinculo-vivo/docs/art-bible.md](../../vinculo-vivo/docs/art-bible.md).

**Canvas composto:** 64×64 px por criatura (menor que Vínculo Vivo por escala de masmorra).

| Slot | zIndex | Exemplos |
|------|--------|----------|
| `back` | 5 | Asas, casco, barbatana |
| `tail` | 15 | Cauda |
| `body` | 20 | Corpo base |
| `pattern` | 25 | Manchas, bioluminescência |
| `eyes` | 50 | Expressão |
| `mouth` | 55 | Boca |
| `horn` | 40 | Chifre, cristal na cabeça |

**Recolor runtime:** paleta indexada (6 cores) mapeada por `species.palette` — uma arte base serve múltiplas variantes.

---

## 4. Paletas por bioma

### Regra global de UI

- Fundo de painel: `#1a1a2e`
- Texto primário: `#f0e6d3`
- Texto secundário: `#a09880`
- Acento interativo: `#e8a84a`
- Contraste mínimo WCAG AA em todos os textos

### Bioma 1 — Floresta Fúngica

| Role | Hex | Uso |
|------|-----|-----|
| Sombra | `#1a2e1a` | Fundo caverna |
| Base | `#3d5c3a` | Musgo, folhas |
| Mid | `#5dbb63` | Cogumelos, vegetação |
| Highlight | `#8fd894` | Bioluminescência |
| Acento | `#c4f082` | Esporos, olhos |
| Luz quente | `#f0d060` | Tochas refletidas |

**Mood:** misterioso, vivo, húmido.

### Bioma 2 — Caverna de Cristal

| Role | Hex | Uso |
|------|-----|-----|
| Sombra | `#0f1520` | Void |
| Base | `#2a3a5c` | Rocha |
| Mid | `#4a6a9e` | Cristal médio |
| Highlight | `#8ab4f8` | Reflexos |
| Acento | `#c8e0ff` | Brilho prismático |
| Luz | `#e0f0ff` | Glow frio |

**Mood:** frio, reverberante, precioso.

### Bioma 3 — Pântano Termal

| Role | Hex | Uso |
|------|-----|-----|
| Sombra | `#1a1010` | Rochas escuras |
| Base | `#4a3028` | Lama, rocha quente |
| Mid | `#8b5a3c` | Terra termal |
| Highlight | `#e87840` | Lava/lodo brilhante |
| Acento | `#ffaa60` | Vapor iluminado |
| Água | `#4a8a8a` | Poças termais |

**Mood:** quente, perigoso, vaporoso.

### Base — Brumavale

| Role | Hex | Uso |
|------|-----|-----|
| Sombra | `#1a1520` | Cantos |
| Madeira | `#6b4a32` | Móveis, estruturas |
| Pedra | `#4a4a5a` | Paredes escavadas |
| Musgo decor | `#4a6a4a` | Conforto |
| Luz tocha | `#f0a040` | Iluminação quente |
| Têxtil | `#8a6a5a` | Tapetes, cortinas |

**Mood:** lar, seguro, artesanal.

---

## 5. Especificações de sprite

### Tamanhos

| Tipo | Tamanho | Frames |
|------|---------|--------|
| Jogador | 32×32 | idle 4, walk 8, attack 4, hurt 2, death 4 |
| Criatura pequena | 32×32 | idle 4, walk 4, attack 3 |
| Criatura grande | 48×48 | idle 4, walk 6, attack 4 |
| NPC cliente | 32×32 | idle 4, walk 4 |
| Chefe | 64×64 | idle 4, attack 6, hurt 2, death 6 |
| Item (ícone) | 16×16 | 1 |
| Estação craft | 48×48 ou 64×48 | 1 (+ anim loop opcional) |

### Estilo de linha

| Propriedade | Valor |
|-------------|-------|
| Contorno | 1–2 px, cor 20% mais escura que base |
| Anti-aliasing | Mínimo; pixel crisp |
| Cores por sprite | Máx 8 (incluindo outline) |
| Cores por bioma (total) | 32–48 |
| Sombreado | 2 tons (base + highlight); sem gradiente suave |

### Animação

- **12 FPS** para personagens (estilo retro)
- **8 FPS** para props ambientais (cogumelos pulsando)
- Easing em tweens de UI: `ease-out-cubic`
- Squash & stretch leve em ataque (scale Y 0.9 → 1.1)

---

## 6. UI visual

### Princípios

- Painéis com **borda pixel art** (9-slice 16×16)
- Ícones 16×16 alinhados à grade
- Fonte: **Press Start 2P** (títulos) ou **VT323** (corpo) — web fonts
- Nunca texto diretamente sobre gameplay sem painel semi-opaco

### Componentes

| Componente | Visual |
|------------|--------|
| Barra HP | Vermelho `#c03030` sobre fundo `#2a1a1a`, 48×6 px |
| Barra stamina | Amarelo `#e8c040` sobre `#2a2a1a` |
| Slot de bolsa | 20×20, borda `#4a4a5a`, vazio = X tracejado |
| Emoji reação loja | 24×24, bounce ao aparecer |
| Botão UI | Mín 32×32 px, hover + click feedback |

---

## 7. Pipeline de produção de arte

### Ferramentas

| Etapa | Ferramenta |
|-------|------------|
| Pixel art | Aseprite |
| Normal maps | SpriteIlluminator ou Aseprite manual |
| Atlas | TexturePacker |
| Preview in-engine | TexturePacker + PixiJS dev scene |
| Paleta | Lospec palette (custom por bioma) |

### Fluxo por asset

```
1. Concept (silhueta em 32×32)
2. Palette lock (cores do bioma)
3. Sprite diffuse
4. Normal map (se aplicável)
5. Export PNG + JSON atlas
6. Teste in-engine (luz + Y-sort + sombra)
7. Aprovação → commit em public/assets/
```

### Naming convention

```
assets/
  biomes/forest/
    tileset_diffuse.png
    tileset_normal.png
    props_atlas.json
  creatures/
    lumimorcego/
      body.png
      body_n.png
      eyes.png
      ...
  ui/
    panel_9slice.png
    icons_atlas.json
```

---

## 8. Stack de renderização

| Camada | Tecnologia |
|--------|------------|
| Engine | PixiJS 8 (WebGL2) |
| Iluminação | Custom shader (diffuse + normal + up to 4 lights) |
| Partículas | @pixi/particle-emitter |
| Pós-process | Pixi FilterPass (bloom, vignette, color matrix) |
| Áudio visual | Screen shake, flash branco 50ms em crítico |

### Ordem de render (frame)

```
1. Parallax layers (back → front)
2. Tilemap chão
3. Y-sorted entities (sombra → sprite → overlay)
4. Partículas
5. Foreground parallax
6. UI world-space (balões de emoji)
7. UI screen-space (HUD)
8. Post-processing
```

---

## 9. Checklist de qualidade visual

Antes de considerar um bioma "pronto":

- [ ] Personagem side-view legível em 32×32
- [ ] Y-sort correto com 3+ tipos de prop
- [ ] Pelo menos 1 fonte de luz dinâmica com normal map
- [ ] Partículas ambientais ativas
- [ ] Sombra projetada em todas as entidades
- [ ] Transição de tile sem costura visível
- [ ] Paleta do bioma respeitada (≤48 cores)
- [ ] HUD legível sobre qualquer fundo do bioma
- [ ] 60 FPS com cena típica (desktop)
- [ ] 60 FPS em cena típica (desktop)

---

*Art Bible v0.1 — complementa [GDD.md](GDD.md). Atualizar quando assets forem produzidos.*
