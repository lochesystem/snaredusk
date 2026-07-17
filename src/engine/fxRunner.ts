export interface FxHandle {
  cancel: () => void;
}

interface FxEntry {
  life: number;
  maxLife: number;
  onTick: (progress: number, dt: number) => void;
  onDone: () => void;
}

/** Atualiza FX efêmeros no ticker do jogo (evita requestAnimationFrame solto). */
export class FxRunner {
  private entries: FxEntry[] = [];

  spawn(
    maxLife: number,
    onTick: (progress: number, dt: number) => void,
    onDone: () => void,
  ): FxHandle {
    const entry: FxEntry = { life: maxLife, maxLife, onTick, onDone };
    this.entries.push(entry);
    return {
      cancel: () => {
        const idx = this.entries.indexOf(entry);
        if (idx >= 0) {
          this.entries.splice(idx, 1);
          onDone();
        }
      },
    };
  }

  update(dt: number): void {
    for (let i = this.entries.length - 1; i >= 0; i--) {
      const e = this.entries[i]!;
      e.life -= dt;
      const progress = 1 - e.life / e.maxLife;
      e.onTick(progress, dt);
      if (e.life <= 0) {
        e.onDone();
        this.entries.splice(i, 1);
      }
    }
  }

  clear(): void {
    for (const e of this.entries) e.onDone();
    this.entries = [];
  }
}
