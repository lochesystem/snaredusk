import type { Rect } from '../types.ts';

export const PLAYER_RADIUS = 10;
export const WALL_THICKNESS = 14;
export const CORRIDOR_WIDTH = 52;
export const ROOM_W = 240;
export const ROOM_H = 180;
export const CORRIDOR_H_LEN = 64;
export const CORRIDOR_V_LEN = 48;

export type DoorDir = 'n' | 's' | 'e' | 'w';

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
  kind: 'mushroom';
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
}

export interface DungeonChest {
  roomIndex: number;
  x: number;
  y: number;
  lootId: string;
}

export interface DungeonLayout {
  width: number;
  height: number;
  rooms: RoomLayout[];
  floors: Rect[];
  walls: Rect[];
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

const ENEMY_SPECIES = ['esporo_dorminhoco', 'lumimorcego', 'carapaca_musgo'] as const;
const CHEST_LOOT = ['cogumelo_comum', 'fibra_musgo', 'esporo_brilhante'] as const;

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

export function generateDungeon(seed?: number): DungeonLayout {
  const baseSeed = seed ?? Date.now();
  for (let attempt = 0; attempt < 24; attempt++) {
    const layout = buildDungeon(baseSeed + attempt * 7919);
    if (validateLayout(layout)) return layout;
  }
  return buildDungeon(baseSeed);
}

function buildDungeon(seed: number): DungeonLayout {
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

  const floors: Rect[] = [];
  const walls: Rect[] = [];

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
        x: left.rect.x + ROOM_W - WALL_THICKNESS,
        y: left.rect.y + ROOM_H / 2 - half,
        width: CORRIDOR_H_LEN + WALL_THICKNESS * 2,
        height: CORRIDOR_WIDTH,
      };
      floors.push(corridor);
      addCorridorCaps(walls, corridor);
    } else {
      const upper = edge.dir === 's' ? a : b;
      const half = CORRIDOR_WIDTH / 2;
      const corridor: Rect = {
        x: upper.rect.x + ROOM_W / 2 - half,
        y: upper.rect.y + ROOM_H - WALL_THICKNESS,
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
    populateRoomDecor(room, rng, decor, reserved, safeZones);
    if (room.type === 'combat') {
      populateRoomObstacles(room, rng, obstacles, reserved, safeZones);
    }
    if (room.type === 'treasure') {
      populateTreasureRoom(room, rng, chests, reserved, safeZones);
    } else if (room.type === 'combat' && room.index !== 0) {
      maybeAddChest(room, rng, chests, reserved, safeZones);
    }
  }

  for (const obs of obstacles) {
    if (obs.kind === 'rock') {
      const s = obs.radius;
      walls.push({ x: obs.x - s, y: obs.y - s, width: s * 2, height: s * 2 });
    }
  }

  const interactables = buildInteractables(rooms, reserved, safeZones, rng);
  const enemySpawns = pickEnemySpawns(rooms, rng, safeZones);

  const connections = edges.map((e) => ({ a: e.a, b: e.b }));

  return normalizeDungeonLayout({
    width: 0,
    height: 0,
    rooms,
    floors,
    walls,
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
      lootId: CHEST_LOOT[randInt(rng, 0, CHEST_LOOT.length - 1)]!,
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
): DungeonEnemySpawn[] {
  const spawns: DungeonEnemySpawn[] = [];

  for (const room of rooms) {
    if (room.type === 'combat' && room.index !== 0) {
      const count = randInt(rng, 1, 2);
      for (let i = 0; i < count; i++) {
        const speciesId = ENEMY_SPECIES[randInt(rng, 0, ENEMY_SPECIES.length - 1)]!;
        const pt = randomInteriorPoint(room, rng, [], 36, safeZones);
        const cx = room.rect.x + room.rect.width / 2;
        const cy = room.rect.y + room.rect.height / 2;
        spawns.push({
          speciesId,
          roomIndex: room.index,
          x: pt?.x ?? cx,
          y: pt?.y ?? cy,
        });
      }
    }

    if (room.type === 'boss') {
      const pt = randomInteriorPoint(room, rng, [], 48, safeZones);
      const cx = room.rect.x + room.rect.width / 2;
      const cy = room.rect.y + room.rect.height / 2 + 20;
      spawns.push({
        speciesId: 'rei_esporas',
        roomIndex: room.index,
        x: pt?.x ?? cx,
        y: pt?.y ?? cy,
        isBoss: true,
      });
    }
  }

  return spawns;
}

function populateRoomDecor(
  room: RoomLayout,
  rng: Rng,
  decor: DungeonDecor[],
  reserved: { x: number; y: number }[],
  safeZones: SafeZone[],
): void {
  const count = randInt(rng, 4, 8);
  for (let i = 0; i < count; i++) {
    const pt = randomInteriorPoint(room, rng, reserved, 22, safeZones);
    if (!pt) continue;
    reserved.push(pt);
    decor.push({
      kind: 'mushroom',
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
): void {
  if (rng() > 0.55) return;

  const rockCount = randInt(rng, 0, 2);
  for (let i = 0; i < rockCount; i++) {
    const rockRadius = 10 + randInt(rng, 0, 4);
    const pt = randomInteriorPoint(room, rng, reserved, 36, safeZones, rockRadius);
    if (!pt) continue;
    reserved.push(pt);
    obstacles.push({
      kind: 'rock',
      x: pt.x,
      y: pt.y,
      radius: rockRadius,
      roomIndex: room.index,
    });
  }

  if (rng() < 0.35) {
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
    lootId: CHEST_LOOT[randInt(rng, 0, CHEST_LOOT.length - 1)]!,
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

function addRoomWalls(room: RoomLayout, walls: Rect[]): void {
  const { rect, doors } = room;
  const t = WALL_THICKNESS;
  const half = CORRIDOR_WIDTH / 2;
  const cx = rect.x + rect.width / 2;
  const cy = rect.y + rect.height / 2;

  addHorizontalWall(walls, rect.x, rect.y, rect.width, t, doors.includes('n'), cx, half);
  addHorizontalWall(
    walls,
    rect.x,
    rect.y + rect.height - t,
    rect.width,
    t,
    doors.includes('s'),
    cx,
    half,
  );
  addVerticalWall(walls, rect.x, rect.y, rect.height, t, doors.includes('w'), cy, half);
  addVerticalWall(
    walls,
    rect.x + rect.width - t,
    rect.y,
    rect.height,
    t,
    doors.includes('e'),
    cy,
    half,
  );
}

function addHorizontalWall(
  walls: Rect[],
  x: number,
  y: number,
  width: number,
  thickness: number,
  hasGap: boolean,
  gapCenterX: number,
  halfGap: number,
): void {
  if (!hasGap) {
    walls.push({ x, y, width, height: thickness });
    return;
  }
  const gapLeft = gapCenterX - halfGap;
  const gapRight = gapCenterX + halfGap;
  const leftW = Math.max(0, gapLeft - x);
  const rightW = Math.max(0, x + width - gapRight);
  if (leftW > 0) walls.push({ x, y, width: leftW, height: thickness });
  if (rightW > 0) walls.push({ x: gapRight, y, width: rightW, height: thickness });
}

function addVerticalWall(
  walls: Rect[],
  x: number,
  y: number,
  height: number,
  thickness: number,
  hasGap: boolean,
  gapCenterY: number,
  halfGap: number,
): void {
  if (!hasGap) {
    walls.push({ x, y, width: thickness, height });
    return;
  }
  const gapTop = gapCenterY - halfGap;
  const gapBot = gapCenterY + halfGap;
  const topH = Math.max(0, gapTop - y);
  const botH = Math.max(0, y + height - gapBot);
  if (topH > 0) walls.push({ x, y, width: thickness, height: topH });
  if (botH > 0) walls.push({ x, y: gapBot, width: thickness, height: botH });
}

function addCorridorCaps(walls: Rect[], corridor: Rect): void {
  const t = WALL_THICKNESS;
  walls.push({ x: corridor.x, y: corridor.y - t, width: corridor.width, height: t });
  walls.push({
    x: corridor.x,
    y: corridor.y + corridor.height,
    width: corridor.width,
    height: t,
  });
}

function addSideCorridorCaps(walls: Rect[], corridor: Rect): void {
  const t = WALL_THICKNESS;
  walls.push({ x: corridor.x - t, y: corridor.y, width: t, height: corridor.height });
  walls.push({
    x: corridor.x + corridor.width,
    y: corridor.y,
    width: t,
    height: corridor.height,
  });
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

function isPointWalkable(layout: DungeonLayout, x: number, y: number): boolean {
  if (!isOnWalkableFloorPoint(x, y, PLAYER_RADIUS, layout.floors)) return false;
  if (collidesCirclePoint(x, y, PLAYER_RADIUS, layout.walls)) return false;
  for (const obs of layout.obstacles) {
    if (obs.kind !== 'hole') continue;
    const dx = x - obs.x;
    const dy = y - obs.y;
    if (dx * dx + dy * dy < (obs.radius + PLAYER_RADIUS * 0.6) ** 2) return false;
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
