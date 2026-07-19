# Paredes de masmorra — pipeline técnico

Documento de referência para **como o engine monta paredes**, o que pintar no tileset e como depurar desalinhamento. Complementa [sprite-prompts.md](sprite-prompts.md) (prompts de IA) e [art-bible.md](art-bible.md) (visão geral).

---

## Resumo

| Conceito | Valor |
|----------|-------|
| Tile lógico | **32×32 px** (`floor`, `void`) |
| Espessura de parede (colisão + render) | **14 px** (`WALL_THICKNESS`) |
| Export do frame no PNG | **32×32** (parede ocupa só uma faixa dentro do frame) |
| Recorte no engine | **Fixo** — igual para todas as paredes do bioma |
| Tileado da faixa | Só no eixo **longo**, a cada **32 px** |

---

## Arquivos no código

| Arquivo | Responsabilidade |
|---------|------------------|
| [`src/world/environmentAssets.ts`](../src/world/environmentAssets.ts) | Carrega atlas; `WALL_STRIP_CROPS`; `getWallHorizontalTexture` / `Vertical` / `Corner` |
| [`src/world/wallRendering.ts`](../src/world/wallRendering.ts) | Fase do tileado, espelhamento por face, flips de quina — **edite aqui para ajuste fino** |
| [`src/world/tileRenderer.ts`](../src/world/tileRenderer.ts) | Monta chão, faixas, quinas externas e quinas de porta |
| [`src/world/dungeonGenerator.ts`](../src/world/dungeonGenerator.ts) | Segmentos de colisão 14×N; portas com gap de corredor |
| [`tests/wallRendering.test.ts`](../tests/wallRendering.test.ts) | Comportamento esperado (recorte, tilePosition, flips) |
| [`scripts/generate-environment-placeholders.mjs`](../scripts/generate-environment-placeholders.mjs) | Placeholders + `meta.snaredusk.walls` no JSON |

---

## Frames do tileset

Cada frame é exportado em **32×32**. O engine **recorta** uma sub-região fixa:

| Frame | Região recortada | Uso |
|-------|------------------|-----|
| `wall_h` | **32×14** no topo `(0,0)` | Paredes norte e sul (`TilingSprite` horizontal) |
| `wall_v` | **14×32** à esquerda `(0,0)` | Paredes oeste e leste (`TilingSprite` vertical) |
| `wall_corner` | **14×14** no canto sup.-esq. `(0,0)` | Quinas externas da sala + ombreiras de porta |

Constantes: `WALL_STRIP_CROPS` em `environmentAssets.ts`.

O restante do frame 32×32 pode ser `void`, transparente ou padding — **não entra no recorte**.

---

## Como uma sala é montada

```
     [wall_h norte — faixa tileada, pontas recortadas nas quinas]
[wall_v] [corner NW]········[corner NE] [wall_v]
oeste    │                  │           leste
         │     CHÃO 32×32   │
[wall_v] [corner SW]········[corner SE] [wall_v]
     [wall_h sul — faixa tileada, espelhada no eixo Y]
```

### Ordem de desenho

1. `void` + `floor` (salas e corredores)
2. Faixas **verticais** (`wall_v`)
3. Faixas **horizontais** (`wall_h`)
4. Quinas **externas** (4 cantos da sala, 14×14)
5. Quinas **internas** nas ombreiras das portas (`collectDoorJambCorners`)

### Encurtamento nas quinas (`trimWallSegment`)

Segmentos horizontais/verticais são encurtados **14 px** em cada canto da sala para não sobrepor a peça `wall_corner`. Sem isso, faixas e quinas brigam no mesmo bloco 14×14.

### Portas e corredores

- O gerador deixa um **gap** central na parede (largura do corredor).
- Quinas de porta usam o mesmo atlas `wall_corner` com orientação diferente.
- **Junções em T** (corredor perpendicular no meio da parede) **não têm peça dedicada** no MVP — podem parecer imperfeitas mesmo com arte correta.

---

## Espelhamento (borda clara na face interna)

A arte é pintada uma vez no atlas; o engine espelha:

| Face | Frame | Espelho | Config (`wallRendering.ts`) |
|------|-------|---------|----------------------------|
| Norte | `wall_h` | nenhum | — |
| Sul | `wall_h` | eixo **Y** | `DEFAULT_WALL_FACING_FLIPS.flipSouth` (padrão `true`) |
| Oeste | `wall_v` | nenhum | — |
| Leste | `wall_v` | eixo **X** | `DEFAULT_WALL_FACING_FLIPS.flipEast` (padrão `true`) |

Quinas: `wall_corner` desenhado como **NW**; NE/SW/SE por espelhamento (`cornerSpriteFlips`).

**Se a borda clara ficar do lado errado em todo o bioma:** inverta `flipSouth` ou `flipEast` em `DEFAULT_WALL_FACING_FLIPS` — não precisa repintar o PNG.

---

## Tileado (`TilingSprite`) — regra crítica

A faixa repete o padrão no eixo **longo** (a cada 32 px de comprimento da parede).

Na espessura de **14 px**, o offset de fase é **sempre zero**.

```ts
// Correto (wallRendering.ts)
horizontal → tilePosition = (tileMod(-wallX, 32), 0)
vertical   → tilePosition = (0, tileMod(-wallY, 32))
```

### Bug que causava “borda no meio”

Versão antiga usava `tileMod(-wall.x, texture.width)` em **ambos** os eixos. Para `wall_v` (largura 14), `tileMod(-48, 14) = 10` deslocava a textura **dentro** da faixa e a highlight saía do lugar — pior em paredes com `x`/`y` não múltiplos de 14.

**Sintoma:** um lado da sala alinhado, o outro com borda deslocada ou “no meio” do bloco.

**Correção:** `computeWallStripTilePosition` — ver testes em `wallRendering.test.ts`.

---

## O que pintar (checklist rápido)

| Frame | Canvas 32×32 | Highlight |
|-------|--------------|-----------|
| `wall_h` | Faixa **32×14 no topo** | Sempre no **topo** do frame |
| `wall_v` | Faixa **14×32 à esquerda** | Sempre na **esquerda** do frame |
| `wall_corner` | Bloco **14×14** no canto sup.-esq. | **Topo + esquerda** em L |

1. Mesma paleta base nos três frames.
2. Mesma espessura de highlight (2–3 px).
3. Padrão **seamless** na direção do tileado (H → horizontal, V → vertical).
4. Valide no Aseprite: sala 3×3 só com paredes antes de exportar.

Prompts de IA: [sprite-prompts.md — wall_h / wall_v / wall_corner](sprite-prompts.md).

---

## Abordagens testadas (lições aprendidas)

### ✅ Faixas 14 px + quinas (atual)

- Colisão e visual alinhados a **14 px**.
- Quinas externas com `wall_corner` 14×14.
- Melhor custo/benefício para salas procedurais de tamanho arbitrário.

### ❌ Células 32×32 inteiras em anel

- Parecia bonito no exemplo estático (grade 7×7).
- No jogo: paredes grossas demais, chão recuado, quinas internas/externas piores em portas e corredores.
- **Não usar** para render in-game; o exemplo em `docs/examples/floresta-tileset-example.png` é referência de **composição de frames**, não de espessura in-game.

### Recorte dinâmico por parede

- **Não existe** — o crop é sempre o mesmo retângulo no frame.
- Desalinhamento vinha do **tilePosition** na espessura, não do crop variável.

---

## Validar no jogo

```bash
npm run sprites:environment   # regenera placeholders + exemplo
npm run dev                   # masmorra floresta
npm test -- wallRendering     # testes do pipeline
```

### Checklist visual (playtest)

Ver também [PLAYTEST.md § 3 — paredes](PLAYTEST.md).

- [ ] Borda clara contínua nas **4 quinas externas** da sala
- [ ] Parede **esquerda** e **direita** com highlight na mesma distância da borda interna
- [ ] Parede **norte** e **sul** alinhadas (sem “degrau” no tileado)
- [ ] Ombreiras de **porta** sem buraco óbvio de void entre faixa e corredor
- [ ] Aceitar imperfeição em **junção T** de corredor (sem peça `wall_t` ainda)

---

## Metadados no `tileset.json`

Placeholders gerados incluem (em `meta.snaredusk.walls`):

```json
{
  "thickness": 14,
  "strips": {
    "wall_h": { "crop": [0, 0, 32, 14], "tileAlong": "x" },
    "wall_v": { "crop": [0, 0, 14, 32], "tileAlong": "y" },
    "wall_corner": { "crop": [0, 0, 14, 14] }
  },
  "flipSouth": true,
  "flipEast": true
}
```

Hoje o runtime lê as constantes em TypeScript; o JSON serve como **documentação no asset** para pintores e para futura leitura pelo loader.

---

## Roadmap técnico (paredes)

| Item | Status |
|------|--------|
| Faixas 14 px + quinas externas | ✅ |
| Quinas de ombreira de porta | ✅ |
| Fix tilePosition na espessura | ✅ |
| Peça `wall_t` (junção T de corredor) | Pendente |
| Flips por bioma via `tileset.json` | Pendente (hoje só `wallRendering.ts`) |

---

*Atualizar este doc quando mudar `WALL_STRIP_CROPS`, ordem de render ou peças de junção.*
