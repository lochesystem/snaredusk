# Snaredusk

Jogo web desktop de ação e gerenciamento: explore cavernas ao crepúsculo, capture criaturas vivas, venda-as de dia na sua loja subterrânea e expanda um refúgio no subsolo. Mistura de **Moonlighter** (loja + masmorra), **Core Keeper** (base e craft) e captura de monstros com combate por companheiros.

## Pitch

Você é um caçador-mercador que explora cavernas à noite, captura criaturas vivas e as vende (ou treina) de dia na sua loja subterrânea. Cada monstro capturado pode lutar ao seu lado, gerar renda passiva e alterar biomas inteiros com habilidades ambientais — enquanto você expande sua base como um refúgio vivo no subsolo.

## Pilares de design

1. **Risco vs. recompensa** — morrer na masmorra perde o loot da bolsa; criaturas e itens já depositados na base permanecem.
2. **Criaturas como recurso vivo** — todo monstro é mercadoria, aliado de combate e modificador de ambiente.
3. **Cozy profundidade** — base acolhedora e gerenciável; masmorras tensas e lucrativas.

## Core loop

```
Preparar (party + sentinelas) → Masmorra (combate + captura) → Retorno (portal ou morte)
    → Loja (vender loot e criaturas) → Base (habitats, craft, expansão) → Preparar…
```

### Ciclo dia/noite

| Fase | Atividade |
|------|-----------|
| **Noite** | Explorar masmorras, combater, capturar, coletar loot |
| **Amanhecer** | Portal fecha a masmorra; progresso do bioma é salvo |
| **Dia** | Abrir loja, atender clientes, construir e gerenciar habitats |
| **Entardecer** | Evento opcional (visitante especial ou bônus de preço) |

## Plataforma

**Desktop web apenas** — mouse + teclado. Sem suporte mobile ou touch.

## Controles

| Input | Ação |
|-------|------|
| WASD / setas | Mover personagem |
| Mouse / clique | Atacar na direção do cursor |
| Espaço | Habilidade especial |
| E | Interagir (balcão, baú, NPC, captura) |
| Q | Orbe de Vínculo (captura) |
| Tab | Alternar alvo de companheiro |
| I | Inventário / bolsa |
| B | Modo construção (na base) |
| M | Mapa da masmorra |
| Esc | Pausa / menu |

## Sistemas principais

| Sistema | Descrição |
|---------|-----------|
| **Masmorra** | Biomas temáticos, salas procedurais, bolsa limitada (12 slots) |
| **Captura** | Lançar Orbe de Vínculo; taxa sobe conforme HP cai (5% cheio → ~70% crítico) |
| **Combate** | Real-time; party de até 2 monstros (3 com upgrade) |
| **Sentinelas** | 1 monstro por bioma com passivo ambiental |
| **Loja** | Precificação por reações do cliente; itens mortos e criaturas vivas |
| **Base** | Escavação, habitats, oficina, jardim de fungos, armazém |
| **Craft** | Orbes, armas, móveis; materiais puxados de baús adjacentes |
| **Progressão** | Ouro, materiais, reputação, bestiário, chaves de bioma |

## Conteúdo MVP

| Categoria | Quantidade |
|-----------|------------|
| Biomas | 3 |
| Monstros capturáveis | 18 |
| Itens de loot | 30 |
| Receitas | 20 |
| Upgrades de loja | 5 níveis |
| Estruturas de base | 8 |
| Arquétipos de cliente | 6 |

## Stack

- Vite 8 + TypeScript 6 + PixiJS 8 (WebGL)
- Vitest (sistemas puros)
- Deploy: GitHub Pages (`lochesystem.github.io/snaredusk/`)

## Comandos

```bash
cd snaredusk
npm install
npm run dev      # http://localhost:5173/snaredusk/
npm test
npm run build
```

## Jogar (Fase 1 — vertical slice)

1. **Novo Jogo** na tela título
2. **Entrar na Masmorra** — Floresta Fúngica (5 salas fixas)
3. Derrote ou capture 3 criaturas (WASD, clique para atacar, **Q** para Orbe)
4. Quando todos forem derrotados/fugirem, vá ao **Portal** na última sala e pressione **E**
5. **Abrir Loja** — coloque itens da bolsa nas prateleiras/gaiola, ajuste preço, **Abrir loja ao público**

## Documentação de design

| Arquivo | Conteúdo |
|---------|----------|
| [docs/GDD.md](docs/GDD.md) | Documento mestre — sistemas, números, fluxos |
| [docs/art-bible.md](docs/art-bible.md) | Perspectiva 2.5D, pipeline visual, paletas |
| [docs/UX-UI.md](docs/UX-UI.md) | Wireframes, HUD, fluxos de tela |
| [docs/ROADMAP.md](docs/ROADMAP.md) | Fases de produção e critérios de done |

## Referências (não clones)

- **Moonlighter** — loop dia/noite, loja com precificação
- **Core Keeper** — base subterrânea, craft adjacente a baús
- **Stardew Valley** — perspectiva oblíqua cozy, ciclo diário
- **Pokémon / Nexomon** — captura, party, tipos elementais

## Status

**Fase 1 — vertical slice jogável.** Engine oblíqua, masmorra, captura, loja básica e save local.

---

*LochéSystem — lochesystem.github.io*
