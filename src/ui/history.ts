import { renderQrToCanvas, saveCanvasImage } from '../qr/render';
import { deleteHistoryEntry, listHistory, MAX_HISTORY, type HistoryEntry } from '../history/store';
import { renderCarousel } from './carousel';
import { showImageOverlay } from './imageViewer';

const TYPE_LABEL: Record<HistoryEntry['type'], string> = {
  url: 'URL',
  wifi: 'Wi-Fi',
  text: 'Text',
};

export function renderHistoryTab(container: HTMLElement): void {
  function renderTab(preferredId?: string): void {
    const entries = listHistory();
    container.innerHTML = `
      <p>${entries.length} / ${MAX_HISTORY} recent — oldest drops off automatically</p>
      <div id="carousel-slot"></div>
    `;

    const carouselSlot = container.querySelector<HTMLDivElement>('#carousel-slot')!;
    renderCarousel<HistoryEntry>(carouselSlot, {
      items: entries,
      initialId: preferredId,
      previewHostClassName: 'history-preview-host',
      canvasClassName: 'history-canvas-preview',
      emptyMessage: 'Nothing saved yet — generate a QR code and tap "Save to history".',
      errorMessage: 'Could not render the QR code.',
      caption: (entry) => `[${TYPE_LABEL[entry.type]}] ${entry.label}`,
      composeCanvas: async (entry) => {
        const canvas = document.createElement('canvas');
        await renderQrToCanvas(canvas, entry.payload);
        return canvas;
      },
      buttons: [
        {
          label: 'Download PNG',
          icon: '⬇️',
          onClick: (entry) => {
            const canvas = document.createElement('canvas');
            void renderQrToCanvas(canvas, entry.payload).then(() => {
              void saveCanvasImage(canvas, entry.label || 'qrcode', entry.label || 'QR code');
            });
          },
        },
        {
          label: 'View image',
          icon: '👁️',
          className: 'secondary',
          onClick: (entry) => {
            const canvas = document.createElement('canvas');
            void renderQrToCanvas(canvas, entry.payload).then(() => {
              showImageOverlay(canvas, entry.label || 'QR code');
            });
          },
        },
        {
          label: 'Delete',
          icon: '🗑️',
          className: 'secondary danger',
          onClick: (entry) => {
            deleteHistoryEntry(entry.id);
            renderTab();
          },
        },
      ],
    });
  }

  renderTab();
}
