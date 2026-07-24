export interface QuantityPickerOptions {
  title: string;
  itemName: string;
  max: number;
  actionLabel?: string;
  onConfirm: (quantity: number) => void;
}

let activeConfirm: ((quantity: number) => void) | null = null;

function ensureQuantityPicker(): {
  modal: HTMLElement;
  title: HTMLElement;
  item: HTMLElement;
  input: HTMLInputElement;
  confirm: HTMLButtonElement;
} {
  let modal = document.getElementById('quantity-picker-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'quantity-picker-modal';
    modal.className = 'modal hidden quantity-picker-modal';
    modal.innerHTML = `
      <div class="modal-content quantity-picker-content" role="dialog" aria-modal="true">
        <div class="modal-title-row">
          <div>
            <p class="modal-kicker">Selecionar quantidade</p>
            <h3 id="quantity-picker-title">Mover item</h3>
          </div>
          <button id="quantity-picker-close" class="modal-close-icon" type="button" aria-label="Fechar">×</button>
        </div>
        <p id="quantity-picker-item" class="panel-hint"></p>
        <div class="quantity-picker-row">
          <button id="quantity-picker-one" type="button">1 unidade</button>
          <button id="quantity-picker-all" type="button">Tudo</button>
        </div>
        <label class="quantity-picker-field">
          <span>Quantidade</span>
          <input id="quantity-picker-input" type="number" min="1" step="1" inputmode="numeric">
        </label>
        <button id="quantity-picker-confirm" class="quantity-picker-confirm" type="button">Mover</button>
      </div>
    `;
    document.body.appendChild(modal);

    const close = () => closeQuantityPicker();
    modal.querySelector('#quantity-picker-close')?.addEventListener('click', close);
    modal.addEventListener('click', (event) => {
      if (event.target === modal) close();
    });
    modal.querySelector('#quantity-picker-one')?.addEventListener('click', () => confirmQuantity(1));
    modal.querySelector('#quantity-picker-all')?.addEventListener('click', () => {
      const input = modal!.querySelector('#quantity-picker-input') as HTMLInputElement;
      confirmQuantity(Number(input.max));
    });
    modal.querySelector('#quantity-picker-confirm')?.addEventListener('click', () => {
      const input = modal!.querySelector('#quantity-picker-input') as HTMLInputElement;
      confirmQuantity(Number(input.value));
    });
  }

  return {
    modal,
    title: modal.querySelector('#quantity-picker-title') as HTMLElement,
    item: modal.querySelector('#quantity-picker-item') as HTMLElement,
    input: modal.querySelector('#quantity-picker-input') as HTMLInputElement,
    confirm: modal.querySelector('#quantity-picker-confirm') as HTMLButtonElement,
  };
}

function confirmQuantity(requested: number): void {
  const input = document.getElementById('quantity-picker-input') as HTMLInputElement | null;
  const max = Number(input?.max ?? 1);
  const quantity = Math.max(1, Math.min(Math.floor(requested || 1), max));
  const confirm = activeConfirm;
  closeQuantityPicker();
  confirm?.(quantity);
}

export function openQuantityPicker(options: QuantityPickerOptions): void {
  if (options.max <= 1) {
    options.onConfirm(1);
    return;
  }
  const refs = ensureQuantityPicker();
  refs.title.textContent = options.title;
  refs.item.textContent = `${options.itemName} — disponível: ${options.max}`;
  refs.input.min = '1';
  refs.input.max = String(options.max);
  refs.input.value = String(options.max);
  refs.confirm.textContent = options.actionLabel ?? 'Confirmar';
  activeConfirm = options.onConfirm;
  refs.modal.classList.remove('hidden');
  refs.input.focus();
  refs.input.select();
}

export function closeQuantityPicker(): void {
  activeConfirm = null;
  document.getElementById('quantity-picker-modal')?.classList.add('hidden');
}
