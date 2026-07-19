# Catálogo de inimigos — Snaredusk

Referência gerada a partir dos dados implementados no código (`creatures.ts`, `enemyBehaviors.ts`, `items.ts`, `habitatYields.ts`, `biomes.ts`, `bossMechanics.ts`, `bossPhase.ts`).

**Última revisão:** alinhado ao commit com drop de Cogumelo comum no Esporo Dorminhoco e ciclo de dia só pela cama.

---

## Regras globais

### Combate

| Parâmetro | Valor |
|-----------|-------|
| Fórmula de dano | `max(1, round(ATK − DEF × 0,5))` |
| Aggro (comum) | 80 px, mesma sala |
| Aggro (chefe) | 108 px |
| Leash (perde aggro) | 128 px fora da sala ou distância |
| Escala visual do chefe | ×1,35 |
| Fase 2 do chefe | A ≤ 50% HP — enraivecido, modificadores por espécie |
| Escudo | Inimigos `shielded` e chefes começam com escudo; **não regenera** após quebrar |

### Captura

| Parâmetro | Valor |
|-----------|-------|
| Capturável | Todas as espécies listadas (`capturable: true`) |
| Taxa mínima (HP cheio) | 5% |
| Taxa máxima | 85% |
| Curva | Quanto menor o HP, maior a chance (quadrática) |
| Custo | 1 Orbe por tentativa |
| Ao capturar | Criatura vai para a bolsa + mesmo baú de loot da derrota |

### Baú de inimigo

- Aparece ao **derrotar** ou **capturar** o monstro.
- **Minions** invocados por chefes **não** deixam baú.
- Baú épico do chefe ativa o **portal** de retorno à base.

### Progressão de masmorra

1. Eliminar ou capturar todos os inimigos de fase → **Chave da Arena** (item especial da run).
2. Abrir portão → arena do chefe.
3. Derrotar chefe → baú épico + recompensas de progressão (chaves de bioma).

---

## Biomas

| ID | Nome | Hazard | Dano ambiental |
|----|------|--------|----------------|
| `floresta` | Floresta Fúngica | Esporos | 2 a cada 1,2 s |
| `cristal` | Caverna de Cristal | Gelo escorregadio | Sem dano (física de deslize) |
| `termal` | Pântano Termal | Veneno | 3 a cada 0,55 s |

### Loot de baús espalhados (pool por bioma)

| Bioma | Itens possíveis |
|-------|-----------------|
| Floresta | Cogumelo comum, Fibra de musgo, Esporo brilhante |
| Cristal | Fragmento de cristal, Quartzo bruto, Poeira prismática |
| Termal | Escama termal, Concha de vapor, Essência térmica |

- **Sala tesouro:** 1–2 baús do pool.
- **Salas de combate:** ~28% de chance de 1 baú extra (máx. 2 extras no andar).

---

# Floresta Fúngica

**Chefe:** Rei das Esporas (`rei_esporas`)  
**Inimigos do pool:** Esporo Dorminhoco, Lumimorcego, Carapaça de Musgo

---

## Esporo Dorminhoco

| Campo | Valor |
|-------|-------|
| ID | `esporo_dorminhoco` |
| Tipo | Comum · Natureza |
| HP | 30 |
| ATK | 4 |
| DEF | 0 |
| Velocidade | 45 |
| Valor (loja) | 45 ouro |
| Comportamento | `melee` |
| Alcance de ataque | 18 px |
| Cooldown de ataque | 1,1 s |
| Escudo | — |

**Descrição:** Bolinha fúngica sonolenta que rasteja pelo chão da floresta. O inimigo mais fraco e frequente do bioma — serve de alvo fácil para captura e farm de loot básico.

**Drop (baú):** Cogumelo comum ×2  
**Produção no habitat:** Fibra de musgo ×1/dia  
**Sentinela (GDD):** 10% dos inimigos comuns não agredem (planejado)

---

## Lumimorcego

| Campo | Valor |
|-------|-------|
| ID | `lumimorcego` |
| Tipo | Comum · Luz |
| HP | 40 |
| ATK | 6 |
| DEF | 2 |
| Velocidade | 70 |
| Valor (loja) | 65 ouro |
| Comportamento | `ranged` |
| Alcance de ataque | 140 px |
| Alcance preferido | 100 px |
| Cooldown de ataque | 2,0 s |
| Projétil | 150 px/s, dano = ATK × 1 |
| Escudo | — |

**Descrição:** Morcego bioluminescente que ataca à distância com esporos luminosos. Rápido e frágil — prioriza manter distância do jogador.

**Drop (baú):** Esporo brilhante ×1  
**Produção no habitat:** Pó bioluminescente ×2/dia  
**Sentinela (GDD):** Revela salas secretas no minimapa (planejado)

---

## Carapaça de Musgo

| Campo | Valor |
|-------|-------|
| ID | `carapaca_musgo` |
| Tipo | Incomum · Natureza |
| HP | 55 |
| ATK | 8 |
| DEF | 8 |
| Velocidade | 35 |
| Valor (loja) | 90 ouro |
| Comportamento | `shielded` |
| Alcance de ataque | 20 px |
| Cooldown de ataque | 1,4 s |
| Escudo | 30 HP |

**Descrição:** Tartaruga coberta de musgo vivo. Tanque do bioma — alta defesa e escudo que precisa ser quebrado antes do dano no HP.

**Drop (baú):** Núcleo fúngico ×1 + **8 ouro** bônus  
**Produção no habitat:** Fibra de musgo ×3/dia  
**Sentinela (GDD):** +15% DEF do jogador (planejado)

---

## Rei das Esporas *(chefe)*

| Campo | Valor |
|-------|-------|
| ID | `rei_esporas` |
| Tipo | Chefe · Natureza |
| HP | 120 |
| ATK | 12 |
| DEF | 6 |
| Velocidade | 38 |
| Valor (loja) | 200 ouro |
| Comportamento | `boss_spore` |
| Alcance de ataque | 150 px |
| Alcance preferido | 85 px |
| Cooldown de ataque | 2,2 s (×0,7 na fase 2) |
| Rajada | 4 projéteis (5 na fase 2) |
| Projétil | 120 px/s, dano = ATK × 0,8 |
| Escudo | 35 HP |
| Salto especial | A cada ~5 s (`leapInterval`) |

**Descrição:** Monarca dos fungos da floresta. Dispara rajadas de esporos, salta pela arena e invoca Esporos Dorminhocos como reforço.

**Mecânica exclusiva — Invocação:** a cada ~7 s (×0,85 CD na fase 2), invoca 1 Esporo Dorminhoco (fase 1) ou 2 (fase 2) ao redor do chefe. Minions **não** dropam baú.

**Fase 2 (≤ 50% HP):** ATK mais rápido, +10% velocidade, mais projéteis na rajada, invocações mais frequentes e em maior número.

**Drop (baú épico):** Coroa de Esporas ×1 + **35 ouro** bônus  
**Progressão:** Chave de Esporo na bolsa → desbloqueia **Caverna de Cristal**  
**Produção no habitat:** — (chefes não produzem)

---

# Caverna de Cristal

**Chefe:** Matriarca Prismática (`matriarca_prismatica`)  
**Desbloqueio:** Derrotar Rei das Esporas  
**Inimigos do pool:** Prismarin, Lumicascalho, Eco de Quartzo  
**Hazard:** Chão escorregadio (deslize com inércia)

---

## Prismarin

| Campo | Valor |
|-------|-------|
| ID | `prismarin` |
| Tipo | Comum · Luz |
| HP | 38 |
| ATK | 7 |
| DEF | 2 |
| Velocidade | 65 |
| Valor (loja) | 70 ouro |
| Comportamento | `ranged` |
| Alcance / CD / Projétil | Igual padrão `ranged` |

**Descrição:** Peixe de luz cristalina que dispara fragmentos prismáticos. Equivalente ao Lumimorcego no Cristal.

**Drop (baú):** Poeira prismática ×1  
**Produção no habitat:** Fragmento de cristal ×1/dia  
**Sentinela (GDD):** +20% ouro em baús (planejado)

---

## Lumicascalho

| Campo | Valor |
|-------|-------|
| ID | `lumicascalho` |
| Tipo | Comum · Neutro |
| HP | 42 |
| ATK | 5 |
| DEF | 3 |
| Velocidade | 50 |
| Valor (loja) | 55 ouro |
| Comportamento | `melee` |

**Descrição:** Cascalho animado que brilha no escuro. Inimigo corpo a corpo intermediário do bioma.

**Drop (baú):** Quartzo bruto ×2  
**Produção no habitat:** Quartzo bruto ×2/dia  
**Sentinela (GDD):** Ilumina salas sem tocha (planejado)

---

## Eco de Quartzo

| Campo | Valor |
|-------|-------|
| ID | `eco_quartzo` |
| Tipo | Incomum · Luz |
| HP | 50 |
| ATK | 9 |
| DEF | 6 |
| Velocidade | 40 |
| Valor (loja) | 95 ouro |
| Comportamento | `shielded` |
| Escudo | 30 HP |

**Descrição:** Entidade resonante de quartzo. Tanque do Cristal — também invocado como minion da Matriarca.

**Drop (baú):** Gema rachada ×1 + **10 ouro** bônus  
**Produção no habitat:** Gema rachada ×1/dia  
**Sentinela (GDD):** Reflete 10% do dano ao atacante (planejado)

---

## Matriarca Prismática *(chefe)*

| Campo | Valor |
|-------|-------|
| ID | `matriarca_prismatica` |
| Tipo | Chefe · Luz |
| HP | 140 |
| ATK | 14 |
| DEF | 8 |
| Velocidade | 42 |
| Valor (loja) | 240 ouro |
| Comportamento | `boss_prism` |
| Alcance de ataque | 170 px |
| Rajada | 3 projéteis |
| Projétil | 145 px/s, dano = ATK × 0,9 |
| Escudo | 45 HP |

**Descrição:** Rainha das cavernas de cristal. Combina rajadas prismáticas, estalactites telegrafadas e invocações na segunda fase.

**Mecânica — Estalactite:** a cada 3 s, marca a posição do jogador; após 0,85 s cai causando **14 de dano** em raio de 16 px e deixa rocha bloqueadora por 12 s.

**Mecânica — Invocação (fase 2):** até 2 Eco de Quartzo vivos; cooldown de summon 3 s.

**Fase 2 (≤ 50% HP):** ATK mais rápido, +15% velocidade, estalactites mais frequentes (CD ×0,65), **reflete dano** mesmo sem escudo.

**Drop (baú épico):** Coroa de Cristal ×1 + **45 ouro** bônus  
**Progressão:** Chave Prismática → desbloqueia **Pântano Termal**  
**Obstáculos:** Salas de combate e boss podem ter buracos (queda −10 HP)

---

# Pântano Termal

**Chefe:** Salamandra Anciã (`salamandra_ancia`)  
**Desbloqueio:** Derrotar Matriarca Prismática  
**Inimigos do pool:** Salamandra, Vaporoso, Caranguejo Termal  
**Hazard:** Veneno (3 dano / 0,55 s em áreas tóxicas)

---

## Salamandra

| Campo | Valor |
|-------|-------|
| ID | `salamandra` |
| Tipo | Comum · Fogo |
| HP | 36 |
| ATK | 8 |
| DEF | 2 |
| Velocidade | 58 |
| Valor (loja) | 60 ouro |
| Comportamento | `melee` |

**Descrição:** Anfíbio de poças quentes. Agressivo em combate corpo a corpo.

**Drop (baú):** Escama termal ×2  
**Produção no habitat:** Escama termal ×1/dia  
**Sentinela (GDD):** Imunidade a dano de lava/lodo (planejado)

---

## Vaporoso

| Campo | Valor |
|-------|-------|
| ID | `vaporoso` |
| Tipo | Comum · Água |
| HP | 32 |
| ATK | 6 |
| DEF | 1 |
| Velocidade | 72 |
| Valor (loja) | 50 ouro |
| Comportamento | `ranged` |

**Descrição:** Nuvem de vapor que flutua e ataca à distância. O mais rápido do bioma; também minion da Salamandra Anciã.

**Drop (baú):** Concha de vapor ×1  
**Produção no habitat:** Condensado ×2/dia  
**Sentinela (GDD):** +10% taxa de captura (planejado)

---

## Caranguejo Termal

| Campo | Valor |
|-------|-------|
| ID | `caranguejo_termal` |
| Tipo | Incomum · Fogo |
| HP | 58 |
| ATK | 10 |
| DEF | 7 |
| Velocidade | 32 |
| Valor (loja) | 85 ouro |
| Comportamento | `shielded` |
| Escudo | 30 HP |

**Descrição:** Crustáceo blindado das fontes termais. Lento, porém pesado em dano e defesa.

**Drop (baú):** Núcleo de bruma ×1 + **12 ouro** bônus  
**Produção no habitat:** Essência térmica ×1/dia  
**Sentinela (GDD):** Regenera 2 HP/s fora de combate (planejado)

---

## Salamandra Anciã *(chefe)*

| Campo | Valor |
|-------|-------|
| ID | `salamandra_ancia` |
| Tipo | Chefe · Fogo |
| HP | 160 |
| ATK | 16 |
| DEF | 10 |
| Velocidade | 40 |
| Valor (loja) | 280 ouro |
| Comportamento | `boss_thermal` |
| Alcance melee | 22 px |
| Cooldown de ataque | 1,6 s |
| Investida | 220 px/s por 0,55 s |
| Salto | A cada ~4,5 s |
| Escudo | 30 HP |

**Descrição:** Matriarca das salamandras do pântano. Luta em curta distância com investidas, saltos e ondas de calor.

**Mecânica — Onda de calor:** se o jogador estiver a < 90 px, causa **8 de dano** em área; cooldown 5,5 s (3,2 s na fase 2).

**Fase 2 (≤ 50% HP):** +20% velocidade, investidas mais curtas e frequentes, ondas de calor mais rápidas.

**Drop (baú épico):** Coroa Termal ×1 + **55 ouro** bônus  
**Progressão:** Nenhum bioma novo após este chefe (fim da cadeia MVP)  
**Produção no habitat:** —

---

# Tabela resumo — stats

| Espécie | Bioma | HP | ATK | DEF | SPD | Escudo | Papel |
|---------|-------|----|-----|-----|-----|--------|-------|
| Esporo Dorminhoco | Floresta | 30 | 4 | 0 | 45 | — | Melee fraco |
| Lumimorcego | Floresta | 40 | 6 | 2 | 70 | — | Ranged |
| Carapaça de Musgo | Floresta | 55 | 8 | 8 | 35 | 30 | Tank |
| Rei das Esporas | Floresta | 120 | 12 | 6 | 38 | 35 | Chefe ranged + summon |
| Prismarin | Cristal | 38 | 7 | 2 | 65 | — | Ranged |
| Lumicascalho | Cristal | 42 | 5 | 3 | 50 | — | Melee |
| Eco de Quartzo | Cristal | 50 | 9 | 6 | 40 | 30 | Tank |
| Matriarca Prismática | Cristal | 140 | 14 | 8 | 42 | 45 | Chefe ranged + estalactite |
| Salamandra | Termal | 36 | 8 | 2 | 58 | — | Melee |
| Vaporoso | Termal | 32 | 6 | 1 | 72 | — | Ranged rápido |
| Caranguejo Termal | Termal | 58 | 10 | 7 | 32 | 30 | Tank |
| Salamandra Anciã | Termal | 160 | 16 | 10 | 40 | 30 | Chefe melee + heatwave |

---

# Tabela resumo — drops

| Espécie | Baú (loot) | Qtd | Ouro extra | Épico | Habitat/dia |
|---------|------------|-----|------------|-------|-------------|
| Esporo Dorminhoco | Cogumelo comum | 2 | — | — | Fibra de musgo ×1 |
| Lumimorcego | Esporo brilhante | 1 | — | — | Pó bioluminescente ×2 |
| Carapaça de Musgo | Núcleo fúngico | 1 | +8 | — | Fibra de musgo ×3 |
| Rei das Esporas | Coroa de Esporas | 1 | +35 | Sim | — |
| Prismarin | Poeira prismática | 1 | — | — | Fragmento de cristal ×1 |
| Lumicascalho | Quartzo bruto | 2 | — | — | Quartzo bruto ×2 |
| Eco de Quartzo | Gema rachada | 1 | +10 | — | Gema rachada ×1 |
| Matriarca Prismática | Coroa de Cristal | 1 | +45 | Sim | — |
| Salamandra | Escama termal | 2 | — | — | Escama termal ×1 |
| Vaporoso | Concha de vapor | 1 | — | — | Condensado ×2 |
| Caranguejo Termal | Núcleo de bruma | 1 | +12 | — | Essência térmica ×1 |
| Salamandra Anciã | Coroa Termal | 1 | +55 | Sim | — |

### Chaves de progressão (bolsa permanente)

| Chefe derrotado | Item | Efeito |
|-----------------|------|--------|
| Rei das Esporas | Chave de Esporo | Desbloqueia Caverna de Cristal |
| Matriarca Prismática | Chave Prismática | Desbloqueia Pântano Termal |

### Item especial de run (aba Especiais)

| Bioma | Item | Efeito |
|-------|------|--------|
| Floresta | Chave da Arena — Floresta | Abre portão do chefe |
| Cristal | Chave da Arena — Cristal | Abre portão do chefe |
| Termal | Chave da Arena — Termal | Abre portão do chefe |

---

# Tabela de loot — valores

| ID | Nome | Raridade | Valor base |
|----|------|----------|------------|
| `cogumelo_comum` | Cogumelo comum | Comum | 15 |
| `fibra_musgo` | Fibra de musgo | Incomum | 20 |
| `esporo_brilhante` | Esporo brilhante | Raro | 45 |
| `nucleo_fungico` | Núcleo fúngico | Raro | 75 |
| `coroa_esporas` | Coroa de Esporas | Épico | 120 |
| `chave_esporo` | Chave de Esporo | Épico | — |
| `po_bioluminescente` | Pó bioluminescente | Incomum | 25 |
| `fragmento_cristal` | Fragmento de cristal | Comum | 35 |
| `quartzo_bruto` | Quartzo bruto | Comum | 30 |
| `poeira_prismatica` | Poeira prismática | Incomum | 55 |
| `gema_rachada` | Gema rachada | Raro | 90 |
| `coroa_cristal` | Coroa de Cristal | Épico | 130 |
| `chave_prismatica` | Chave Prismática | Épico | — |
| `escama_termal` | Escama termal | Comum | 40 |
| `concha_vapor` | Concha de vapor | Comum | 28 |
| `essencia_termal` | Essência térmica | Incomum | 55 |
| `nucleo_bruma` | Núcleo de bruma | Raro | 95 |
| `coroa_termal` | Coroa Termal | Épico | 140 |
| `condensado` | Condensado | Comum | 22 |

---

## Comportamentos de combate (referência)

| ID | Tipo | Alcance | CD | Escudo | Extras |
|----|------|---------|-----|--------|--------|
| `melee` | Corpo a corpo | 18 | 1,1 s | — | — |
| `ranged` | Projétil | 140 | 2,0 s | — | Pref. 100 px, vel. 150 |
| `shielded` | Corpo a corpo | 20 | 1,4 s | 30 | — |
| `boss_spore` | Rajada | 150 | 2,2 s | 35 | 4 tiros, salto 5 s |
| `boss_prism` | Rajada | 170 | 2,0 s | 45 | 3 tiros |
| `boss_thermal` | Melee + charge | 22 | 1,6 s | 30 | Charge 220 px/s, salto 4,5 s |

---

## Notas

- **Sentinelas:** passivos listados vêm do GDD; implementação completa pode variar.
- **GDD vs código:** o GDD prevê 6 espécies por bioma; o MVP implementa **3 comuns + 1 chefe** por bioma.
- **Minions de chefe:** Esporo Dorminhoco (Rei), Eco de Quartzo (Matriarca), Vaporoso (Salamandra Anciã).
