import { renderQrToCanvas, downloadCanvasAsPng } from '../qr/render';
import { deleteHistoryEntry, listHistory, MAX_HISTORY, type HistoryEntry } from '../history/store';

const TYPE_LABEL: Record<HistoryEntry['type'], string> = {
  url: 'URL',
  wifi: 'Wi-Fi',
  text: 'Text',
};

export function renderHistoryTab(container: HTMLElement): void {
  function renderList(): void {
    const entries = listHistory();
    container.innerHTML = `
      <p>${entries.length} / ${MAX_HISTORY} recent — oldest drops off automatically</p>
      <div class="card-list" id="history-list"></div>
      <div id="history-viewer"></div>
    `;

    const listEl = container.querySelector<HTMLDivElement>('#history-list')!;
    if (entries.length === 0) {
      listEl.innerHTML = `<div class="empty-state">Nothing saved yet — generate a QR code and tap "Save to history".</div>`;
    }
    for (const entry of entries) {
      const row = document.createElement('div');
      row.className = 'card-item';
      row.innerHTML = `
        <span>[${TYPE_LABEL[entry.type]}] ${escapeHtml(entry.label)}</span>
        <span class="row" style="flex:none;">
          <button class="secondary" data-action="view" data-id="${entry.id}" type="button">View</button>
          <button class="secondary danger" data-action="delete" data-id="${entry.id}" type="button">Delete</button>
        </span>
      `;
      listEl.appendChild(row);
    }

    listEl.addEventListener('click', (e) => {
      const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('button[data-action]');
      if (!btn) return;
      const id = btn.dataset.id!;
      if (btn.dataset.action === 'delete') {
        deleteHistoryEntry(id);
        renderList();
      } else if (btn.dataset.action === 'view') {
        showViewer(entries.find((e) => e.id === id)!);
      }
    });
  }

  function showViewer(entry: HistoryEntry): void {
    const slot = container.querySelector<HTMLDivElement>('#history-viewer')!;
    slot.innerHTML = `
      <div class="qr-output">
        <canvas id="history-canvas"></canvas>
        <button class="secondary" id="history-download" type="button">Download PNG</button>
      </div>
    `;
    const canvas = slot.querySelector<HTMLCanvasElement>('#history-canvas')!;
    void renderQrToCanvas(canvas, entry.payload);
    slot.querySelector<HTMLButtonElement>('#history-download')!.addEventListener('click', () => {
      downloadCanvasAsPng(canvas, entry.label || 'qrcode');
    });
  }

  function escapeHtml(s: string): string {
    const div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
  }

  renderList();
}
