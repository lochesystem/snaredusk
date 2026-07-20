# Playtest interno — Fase 1 (10 min)

Roteiro para validar o vertical slice antes de fechar a Fase 1. Marque cada item durante ou logo após jogar.

**Onde jogar:** [lochesystem.github.io/snaredusk/](https://lochesystem.github.io/snaredusk/) ou `npm run dev` → URL do Vite (ex. http://localhost:5176/snaredusk/)

**No Cursor:** `Ctrl+Shift+P` → **Simple Browser: Show** → colar a URL local acima.

**Smoke automático (DOM):** `node scripts/playtest-smoke.mjs http://localhost:5176/snaredusk/`

**Tempo alvo:** 10–15 minutos  
**Anote:** bugs, confusão, tédio, momentos divertidos, sugestões de balance.

---

## Pré-check (automático)

Antes do playtest manual, o CI/local deve passar:

```bash
npm test
npm run build
```

---

## Roteiro (siga na ordem)

### 1. Título e save (1 min)

| # | Ação | OK? | Notas |
|---|------|-----|-------|
| 1.1 | Clicar **Novo Jogo** | ☐ | |
| 1.2 | Ver hub **Brumavale** (canvas + barra inferior: ouro, orbes, stamina) | ☐ | |
| 1.3 | **F5** na página → **Continuar** restaura o save | ☐ | |

### 2. Base escavável (2 min)

| # | Ação | OK? | Notas |
|---|------|-----|-------|
| 2.0 | **WASD** na base: chão/rocha/parede usam **tiles 32×32** (se `public/assets/base/tileset.json` existir) | ☐ | |
| 2.2 | **[E]** em rocha adjacente escava (gasta stamina) | ☐ | |
| 2.3 | **Construir** → colocar baú e bancada lado a lado | ☐ | |
| 2.4 | Depositar loot no **baú** ([E] no baú) | ☐ | |
| 2.5 | **[E]** na **bancada** → craft com materiais do baú adjacente | ☐ | |
| 2.6 | **Orbes** na barra → comprar orbes | ☐ | |
| 2.7 | **Bolsa** → colocar criatura no habitat | ☐ | |
| 2.9 | **[E] na cama** → dormir só após voltar da masmorra; dia avança, loot na bolsa | ☐ | |
| 2.10 | Barra da base mostra **Dia N**; loja reabre no dia seguinte | ☐ | |
| 2.11 | Portal bloqueado após 1 ida à masmorra no mesmo dia | ☐ | |
| 2.8 | Clicar criatura no mapa → volta à bolsa | ☐ | |

### 3. Masmorra — exploração (4 min)

| # | Ação | OK? | Notas |
|---|------|-----|-------|
| 3.0 | Masmorra usa **tileset do bioma** (chão/parede repetidos; props como sprites) | ☐ | |
| 3.0a | **Paredes:** borda clara alinhada nas 4 quinas externas da sala | ☐ | Ver [wall-tiles.md](wall-tiles.md) |
| 3.0b | **Paredes:** esquerda/direita e norte/sul com highlight simétrico (sem “borda no meio”) | ☐ | |
| 3.0c | **Portas:** ombreiras sem buraco grosso de void (junção T pode ficar imperfeita — OK no MVP) | ☐ | |
| 3.1 | **Entrar na Masmorra**; layout diferente a cada run? | ☐ | |
| 3.2 | **Minimapa** atualiza ao entrar em salas novas | ☐ | |
| 3.3 | Câmera segue o jogador; sem andar no void | ☐ | |
| 3.4 | Abrir um **baú** com **E** (se encontrar) | ☐ | |
| 3.5 | Combater com clique; inimigos reagem | ☐ | |
| 3.6 | Capturar com **Q** pelo menos 1 criatura | ☐ | |
| 3.7 | Portal só ativa após limpar inimigos; sair com **E** | ☐ | |

### 4. Habitat (30 s)

| # | Ação | OK? | Notas |
|---|------|-----|-------|
| 4.1 | Criaturas no **cercado** (se colocado) ou perto do spawn vagam | ☐ | |
| 4.2 | Modal do cercado mostra **+X loot/dia** por criatura | ☐ | |
| 4.3 | Após dormir, toast resume produção do habitat | ☐ | |

### 5. Loja (2 min)

| # | Ação | OK? | Notas |
|---|------|-----|-------|
| 5.1 | **Abrir Loja**; colocar loot/criatura nas prateleiras/gaiola | ☐ | |
| 5.2 | Ajustar preço (**sem** dica caro/barato — reação só pelos clientes) | ☐ | |
| 5.3 | **Abrir loja ao público**; clientes com emoji na loja | ☐ | |
| 5.4 | Ouro sobe após vendas | ☐ | |
| 5.5 | Tentar abrir loja de novo no mesmo dia → deve bloquear | ☐ | |

### 5b. Combate e craft (v0.3 — 2 min)

| # | Ação | OK? | Notas |
|---|------|-----|-------|
| 5b.1 | Craftar arma na **bancada** (materiais no baú adjacente) | ☐ | |
| 5b.2 | Equipar no modal da **bancada** | ☐ | |
| 5b.3 | **Esquiva** com R; barra **STA** no HUD desce e regenera | ☐ | |

### 5c. Chefe — HUD, fases e SFX (2 min)

| # | Ação | OK? | Notas |
|---|------|-----|-------|
| 5c.1 | Ao iniciar luta do chefe, **barra grande no topo** com nome | ☐ | |
| 5c.2 | Barra tem **duas fases visuais** (verde → vermelho na metade) | ☐ | |
| 5c.3 | A **50% HP** toast "Fase 2!", pulso na barra, chefe mais agressivo | ☐ | |
| 5c.4 | Golpes do chefe mostram **auras/VFX** (windup, charge, heat wave) | ☐ | |
| 5c.5 | **SFX** audíveis: ataque, hit, dodge, baú, portão, captura, fase 2 | ☐ | Som após Novo Jogo/Continuar |

### 6. Tutorial com Mira — MVP (3 min)

**Pré-requisito:** **Novo Jogo** (save limpo ou apagar save local).

| # | Ação | OK? | Notas |
|---|------|-----|-------|
| 6.1 | Ao iniciar, overlay da **Mira** com boas-vindas | ☐ | |
| 6.2 | **Continuar** → hint no portal; loja/cama bloqueados | ☐ | |
| 6.3 | **[E]** no portal → modal Destino → entrar na masmorra | ☐ | Layout de **1 sala** (tutorial) |
| 6.4 | Diálogo WASD; atacar esporo com **clique** | ☐ | |
| 6.5 | **Q** para captura; highlight na tecla Q no HUD | ☐ | |
| 6.6 | Portal de saída após captura ou derrota; **[E]** volta à base | ☐ | |
| 6.7 | Diálogo final da Mira; **Continuar** encerra tutorial | ☐ | |
| 6.8 | **Pular tutorial** em qualquer passo → toast e jogo livre | ☐ | |
| 6.9 | **Continuar** após tutorial parcial salva progresso do passo | ☐ | F5 + Continuar |

### 7. Loop completo (1 min)

| # | Ação | OK? | Notas |
|---|------|-----|-------|
| 7.1 | Reentrar na masmorra **sem travar** | ☐ | |
| 7.2 | Segunda run: bolsa, habitat e ouro persistem | ☐ | |

---

## Critérios de sucesso (Fase 1)

- [ ] Loop masmorra (1×/dia) → captura → portal → dormir → habitat/loja completado sem softlock
- [ ] Nenhum bug bloqueante (freeze, void, spawn preso)
- [ ] Controles compreensíveis sem ler o README
- [ ] Sensação geral ≥ **7/10** (anotar nota: ___/10)

## Perguntas pós-playtest

1. O que foi mais divertido?
2. O que foi confuso ou frustrante?
3. A precificação na loja parece um jogo ou só clique?
4. A masmorra procedural enjoou ou variou o suficiente em 2 runs?
5. O que você mudaria primeiro no balance?

---

## Resultado desta sessão

| Campo | Valor |
|-------|-------|
| Data | 2026-07-17 |
| Jogador | Adrian |
| Build | v0.3.1 local |
| Smoke automático | 19/19 OK (`scripts/playtest-smoke.mjs`) |
| Nota geral | **10/10** |
| Bugs encontrados | Nenhum |
| Aprovado Fase 1? | ☑ Sim ☐ Com ressalvas |

**Notas da sessão manual:** loop completo (masmorra → captura → habitat → loja → trava diária). Emojis dos clientes visíveis; precificação por tentativa funcionou; nenhum softlock. *Atualização:* ciclo dia com cama + 1 masmorra/dia — validar em playtest.*

*Após preencher, marcar playtest no [ROADMAP.md](ROADMAP.md) e registrar achados no [CHANGELOG.md](../CHANGELOG.md) se houver fixes.*
