import { renderQrToCanvas, saveCanvasImage } from '../qr/render';
import { deleteHistoryEntry, listHistory, MAX_HISTORY, type HistoryEntry } from '../history/store';
import { renderCarousel } from './carousel';
import { showImageOverlay } from './imageViewer';

const TYPE_LABEL: Record<HistoryEntry['type'], string> = {
  url: 'URL',
  wifi: 'Wi-Fi',
  text: 'Text',
  email: 'Email',
  phone: 'Phone',
  sms: 'SMS',
  geo: 'Location',
  event: 'Event',
  whatsapp: 'WhatsApp',
};

export function renderHistoryTab(container: HTMLElement): void {
  function renderTab(preferredId?: string): void {
    const entries = listHistory();
    container.innerHTML = `
      <div class="tab-head">
        <h2 class="tab-title">History</h2>
        <span class="count-pill">${entries.length} / ${MAX_HISTORY}</span>
      </div>
      <p class="tab-hint">Most recent first — the oldest drops off automatically.</p>
      <div id="carousel-slot"></div>
    `;

    const qrCache = new Map<string, Promise<HTMLCanvasElement>>();
    function getQrCanvas(entry: HistoryEntry): Promise<HTMLCanvasElement> {
      let pending = qrCache.get(entry.id);
      if (!pending) {
        const canvas = document.createElement('canvas');
        pending = renderQrToCanvas(canvas, entry.payload, entry.maskPattern).then(() => canvas);
        qrCache.set(entry.id, pending);
      }
      return pending;
    }

    const carouselSlot = container.querySelector<HTMLDivElement>('#carousel-slot')!;
    renderCarousel<HistoryEntry>(carouselSlot, {
      items: entries,
      initialId: preferredId,
      previewHostClassName: 'history-preview-host',
      canvasClassName: 'history-canvas-preview',
      emptyMessage: 'Nothing saved yet — generate a QR code and tap "Save to history".',
      errorMessage: 'Could not render the QR code.',
      caption: (entry) => `[${TYPE_LABEL[entry.type]}] ${entry.label}`,
      composeCanvas: getQrCanvas,
      buttons: [
        {
          label: 'Download PNG',
          icon: 'download',
          onClick: async (entry) => {
            await saveCanvasImage(await getQrCanvas(entry), entry.label || 'qrcode', entry.label || 'QR code');
          },
        },
        {
          label: 'View image',
          icon: 'eye',
          className: 'secondary',
          onClick: async (entry) => {
            showImageOverlay(await getQrCanvas(entry), entry.label || 'QR code');
          },
        },
        {
          label: 'Delete',
          icon: 'trash',
          className: 'secondary danger',
          onClick: (entry) => {
            if (!window.confirm(`Delete "${entry.label}" from history? This cannot be undone.`)) return;
            deleteHistoryEntry(entry.id);
            renderTab();
          },
        },
      ],
    });
  }

  renderTab();
}
