import { Container, Graphics } from 'pixi.js';
import { GAME_WIDTH } from '../engine/constants.ts';
import type { DungeonLayout } from '../world/dungeonGenerator.ts';

const MAP_W = 112;
const MAP_H = 84;
const MAP_MARGIN = 8;

export class DungeonMinimap {
  readonly container = new Container();
  private gfx = new Graphics();
  private explored = new Set<number>();
  private portalRoomIndex: number;

  constructor(portalRoomIndex: number) {
    this.portalRoomIndex = portalRoomIndex;
    this.container.addChild(this.gfx);
  }

  update(layout: DungeonLayout, playerX: number, playerY: number): void {
    for (const room of layout.rooms) {
      if (this.isInsideRoom(playerX, playerY, room.rect)) {
        this.explored.add(room.index);
      }
    }

    this.container.x = GAME_WIDTH - MAP_W - MAP_MARGIN;
    this.container.y = MAP_MARGIN;

    const minGx = Math.min(...layout.rooms.map((r) => r.gx));
    const maxGx = Math.max(...layout.rooms.map((r) => r.gx));
    const minGy = Math.min(...layout.rooms.map((r) => r.gy));
    const maxGy = Math.max(...layout.rooms.map((r) => r.gy));
    const gridW = maxGx - minGx + 1;
    const gridH = maxGy - minGy + 1;
    const innerW = MAP_W - 14;
    const innerH = MAP_H - 14;
    const cell = Math.min(innerW / gridW, innerH / gridH, 16);
    const originX = 7 + (innerW - gridW * cell) / 2;
    const originY = 7 + (innerH - gridH * cell) / 2;

    const roomCenter = (roomIndex: number): { x: number; y: number } | null => {
      const room = layout.rooms.find((r) => r.index === roomIndex);
      if (!room) return null;
      return {
        x: originX + (room.gx - minGx) * cell + cell / 2,
        y: originY + (room.gy - minGy) * cell + cell / 2,
      };
    };

    this.gfx.clear();

    this.gfx.roundRect(0, 0, MAP_W, MAP_H, 4);
    this.gfx.fill({ color: 0x080810, alpha: 0.92 });
    this.gfx.roundRect(0, 0, MAP_W, MAP_H, 4);
    this.gfx.stroke({ width: 2, color: 0x4a4a58 });

    for (const link of layout.connections) {
      if (!this.explored.has(link.a) || !this.explored.has(link.b)) continue;
      const ca = roomCenter(link.a);
      const cb = roomCenter(link.b);
      if (!ca || !cb) continue;
      this.gfx.moveTo(ca.x, ca.y);
      this.gfx.lineTo(cb.x, cb.y);
      this.gfx.stroke({ width: 2, color: 0x5a5a68 });
    }

    let currentRoomIndex = -1;
    for (const room of layout.rooms) {
      if (this.isInsideRoom(playerX, playerY, room.rect)) {
        currentRoomIndex = room.index;
      }
    }

    for (const room of layout.rooms) {
      if (!this.explored.has(room.index)) continue;

      const cx = originX + (room.gx - minGx) * cell + cell / 2;
      const cy = originY + (room.gy - minGy) * cell + cell / 2;
      const rw = cell * 0.82;
      const rh = cell * 0.72;
      const isCurrent = room.index === currentRoomIndex;
      const isPortal = room.index === this.portalRoomIndex;

      this.gfx.rect(cx - rw / 2, cy - rh / 2, rw, rh);
      if (isCurrent) {
        this.gfx.fill(0xe8e8f0);
      } else if (isPortal) {
        this.gfx.fill(0x8fd894);
      } else {
        this.gfx.fill(0x6a6a78);
      }
      this.gfx.rect(cx - rw / 2, cy - rh / 2, rw, rh);
      this.gfx.stroke({ width: 1, color: 0x2a2a34 });
    }

    if (currentRoomIndex >= 0 && this.explored.has(currentRoomIndex)) {
      const center = roomCenter(currentRoomIndex);
      if (center) {
        this.gfx.circle(center.x, center.y, 2.5);
        this.gfx.fill(0xffffff);
      }
    }
  }

  private isInsideRoom(
    x: number,
    y: number,
    rect: { x: number; y: number; width: number; height: number },
  ): boolean {
    return x >= rect.x && x <= rect.x + rect.width && y >= rect.y && y <= rect.y + rect.height;
  }
}
