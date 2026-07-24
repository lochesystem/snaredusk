import type { ActiveExpedition } from '../types.ts';

export type ExpeditionPerkId =
  | 'fio_afiado'
  | 'maos_rapidas'
  | 'casca_reforcada'
  | 'segundo_folego'
  | 'passo_leve'
  | 'vinculo_feroz'
  | 'guardiao';

export interface ExpeditionPerkDef {
  id: ExpeditionPerkId;
  name: string;
  description: string;
  category: 'attack' | 'defense' | 'mobility' | 'companion';
  rune: string;
}

export interface ExpeditionPerkModifiers {
  weaponDamageMultiplier: number;
  attackCooldownMultiplier: number;
  playerDefenseBonus: number;
  moveSpeedMultiplier: number;
  transitionHealBonusRate: number;
  companionDamageMultiplier: number;
  companionDamageTakenMultiplier: number;
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
  passo_leve: {
    id: 'passo_leve',
    name: 'Passo Leve',
    description: '+10% de velocidade de movimento.',
    category: 'mobility',
    rune: '➶',
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
  return {
    weaponDamageMultiplier: chosen.has('fio_afiado') ? 1.15 : 1,
    attackCooldownMultiplier: chosen.has('maos_rapidas') ? 0.88 : 1,
    playerDefenseBonus: chosen.has('casca_reforcada') ? 3 : 0,
    moveSpeedMultiplier: chosen.has('passo_leve') ? 1.1 : 1,
    transitionHealBonusRate: chosen.has('segundo_folego') ? 0.05 : 0,
    companionDamageMultiplier: chosen.has('vinculo_feroz') ? 1.2 : 1,
    companionDamageTakenMultiplier: chosen.has('guardiao') ? 0.8 : 1,
  };
}

export function getExpeditionPerk(perkId: string): ExpeditionPerkDef | null {
  return EXPEDITION_PERKS[perkId as ExpeditionPerkId] ?? null;
}
