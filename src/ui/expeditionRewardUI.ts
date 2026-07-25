import {
  getExpeditionPerk,
  type ExpeditionPerkDef,
} from '../systems/expeditionPerks.ts';

export type ExpeditionRewardDecision =
  | { kind: 'continue'; perkId: string }
  | { kind: 'extract' };

let activeOverlay: HTMLDivElement | null = null;

export function closeExpeditionRewardUI(): void {
  activeOverlay?.remove();
  activeOverlay = null;
}

export function openExpeditionRewardUI(
  perkIds: readonly string[],
  floor: number,
): Promise<ExpeditionRewardDecision> {
  closeExpeditionRewardUI();
  const perks = perkIds
    .map(getExpeditionPerk)
    .filter((perk): perk is ExpeditionPerkDef => perk !== null);

  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'expedition-reward-overlay';
    overlay.innerHTML = `
      <section class="expedition-reward-panel" role="dialog" aria-modal="true"
        data-controller-scope="expedition-reward"
        aria-labelledby="expedition-reward-title">
        <p class="expedition-reward-kicker">Andar ${floor} concluído</p>
        <h2 id="expedition-reward-title">A passagem exige uma escolha</h2>
        <p class="expedition-reward-copy">
          Escolha uma bênção para seguir. O próximo andar restaura a stamina
          e recupera 5% da sua vida máxima.
        </p>
        <div class="expedition-perk-grid">
          ${perks.map((perk) => `
            <button class="expedition-perk-card" type="button" data-perk="${perk.id}">
              <span class="expedition-perk-rune" aria-hidden="true">${perk.rune}</span>
              <span class="expedition-perk-name">${perk.name}</span>
              <span class="expedition-perk-description">${perk.description}</span>
              <span class="expedition-perk-action">Escolher e prosseguir</span>
            </button>
          `).join('')}
        </div>
        <div class="expedition-extract-row">
          <div>
            <strong>Voltar em segurança</strong>
            <span>Leve toda a bolsa para a base e encerre esta expedição.</span>
          </div>
          <button class="expedition-extract-button" type="button">
            Extrair para a base
          </button>
        </div>
      </section>
    `;

    const finish = (decision: ExpeditionRewardDecision) => {
      closeExpeditionRewardUI();
      resolve(decision);
    };
    overlay.querySelectorAll<HTMLButtonElement>('[data-perk]').forEach((button) => {
      button.addEventListener('click', () => {
        const perkId = button.dataset.perk;
        if (perkId) finish({ kind: 'continue', perkId });
      });
    });
    overlay.querySelector<HTMLButtonElement>('.expedition-extract-button')
      ?.addEventListener('click', () => finish({ kind: 'extract' }));

    document.getElementById('game-wrapper')?.appendChild(overlay);
    activeOverlay = overlay;
    requestAnimationFrame(() => overlay.classList.add('visible'));
  });
}
