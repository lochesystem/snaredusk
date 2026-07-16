# Snaredusk

Jogo web desktop de ação e gerenciamento: explore cavernas ao crepúsculo, capture criaturas vivas, venda-as de dia na sua loja subterrânea e expanda um refúgio no subsolo. Mistura de **Moonlighter** (loja + masmorra), **Core Keeper** (base e craft) e captura de monstros com combate por companheiros.

**Jogar online:** [lochesystem.github.io/snaredusk/](https://lochesystem.github.io/snaredusk/)

## Pitch

Você é um caçador-mercador que explora cavernas à noite, captura criaturas vivas e as vende (ou treina) de dia na sua loja subterrânea. Cada monstro capturado pode lutar ao seu lado, gerar renda passiva e alterar biomas inteiros com habilidades ambientais — enquanto você expande sua base como um refúgio vivo no subsolo.

## Pilares de design

1. **Risco vs. recompensa** — morrer na masmorra perde o loot da bolsa; criaturas e itens já depositados na base permanecem.
2. **Criaturas como recurso vivo** — todo monstro é mercadoria, aliado de combate e modificador de ambiente.
3. **Cozy profundidade** — base acolhedora e gerenciável; masmorras tensas e lucrativas.

## Core loop (visão completa)

```
Preparar (party + sentinelas) → Masmorra (combate + captura) → Retorno (portal ou morte)
    → Loja (vender loot e criaturas) → Base (habitats, craft, expansão) → Preparar…
```

No **build atual** (vertical slice): masmorra → captura → portal → loja → habitat na base. Party, sentinelas, craft e ciclo dia/noite ainda estão no [GDD](docs/GDD.md).

## Plataforma

**Desktop web apenas** — mouse + teclado. Sem suporte mobile ou touch.

## Controles (implementados)

| Input | Ação |
|-------|------|
| WASD / setas | Mover personagem |
| Mouse / clique | Atacar na direção do cursor |
| **Q** | Orbe de Vínculo (captura) |
| **E** | Interagir — portal, baús de tesouro |

Controles planejados (fase 2+): Espaço, Tab, I, B, M, Esc — ver [UX-UI](docs/UX-UI.md).

## O que está no jogo hoje

| Sistema | Estado |
|---------|--------|
| **Masmorra procedural** | 7–9 salas em grafo (N/S/E/W), decor de cogumelos, rochas e buracos |
| **Minimapa** | Canto superior direito; salas exploradas, portal em verde |
| **Baús** | ~28% das salas (máx. 2 por run); abrir com **E** |
| **Captura** | Orbe de Vínculo; taxa sobe conforme HP cai |
| **3 criaturas** | Lumimorcego, Esporo Dorminhoco, Carapaça de Musgo |
| **Loja** | 3 prateleiras, 1 gaiola, precificação por reação do cliente |
| **Habitat** | Até 4 criaturas; cena visual na base; mover bolsa ↔ habitat |
| **Mercador de orbes** | Na base: ×1 por 25 ouro, ×3 por 70 ouro |
| **Save** | localStorage entre sessões |
| **Deploy** | GitHub Actions → GitHub Pages |

## Conteúdo MVP (meta do GDD)

| Categoria | Meta | No build atual |
|-----------|------|----------------|
| Biomas | 3 | 1 (Floresta Fúngica) |
| Monstros capturáveis | 18 | 3 |
| Itens de loot | 30 | Subconjunto |
| Receitas | 20 | — |
| Upgrades de loja | 5 níveis | Básico |
| Estruturas de base | 8 | Habitat |
| Arquétipos de cliente | 6 | Simulado (faixas de preço) |

## Stack

- Vite 8 + TypeScript 6 + PixiJS 8 (WebGL)
- Vitest (sistemas puros)
- Deploy: GitHub Pages ([lochesystem.github.io/snaredusk/](https://lochesystem.github.io/snaredusk/))

## Comandos

```bash
npm install
npm run dev      # http://localhost:5173/snaredusk/
npm test
npm run build
```

## Como jogar (vertical slice)

1. **Novo Jogo** (ou **Continuar**) na tela título
2. Na **base**, compre orbes no mercador se precisar
3. **Entrar na Masmorra** — layout procedural da Floresta Fúngica (7–9 salas)
4. Explore, abra **baús** com **E**, combata com clique e capture com **Q**
5. Derrote ou capture todos os inimigos; o **portal** ativa — vá até ele e pressione **E**
6. Na base, coloque criaturas da bolsa no **habitat** (botão ou clique na cena)
7. **Abrir Loja** — itens nas prateleiras/gaiola, ajuste preço, **Abrir loja ao público**

## Documentação de design

| Arquivo | Conteúdo |
|---------|----------|
| [docs/GDD.md](docs/GDD.md) | Documento mestre — sistemas, números, fluxos |
| [docs/GDD.md#0-estado-da-implementação-build-atual](docs/GDD.md#0-estado-da-implementação-build-atual) | O que já existe vs. plano |
| [docs/art-bible.md](docs/art-bible.md) | Perspectiva 2.5D, pipeline visual, paletas |
| [docs/UX-UI.md](docs/UX-UI.md) | Wireframes, HUD, fluxos de tela |
| [docs/ROADMAP.md](docs/ROADMAP.md) | Fases de produção e critérios de done |
| [CHANGELOG.md](CHANGELOG.md) | Histórico de versões |

## Referências (não clones)

- **Moonlighter** — loop dia/noite, loja com precificação
- **Core Keeper** — base subterrânea, craft adjacente a baús
- **Stardew Valley** — perspectiva oblíqua cozy, ciclo diário
- **Pokémon / Nexomon** — captura, party, tipos elementais

## Status

**Fase 1 — vertical slice jogável e publicado.** Masmorra procedural, minimapa, captura, loja, habitat visual, mercador de orbes, save local e deploy automático no GitHub Pages.

---

*LochéSystem — [lochesystem.github.io/snaredusk](https://lochesystem.github.io/snaredusk)*
