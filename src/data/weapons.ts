export type WeaponKind = 'melee' | 'ranged';

export interface WeaponDef {
  id: string;
  name: string;
  kind: WeaponKind;
  atk: number;
  cooldown: number;
  range: number;
  arcAngle?: number;
  projectileSpeed?: number;
  pierce?: number;
  slashColor?: number;
  projectileStyle?: 'orb' | 'spear' | 'spore';
  attackFx?: 'knife' | 'pickaxe' | 'spear_thrust';
  staminaCost: number;
}

export const WEAPONS: Record<string, WeaponDef> = {
  faca_enferrujada: {
    id: 'faca_enferrujada',
    name: 'Faca enferrujada',
    kind: 'melee',
    atk: 10,
    cooldown: 0.35,
    range: 34,
    arcAngle: 2.09,
    slashColor: 0xf0e6d3,
    attackFx: 'knife',
    staminaCost: 6,
  },
  picareta_combate: {
    id: 'picareta_combate',
    name: 'Picareta de combate',
    kind: 'melee',
    atk: 18,
    cooldown: 0.55,
    range: 42,
    arcAngle: 1.57,
    slashColor: 0xc4a040,
    attackFx: 'pickaxe',
    staminaCost: 14,
  },
  lanca_esporo: {
    id: 'lanca_esporo',
    name: 'Lança esporo',
    kind: 'ranged',
    atk: 14,
    cooldown: 0.7,
    range: 180,
    projectileSpeed: 200,
    pierce: 0,
    slashColor: 0xc4f082,
    projectileStyle: 'spear',
    attackFx: 'spear_thrust',
    staminaCost: 10,
  },
};

export const STARTING_WEAPON_ID = 'faca_enferrujada';

export function getWeapon(id: string): WeaponDef {
  const w = WEAPONS[id];
  if (!w) throw new Error(`Arma desconhecida: ${id}`);
  return w;
}

export function getEquippedWeapon(equippedId: string): WeaponDef {
  return getWeapon(equippedId in WEAPONS ? equippedId : STARTING_WEAPON_ID);
}
