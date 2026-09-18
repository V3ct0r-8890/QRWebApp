import { buildVCardPayload } from '../qr/encode';
import { downloadCanvasAsPng, renderQrToCanvas } from '../qr/render';
import {
  CardLimitError,
  MAX_CARDS,
  deleteCard,
  generateCardId,
  listCards,
  saveCard,
  type CardProfile,
} from '../cards/store';
import { resizeImageToDataUrl } from '../util/image';
import { composeCardImage } from '../cards/composeCardImage';

export function renderCardsTab(container: HTMLElement): void {
  let editingId: string | null = null;

  function renderList(): void {
    const cards = listCards();
    container.innerHTML = `
      <p>${cards.length} / ${MAX_CARDS} saved cards</p>
      <div class="card-list" id="card-list"></div>
      <button class="primary" id="add-card-btn" type="button" ${cards.length >= MAX_CARDS ? 'disabled' : ''}>
        + New card
      </button>
      <p class="error-text" id="list-error" hidden></p>
      <div id="editor-slot"></div>
    `;

    const listEl = container.querySelector<HTMLDivElement>('#card-list')!;
    if (cards.length === 0) {
      listEl.innerHTML = `<div class="empty-state">No saved cards yet — add one below.</div>`;
    }
    for (const card of cards) {
      const row = document.createElement('div');
      row.className = 'card-item';
      row.innerHTML = `
        <span>${escapeHtml(card.label)} — ${escapeHtml(card.fullName)}</span>
        <span class="row" style="flex:none;">
          <button class="secondary" data-action="view" data-id="${card.id}" type="button">View</button>
          <button class="secondary danger" data-action="delete" data-id="${card.id}" type="button">Delete</button>
        </span>
      `;
      listEl.appendChild(row);
    }

    listEl.addEventListener('click', (e) => {
      const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('button[data-action]');
      if (!btn) return;
      const id = btn.dataset.id!;
      if (btn.dataset.action === 'delete') {
        deleteCard(id);
        renderList();
      } else if (btn.dataset.action === 'view') {
        showViewer(id);
      }
    });

    container.querySelector<HTMLButtonElement>('#add-card-btn')!.addEventListener('click', () => {
      editingId = null;
      showEditor(null);
    });
  }

  function showViewer(id: string): void {
    const card = listCards().find((c) => c.id === id);
    if (!card) return;
    const slot = container.querySelector<HTMLDivElement>('#editor-slot')!;
    slot.innerHTML = `
      <div class="qr-output">
        <div class="card-preview-inner">
          ${card.logo ? `<img class="card-logo" src="${card.logo}" alt="" />` : ''}
          <div class="card-body">
            <canvas id="card-canvas"></canvas>
            <div class="card-info">
              <p class="card-name">${escapeHtml(card.fullName)}</p>
              ${card.title ? `<p>${escapeHtml(card.title)}</p>` : ''}
              ${card.org ? `<p>${escapeHtml(card.org)}</p>` : ''}
              ${card.email ? `<p>${escapeHtml(card.email)}</p>` : ''}
              ${card.phone ? `<p>${escapeHtml(card.phone)}</p>` : ''}
            </div>
          </div>
        </div>
        <div class="row">
          <button class="secondary" id="card-download-qr" type="button">Download QR</button>
          <button class="secondary" id="card-download-card" type="button">Download card image</button>
        </div>
        <button class="secondary" id="card-edit" type="button">Edit</button>
        <p class="error-text" id="card-compose-error" hidden></p>
      </div>
    `;
    const canvas = slot.querySelector<HTMLCanvasElement>('#card-canvas')!;
    const composeErrorEl = slot.querySelector<HTMLParagraphElement>('#card-compose-error')!;
    void renderQrToCanvas(canvas, buildVCardPayload(card));
    slot.querySelector<HTMLButtonElement>('#card-download-qr')!.addEventListener('click', () => {
      downloadCanvasAsPng(canvas, `${card.label || 'card'}-qr`);
    });
    slot.querySelector<HTMLButtonElement>('#card-download-card')!.addEventListener('click', () => {
      composeErrorEl.hidden = true;
      composeCardImage(card, canvas)
        .then((composed) => downloadCanvasAsPng(composed, `${card.label || 'card'}`))
        .catch((err) => {
          composeErrorEl.textContent = err instanceof Error ? err.message : 'Could not compose the card image.';
          composeErrorEl.hidden = false;
        });
    });
    slot.querySelector<HTMLButtonElement>('#card-edit')!.addEventListener('click', () => {
      editingId = id;
      showEditor(card);
    });
  }

  function showEditor(existing: CardProfile | null): void {
    const slot = container.querySelector<HTMLDivElement>('#editor-slot')!;
    slot.innerHTML = `
      <div class="field">
        <label for="c-logo">Logo</label>
        <div class="logo-upload-row">
          <img id="c-logo-preview" alt="" hidden />
          <input id="c-logo" type="file" accept="image/*" style="width:auto;min-height:auto;" />
          <button class="secondary" id="c-logo-remove" type="button" hidden>Remove</button>
        </div>
      </div>
      <div class="field"><label for="c-label">Slot label</label><input id="c-label" /></div>
      <div class="field"><label for="c-name">Full name *</label><input id="c-name" /></div>
      <div class="field"><label for="c-org">Organization</label><input id="c-org" /></div>
      <div class="field"><label for="c-title">Title</label><input id="c-title" /></div>
      <div class="field"><label for="c-phone">Phone</label><input id="c-phone" type="tel" /></div>
      <div class="field"><label for="c-email">Email</label><input id="c-email" type="email" /></div>
      <div class="field"><label for="c-url">Website</label><input id="c-url" type="text" /></div>
      <div class="field"><label for="c-note">Note</label><textarea id="c-note" rows="2"></textarea></div>
      <div class="row">
        <button class="primary" id="c-save" type="button">Save</button>
        <button class="secondary" id="c-cancel" type="button">Cancel</button>
      </div>
      <p class="error-text" id="c-error" hidden></p>
    `;

    let logoDataUrl: string | undefined = existing?.logo;
    const logoInput = slot.querySelector<HTMLInputElement>('#c-logo')!;
    const logoPreview = slot.querySelector<HTMLImageElement>('#c-logo-preview')!;
    const logoRemoveBtn = slot.querySelector<HTMLButtonElement>('#c-logo-remove')!;

    function refreshLogoPreview(): void {
      if (logoDataUrl) {
        logoPreview.src = logoDataUrl;
        logoPreview.hidden = false;
        logoRemoveBtn.hidden = false;
      } else {
        logoPreview.hidden = true;
        logoRemoveBtn.hidden = true;
      }
    }
    refreshLogoPreview();

    logoInput.addEventListener('change', () => {
      const file = logoInput.files?.[0];
      if (!file) return;
      resizeImageToDataUrl(file, 160)
        .then((dataUrl) => {
          logoDataUrl = dataUrl;
          refreshLogoPreview();
        })
        .catch((err) => {
          errorEl.textContent = err instanceof Error ? err.message : 'Could not process the image.';
          errorEl.hidden = false;
        });
    });
    logoRemoveBtn.addEventListener('click', () => {
      logoDataUrl = undefined;
      logoInput.value = '';
      refreshLogoPreview();
    });

    const fields: Record<string, HTMLInputElement | HTMLTextAreaElement> = {
      label: slot.querySelector('#c-label')!,
      fullName: slot.querySelector('#c-name')!,
      org: slot.querySelector('#c-org')!,
      title: slot.querySelector('#c-title')!,
      phone: slot.querySelector('#c-phone')!,
      email: slot.querySelector('#c-email')!,
      url: slot.querySelector('#c-url')!,
      note: slot.querySelector('#c-note')!,
    };
    const errorEl = slot.querySelector<HTMLParagraphElement>('#c-error')!;
    if (existing) {
      fields.label.value = existing.label;
      fields.fullName.value = existing.fullName;
      fields.org.value = existing.org ?? '';
      fields.title.value = existing.title ?? '';
      fields.phone.value = existing.phone ?? '';
      fields.email.value = existing.email ?? '';
      fields.url.value = existing.url ?? '';
      fields.note.value = existing.note ?? '';
    }

    slot.querySelector<HTMLButtonElement>('#c-save')!.addEventListener('click', () => {
      errorEl.hidden = true;
      const fullName = fields.fullName.value.trim();
      if (!fullName) {
        errorEl.textContent = 'Full name is required.';
        errorEl.hidden = false;
        return;
      }
      const card: CardProfile = {
        id: existing?.id ?? editingId ?? generateCardId(),
        label: fields.label.value.trim() || fullName,
        fullName,
        org: fields.org.value.trim() || undefined,
        title: fields.title.value.trim() || undefined,
        phone: fields.phone.value.trim() || undefined,
        email: fields.email.value.trim() || undefined,
        url: fields.url.value.trim() || undefined,
        note: fields.note.value.trim() || undefined,
        logo: logoDataUrl,
      };
      try {
        saveCard(card);
        editingId = null;
        renderList();
      } catch (err) {
        if (err instanceof CardLimitError) {
          errorEl.textContent = err.message;
          errorEl.hidden = false;
        } else {
          throw err;
        }
      }
    });

    slot.querySelector<HTMLButtonElement>('#c-cancel')!.addEventListener('click', () => {
      editingId = null;
      slot.innerHTML = '';
    });
  }

  function escapeHtml(s: string): string {
    const div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
  }

  renderList();
}
