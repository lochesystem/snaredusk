export type StationId = 'workbench' | 'chest_wood' | 'habitat_pen';

export interface StationDef {
  id: StationId;
  name: string;
  width: number;
  height: number;
  /** Custo em ouro (0 = grátis nas 3 primeiras colocações). */
  goldCost: number;
  color: number;
  accent: number;
  interact: 'craft' | 'chest' | 'habitat';
}

export const BASE_STATIONS: Record<StationId, StationDef> = {
  workbench: {
    id: 'workbench',
    name: 'Bancada',
    width: 1,
    height: 1,
    goldCost: 0,
    color: 0x5a4a38,
    accent: 0x8a7a58,
    interact: 'craft',
  },
  chest_wood: {
    id: 'chest_wood',
    name: 'Baú de madeira',
    width: 1,
    height: 1,
    goldCost: 0,
    color: 0x6a5038,
    accent: 0x9a7048,
    interact: 'chest',
  },
  habitat_pen: {
    id: 'habitat_pen',
    name: 'Cercado habitat',
    width: 2,
    height: 2,
    goldCost: 40,
    color: 0x3d5c3a,
    accent: 0x5dbb63,
    interact: 'habitat',
  },
};

export const BUILDABLE_STATIONS: StationId[] = ['workbench', 'chest_wood', 'habitat_pen'];

export const FREE_BUILD_COUNT = 3;

export function getStation(id: StationId): StationDef {
  return BASE_STATIONS[id];
}
