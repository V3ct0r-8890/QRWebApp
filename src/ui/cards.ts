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
import { renderCarousel } from './carousel';

export function renderCardsTab(container: HTMLElement): void {
  let editingId: string | null = null;

  function renderTab(preferredId?: string): void {
    const cards = listCards();
    container.innerHTML = `
      <p>${cards.length} / ${MAX_CARDS} saved cards</p>
      <div id="carousel-slot"></div>
      <button class="primary" id="add-card-btn" type="button" ${cards.length >= MAX_CARDS ? 'disabled' : ''}>
        + New card
      </button>
      <p class="error-text" id="list-error" hidden></p>
      <div id="editor-slot"></div>
    `;

    // Per-card QR cache — shared between the carousel's compose step and the
    // "Download QR" button so a card's QR is only ever rendered once.
    const qrCache = new Map<string, HTMLCanvasElement>();
    async function getQrCanvas(card: CardProfile): Promise<HTMLCanvasElement> {
      const cached = qrCache.get(card.id);
      if (cached) return cached;
      const c = document.createElement('canvas');
      await renderQrToCanvas(c, buildVCardPayload(card));
      qrCache.set(card.id, c);
      return c;
    }

    const carouselSlot = container.querySelector<HTMLDivElement>('#carousel-slot')!;
    renderCarousel<CardProfile>(carouselSlot, {
      items: cards,
      initialId: preferredId,
      previewHostClassName: 'card-preview-inner',
      canvasClassName: 'card-canvas-preview',
      emptyMessage: 'No saved cards yet — add one below.',
      errorMessage: 'Could not render the card preview.',
      composeCanvas: async (card) => {
        const qrCanvas = await getQrCanvas(card);
        // The on-screen preview renders the SAME composed canvas that gets
        // downloaded, so the two can never drift apart.
        return composeCardImage(card, qrCanvas);
      },
      buttons: [
        {
          label: 'Download QR',
          onClick: (card) => {
            void getQrCanvas(card).then((qrCanvas) => {
              downloadCanvasAsPng(qrCanvas, `${card.label || 'card'}-qr`);
            });
          },
        },
        {
          label: 'Download card image',
          onClick: (card) => {
            void getQrCanvas(card)
              .then((qrCanvas) => composeCardImage(card, qrCanvas))
              .then((composed) => downloadCanvasAsPng(composed, `${card.label || 'card'}`));
          },
        },
        {
          label: 'Edit',
          onClick: (card) => {
            editingId = card.id;
            showEditor(card);
          },
        },
        {
          label: 'Delete',
          className: 'secondary danger',
          onClick: (card) => {
            deleteCard(card.id);
            renderTab();
          },
        },
      ],
    });

    container.querySelector<HTMLButtonElement>('#add-card-btn')!.addEventListener('click', () => {
      editingId = null;
      showEditor(null);
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
        const savedId = card.id;
        editingId = null;
        renderTab(savedId);
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

  renderTab();
}
