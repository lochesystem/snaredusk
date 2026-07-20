import type { BiomeId } from '../data/biomes.ts';
import {
  ROOM_H,
  ROOM_W,
  WALL_THICKNESS,
  type DungeonEnemySpawn,
  type DungeonLayout,
  type DungeonWall,
  type RoomLayout,
} from './dungeonGenerator.ts';

const WORLD_PADDING = 48;
const TUTORIAL_ENEMY_HP = 15;

function buildClosedRoomWalls(rect: { x: number; y: number; width: number; height: number }): DungeonWall[] {
  const t = WALL_THICKNESS;
  return [
    { x: rect.x, y: rect.y, width: rect.width, height: t, axis: 'h', facing: 'n' },
    { x: rect.x, y: rect.y + rect.height - t, width: rect.width, height: t, axis: 'h', facing: 's' },
    { x: rect.x, y: rect.y, width: t, height: rect.height, axis: 'v', facing: 'w' },
    { x: rect.x + rect.width - t, y: rect.y, width: t, height: rect.height, axis: 'v', facing: 'e' },
  ];
}

/** Masmorra de 1 sala para o tutorial — 1 esporo fraco, sem chefe nem chave. */
export function generateTutorialDungeon(biomeId: BiomeId = 'floresta'): DungeonLayout {
  const rect = { x: WORLD_PADDING, y: WORLD_PADDING, width: ROOM_W, height: ROOM_H };
  const room: RoomLayout = {
    index: 0,
    gx: 0,
    gy: 0,
    rect,
    decorSeed: 42,
    doors: [],
    type: 'combat',
  };

  const spawn = { x: rect.x + 52, y: rect.y + rect.height / 2 };
  const portal = { x: rect.x + rect.width - 52, y: rect.y + rect.height / 2 };
  const enemyPos = { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };

  const enemySpawns: DungeonEnemySpawn[] = [
    {
      speciesId: 'esporo_dorminhoco',
      x: enemyPos.x,
      y: enemyPos.y,
      roomIndex: 0,
      hp: TUTORIAL_ENEMY_HP,
    },
  ];

  return {
    biomeId,
    width: rect.x + rect.width + WORLD_PADDING,
    height: rect.y + rect.height + WORLD_PADDING,
    rooms: [room],
    floors: [{ ...rect }],
    walls: buildClosedRoomWalls(rect),
    bossGateWalls: [],
    hazards: [],
    decor: [],
    obstacles: [],
    chests: [],
    connections: [],
    bossRoomIndex: -1,
    portalRoomIndex: 0,
    spawn,
    portal,
    enemySpawns,
    interactables: [],
  };
}

export const TUTORIAL_ENEMY_MAX_HP = TUTORIAL_ENEMY_HP;
