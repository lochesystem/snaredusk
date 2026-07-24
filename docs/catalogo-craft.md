# Catálogo de craft — Snaredusk

Referência dos **20 itens fabricáveis** na bancada e de **onde conseguir cada material** usado nas receitas.

**Fontes verificadas neste build:** `src/data/recipes.ts`, `src/data/items.ts`, `src/data/biomes.ts`, `src/data/habitatYields.ts`, `src/data/weapons.ts`.

---

## Como fabricar

1. Coloque uma **Bancada** na base (a primeira já vem no layout inicial).
2. Guarde os materiais em **qualquer baú da base** — a bancada acessa todo o armazenamento; a bolsa também pode complementar.
3. Abra a **Oficina** (`[E]` na bancada) e escolha a receita.
4. Pague o **custo em ouro** indicado na receita (além dos materiais).

**Construções** (bancada, baú, cercado, cama) entram na bolsa ao fabricar e são colocadas pelo modo **Construir** na base. As **3 primeiras colocações** de estruturas na base são gratuitas; depois disso há custo em ouro por peça (`FREE_BUILD_COUNT = 3`).

---

## Índice rápido

| Categoria | Receitas |
|-----------|----------|
| [Armas](#armas) | 5 |
| [Construções](#construções) | 4 |
| [Itens de venda / utilidade](#itens-de-venda--utilidade) | 5 |
| [Orbes de captura](#orbes-de-captura) | 2 |
| [Conversão de materiais](#conversão-de-materiais) | 4 |

---

## Armas

| Receita | Produto | Ouro | Ingredientes |
|---------|---------|------|--------------|
| Picareta de combate | `picareta_combate` — ATK 18, melee | 40 | 3× Fibra de musgo |
| Lança esporo | `lanca_esporo` — ATK 14, ranged | 0 | 2× Esporo brilhante, 5× Cogumelo comum |
| Foice de micélio | `foice_micelio` — ATK 16, melee | 35 | 1× Chifre fúngico, 2× Madeira petrificada, 1× Esporo brilhante |
| Lâmina prismática | `lamina_prismatica` — ATK 24, melee | 70 | 1× Prisma refrator, 4× Fragmento de cristal, 2× Poeira prismática |
| Tridente termal | `tridente_termal` — ATK 22, ranged (perfura 1) | 90 | 1× Pluma de bruma, 3× Essência térmica, 4× Escama termal |

> A **Faca enferrujada** é a arma inicial — não tem receita.

---

## Construções

| Receita | Produto | Ouro | Ingredientes | Uso |
|---------|---------|------|--------------|-----|
| Bancada | Estação `workbench` | 20 | 4× Madeira petrificada, 2× Fibra de musgo | Craft (oficina) |
| Baú de madeira | Estação `chest_wood` | 10 | 3× Madeira petrificada, 1× Fibra de musgo | Armazenar loot para craft |
| Cercado | Estação `habitat_pen` | 20 | 4× Madeira petrificada, 3× Fibra de musgo | Habitat de criaturas |
| Cama | Estação `bed` | 25 | 5× Madeira petrificada, 4× Fibra de musgo | Dormir → avança o dia + produção do habitat |

---

## Itens de venda / utilidade

| Receita | Produto | Ouro | Ingredientes | Valor base |
|---------|---------|------|--------------|------------|
| Barra de ferro | 1× Barra de ferro | 8 | 2× Quartzo bruto, 1× Madeira petrificada | 50 |
| Cristal luminescente | 1× Cristal luminescente | 15 | 4× Fragmento de cristal, 2× Pó bioluminescente | 110 |
| Estatueta fúngica | 1× Estatueta fúngica | 12 | 4× Cogumelo comum, 2× Madeira petrificada, 1× Esporo brilhante | 125 |
| Ornamento prismático | 1× Ornamento prismático | 20 | 3× Fragmento de cristal, 2× Poeira prismática | 165 |
| Incensário termal | 1× Incensário termal | 25 | 2× Concha de vapor, 2× Essência térmica, 1× Lodo termal | 190 |

---

## Orbes de captura

| Receita | Produto | Ouro | Ingredientes |
|---------|---------|------|--------------|
| Orbe de Vínculo | +1 orbe | 20 | 2× Fibra de musgo, 1× Pó bioluminescente |
| Conjunto de Orbes Reforçados | +3 orbes | 60 | 3× Fragmento de cristal, 1× Prisma refrator |

**Alternativa à craft:** comprar orbes com ouro.

| Onde | Pacote | Preço |
|------|--------|-------|
| Base — mercador de orbes | ×1 | 25 ouro |
| Base — mercador de orbes | ×3 | 70 ouro |
| Masmorra — sala de mercador ambulante | ×1 | 25 ouro |
| Masmorra — sala de mercador ambulante | ×3 | 70 ouro |

---

## Conversão de materiais

Receitas intermediárias para transformar loot comum em ingredientes de armas/construções.

| Receita | Entrada | Saída | Ouro |
|---------|---------|-------|------|
| Compactar fibras | 3× Cogumelo comum | 1× Fibra de musgo | 4 |
| Concentrar esporos | 2× Cogumelo comum, 1× Fibra de musgo | 1× Esporo brilhante | 6 |
| Lapidar quartzo | 2× Quartzo bruto | 1× Fragmento de cristal | 6 |
| Destilar lodo termal | 2× Lodo termal, 1× Concha de vapor | 1× Essência térmica | 8 |

---

## Onde conseguir cada material

Legenda das colunas:

- **Baú masmorra** — loot aleatório de baús no bioma indicado
- **Drop inimigo** — baú ao derrotar/capturar a criatura
- **Habitat** — produção passiva ao dormir na cama (por criatura no cercado)
- **Craft** — só via receita de conversão acima

### Floresta Fúngica

| Item | Raridade | Baú masmorra | Drop inimigo | Habitat (/dia) | Craft |
|------|----------|--------------|--------------|----------------|-------|
| Cogumelo comum | comum | ✓ | Esporo Dorminhoco (×2) | — | — |
| Fibra de musgo | incomum | ✓ | — | Carapaça de Musgo (×3), Esporo Dorminhoco (×1) | Compactar fibras |
| Esporo brilhante | raro | ✓ | Lumimorcego (×1) | — | Concentrar esporos |
| Madeira petrificada | incomum | ✓ | Cogumante (×2) | Cogumante (×1) | — |
| Chifre fúngico | raro | ✓ | Ferrão Fúngico (×1) | Ferrão Fúngico (×1) | — |
| Núcleo fúngico | raro | — | Carapaça de Musgo (×1) | — | — |
| Coroa de Esporas | épico | — | Rei das Esporas (chefe) | — | — |

### Caverna de Cristal

| Item | Raridade | Baú masmorra | Drop inimigo | Habitat (/dia) | Craft |
|------|----------|--------------|--------------|----------------|-------|
| Fragmento de cristal | comum | ✓ | — | Prismarin (×1), Gema Viva (×2) | Lapidar quartzo |
| Quartzo bruto | comum | ✓ | Lumicascalho (×2) | Lumicascalho (×2) | — |
| Poeira prismática | incomum | ✓ | Prismarin (×1) | — | — |
| Gema rachada | raro | — | Eco de Quartzo (×1) | — | — |
| Coração de geodo | raro | ✓ | Gema Viva (×1) | — | — |
| Prisma refrator | raro | ✓ | Refrator (×1) | Refrator (×1) | — |
| Coroa de Cristal | épico | — | Matriarca Prismática (chefe) | — | — |
| Pó bioluminescente | incomum | — | — | Lumimorcego (×2) | — |

> **Pó bioluminescente** não aparece em baús — depende de capturar **Lumimorcego** no habitat ou usar receitas que não o exijam.

### Pântano Termal

| Item | Raridade | Baú masmorra | Drop inimigo | Habitat (/dia) | Craft |
|------|----------|--------------|--------------|----------------|-------|
| Escama termal | comum | ✓ | Salamandra (×2) | — | — |
| Concha de vapor | comum | ✓ | Vaporoso (×1) | — | — |
| Essência térmica | incomum | ✓ | — | Caranguejo Termal (×1) | Destilar lodo termal |
| Lodo termal | incomum | ✓ | Lodo Vivo (×2) | Lodo Vivo (×2) | — |
| Núcleo de bruma | raro | — | Caranguejo Termal (×1) | — | — |
| Pluma de bruma | raro | ✓ | Fênix de Bruma (×1) | Fênix de Bruma (×1) | — |
| Condensado | comum | — | — | Vaporoso (×2) | — |
| Coroa Termal | épico | — | Salamandra Anciã (chefe) | — | — |

---

## Progressão sugerida por bioma

### Floresta (início)

1. Mate/capture **Esporo Dorminhoco** e **Lumimorcego** → cogumelos e esporos.
2. Coloque criaturas no **cercado** → fibras e pó bioluminescente passivos.
3. Craft: **Lança esporo** (barata) ou **Picareta** → **Baús** + **Cercado** extra.
4. Derrote o **Rei das Esporas** para desbloquear Cristal.

### Cristal

1. Baús e inimigos fornecem quartzo, fragmentos e poeira.
2. Capture **Lumimorcego** (se ainda não tiver) e **Refrator** para pó e prisma passivos.
3. Craft: **Lâmina prismática**, **Ornamento prismático**, orbes reforçados.
4. Derrote a **Matriarca** para desbloquear Termal.

### Termal

1. Escamas, conchas e lodo vêm de baús e inimigos comuns.
2. Capture **Fênix de Bruma** e **Caranguejo Termal** para pluma e essência passivas.
3. Craft: **Tridente termal**, **Incensário termal**.

---

## Itens de loot sem receita de craft

Estes aparecem no jogo (drops, baús, habitat) mas **não entram** em nenhuma receita atual — servem para venda na loja ou troféus de chefe:

| Item | Origem principal |
|------|------------------|
| Núcleo fúngico | Carapaça de Musgo |
| Coroa de Esporas | Rei das Esporas |
| Chave de Esporo | Evento pós-chefe floresta |
| Gema rachada | Eco de Quartzo |
| Coroa de Cristal | Matriarca Prismática |
| Chave Prismática | Evento pós-chefe cristal |
| Núcleo de bruma | Caranguejo Termal |
| Coroa Termal | Salamandra Anciã |
| Condensado | Vaporoso (habitat) |

---

## Mapa criatura → material

Referência rápida para planejar o habitat.

| Criatura | Bioma | Produção/dia | Drop ao derrotar |
|----------|-------|--------------|------------------|
| Esporo Dorminhoco | Floresta | 1× Fibra de musgo | 2× Cogumelo comum |
| Lumimorcego | Floresta | 2× Pó bioluminescente | 1× Esporo brilhante |
| Carapaça de Musgo | Floresta | 3× Fibra de musgo | 1× Núcleo fúngico |
| Cogumante | Floresta | 1× Madeira petrificada | 2× Madeira petrificada |
| Ferrão Fúngico | Floresta | 1× Chifre fúngico | 1× Chifre fúngico |
| Prismarin | Cristal | 1× Fragmento de cristal | 1× Poeira prismática |
| Lumicascalho | Cristal | 2× Quartzo bruto | 2× Quartzo bruto |
| Eco de Quartzo | Cristal | — | 1× Gema rachada |
| Gema Viva | Cristal | 2× Fragmento de cristal | 1× Coração de geodo |
| Refrator | Cristal | 1× Prisma refrator | 1× Prisma refrator |
| Salamandra | Termal | — | 2× Escama termal |
| Vaporoso | Termal | 2× Condensado | 1× Concha de vapor |
| Caranguejo Termal | Termal | 1× Essência térmica | 1× Núcleo de bruma |
| Lodo Vivo | Termal | 2× Lodo termal | 2× Lodo termal |
| Fênix de Bruma | Termal | 1× Pluma de bruma | 1× Pluma de bruma |

---

*Documento gerado a partir do build em `main` — 2026-07-24.*
