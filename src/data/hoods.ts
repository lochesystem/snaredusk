export const HOOD_IDS = ['cacador', 'fungico', 'prismatico', 'termal'] as const;

export type HoodId = (typeof HOOD_IDS)[number];

export interface HoodDef {
  id: HoodId;
  name: string;
  description: string;
  craftable: boolean;
}

export const HOODS: Record<HoodId, HoodDef> = {
  cacador: {
    id: 'cacador',
    name: 'Capuz do Caçador',
    description: 'O capuz original de Brumavale.',
    craftable: false,
  },
  fungico: {
    id: 'fungico',
    name: 'Capuz do Micélio',
    description: 'Tecido verde-musgo marcado por um pequeno esporo.',
    craftable: true,
  },
  prismatico: {
    id: 'prismatico',
    name: 'Capuz Prismático',
    description: 'Índigo profundo com uma costura luminosa de cristal.',
    craftable: true,
  },
  termal: {
    id: 'termal',
    name: 'Capuz da Brasa',
    description: 'Vinho escuro rematado por uma discreta costura de brasa.',
    craftable: true,
  },
};

export function isHoodId(value: unknown): value is HoodId {
  return typeof value === 'string' && HOOD_IDS.includes(value as HoodId);
}

export function getHood(id: HoodId): HoodDef {
  return HOODS[id];
}
