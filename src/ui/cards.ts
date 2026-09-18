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
      <div id="editor-slot"></div>
      <p>${cards.length} / ${MAX_CARDS} saved cards</p>
      <div class="card-list" id="card-list"></div>
      <button class="primary" id="add-card-btn" type="button" ${cards.length >= MAX_CARDS ? 'disabled' : ''}>
        + New card
      </button>
      <p class="error-text" id="list-error" hidden></p>
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
    const cards = listCards();
    if (cards.length === 0) return;
    const startIndex = cards.findIndex((c) => c.id === id);
    let index = startIndex >= 0 ? startIndex : 0;

    const slot = container.querySelector<HTMLDivElement>('#editor-slot')!;
    slot.innerHTML = `
      <div class="qr-output">
        <div class="card-viewer" id="card-viewer">
          <button class="card-nav-btn" id="card-nav-up" type="button" aria-label="Previous card" ${cards.length < 2 ? 'hidden' : ''}>▲</button>
          <div class="card-preview-inner" id="card-preview-host"></div>
          <button class="card-nav-btn" id="card-nav-down" type="button" aria-label="Next card" ${cards.length < 2 ? 'hidden' : ''}>▼</button>
        </div>
        <p class="card-position" id="card-position" ${cards.length < 2 ? 'hidden' : ''}></p>
        <div class="row">
          <button class="secondary" id="card-download-qr" type="button">Download QR</button>
          <button class="secondary" id="card-download-card" type="button">Download card image</button>
        </div>
        <button class="secondary" id="card-edit" type="button">Edit</button>
        <p class="error-text" id="card-compose-error" hidden></p>
      </div>
    `;
    const viewerEl = slot.querySelector<HTMLDivElement>('#card-viewer')!;
    const host = slot.querySelector<HTMLDivElement>('#card-preview-host')!;
    const positionEl = slot.querySelector<HTMLParagraphElement>('#card-position')!;
    const composeErrorEl = slot.querySelector<HTMLParagraphElement>('#card-compose-error')!;
    const navUp = slot.querySelector<HTMLButtonElement>('#card-nav-up')!;
    const navDown = slot.querySelector<HTMLButtonElement>('#card-nav-down')!;

    // Per-card caches, keyed by card id — populated once (in the background,
    // for all cards, right away) and reused on every scroll/swipe so moving
    // between cards is instant rather than re-rendering each time.
    const qrCache = new Map<string, HTMLCanvasElement>();
    const composedCache = new Map<string, HTMLCanvasElement>();

    async function getQrCanvas(card: CardProfile): Promise<HTMLCanvasElement> {
      const cached = qrCache.get(card.id);
      if (cached) return cached;
      const c = document.createElement('canvas');
      await renderQrToCanvas(c, buildVCardPayload(card));
      qrCache.set(card.id, c);
      return c;
    }

    async function composeFor(card: CardProfile): Promise<HTMLCanvasElement> {
      const cached = composedCache.get(card.id);
      if (cached) return cached;
      const qrCanvas = await getQrCanvas(card);
      // The on-screen preview renders the SAME composed canvas that gets
      // downloaded, so the two can never drift apart.
      const composed = await composeCardImage(card, qrCanvas);
      composed.className = 'card-canvas-preview';
      composedCache.set(card.id, composed);
      return composed;
    }

    function preloadAll(): void {
      for (const c of cards) {
        void composeFor(c).catch(() => {
          // Best-effort — a failed preload just means that one card falls
          // back to on-demand rendering when scrolled to.
        });
      }
    }

    async function renderCurrent(): Promise<void> {
      composeErrorEl.hidden = true;
      const card = cards[index];
      positionEl.textContent = `${index + 1} / ${cards.length}`;
      try {
        const composed = await composeFor(card);
        host.innerHTML = '';
        host.appendChild(composed);
      } catch (err) {
        composeErrorEl.textContent = err instanceof Error ? err.message : 'Could not render the card preview.';
        composeErrorEl.hidden = false;
      }
    }

    function go(delta: number): void {
      index = (index + delta + cards.length) % cards.length;
      void renderCurrent();
    }

    preloadAll();
    void renderCurrent();

    navUp.addEventListener('click', () => go(-1));
    navDown.addEventListener('click', () => go(1));

    let wheelLocked = false;
    viewerEl.addEventListener(
      'wheel',
      (e) => {
        if (cards.length < 2) return;
        e.preventDefault();
        if (wheelLocked) return;
        wheelLocked = true;
        go(e.deltaY > 0 ? 1 : -1);
        setTimeout(() => {
          wheelLocked = false;
        }, 350);
      },
      { passive: false },
    );

    let touchStartY: number | null = null;
    viewerEl.addEventListener(
      'touchstart',
      (e) => {
        touchStartY = e.touches[0]?.clientY ?? null;
      },
      { passive: true },
    );
    viewerEl.addEventListener(
      'touchend',
      (e) => {
        if (touchStartY === null || cards.length < 2) return;
        const endY = e.changedTouches[0]?.clientY ?? touchStartY;
        const delta = touchStartY - endY;
        touchStartY = null;
        if (Math.abs(delta) < 30) return; // ignore taps / small jitter
        go(delta > 0 ? 1 : -1);
      },
      { passive: true },
    );

    slot.querySelector<HTMLButtonElement>('#card-download-qr')!.addEventListener('click', () => {
      const card = cards[index];
      void getQrCanvas(card).then((qrCanvas) => {
        downloadCanvasAsPng(qrCanvas, `${card.label || 'card'}-qr`);
      });
    });
    slot.querySelector<HTMLButtonElement>('#card-download-card')!.addEventListener('click', () => {
      composeErrorEl.hidden = true;
      const card = cards[index];
      composeFor(card)
        .then((composed) => downloadCanvasAsPng(composed, `${card.label || 'card'}`))
        .catch((err) => {
          composeErrorEl.textContent = err instanceof Error ? err.message : 'Could not compose the card image.';
          composeErrorEl.hidden = false;
        });
    });
    slot.querySelector<HTMLButtonElement>('#card-edit')!.addEventListener('click', () => {
      const card = cards[index];
      editingId = card.id;
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
      <div class="field"><label for="c-address">Address</label><textarea id="c-address" rows="2"></textarea></div>
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
      address: slot.querySelector('#c-address')!,
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
      fields.address.value = existing.address ?? '';
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
        address: fields.address.value.trim() || undefined,
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
