let onConfirm: (() => void) | null = null;

export function bindAbandonModal(): void {
  document.getElementById('abandon-cancel')?.addEventListener('click', () => {
    closeAbandonModal();
  });
  document.getElementById('abandon-confirm')?.addEventListener('click', () => {
    const cb = onConfirm;
    closeAbandonModal();
    cb?.();
  });
}

export function openAbandonModal(confirm: () => void): void {
  onConfirm = confirm;
  document.getElementById('abandon-modal')?.classList.remove('hidden');
}

export function closeAbandonModal(): void {
  onConfirm = null;
  document.getElementById('abandon-modal')?.classList.add('hidden');
}

export function isAbandonModalOpen(): boolean {
  const modal = document.getElementById('abandon-modal');
  return modal ? !modal.classList.contains('hidden') : false;
}
