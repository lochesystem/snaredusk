# Changelog

Formato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/).

## [Unreleased]

### Adicionado

- **Bestiário simplificado:** 18 fichas em abas por bioma, silhuetas para
  criaturas não registradas, sprites e dados de combate, drops, produção,
  disponibilidade como companheiro e progresso por bioma/total
- Acesso ao Bestiário pela barra da base e pelo Inventário; chefes são
  registrados automaticamente ao serem derrotados
- Testes do Bestiário; suíte atualizada para **297 testes em 63 arquivos**
- **Fundação das expedições:** `ActiveExpedition` com bioma, seed, andar, fase,
  perks, ofertas, elites derrotadas e checkpoint de HP, stamina e bolsa
- Save v10 com retomada determinística pelo Continue e migração segura de saves
  v1–v9; fechar no meio de uma sala retorna ao começo do mesmo andar
- Ciclo de vida separado para extração, morte, abandono e vitória, sempre
  limpando perks e andamento antes de salvar o retorno à base
- Testes de expedição e smoke test no Chrome para retomada/abandono
- **Vertical slice estrutural da Floresta:** três andares procedurais compactos
  sem chefe e quarta etapa com arena isolada do Rei das Esporas
- Quantidade crescente por estágio: 5–6/6–7/7–8 salas e
  5–7/7–10/9–12 inimigos, validada em 100 seeds por andar
- **Recompensa entre andares:** ao usar a passagem, o jogador pode extrair toda
  a bolsa para a base ou escolher uma entre três bênçãos para prosseguir
- Sete perks funcionais no primeiro lote, com ofertas determinísticas e sem
  repetição: dano, recarga, defesa, cura, movimento e dois bônus de companheiro
- Prosseguir recupera 5% do HP máximo e toda a stamina; Segundo Fôlego acrescenta
  outros 5% de cura, e a escolha fica persistida no checkpoint
- O mercador da expedição vende um Elixir do Caminhante por encontro: cura
  aleatória de 5–10% e preço dinâmico de 20–40% do ouro atual, sempre acima das
  opções de Orbe
- Ao limpar um andar, o portal surge no centro de uma sala de combate aleatória
  sem evento, baú ou perigo; um anúncio próprio informa o despertar e a sala
  passa a ser marcada em ciano no minimapa
- Baús abertos permanecem visíveis por um segundo e desaparecem com uma
  transição curta, reduzindo a poluição visual das salas já exploradas
- Curva inicial de HP, ataque e velocidade aplicada por andar; Cristal, Termal
  e tutorial preservam o fluxo anterior
- Testes da geração, perks, cura do mercador e ciclo visual dos baús; suíte
  atualizada para **319 testes em 68 arquivos**
- **Elites de encerramento dos andares:** uma espécie diferente por piso
  desperta na sala marcada após a derrota dos inimigos comuns, com escala,
  aura, barra dourada, título e anúncio próprios
- Três afixos funcionais para elites: Implacável acelera ataques e movimento,
  Tempestade dispara rajadas em leque e Bastião recebe defesa e escudo
- **Planejamento de expedições roguelite:** especificação de três andares,
  elites, perks temporários, extração, arenas de chefe e implementação em sete
  etapas, começando pelo Bestiário simplificado
- **Economia de 10 ciclos:** simulação determinística dos perfis conservador, normal e eficiente usando loja, craft, orbes, reputação e upgrades reais
- **Suíte completa de save:** round-trip do estado, migrações v1–v9, `localStorage`, JSON inválido e normalização de dados corrompidos
- Testes: `economy.test.ts` e `save.test.ts`

### Corrigido

- Mira, efeitos e ataques usam o centro visual do corpo como origem, em vez da
  âncora dos pés do personagem
- Saves com ouro/HP/stamina/dia fora dos limites são normalizados sem perder o restante do progresso
- Armas, capuzes, biomas, tutorial, bolsa e layout da base inválidos recebem fallbacks seguros
- Saves antigos sem campos do tutorial continuam pulando o tutorial, como antes
- Expedições corrompidas são descartadas isoladamente sem invalidar ouro,
  inventário, base ou demais dados do save

## [0.5.0] — 2026-07-23

Pass de arte v2, loja visual, tutorial completo (Mira) e polish de UI.

### Adicionado

- **Tutorial com Mira (PR2):** após a primeira masmorra — cercado, colocar criatura, vender na loja, comprar orbes; tutorial conclui ao comprar orbes
- **Reputação da loja (níveis 1–3):** ouro vendido acumulado; nível 2 = +1 prateleira; nível 3 = peso do arquétipo colecionador dobrado
- **Sprites v2 do jogador:** idle/walk e animações de ataque por arma (faca, picareta, lança esporo)
- **Base tileset v2:** variantes de chão/rocha, FX de escavação, sprites das estações (v3) com footprints maiores
- **Landmarks movíveis:** portal da masmorra e escada da loja reposicionáveis no grid
- **Rotação de estações** na construção (tecla R)
- **Tela de título** redesenhada com arte de fundo e atmosfera
- **Layout fullscreen** unificado na masmorra (igual base e loja)
- **Loja visual:** tileset, props, tábuas no chão, HUD em overlay sobre o canvas
- **Clientes animados** (spritesheet) e fila de atendimento mais natural
- **Painel da bolsa recolhível** na tela da loja; alinhamento das gaiolas
- **Arte biomas Cristal e Termal:** tilesets, props e sprites de criaturas (v1+)
- **Hitboxes de inimigos** por espécie (`enemyHitboxes.ts`)
- Testes: `reputation`, `tutorial`, `aimReticle`, `enemyHitboxes`, `tileRenderer`, `musicManager`

### Corrigido

- Tutorial: matar o esporo agora leva a criatura para a bolsa; save travado recebe esporo ao retomar
- Tutorial: overlay da Mira não bloqueia mais a hotbar de construção (pass-through nos passos de ação)
- Tutorial: cercado desmarca ao avançar ou abrir loja; [E] na loja com bolsa selecionada retira item da gaiola
- Tutorial: balão da Mira com fundo mais transparente para ver estantes
- **anchorY** dos sprites de Cristal e Termal

## [0.4.0] — 2026-07-18

Base escavável, ciclo dia/noite e produção do habitat.

### Adicionado

- **Ciclo dia/noite (MVP):** `dayNumber`, cama fixa na base, dormir ou fechar a loja avança o dia
- **Produção passiva do habitat:** yield fixo por espécie (9 capturáveis); loot vai para a bolsa ao fim do dia
- **Base escavável:** grid, escavação com stamina, modo Construir, baús e bancada com craft adjacente
- Novos ingredientes: Pó bioluminescente, Condensado
- Regra diária: **1 masmorra por dia**; cama só após voltar da expedição (anti-farm)
- Save v6+ (`dayNumber`, flags de masmorra/dia)
- Testes: `habitatProduction`, `dayCycle`, `baseDig`, `baseBuild`, `adjacentCraft`

### Adicionado (v0.3.x, resumo)

- v0.3.1–v0.3.6: inventário grid, party (1 slot), hotbar de armas, 3 biomas + chefes, hazards, boss arena, chave da arena, SFX Web Audio, boss HUD 2 fases
- Tutorial Mira MVP (masmorra scriptada + captura Q)
- Mira de combate (retículo + alcance da arma)

## [0.3.0] — 2026-07-17

Sistema de combate variado com craft de armas.

### Adicionado

- 3 armas: Faca (inicial), Picareta de combate, Lança esporo (projétil)
- Oficina e Arsenal na base — craft com materiais da bolsa, equipar antes da masmorra
- Melee com arco direcional (mira com mouse)
- Projéteis do jogador e inimigos; esquiva com stamina (R)
- Lumimorcego ranged, Carapaça com escudo + DEF, Rei das Esporas com rajada
- Save v3 (armas, stamina, equipamento)
- Testes: combat, projectiles, craft, weaponAttack

## [0.2.1] — 2026-07-16

Tipos de sala na masmorra procedural.

### Adicionado

- 8–11 salas por run com tipos: combate, tesouro, evento, descanso, mercador (≥9 salas), chefe
- Chefe **Rei das Esporas** na sala final; portal só ativa após derrotar inimigos
- Interações na masmorra: fogueira (+25% HP), altar com escolhas (1/2), mercador ambulante
- Tint de sala, sprites de interactables e minimapa por tipo
- Testes: tipos obrigatórios, boss spawn, interactables

## [0.2.0] — 2026-07-16

Início da **Fase 2** — sistema de loja expandido.

### Adicionado

- [docs/PLAYTEST.md](docs/PLAYTEST.md) — roteiro de playtest interno (10 min)
- 4 faixas de preço GDD: barganha, perfeito, caro, recusa
- 6 arquétipos de cliente na simulação de dia de loja
- 5 níveis de upgrade de loja (6→24 prateleiras, 1→6 gaiolas)
- Múltiplas gaiolas vivas; botão **Melhorar loja** na tela da loja
- Save v2 com migração automática de saves v1
- Loja visual navegável (PixiJS): andar pela loja, expor itens, clientes animados
- Testes: `customers`, `shopUpgrade`, `shopDay`, `shopLayout`

### Corrigido

- Pedras e obstáculos não spawnam mais sobre o portal da masmorra

## [0.1.0] — 2026-07-16

Primeiro vertical slice jogável, publicado em [GitHub Pages](https://lochesystem.github.io/snaredusk/).

### Adicionado

- Engine base: PixiJS 8, câmera oblíqua, Y-sort, input WASD + mouse
- Masmorra procedural (7–9 salas, grafo N/S/E/W) com validação de layout
- Decor (cogumelos), obstáculos (rochas com colisão, buracos)
- Baús de tesouro raros (~28%, máx. 2 por run)
- Minimapa estilo Isaac (salas exploradas, portal destacado)
- Combate melee, 3 espécies capturáveis
- Sistema de captura com Orbe de Vínculo (tecla Q)
- Loja com prateleiras, gaiola e precificação por reação
- Habitat visual na base (até 4 criaturas vagando)
- Mercador de orbes na base (25g ×1, 70g ×3)
- Save/load via localStorage
- Testes Vitest: captura, precificação, masmorra, habitat, orbShop
- CI e deploy automático (GitHub Actions → GitHub Pages)

### Corrigido

- Movimento em áreas void fora do chão walkable
- Freeze ao sair e reentrar na masmorra
- Câmera com coordenadas negativas após geração
- Spawn bloqueado por rocha em algumas seeds
