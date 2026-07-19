import type { BiomeId } from '../data/biomes.ts';
import { getBiomeDef } from '../data/biomes.ts';
import type { Rect } from '../types.ts';

export const PLAYER_RADIUS = 10;
export const ENEMY_RADIUS = 9;
export const WALL_THICKNESS = 14;
export const CORRIDOR_WIDTH = 52;
export const ROOM_W = 240;
export const ROOM_H = 180;
export const BOSS_ROOM_W = 360;
export const BOSS_ROOM_H = 280;
export const CORRIDOR_H_LEN = 64;
export const CORRIDOR_V_LEN = 48;

export type DoorDir = 'n' | 's' | 'e' | 'w';

/** Direção para o vazio (lado externo da parede — onde fica o highlight). */
export type WallFacing = DoorDir;

export interface DungeonWall extends Rect {
  axis: 'h' | 'v';
  facing: WallFacing;
}

export type RoomType = 'combat' | 'treasure' | 'event' | 'rest' | 'merchant' | 'boss';

export interface RoomLayout {
  index: number;
  gx: number;
  gy: number;
  rect: Rect;
  decorSeed: number;
  doors: DoorDir[];
  type: RoomType;
}

export interface DungeonEnemySpawn {
  speciesId: string;
  x: number;
  y: number;
  roomIndex: number;
  isBoss?: boolean;
}

export interface DungeonInteractable {
  roomIndex: number;
  kind: 'rest' | 'event' | 'merchant';
  x: number;
  y: number;
  used: boolean;
}

export interface DungeonDecor {
  kind: 'mushroom' | 'crystal' | 'thermal';
  x: number;
  y: number;
  size: number;
  variant: number;
}

export interface DungeonObstacle {
  kind: 'rock' | 'hole';
  x: number;
  y: number;
  radius: number;
  roomIndex: number;
  /** Segundos restantes para obstáculos temporários (estalactites). */
  ttl?: number;
}

export interface DungeonChest {
  roomIndex: number;
  x: number;
  y: number;
  lootId: string;
}

export interface DungeonHazard {
  kind: 'poison' | 'spore';
  x: number;
  y: number;
  radius: number;
  roomIndex: number;
}

export interface DungeonLayout {
  biomeId: BiomeId;
  width: number;
  height: number;
  rooms: RoomLayout[];
  floors: Rect[];
  walls: DungeonWall[];
  bossGateWalls: Rect[];
  hazards: DungeonHazard[];
  decor: DungeonDecor[];
  obstacles: DungeonObstacle[];
  chests: DungeonChest[];
  connections: { a: number; b: number }[];
  bossRoomIndex: number;
  portalRoomIndex: number;
  spawn: { x: number; y: number };
  portal: { x: number; y: number };
  enemySpawns: DungeonEnemySpawn[];
  interactables: DungeonInteractable[];
}

type Rng = () => number;

interface GraphNode {
  id: number;
  gx: number;
  gy: number;
}

interface GraphEdge {
  a: number;
  b: number;
  dir: DoorDir;
}

const DIR_DELTA: Record<DoorDir, { dgx: number; dgy: number }> = {
  n: { dgx: 0, dgy: -1 },
  s: { dgx: 0, dgy: 1 },
  e: { dgx: 1, dgy: 0 },
  w: { dgx: -1, dgy: 0 },
};

function createRng(seed: number): Rng {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function randInt(rng: Rng, min: number, max: number): number {
  return Math.floor(rng() * (max - min + 1)) + min;
}

function cellKey(gx: number, gy: number): string {
  return `${gx},${gy}`;
}

function shuffle<T>(arr: T[], rng: Rng): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = randInt(rng, 0, i);
    [arr[i], arr[j]] = [arr[j]!, arr[i]!];
  }
}

function generateGraph(rng: Rng, targetRooms: number): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const occupied = new Map<string, number>();
  const nodes: GraphNode[] = [{ id: 0, gx: 0, gy: 0 }];
  occupied.set(cellKey(0, 0), 0);
  const edges: GraphEdge[] = [];
  const frontier = [0];

  while (nodes.length < targetRooms && frontier.length > 0) {
    const nodeId = frontier[randInt(rng, 0, frontier.length - 1)]!;
    const node = nodes[nodeId]!;
    const dirs: DoorDir[] = ['n', 's', 'e', 'w'];
    shuffle(dirs, rng);

    let expanded = false;
    for (const dir of dirs) {
      const { dgx, dgy } = DIR_DELTA[dir];
      const ngx = node.gx + dgx;
      const ngy = node.gy + dgy;
      const key = cellKey(ngx, ngy);
      if (occupied.has(key)) continue;

      const newId = nodes.length;
      nodes.push({ id: newId, gx: ngx, gy: ngy });
      occupied.set(key, newId);
      edges.push({ a: nodeId, b: newId, dir });
      frontier.push(newId);
      expanded = true;
      break;
    }

    if (!expanded) {
      const idx = frontier.indexOf(nodeId);
      if (idx >= 0) frontier.splice(idx, 1);
    }
  }

  const extra = randInt(rng, 0, 2);
  for (let i = 0; i < extra; i++) {
    const node = nodes[randInt(rng, 0, nodes.length - 1)]!;
    const dirs: DoorDir[] = ['n', 's', 'e', 'w'];
    shuffle(dirs, rng);
    for (const dir of dirs) {
      const { dgx, dgy } = DIR_DELTA[dir];
      const key = cellKey(node.gx + dgx, node.gy + dgy);
      const otherId = occupied.get(key);
      if (otherId === undefined) continue;
      const exists = edges.some(
        (e) => (e.a === node.id && e.b === otherId) || (e.a === otherId && e.b === node.id),
      );
      if (!exists) {
        edges.push({ a: node.id, b: otherId, dir });
        break;
      }
    }
  }

  return { nodes, edges };
}

function roomRect(gx: number, gy: number): Rect {
  return {
    x: 48 + gx * (ROOM_W + CORRIDOR_H_LEN),
    y: 48 + gy * (ROOM_H + CORRIDOR_V_LEN),
    width: ROOM_W,
    height: ROOM_H,
  };
}

function buildDoorMap(nodes: GraphNode[], edges: GraphEdge[]): Map<number, DoorDir[]> {
  const doors = new Map<number, DoorDir[]>();
  for (const n of nodes) doors.set(n.id, []);
  for (const edge of edges) {
    doors.get(edge.a)!.push(edge.dir);
    if (edge.dir === 'e') doors.get(edge.b)!.push('w');
    else if (edge.dir === 'w') doors.get(edge.b)!.push('e');
    else if (edge.dir === 'n') doors.get(edge.b)!.push('s');
    else doors.get(edge.b)!.push('n');
  }
  return doors;
}

export function generateDungeon(seed?: number, biomeId: BiomeId = 'floresta'): DungeonLayout {
  const baseSeed = seed ?? Date.now();
  for (let attempt = 0; attempt < 24; attempt++) {
    const layout = buildDungeon(baseSeed + attempt * 7919, biomeId);
    if (validateLayout(layout)) return layout;
  }
  return buildDungeon(baseSeed, biomeId);
}

function buildDungeon(seed: number, biomeId: BiomeId): DungeonLayout {
  const biome = getBiomeDef(biomeId);
  const rng = createRng(seed);
  const targetRooms = randInt(rng, 8, 11);
  const { nodes, edges } = generateGraph(rng, targetRooms);
  const doorMap = buildDoorMap(nodes, edges);

  const rooms: RoomLayout[] = nodes.map((n) => ({
    index: n.id,
    gx: n.gx,
    gy: n.gy,
    rect: roomRect(n.gx, n.gy),
    decorSeed: randInt(rng, 1, 99999),
    doors: doorMap.get(n.id) ?? [],
    type: 'combat' as RoomType,
  }));

  const bossRoomIndex = assignRoomTypes(rooms, edges, rng);
  expandBossRoom(rooms, bossRoomIndex);

  const floors: Rect[] = [];
  const walls: DungeonWall[] = [];

  for (const room of rooms) {
    floors.push({ ...room.rect });
  }

  for (const edge of edges) {
    const a = rooms[edge.a]!;
    const b = rooms[edge.b]!;
    if (edge.dir === 'e' || edge.dir === 'w') {
      const left = edge.dir === 'e' ? a : b;
      const half = CORRIDOR_WIDTH / 2;
      const corridor: Rect = {
        x: left.rect.x + left.rect.width - WALL_THICKNESS,
        y: left.rect.y + left.rect.height / 2 - half,
        width: CORRIDOR_H_LEN + WALL_THICKNESS * 2,
        height: CORRIDOR_WIDTH,
      };
      floors.push(corridor);
      addCorridorCaps(walls, corridor);
    } else {
      const upper = edge.dir === 's' ? a : b;
      const half = CORRIDOR_WIDTH / 2;
      const corridor: Rect = {
        x: upper.rect.x + upper.rect.width / 2 - half,
        y: upper.rect.y + upper.rect.height - WALL_THICKNESS,
        width: CORRIDOR_WIDTH,
        height: CORRIDOR_V_LEN + WALL_THICKNESS * 2,
      };
      floors.push(corridor);
      addSideCorridorCaps(walls, corridor);
    }
  }

  for (const room of rooms) {
    addRoomWalls(room, walls);
  }

  const spawnRoom = rooms[0]!;
  const portalRoomIndex = bossRoomIndex;
  const portalRoom = rooms[portalRoomIndex]!;

  const spawn = {
    x: spawnRoom.rect.x + 52,
    y: spawnRoom.rect.y + spawnRoom.rect.height / 2,
  };
  const portal = {
    x: portalRoom.rect.x + portalRoom.rect.width / 2,
    y: portalRoom.rect.y + portalRoom.rect.height / 2,
  };

  const reserved: { x: number; y: number }[] = [spawn, portal];
  const spawnSafeRadius = 56;
  const portalSafeRadius = 56;
  const safeZones = [
    { x: spawn.x, y: spawn.y, radius: spawnSafeRadius },
    { x: portal.x, y: portal.y, radius: portalSafeRadius },
  ];
  const decor: DungeonDecor[] = [];
  const obstacles: DungeonObstacle[] = [];
  const chests: DungeonChest[] = [];

  for (const room of rooms) {
    populateRoomDecor(room, rng, decor, reserved, safeZones, biome.decorKind);
    if (room.type === 'combat' || (room.type === 'boss' && biomeId === 'cristal')) {
      populateRoomObstacles(room, rng, obstacles, reserved, safeZones, biomeId);
    }
    if (room.type === 'treasure') {
      populateTreasureRoom(room, rng, chests, reserved, safeZones, biome.chestLoot);
    } else if (room.type === 'combat' && room.index !== 0) {
      maybeAddChest(room, rng, chests, reserved, safeZones, biome.chestLoot);
    }
  }

  const interactables = buildInteractables(rooms, reserved, safeZones, rng);
  const enemySpawns = pickEnemySpawns(rooms, rng, safeZones, floors, walls, obstacles, biome);
  const bossRoom = rooms.find((r) => r.index === bossRoomIndex)!;
  const bossGateWalls = buildBossGateWalls(bossRoom);
  const hazards = populateBiomeHazards(rooms, rng, biomeId, bossRoomIndex, reserved, safeZones);

  const connections = edges.map((e) => ({ a: e.a, b: e.b }));

  return normalizeDungeonLayout({
    biomeId,
    width: 0,
    height: 0,
    rooms,
    floors,
    walls,
    bossGateWalls,
    hazards,
    decor,
    obstacles,
    chests,
    connections,
    bossRoomIndex,
    portalRoomIndex,
    spawn,
    portal,
    enemySpawns,
    interactables,
  });
}

function assignRoomTypes(rooms: RoomLayout[], edges: GraphEdge[], rng: Rng): number {
  const dist = bfsDistances(rooms, edges, 0);
  let bossRoom = 0;
  let maxD = -1;
  for (const room of rooms) {
    const d = dist.get(room.index) ?? 0;
    if (d > maxD) {
      maxD = d;
      bossRoom = room.index;
    }
  }

  const pool = rooms.filter((r) => r.index !== 0 && r.index !== bossRoom);
  shuffle(pool, rng);

  rooms[0]!.type = 'combat';
  rooms.find((r) => r.index === bossRoom)!.type = 'boss';

  const guaranteed: RoomType[] = ['treasure', 'rest', 'event'];
  if (rooms.length >= 9) guaranteed.push('merchant');

  for (const type of guaranteed) {
    const room = pool.pop();
    if (room) room.type = type;
  }

  for (const room of rooms) {
    if (room.index === 0 || room.index === bossRoom) continue;
    if (room.type !== 'combat') continue;
    room.type = 'combat';
  }

  return bossRoom;
}

function expandBossRoom(rooms: RoomLayout[], bossRoomIndex: number): void {
  const boss = rooms.find((r) => r.index === bossRoomIndex);
  if (!boss) return;
  const extraW = BOSS_ROOM_W - ROOM_W;
  const extraH = BOSS_ROOM_H - ROOM_H;
  boss.rect.x -= Math.floor(extraW / 2);
  boss.rect.y -= Math.floor(extraH / 2);
  boss.rect.width = BOSS_ROOM_W;
  boss.rect.height = BOSS_ROOM_H;
}

function buildBossGateWalls(bossRoom: RoomLayout): Rect[] {
  const gates: Rect[] = [];
  const { rect, doors } = bossRoom;
  const t = WALL_THICKNESS;
  const half = CORRIDOR_WIDTH / 2;
  const cx = rect.x + rect.width / 2;
  const cy = rect.y + rect.height / 2;

  for (const door of doors) {
    if (door === 'n') {
      gates.push({ x: cx - half, y: rect.y, width: CORRIDOR_WIDTH, height: t });
    }
    if (door === 's') {
      gates.push({ x: cx - half, y: rect.y + rect.height - t, width: CORRIDOR_WIDTH, height: t });
    }
    if (door === 'w') {
      gates.push({ x: rect.x, y: cy - half, width: t, height: CORRIDOR_WIDTH });
    }
    if (door === 'e') {
      gates.push({ x: rect.x + rect.width - t, y: cy - half, width: t, height: CORRIDOR_WIDTH });
    }
  }
  return gates;
}

function populateBiomeHazards(
  rooms: RoomLayout[],
  rng: Rng,
  biomeId: BiomeId,
  bossRoomIndex: number,
  reserved: { x: number; y: number }[],
  safeZones: SafeZone[],
): DungeonHazard[] {
  const hazards: DungeonHazard[] = [];
  const eligible = rooms.filter((r) => r.index !== 0 && r.index !== bossRoomIndex && r.type === 'combat');

  if (biomeId === 'floresta') {
    for (const room of eligible) {
      if (rng() > 0.55) continue;
      const pt = randomInteriorPoint(room, rng, reserved, 40, safeZones, 22);
      if (!pt) continue;
      reserved.push(pt);
      hazards.push({
        kind: 'spore',
        x: pt.x,
        y: pt.y,
        radius: 28 + randInt(rng, 0, 12),
        roomIndex: room.index,
      });
    }
  }

  if (biomeId === 'termal') {
    for (const room of eligible) {
      const count = randInt(rng, 1, 2);
      for (let i = 0; i < count; i++) {
        const pt = randomInteriorPoint(room, rng, reserved, 36, safeZones, 20);
        if (!pt) continue;
        reserved.push(pt);
        hazards.push({
          kind: 'poison',
          x: pt.x,
          y: pt.y,
          radius: 24 + randInt(rng, 0, 10),
          roomIndex: room.index,
        });
      }
    }
  }

  return hazards;
}

function buildInteractables(
  rooms: RoomLayout[],
  reserved: { x: number; y: number }[],
  safeZones: SafeZone[],
  rng: Rng,
): DungeonInteractable[] {
  const out: DungeonInteractable[] = [];
  for (const room of rooms) {
    if (room.type !== 'rest' && room.type !== 'event' && room.type !== 'merchant') continue;
    const pt = randomInteriorPoint(room, rng, reserved, 40, safeZones);
    const cx = room.rect.x + room.rect.width / 2;
    const cy = room.rect.y + room.rect.height / 2;
    const point = pt ?? { x: cx, y: cy };
    reserved.push(point);
    out.push({
      roomIndex: room.index,
      kind: room.type as 'rest' | 'event' | 'merchant',
      x: point.x,
      y: point.y,
      used: false,
    });
  }
  return out;
}

function populateTreasureRoom(
  room: RoomLayout,
  rng: Rng,
  chests: DungeonChest[],
  reserved: { x: number; y: number }[],
  safeZones: SafeZone[],
  chestLoot: readonly string[],
): void {
  const count = randInt(rng, 1, 2);
  for (let i = 0; i < count; i++) {
    const pt = randomInteriorPoint(room, rng, reserved, 48, safeZones);
    if (!pt) continue;
    reserved.push(pt);
    chests.push({
      roomIndex: room.index,
      x: pt.x,
      y: pt.y,
      lootId: chestLoot[randInt(rng, 0, chestLoot.length - 1)]!,
    });
  }
}

function bfsDistances(
  rooms: RoomLayout[],
  edges: GraphEdge[],
  startId: number,
): Map<number, number> {
  const adj = new Map<number, number[]>();
  for (const r of rooms) adj.set(r.index, []);
  for (const e of edges) {
    adj.get(e.a)!.push(e.b);
    adj.get(e.b)!.push(e.a);
  }
  const dist = new Map<number, number>();
  const q = [startId];
  dist.set(startId, 0);
  while (q.length > 0) {
    const id = q.shift()!;
    for (const next of adj.get(id) ?? []) {
      if (dist.has(next)) continue;
      dist.set(next, (dist.get(id) ?? 0) + 1);
      q.push(next);
    }
  }
  return dist;
}

function pickEnemySpawns(
  rooms: RoomLayout[],
  rng: Rng,
  safeZones: SafeZone[],
  floors: Rect[],
  walls: Rect[],
  obstacles: DungeonObstacle[],
  biome: ReturnType<typeof getBiomeDef>,
): DungeonEnemySpawn[] {
  const spawns: DungeonEnemySpawn[] = [];
  const placed: { x: number; y: number }[] = [];

  const pickClearPoint = (room: RoomLayout, minDist: number): { x: number; y: number } | null => {
    for (let attempt = 0; attempt < 64; attempt++) {
      const pt = randomInteriorPoint(room, rng, placed, minDist, safeZones);
      if (!pt) continue;
      if (!isEntitySpawnWalkable(pt.x, pt.y, ENEMY_RADIUS, floors, walls, obstacles)) continue;
      return pt;
    }
    return findFallbackSpawnPoint(room, placed, floors, walls, obstacles);
  };

  for (const room of rooms) {
    if (room.type === 'combat' && room.index !== 0) {
      const count = randInt(rng, 1, 2);
      for (let i = 0; i < count; i++) {
        const speciesId = biome.enemySpecies[randInt(rng, 0, biome.enemySpecies.length - 1)]!;
        const pt = pickClearPoint(room, 36);
        if (!pt) continue;
        placed.push(pt);
        spawns.push({
          speciesId,
          roomIndex: room.index,
          x: pt.x,
          y: pt.y,
        });
      }
    }

    if (room.type === 'boss') {
      const cx = room.rect.x + room.rect.width / 2;
      const cy = room.rect.y + room.rect.height / 2;
      const centerWalkable = isEntitySpawnWalkable(cx, cy, ENEMY_RADIUS, floors, walls, obstacles);
      const pt = centerWalkable ? { x: cx, y: cy } : pickClearPoint(room, 48);
      if (!pt) continue;
      placed.push(pt);
      spawns.push({
        speciesId: biome.bossSpeciesId,
        roomIndex: room.index,
        x: pt.x,
        y: pt.y,
        isBoss: true,
      });
    }
  }

  return spawns;
}

function findFallbackSpawnPoint(
  room: RoomLayout,
  placed: { x: number; y: number }[],
  floors: Rect[],
  walls: Rect[],
  obstacles: DungeonObstacle[],
): { x: number; y: number } | null {
  const r = room.rect;
  const pad = WALL_THICKNESS + 20;
  const step = 14;

  for (let y = r.y + pad; y <= r.y + r.height - pad; y += step) {
    for (let x = r.x + pad; x <= r.x + r.width - pad; x += step) {
      if (!isFarFromAll(x, y, placed, 28)) continue;
      if (!isEntitySpawnWalkable(x, y, ENEMY_RADIUS, floors, walls, obstacles)) continue;
      return { x, y };
    }
  }

  return null;
}

function isEntitySpawnWalkable(
  x: number,
  y: number,
  radius: number,
  floors: Rect[],
  walls: Rect[],
  obstacles: DungeonObstacle[],
): boolean {
  if (!isOnWalkableFloorPoint(x, y, radius, floors)) return false;
  if (collidesCirclePoint(x, y, radius, walls)) return false;
  for (const obs of obstacles) {
    const dx = x - obs.x;
    const dy = y - obs.y;
    if (obs.kind === 'hole') {
      if (dx * dx + dy * dy < (obs.radius + radius * 0.6) ** 2) return false;
      continue;
    }
    if (dx * dx + dy * dy < (obs.radius + radius + 6) ** 2) return false;
  }
  return true;
}

function areEnemySpawnsWalkable(layout: DungeonLayout): boolean {
  for (const spawn of layout.enemySpawns) {
    if (!isEntitySpawnWalkable(
      spawn.x,
      spawn.y,
      ENEMY_RADIUS,
      layout.floors,
      layout.walls,
      layout.obstacles,
    )) {
      return false;
    }
  }
  return true;
}

function populateRoomDecor(
  room: RoomLayout,
  rng: Rng,
  decor: DungeonDecor[],
  reserved: { x: number; y: number }[],
  safeZones: SafeZone[],
  decorKind: DungeonDecor['kind'],
): void {
  const count = randInt(rng, 4, 8);
  for (let i = 0; i < count; i++) {
    const pt = randomInteriorPoint(room, rng, reserved, 22, safeZones);
    if (!pt) continue;
    reserved.push(pt);
    decor.push({
      kind: decorKind,
      x: pt.x,
      y: pt.y,
      size: 3 + randInt(rng, 0, 2),
      variant: randInt(rng, 0, 2),
    });
  }
}

function populateRoomObstacles(
  room: RoomLayout,
  rng: Rng,
  obstacles: DungeonObstacle[],
  reserved: { x: number; y: number }[],
  safeZones: SafeZone[],
  biomeId: BiomeId,
): void {
  const isCristal = biomeId === 'cristal';
  const isBoss = room.type === 'boss';
  const attempts = isBoss && isCristal ? 3 : isCristal ? 2 : 1;
  const chance = isCristal ? (isBoss ? 1 : 0.72) : 0.35;

  for (let i = 0; i < attempts; i++) {
    if (!isBoss && rng() > chance) continue;
    const holeRadius = 12 + randInt(rng, 0, 5);
    const pt = randomInteriorPoint(room, rng, reserved, 32, safeZones, holeRadius);
    if (pt) {
      reserved.push(pt);
      obstacles.push({
        kind: 'hole',
        x: pt.x,
        y: pt.y,
        radius: holeRadius,
        roomIndex: room.index,
      });
    }
  }
}

function maybeAddChest(
  room: RoomLayout,
  rng: Rng,
  chests: DungeonChest[],
  reserved: { x: number; y: number }[],
  safeZones: SafeZone[],
  chestLoot: readonly string[],
): void {
  if (room.index === 0) return;
  if (chests.length >= 2) return;
  if (rng() > 0.28) return;

  const pt = randomInteriorPoint(room, rng, reserved, 44, safeZones);
  if (!pt) return;
  reserved.push(pt);
  chests.push({
    roomIndex: room.index,
    x: pt.x,
    y: pt.y,
    lootId: chestLoot[randInt(rng, 0, chestLoot.length - 1)]!,
  });
}

interface SafeZone {
  x: number;
  y: number;
  radius: number;
}

function randomInteriorPoint(
  room: RoomLayout,
  rng: Rng,
  reserved: { x: number; y: number }[],
  minDist: number,
  safeZones: SafeZone[] = [],
  obstacleRadius = 0,
): { x: number; y: number } | null {
  const r = room.rect;
  const pad = WALL_THICKNESS + 20;
  const doorGuard = 56;

  const isValid = (x: number, y: number): boolean => {
    if (x < r.x + pad || x > r.x + r.width - pad) return false;
    if (y < r.y + pad || y > r.y + r.height - pad) return false;
    if (!isAwayFromDoors(x, y, room, doorGuard)) return false;
    if (!isFarFromAll(x, y, reserved, minDist)) return false;
    if (!isOutsideSafeZones(x, y, safeZones, obstacleRadius)) return false;
    return true;
  };

  for (let attempt = 0; attempt < 48; attempt++) {
    const x = r.x + pad + rng() * (r.width - pad * 2);
    const y = r.y + pad + rng() * (r.height - pad * 2);
    if (isValid(x, y)) return { x, y };
  }

  for (let attempt = 0; attempt < 24; attempt++) {
    const x = r.x + pad + rng() * (r.width - pad * 2);
    const y = r.y + pad + rng() * (r.height - pad * 2);
    if (!isAwayFromDoors(x, y, room, doorGuard)) continue;
    if (!isOutsideSafeZones(x, y, safeZones, obstacleRadius)) continue;
    if (!isFarFromAll(x, y, reserved, minDist * 0.65)) continue;
    return { x, y };
  }

  return null;
}

function isOutsideSafeZones(
  x: number,
  y: number,
  zones: SafeZone[],
  obstacleRadius: number,
): boolean {
  for (const zone of zones) {
    const dx = x - zone.x;
    const dy = y - zone.y;
    const minClear = zone.radius + obstacleRadius;
    if (dx * dx + dy * dy < minClear * minClear) return false;
  }
  return true;
}

function isAwayFromDoors(x: number, y: number, room: RoomLayout, guard: number): boolean {
  const r = room.rect;
  const cx = r.x + r.width / 2;
  const cy = r.y + r.height / 2;

  for (const door of room.doors) {
    if (door === 'n' && y < r.y + guard) return false;
    if (door === 's' && y > r.y + r.height - guard) return false;
    if (door === 'w' && x < r.x + guard) return false;
    if (door === 'e' && x > r.x + r.width - guard) return false;
    if (door === 'n' && Math.abs(x - cx) < CORRIDOR_WIDTH) return false;
    if (door === 's' && Math.abs(x - cx) < CORRIDOR_WIDTH) return false;
    if (door === 'w' && Math.abs(y - cy) < CORRIDOR_WIDTH) return false;
    if (door === 'e' && Math.abs(y - cy) < CORRIDOR_WIDTH) return false;
  }
  return true;
}

function isFarFromAll(x: number, y: number, points: { x: number; y: number }[], minDist: number): boolean {
  for (const p of points) {
    const dx = x - p.x;
    const dy = y - p.y;
    if (dx * dx + dy * dy < minDist * minDist) return false;
  }
  return true;
}

function wallSegment(rect: Rect, axis: 'h' | 'v', facing: WallFacing): DungeonWall {
  return { ...rect, axis, facing };
}

function addRoomWalls(room: RoomLayout, walls: DungeonWall[]): void {
  const { rect, doors } = room;
  const t = WALL_THICKNESS;
  const half = CORRIDOR_WIDTH / 2;
  const cx = rect.x + rect.width / 2;
  const cy = rect.y + rect.height / 2;

  addHorizontalWall(walls, rect.x, rect.y, rect.width, t, doors.includes('n'), cx, half, 'n');
  addHorizontalWall(
    walls,
    rect.x,
    rect.y + rect.height - t,
    rect.width,
    t,
    doors.includes('s'),
    cx,
    half,
    's',
  );
  addVerticalWall(walls, rect.x, rect.y, rect.height, t, doors.includes('w'), cy, half, 'w');
  addVerticalWall(
    walls,
    rect.x + rect.width - t,
    rect.y,
    rect.height,
    t,
    doors.includes('e'),
    cy,
    half,
    'e',
  );
}

function addHorizontalWall(
  walls: DungeonWall[],
  x: number,
  y: number,
  width: number,
  thickness: number,
  hasGap: boolean,
  gapCenterX: number,
  halfGap: number,
  facing: 'n' | 's',
): void {
  if (!hasGap) {
    walls.push(wallSegment({ x, y, width, height: thickness }, 'h', facing));
    return;
  }
  const gapLeft = gapCenterX - halfGap;
  const gapRight = gapCenterX + halfGap;
  const leftW = Math.max(0, gapLeft - x);
  const rightW = Math.max(0, x + width - gapRight);
  if (leftW > 0) walls.push(wallSegment({ x, y, width: leftW, height: thickness }, 'h', facing));
  if (rightW > 0) walls.push(wallSegment({ x: gapRight, y, width: rightW, height: thickness }, 'h', facing));
}

function addVerticalWall(
  walls: DungeonWall[],
  x: number,
  y: number,
  height: number,
  thickness: number,
  hasGap: boolean,
  gapCenterY: number,
  halfGap: number,
  facing: 'w' | 'e',
): void {
  if (!hasGap) {
    walls.push(wallSegment({ x, y, width: thickness, height }, 'v', facing));
    return;
  }
  const gapTop = gapCenterY - halfGap;
  const gapBot = gapCenterY + halfGap;
  const topH = Math.max(0, gapTop - y);
  const botH = Math.max(0, y + height - gapBot);
  if (topH > 0) walls.push(wallSegment({ x, y, width: thickness, height: topH }, 'v', facing));
  if (botH > 0) walls.push(wallSegment({ x, y: gapBot, width: thickness, height: botH }, 'v', facing));
}

function addCorridorCaps(walls: DungeonWall[], corridor: Rect): void {
  const t = WALL_THICKNESS;
  walls.push(
    wallSegment({ x: corridor.x, y: corridor.y - t, width: corridor.width, height: t }, 'h', 'n'),
  );
  walls.push(
    wallSegment(
      { x: corridor.x, y: corridor.y + corridor.height, width: corridor.width, height: t },
      'h',
      's',
    ),
  );
}

function addSideCorridorCaps(walls: DungeonWall[], corridor: Rect): void {
  const t = WALL_THICKNESS;
  walls.push(
    wallSegment({ x: corridor.x - t, y: corridor.y, width: t, height: corridor.height }, 'v', 'w'),
  );
  walls.push(
    wallSegment(
      { x: corridor.x + corridor.width, y: corridor.y, width: t, height: corridor.height },
      'v',
      'e',
    ),
  );
}

const WORLD_PADDING = 48;

function shiftRect(rect: Rect, dx: number, dy: number): void {
  rect.x += dx;
  rect.y += dy;
}

function shiftPoint(p: { x: number; y: number }, dx: number, dy: number): void {
  p.x += dx;
  p.y += dy;
}

/** Garante que nada fique com coordenada negativa e recalcula bounds do mundo. */
function normalizeDungeonLayout(layout: DungeonLayout): DungeonLayout {
  const xs: number[] = [];
  const ys: number[] = [];

  for (const room of layout.rooms) {
    xs.push(room.rect.x, room.rect.x + room.rect.width);
    ys.push(room.rect.y, room.rect.y + room.rect.height);
  }
  for (const floor of layout.floors) {
    xs.push(floor.x, floor.x + floor.width);
    ys.push(floor.y, floor.y + floor.height);
  }
  xs.push(layout.spawn.x, layout.portal.x);
  ys.push(layout.spawn.y, layout.portal.y);

  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const dx = minX < WORLD_PADDING ? WORLD_PADDING - minX : 0;
  const dy = minY < WORLD_PADDING ? WORLD_PADDING - minY : 0;

  if (dx !== 0 || dy !== 0) {
    for (const room of layout.rooms) shiftRect(room.rect, dx, dy);
    for (const floor of layout.floors) shiftRect(floor, dx, dy);
    for (const wall of layout.walls) shiftRect(wall, dx, dy);
    for (const gate of layout.bossGateWalls) shiftRect(gate, dx, dy);
    for (const h of layout.hazards) {
      h.x += dx;
      h.y += dy;
    }
    for (const d of layout.decor) {
      d.x += dx;
      d.y += dy;
    }
    for (const obs of layout.obstacles) {
      obs.x += dx;
      obs.y += dy;
    }
    for (const chest of layout.chests) {
      chest.x += dx;
      chest.y += dy;
    }
    for (const spawn of layout.enemySpawns) {
      spawn.x += dx;
      spawn.y += dy;
    }
    for (const item of layout.interactables) {
      item.x += dx;
      item.y += dy;
    }
    shiftPoint(layout.spawn, dx, dy);
    shiftPoint(layout.portal, dx, dy);
  }

  const maxX = Math.max(
    ...layout.rooms.map((r) => r.rect.x + r.rect.width),
    ...layout.floors.map((f) => f.x + f.width),
  );
  const maxY = Math.max(
    ...layout.rooms.map((r) => r.rect.y + r.rect.height),
    ...layout.floors.map((f) => f.y + f.height),
  );

  layout.width = maxX + WORLD_PADDING;
  layout.height = maxY + WORLD_PADDING;

  const spawnRoom = layout.rooms[0]!;
  layout.spawn = {
    x: spawnRoom.rect.x + 52,
    y: spawnRoom.rect.y + spawnRoom.rect.height / 2,
  };
  const portalRoom = layout.rooms.find((r) => r.index === layout.portalRoomIndex)!;
  layout.portal = {
    x: portalRoom.rect.x + portalRoom.rect.width / 2,
    y: portalRoom.rect.y + portalRoom.rect.height / 2,
  };

  return layout;
}

function validateLayout(layout: DungeonLayout): boolean {
  const spawnRoom = layout.rooms.find((r) => r.index === 0);
  if (!spawnRoom || spawnRoom.doors.length === 0) return false;

  if (!isSpawnWalkable(layout)) return false;
  if (!isPortalWalkable(layout)) return false;
  if (!canLeaveSpawnRoom(layout)) return false;
  if (!allRoomsReachable(layout)) return false;
  if (!hasRequiredRoomTypes(layout)) return false;
  if (!areEnemySpawnsWalkable(layout)) return false;
  return true;
}

function hasRequiredRoomTypes(layout: DungeonLayout): boolean {
  const types = new Set(layout.rooms.map((r) => r.type));
  return types.has('boss') && types.has('treasure') && types.has('rest') && types.has('event');
}

function isPortalWalkable(layout: DungeonLayout): boolean {
  const { x, y } = layout.portal;
  if (!isPointWalkable(layout, x, y)) return false;
  for (const obs of layout.obstacles) {
    if (obs.kind !== 'rock') continue;
    const dx = x - obs.x;
    const dy = y - obs.y;
    if (dx * dx + dy * dy < (obs.radius + PLAYER_RADIUS + 8) ** 2) return false;
  }
  return true;
}

function isSpawnWalkable(layout: DungeonLayout): boolean {
  const { x, y } = layout.spawn;
  if (!isPointWalkable(layout, x, y)) return false;
  for (const obs of layout.obstacles) {
    if (obs.kind !== 'rock') continue;
    const dx = x - obs.x;
    const dy = y - obs.y;
    if (dx * dx + dy * dy < (obs.radius + PLAYER_RADIUS + 4) ** 2) return false;
  }
  return true;
}

function isPointWalkable(layout: DungeonLayout, x: number, y: number, radius = PLAYER_RADIUS): boolean {
  if (!isOnWalkableFloorPoint(x, y, radius, layout.floors)) return false;
  if (collidesCirclePoint(x, y, radius, layout.walls)) return false;
  for (const obs of layout.obstacles) {
    if (obs.kind !== 'hole') continue;
    const dx = x - obs.x;
    const dy = y - obs.y;
    if (dx * dx + dy * dy < (obs.radius + radius * 0.6) ** 2) return false;
  }
  return true;
}

function isOnWalkableFloorPoint(
  cx: number,
  cy: number,
  radius: number,
  floors: Rect[],
): boolean {
  for (const floor of floors) {
    if (circleHitsFloor(cx, cy, radius, floor)) return true;
  }
  return false;
}

function circleHitsFloor(cx: number, cy: number, radius: number, rect: Rect): boolean {
  const nearestX = Math.max(rect.x, Math.min(cx, rect.x + rect.width));
  const nearestY = Math.max(rect.y, Math.min(cy, rect.y + rect.height));
  const dx = cx - nearestX;
  const dy = cy - nearestY;
  return dx * dx + dy * dy < radius * radius;
}

function collidesCirclePoint(cx: number, cy: number, radius: number, walls: Rect[]): boolean {
  for (const wall of walls) {
    const nearestX = Math.max(wall.x, Math.min(cx, wall.x + wall.width));
    const nearestY = Math.max(wall.y, Math.min(cy, wall.y + wall.height));
    const dx = cx - nearestX;
    const dy = cy - nearestY;
    if (dx * dx + dy * dy < radius * radius) return true;
  }
  return false;
}

function canLeaveSpawnRoom(layout: DungeonLayout): boolean {
  const probes = [
    { x: 36, y: 0 },
    { x: -36, y: 0 },
    { x: 0, y: 36 },
    { x: 0, y: -36 },
  ];
  return probes.some((p) => isPointWalkable(layout, layout.spawn.x + p.x, layout.spawn.y + p.y));
}

function allRoomsReachable(layout: DungeonLayout): boolean {
  const adj = new Map<number, number[]>();
  for (const room of layout.rooms) adj.set(room.index, []);
  for (const link of layout.connections) {
    adj.get(link.a)!.push(link.b);
    adj.get(link.b)!.push(link.a);
  }
  const seen = new Set<number>([0]);
  const queue = [0];
  while (queue.length > 0) {
    const id = queue.shift()!;
    for (const next of adj.get(id) ?? []) {
      if (seen.has(next)) continue;
      seen.add(next);
      queue.push(next);
    }
  }
  return seen.size === layout.rooms.length;
}
