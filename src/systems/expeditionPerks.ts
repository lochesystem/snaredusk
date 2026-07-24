import type { ActiveExpedition } from '../types.ts';

export type ExpeditionPerkId =
  | 'fio_afiado'
  | 'maos_rapidas'
  | 'golpe_pesado'
  | 'cacador_elite'
  | 'casca_reforcada'
  | 'segundo_folego'
  | 'barreira_inicial'
  | 'passo_leve'
  | 'laco_preciso'
  | 'orbe_persistente'
  | 'vinculo_feroz'
  | 'guardiao';

export interface ExpeditionPerkDef {
  id: ExpeditionPerkId;
  name: string;
  description: string;
  category: 'attack' | 'defense' | 'mobility' | 'capture' | 'companion';
  rune: string;
}

export interface ExpeditionPerkModifiers {
  weaponDamageMultiplier: number;
  attackCooldownMultiplier: number;
  eliteBossDamageMultiplier: number;
  playerDefenseBonus: number;
  moveSpeedMultiplier: number;
  transitionHealBonusRate: number;
  floorBarrierHp: number;
  captureChanceBonus: number;
  failedOrbRefundChance: number;
  companionDamageMultiplier: number;
  companionDamageTakenMultiplier: number;
}

export interface BarrierDamageResult {
  barrierHp: number;
  hpDamage: number;
  absorbed: number;
  broken: boolean;
}

export interface ExpeditionDamageContext {
  source: 'player' | 'companion';
  isElite: boolean;
  isBoss: boolean;
}

export const EXPEDITION_PERKS: Record<ExpeditionPerkId, ExpeditionPerkDef> = {
  fio_afiado: {
    id: 'fio_afiado',
    name: 'Fio Afiado',
    description: '+15% de dano com armas.',
    category: 'attack',
    rune: '✦',
  },
  maos_rapidas: {
    id: 'maos_rapidas',
    name: 'Mãos Rápidas',
    description: 'Ataques recarregam 12% mais rápido.',
    category: 'attack',
    rune: '⚔',
  },
  golpe_pesado: {
    id: 'golpe_pesado',
    name: 'Golpe Pesado',
    description: '+25% de dano, mas ataques recarregam 10% mais devagar.',
    category: 'attack',
    rune: '✹',
  },
  cacador_elite: {
    id: 'cacador_elite',
    name: 'Caçador de Elite',
    description: '+20% de dano contra elites e chefes.',
    category: 'attack',
    rune: '♛',
  },
  casca_reforcada: {
    id: 'casca_reforcada',
    name: 'Casca Reforçada',
    description: '+3 de defesa durante a expedição.',
    category: 'defense',
    rune: '◆',
  },
  segundo_folego: {
    id: 'segundo_folego',
    name: 'Segundo Fôlego',
    description: '+5% de cura adicional em cada passagem.',
    category: 'defense',
    rune: '♥',
  },
  barreira_inicial: {
    id: 'barreira_inicial',
    name: 'Barreira Inicial',
    description: 'Comece cada andar com um escudo de 20 pontos.',
    category: 'defense',
    rune: '◈',
  },
  passo_leve: {
    id: 'passo_leve',
    name: 'Passo Leve',
    description: '+10% de velocidade de movimento.',
    category: 'mobility',
    rune: '➶',
  },
  laco_preciso: {
    id: 'laco_preciso',
    name: 'Laço Preciso',
    description: '+10 pontos percentuais na chance de captura.',
    category: 'capture',
    rune: '◎',
  },
  orbe_persistente: {
    id: 'orbe_persistente',
    name: 'Orbe Persistente',
    description: '35% de chance de recuperar o Orbe após uma captura falhar.',
    category: 'capture',
    rune: '◉',
  },
  vinculo_feroz: {
    id: 'vinculo_feroz',
    name: 'Vínculo Feroz',
    description: 'Seu companheiro causa +20% de dano.',
    category: 'companion',
    rune: '♢',
  },
  guardiao: {
    id: 'guardiao',
    name: 'Guardião',
    description: 'Seu companheiro recebe 20% menos dano.',
    category: 'companion',
    rune: '⬡',
  },
};

const PERK_IDS = Object.keys(EXPEDITION_PERKS) as ExpeditionPerkId[];

function createRng(seed: number): () => number {
  let value = seed >>> 0;
  return () => {
    value = (value + 0x6d2b79f5) | 0;
    let mixed = Math.imul(value ^ (value >>> 15), 1 | value);
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed);
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
}

export function generatePerkOffers(
  expedition: ActiveExpedition,
  count = 3,
): ExpeditionPerkId[] {
  const selected = new Set(expedition.perks);
  const pool = PERK_IDS.filter((id) => !selected.has(id));
  const rng = createRng(
    expedition.seed
      ^ Math.imul(expedition.floor, 0x9e3779b1)
      ^ Math.imul(selected.size + 1, 0x85ebca6b),
  );
  const shuffled = [...pool].sort(() => rng() - 0.5);
  const offers: ExpeditionPerkId[] = [];
  const usedCategories = new Set<ExpeditionPerkDef['category']>();

  for (const perkId of shuffled) {
    const category = EXPEDITION_PERKS[perkId].category;
    if (usedCategories.has(category)) continue;
    offers.push(perkId);
    usedCategories.add(category);
    if (offers.length >= count) return offers;
  }
  for (const perkId of shuffled) {
    if (offers.includes(perkId)) continue;
    offers.push(perkId);
    if (offers.length >= count) break;
  }
  return offers;
}

export function getExpeditionPerkModifiers(
  perkIds: readonly string[],
): ExpeditionPerkModifiers {
  const chosen = new Set(perkIds);
  const weaponDamageMultiplier =
    (chosen.has('fio_afiado') ? 1.15 : 1)
    * (chosen.has('golpe_pesado') ? 1.25 : 1);
  const attackCooldownMultiplier =
    (chosen.has('maos_rapidas') ? 0.88 : 1)
    * (chosen.has('golpe_pesado') ? 1.1 : 1);
  return {
    weaponDamageMultiplier,
    attackCooldownMultiplier,
    eliteBossDamageMultiplier: chosen.has('cacador_elite') ? 1.2 : 1,
    playerDefenseBonus: chosen.has('casca_reforcada') ? 3 : 0,
    moveSpeedMultiplier: chosen.has('passo_leve') ? 1.1 : 1,
    transitionHealBonusRate: chosen.has('segundo_folego') ? 0.05 : 0,
    floorBarrierHp: chosen.has('barreira_inicial') ? 20 : 0,
    captureChanceBonus: chosen.has('laco_preciso') ? 0.1 : 0,
    failedOrbRefundChance: chosen.has('orbe_persistente') ? 0.35 : 0,
    companionDamageMultiplier: chosen.has('vinculo_feroz') ? 1.2 : 1,
    companionDamageTakenMultiplier: chosen.has('guardiao') ? 0.8 : 1,
  };
}

export function absorbDamageWithBarrier(
  barrierHp: number,
  damage: number,
): BarrierDamageResult {
  const safeBarrier = Math.max(0, barrierHp);
  const safeDamage = Math.max(0, damage);
  const absorbed = Math.min(safeBarrier, safeDamage);
  const nextBarrier = safeBarrier - absorbed;
  return {
    barrierHp: nextBarrier,
    hpDamage: safeDamage - absorbed,
    absorbed,
    broken: safeBarrier > 0 && nextBarrier <= 0,
  };
}

export function getExpeditionOutgoingDamageMultiplier(
  modifiers: ExpeditionPerkModifiers,
  context: ExpeditionDamageContext,
): number {
  const sourceMultiplier = context.source === 'companion'
    ? modifiers.companionDamageMultiplier
    : modifiers.weaponDamageMultiplier;
  const targetMultiplier =
    context.source === 'player' && (context.isElite || context.isBoss)
      ? modifiers.eliteBossDamageMultiplier
      : 1;
  return sourceMultiplier * targetMultiplier;
}

export function rollFailedOrbRefund(
  chance: number,
  rng: () => number = Math.random,
): boolean {
  return chance > 0 && rng() < Math.min(1, Math.max(0, chance));
}

export function getExpeditionPerk(perkId: string): ExpeditionPerkDef | null {
  return EXPEDITION_PERKS[perkId as ExpeditionPerkId] ?? null;
}
