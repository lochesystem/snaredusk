import { WEAPONS } from '../data/weapons.ts';
import type { GameState } from '../types.ts';
import { WEAPON_HOTBAR_SLOTS } from '../systems/weaponHotbar.ts';

export interface HotbarIconRenderer {
  setIcon: (img: HTMLImageElement, weaponId: string) => void;
}

export function renderWeaponHotbar(state: GameState, icons: HotbarIconRenderer): void {
  const container = document.getElementById('hud-hotbar');
  if (!container) return;

  container.innerHTML = '';

  for (let i = 0; i < WEAPON_HOTBAR_SLOTS; i++) {
    const weaponId = state.weaponHotbar[i];
    const slot = document.createElement('div');
    slot.className = 'hotbar-slot';
    if (!weaponId) slot.classList.add('empty');
    else if (state.equippedWeaponId === weaponId) slot.classList.add('selected');

    const key = document.createElement('span');
    key.className = 'hotbar-key';
    key.textContent = String(i + 1);
    slot.appendChild(key);

    if (weaponId && WEAPONS[weaponId]) {
      const weapon = WEAPONS[weaponId];
      const icon = document.createElement('img');
      icon.className = 'hotbar-icon';
      icon.alt = weapon.name;
      icons.setIcon(icon, weaponId);
      slot.appendChild(icon);

      const label = document.createElement('span');
      label.className = 'hotbar-label';
      label.textContent = weapon.name.split(' ')[0] ?? weapon.name;
      label.title = `${weapon.name} · ATK ${weapon.atk}`;
      slot.appendChild(label);
    }

    container.appendChild(slot);
  }
}
