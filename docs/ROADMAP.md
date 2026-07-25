# Roadmap — Snaredusk

Fases de produção do GDD ao release jogável. Cada fase tem entregáveis, critérios de done e dependências.

---

## Visão geral

```mermaid
flowchart LR
  f0["Fase 0 GDD\nconcluída"] --> f1["Fase 1 Slice\nconcluída"]
  f1 --> f2["Fase 2 Core\n~92%"]
  f2 --> f25["Fase 2.5 Expedições\nem progresso"]
  f25 --> f3["Fase 3 Polish\n~72%"]
  f3 --> f4["Fase 4 Release\nparcial"]
```

**Versão pública:** `v0.5.0` — [jogo público](https://lochesystem.github.io/snaredusk/)

**Build local:** pós-`v0.5.0`, candidato à próxima release.

**Próximo marco:** balancear o vertical slice roguelite da Floresta antes de
replicar a estrutura para Cristal e Termal.

---

## Progresso por fase

| Fase | Status | Notas |
|------|--------|-------|
| 0 — GDD | 100% | Documentação completa |
| 1 — Vertical slice | 100% | Playtest 10/10 (2026-07-17) |
| 2 — Core loop | **~92%** | Economia, saves e Bestiário simplificado concluídos |
| 2.5 — Expedições roguelite | **Em progresso** | Vertical slice da Floresta concluído; próximo: balanceamento |
| 3 — Polish | **~72%** | Sprites v2+, skins, UI customizada, fog of war e ambientação dos três biomas |
| 4 — Release | ~55% | Deploy + save ok; tutorial fluxo completo; polish visual em andamento |

---

## Fase 0 — GDD (concluída)

### Entregáveis

- [x] [README.md](../README.md) — pitch, controles, visão
- [x] [docs/GDD.md](GDD.md) — sistemas, números, catálogo
- [x] [docs/art-bible.md](art-bible.md) — perspectiva, pipeline visual
- [x] [docs/wall-tiles.md](wall-tiles.md) — pipeline técnico de paredes de masmorra
- [x] [docs/UX-UI.md](UX-UI.md) — wireframes, HUD, fluxos
- [x] [docs/ROADMAP.md](ROADMAP.md) — este documento

---

## Fase 1 — Vertical slice (concluída)

**Playtest:** 10/10 em 2026-07-17 — loop completo validado ([PLAYTEST.md](PLAYTEST.md)).

### Entregáveis

| Item | Status |
|------|--------|
| Projeto Vite + TS + PixiJS | Feito |
| Engine base (câmera, Y-sort, WASD + mouse) | Feito |
| 1 bioma — Floresta Fúngica | Feito |
| Masmorra procedural (grafo N/S/E/W) | Feito |
| Decor, obstáculos, baús, minimapa | Feito |
| Jogador (movimento, melee, HP) | Feito |
| 3 criaturas capturáveis | Feito |
| Captura (orbe, taxa por HP) | Feito |
| Loja básica + habitat + mercador de orbes | Feito |
| Save localStorage + deploy GitHub Pages | Feito |

---

## Fase 2 — Core loop completo (em progresso)

**Objetivo:** MVP jogável com todos os sistemas principais.

**Iniciado:** 2026-07-16 · **Última entrega:** `v0.5.0` (2026-07-23)

### Releases

| Versão | Data | Conteúdo principal |
|--------|------|-------------------|
| v0.3.2 | 2026-07-17 | Inventário grid, party (1 slot), hotbar de armas, desistir da masmorra (Esc) |
| v0.3.3–v0.3.6 | 2026-07-17 | 3 biomas + chefes, hazards, boss arena, chave, SFX, boss HUD 2 fases |
| v0.4.0 | 2026-07-18 | Base escavável, ciclo dia/noite, produção habitat |
| v0.4.1 | 2026-07-19 | Tutorial Mira MVP, mira de combate, reputação loja (níveis 1–3) |
| **v0.5.0** | **2026-07-23** | Tutorial PR2 (habitat/loja/orbes), sprites v2, loja visual, título redesenhado, rotação de estações, hitboxes |

### Entregáveis

| Sistema | Escopo GDD | Status | Notas |
|---------|------------|--------|-------|
| **3 biomas** | Floresta, Cristal, Termal + chefes | **Feito** | Desbloqueio em cadeia; tilesets v2 nos 3 biomas |
| **Boss fights** | Chefes únicos, arena, progressão | **Feito** | Arena, portão + chave, intro, 3 mecânicas, minions |
| **Hazards de bioma** | Esporos, gelo, veneno | **Feito** | Vinheta, inércia, poças de veneno |
| **Procedural** | 8–11 salas, 6 tipos de sala | **Feito** | Combate, tesouro, evento, descanso, mercador, chefe |
| **Combate variado** | Armas, projéteis, escudos, esquiva | **Forte** | Hotbar 1/2, stamina, Shift dash, 6 armas, mira de alcance |
| **Bolsa / inventário** | 12 slots + gestão | **Feito** | Pilhas, transferência unitária/tudo/quantidade, descarte, modal e aba Especiais |
| **Chave da arena** | Limpar fase → portão do chefe | **Feito** | Mata/captura todos → chave; some ao voltar à base |
| **Portal pós-chefe** | Só após baú épico | **Feito** | Não exige limpar masmorra inteira |
| **Loja** | 5 níveis, clientes, faixas | **Forte** | Tileset + props, clientes animados, reputação, painel bolsa recolhível |
| **Craft / oficina** | 20 receitas | **Feito (conteúdo MVP)** | **23 receitas**, construções consumíveis, orbes, materiais, armas e capuzes; armazenamento integrado |
| **Companheiro** | 1 companheiro ativo | **Feito (MVP)** | Escopo fechado em 1 slot para preservar clareza da ação; IA de idle, seguir e atacar |
| **Bestiário** | UI + bônus família | **Feito (MVP)** | 18 fichas, silhuetas, dados, progresso por bioma e registro de chefes |
| **Criaturas** | 18 espécies | **Feito** | **18/18** (5 capturáveis + chefe por bioma); sprites v1+ nos 3 biomas |
| **Loot** | 30 itens | **Feito** | **30/30** em `LOOT_TABLE` |
| **Receitas** | 20 receitas | **Feito** | **23/20** |
| **Ciclo dia/noite** | Dormir, loja, entardecer | **Parcial (MVP)** | Cama + `dayNumber`; 1 masmorra/dia; dormir após voltar ou fechar loja |
| **Sentinelas** | 1 por bioma, passivos | **Pós-release** | Fora do escopo atual; mantém 1 companheiro e combate limpo |
| **Base escavável** | Grid, escavação, baús, craft integrado | **Feito (v0.4)** | Tileset v2, estações v3, landmarks movíveis, rotação (R) |
| **Produção habitat** | Recursos passivos | **Parcial (MVP)** | Yield fixo por espécie; humor/fome depois |
| **Popularidade / reputação** | Níveis 1–3 | **Feito (MVP)** | Ouro vendido; +1 prateleira (nív. 2); colecionador (nív. 3) |
| **Tutorial** | 15 min com Mira | **Feito (fluxo)** | Masmorra → habitat → loja → orbes; skippável; fixes anti-softlock |

### Critérios de done

- [ ] 8–12 horas de conteúdo jogável (estimativa atual: ~4–6 h)
- [x] Todos os chefes derrotáveis com progressão de equipamento
- [x] Economia sem inflação em 10 ciclos dia/noite (3 perfis determinísticos)
- [x] Habitat produz recursos (MVP: yield fixo ao dormir/fechar loja)
- [x] Reputação nível 1–3 alcançável
- [x] Tutorial completo sem softlocks conhecidos (validação contínua em playtest)
- [x] Suite Vitest abrangente (**326 testes**, 68 arquivos)

### Testes automatizados (Vitest) — estado atual

```
tests/
  biomes.test.ts           # biomas, desbloqueio, spawns
  bossMechanics.test.ts      # entrada na arena, portão
  dungeon.test.ts            # geração, walkability, sala boss
  tutorial.test.ts           # fluxo Mira, reputação, habitat
  reputation.test.ts         # níveis 1–3 da loja
  aimReticle.test.ts         # mira de combate
  enemyHitboxes.test.ts      # hitboxes por espécie
  tileRenderer.test.ts       # render de tiles
  shopDay.test.ts            # simulação de dia de loja
  baseBuild.test.ts          # colocação, rotação de estações
  habitatProduction.test.ts  # yield passivo
  dayCycle.test.ts           # endDay, flags masmorra/dia
  economy.test.ts            # 10 ciclos, 3 perfis, orbes/craft/reputação/upgrades
  save.test.ts               # round-trip v10, migração v1–v9, corrupção e localStorage
  expedition.test.ts         # checkpoint, seed, perks e caminhos de encerramento
  expeditionDungeon.test.ts  # 100 seeds/andar, limites, ausência de boss e arena
  … (+ combat, craft, customers, etc.)
```

---

## Fase 2.5 — Expedições roguelite (em progresso)

**Objetivo:** ampliar duração, risco e variedade das runs sem substituir o loop de
base, loja e craft.

Especificação completa: [EXPEDICOES-ROGUELITE.md](EXPEDICOES-ROGUELITE.md).

### Marcos

| Etapa | Entrega | Status |
|-------|---------|--------|
| 1 | Bestiário simplificado | **Feita** |
| 2 | Estado, save e retomada de expedição | **Feita** |
| 3 | Floresta: 3 andares, elites, perks e arena | **Feita** |
| 4 | Balanceamento do vertical slice | **Próxima** |
| 5 | Cristal e Termal | Planejada |
| 6 | Drops de elite e longevidade | Planejada |
| 7 | QA completo e release | Planejada |

### Critérios de done

- [ ] Três andares compactos por bioma e uma arena final. *(Floresta pronta)*
- [x] Extração segura após cada elite. *(portal e recompensa liberados ao limpar o andar)*
- [x] Três escolhas de perk sem repetição. *(pool completo com 12 perks funcionais)*
- [x] Elites existentes com afixos legíveis. *(Implacável, Tempestade e Bastião)*
- [x] Continue retoma a mesma seed e o mesmo andar.
- [x] Chave do próximo bioma vem apenas do baú épico do chefe.
- [ ] Expedição completa dura aproximadamente 25–40 minutos.
- [ ] Novo jogo → três chefes sem softlocks.

---

## Fase 3 — Polish (2–3 semanas)

**Objetivo:** elevar qualidade visual e sonora ao nível da art bible.

### Entregáveis

| Área | Escopo | Status |
|------|--------|--------|
| **Arte jogador** | Sprites pintados + animações de ataque | **Forte** | Modelo v7 + 3 capuzes temáticos em idle/walk/ataques |
| **Arte base** | Tileset + estações + FX escavação | **Parcial** | tileset v2, estações v3, landmarks v3 |
| **Arte loja** | Tileset, props, clientes | **Parcial** | Tileset v1, clientes animados, tábuas no chão |
| **Arte biomas** | 3 biomas com criaturas e ambientação própria | **Forte** | Tilesets v2+, props orgânicos, criaturas/chefes e interactables animados |
| **Tileset masmorra** | Paredes alinhadas (faixas 14 px) | Parcial (Floresta OK) |
| **Tela de título** | Arte + atmosfera | **Feito** | Background v2 |
| **Layout UI** | Fullscreen base/masmorra/loja | **Feito** | HUD overlay na loja |
| **Normal maps** | Jogador + props + criaturas | Pendente |
| **Iluminação** | Point lights por sala | Pendente |
| **Parallax** | 4 camadas por bioma | Pendente |
| **SFX / Música** | Web Audio + placeholders | **Parcial** | SFX combate/UI; música por bioma |
| **Boss HUD + fases** | Barra topo + 50% HP | **Feito** |
| **UI** | Painéis, inventário, craft e animações | **Forte** | Padrão minimalista e fechamento por ×; revisão final responsiva pendente |

---

## Fase 4 — Release (parcial)

| Item | Status |
|------|--------|
| URL pública ([GitHub Pages](https://lochesystem.github.io/snaredusk/)) | Feito |
| CI/CD GitHub Actions | Feito |
| Save persiste entre sessões | Feito |
| CHANGELOG.md | Feito |
| Tutorial para novo jogador | **Feito (fluxo)** — Mira guia masmorra → habitat → loja → orbes |
| Open Graph / GIF no README | Pendente |
| Console limpo (Chrome + Firefox) | Pendente |

---

## Fase 5 — Pós-release (backlog)

| Feature | Prioridade |
|---------|------------|
| Bioma 4 + chefe final ("Câmara do Véu") | Média |
| New Game+ | Baixa |
| Mais receitas (50+) | Baixa |
| APK Android | Fora de escopo |

---

## Próximas ações (prioridade)

1. ~~**Ciclo dia/noite jogável**~~ — MVP feito
2. ~~**Tutorial com Mira**~~ — fluxo completo (masmorra + habitat + loja + orbes)
3. ~~**Reputação na loja**~~ — níveis 1–3
4. ~~**Conteúdo**~~ — +6 criaturas, +13 loots, +18 receitas
5. ~~**Companheiro único**~~ — escopo fechado; IA e animações próprias
6. ~~**Ambientação inicial dos biomas**~~ — props orgânicos e colisões por tipo
7. ~~**Economia de 10 ciclos**~~ — conservador, normal e eficiente
8. ~~**Suíte completa de save**~~ — migrações, corrupção, round-trip e localStorage
9. ~~**Bestiário UI simplificado**~~ — 18 fichas e progresso por bioma
10. ~~**Fundação da expedição**~~ — estado, save, extração e retomada
11. ~~**Vertical slice da Floresta**~~ — 3 andares, elites, perks e arena
12. **Balancear e replicar** — Cristal e Termal somente após validar a Floresta
13. **Playtest completo** — novo jogo → três expedições → craft temático
14. **Polish final** — áudio, responsividade e consistência visual

---

## Riscos ativos

| Risco | Mitigação |
|-------|-----------|
| Três andares virarem repetição, não longevidade | Validar Floresta antes de replicar e ligar reruns a Bestiário/receitas/drops |
| Expedição ficar longa demais | Andares de 5–8 salas e meta total de 25–40 min |
| Save quebrar entre andares | Checkpoint só em transições, seed fixa e migração coberta por testes |
| Build público atrás do local | Agrupar mudanças em uma próxima release testável |
| Arte residual ainda usa fallback seguro | Remover apenas após auditoria visual dos três biomas |

---

*Roadmap v0.11 — revisado 2026-07-24 (vertical slice da Floresta concluído;
próxima etapa é o balanceamento).*
