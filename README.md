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

No **build atual**: masmorra (1×/dia) → captura → portal → **dormir na cama** (produção do habitat) → loja → habitat. Party, sentinelas e humor/fome ainda estão no [GDD](docs/GDD.md).

## Plataforma

**Desktop web apenas** — mouse + teclado ou controle compatível com Gamepad API
(incluindo DualSense/controle de PS5). Sem suporte mobile ou touch.

## Controles (implementados)

| Input | Ação |
|-------|------|
| WASD / setas | Mover personagem |
| Mouse / clique | Atacar na direção do cursor |
| **Q** | Orbe de Vínculo (captura) |
| **E** | Interagir — portal, baús, bancada, cama (dormir) |
| Analógico esquerdo | Mover personagem / navegar nos menus |
| Analógico direito | Mirar e mover o cursor virtual |
| **R2 / ✕ / ○ / □ / △** | Atacar / interagir / esquivar / capturar / inventário |
| **L1 / R1** | Selecionar arma 1 / arma 2 |
| **Create / Options** | Alternar mapa / menu e voltar |

O layout do controle, a zona morta, velocidade do cursor, eixo vertical e
vibração podem ser alterados em **Opções → Controle**.

## O que está no jogo hoje

**Versão:** `v0.5.0` — ver [CHANGELOG.md](CHANGELOG.md) e [ROADMAP.md](docs/ROADMAP.md).

| Sistema | Estado |
|---------|--------|
| **3 biomas** | Floresta Fúngica, Caverna de Cristal, Pântano Termal — desbloqueio em cadeia |
| **Masmorra procedural** | 8–11 salas, 6 tipos (combate, tesouro, evento, descanso, mercador, chefe) |
| **Boss fights** | Arena, portão + chave, intro, 3 mecânicas de chefe, hazards por bioma |
| **Minimapa** | Canto superior direito; salas exploradas, portal em verde |
| **Combate** | 3 armas craftáveis, projéteis, esquiva (R), stamina, mira de alcance |
| **Captura** | Orbe de Vínculo (Q); taxa sobe conforme HP cai |
| **Party** | 1 companheiro com IA na masmorra |
| **Base escavável** | Grid, escavação, construir estações (rotação com R), portal/escada movíveis |
| **Habitat** | Cercados; criaturas vagam; produção passiva ao dormir |
| **Ciclo dia** | 1 masmorra/dia; dormir na cama ou fechar loja avança o dia |
| **Loja** | Tileset visual, clientes animados, 5 níveis, reputação 1–3, painel bolsa recolhível |
| **Tutorial Mira** | Novo jogo: masmorra → habitat → vender → comprar orbes |
| **Mercador de orbes** | Na base: ×1 por 25 ouro, ×3 por 70 ouro |
| **Save** | localStorage v7+ entre sessões |
| **Deploy** | GitHub Actions → GitHub Pages |

## Conteúdo MVP (meta do GDD)

| Categoria | Meta | No build atual |
|-----------|------|----------------|
| Biomas | 3 | **3** |
| Monstros capturáveis | 18 | **9** (+ 3 chefes) |
| Itens de loot | 30 | **17** |
| Receitas | 20 | **2** |
| Upgrades de loja | 5 níveis | **5** |
| Estruturas de base | 8 | Baú, bancada, cama, cercado (+ escavação) |
| Arquétipos de cliente | 6 | **6** (sprites animados) |
| Reputação loja | 3 níveis | **3** |

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
6. Na base, coloque criaturas da bolsa no **cercado** (construir ou modal)
7. **[E] na cama** para dormir — avança o dia e coleta produção do habitat (só após voltar da masmorra)
8. **Abrir Loja** — itens nas prateleiras/gaiola, ajuste preço, **Abrir loja ao público** (também avança o dia ao fechar)

## Documentação de design

| Arquivo | Conteúdo |
|---------|----------|
| [docs/GDD.md](docs/GDD.md) | Documento mestre — sistemas, números, fluxos |
| [docs/GDD.md#0-estado-da-implementação-build-atual](docs/GDD.md#0-estado-da-implementação-build-atual) | O que já existe vs. plano |
| [docs/art-bible.md](docs/art-bible.md) | Perspectiva 2.5D, pipeline visual, paletas |
| [docs/UX-UI.md](docs/UX-UI.md) | Wireframes, HUD, fluxos de tela |
| [docs/PLAYTEST.md](docs/PLAYTEST.md) | Roteiro de playtest 10 min (Fase 1) |
| [CHANGELOG.md](CHANGELOG.md) | Histórico de versões |

## Referências (não clones)

- **Moonlighter** — loop dia/noite, loja com precificação
- **Core Keeper** — base subterrânea, craft adjacente a baús
- **Stardew Valley** — perspectiva oblíqua cozy, ciclo diário
- **Pokémon / Nexomon** — captura, party, tipos elementais

## Status

**Fase 2 em progresso (~75%).** Vertical slice publicado; core loop com 3 biomas, base escavável, tutorial Mira completo, loja visual e pass de arte v2. Ver [ROADMAP](docs/ROADMAP.md).

---

*LochéSystem — [lochesystem.github.io/snaredusk](https://lochesystem.github.io/snaredusk)*
