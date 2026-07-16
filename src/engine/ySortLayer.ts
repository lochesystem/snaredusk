import { Container } from 'pixi.js';

type Sortable = Container & { zOffset?: number };

/** Container que reordena filhos por Y a cada frame (profundidade oblíqua). */
export class YSortLayer extends Container {
  resort(): void {
    this.children.sort((a, b) => {
      const ay = (a as Sortable).y + ((a as Sortable).zOffset ?? 0);
      const by = (b as Sortable).y + ((b as Sortable).zOffset ?? 0);
      return ay - by;
    });
  }
}
