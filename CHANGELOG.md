# Changelog

Formato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/).

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
