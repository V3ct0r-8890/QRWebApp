import { buildTextPayload, buildUrlPayload, buildWifiPayload, type WifiEncryption } from '../qr/encode';
import { renderQrToCanvas, saveCanvasImage } from '../qr/render';
import { saveToHistory } from '../history/store';
import { showImageOverlay } from './imageViewer';

type QrType = 'url' | 'wifi' | 'text';

export function renderGeneratorTab(container: HTMLElement): void {
  container.innerHTML = `
    <div class="field">
      <label for="qr-type">QR type</label>
      <select id="qr-type">
        <option value="url">Website / URL</option>
        <option value="wifi">Wi-Fi network</option>
        <option value="text">Plain text</option>
      </select>
    </div>
    <div id="type-fields"></div>
    <button class="primary" id="generate-btn" type="button">Generate QR</button>
    <p class="error-text" id="generate-error" hidden></p>
    <div class="qr-output" id="qr-output" hidden>
      <canvas id="qr-canvas"></canvas>
      <div class="row" id="qr-output-toolbar">
        <button class="secondary" id="download-btn" type="button" title="Download PNG" aria-label="Download PNG">
          <span class="btn-icon" aria-hidden="true">⬇️</span><span class="btn-label">Download PNG</span>
        </button>
        <button class="secondary" id="view-image-btn" type="button" title="View image" aria-label="View image">
          <span class="btn-icon" aria-hidden="true">👁️</span><span class="btn-label">View image</span>
        </button>
        <button class="secondary" id="save-history-btn" type="button" title="Save to history" aria-label="Save to history">
          <span class="btn-icon" aria-hidden="true">💾</span><span class="btn-label">Save to history</span>
        </button>
      </div>
      <p class="status-text" id="save-status" hidden></p>
    </div>
  `;

  const typeSelect = container.querySelector<HTMLSelectElement>('#qr-type')!;
  const typeFields = container.querySelector<HTMLDivElement>('#type-fields')!;
  const errorEl = container.querySelector<HTMLParagraphElement>('#generate-error')!;
  const outputEl = container.querySelector<HTMLDivElement>('#qr-output')!;
  const canvas = container.querySelector<HTMLCanvasElement>('#qr-canvas')!;
  const downloadBtn = container.querySelector<HTMLButtonElement>('#download-btn')!;
  const viewImageBtn = container.querySelector<HTMLButtonElement>('#view-image-btn')!;
  const saveHistoryBtn = container.querySelector<HTMLButtonElement>('#save-history-btn')!;
  const saveStatusEl = container.querySelector<HTMLParagraphElement>('#save-status')!;

  // Tracks the most recently generated payload so "Save to history" and
  // "Download PNG" both act on exactly what's on screen.
  let lastGenerated: { type: QrType; label: string; payload: string } | null = null;

  function renderFieldsFor(type: QrType): void {
    if (type === 'url') {
      typeFields.innerHTML = `
        <div class="field">
          <label for="f-url">Website URL</label>
          <input id="f-url" type="text" inputmode="url" placeholder="example.com" />
        </div>
      `;
    } else if (type === 'wifi') {
      typeFields.innerHTML = `
        <div class="field">
          <label for="f-ssid">Network name (SSID)</label>
          <input id="f-ssid" type="text" />
        </div>
        <div class="field">
          <label for="f-pass">Password</label>
          <input id="f-pass" type="text" />
        </div>
        <div class="field">
          <label for="f-enc">Security</label>
          <select id="f-enc">
            <option value="WPA">WPA/WPA2</option>
            <option value="WEP">WEP</option>
            <option value="nopass">Open (no password)</option>
          </select>
        </div>
        <div class="field">
          <label><input id="f-hidden" type="checkbox" style="width:auto;min-height:auto;" /> Hidden network</label>
        </div>
      `;
    } else {
      typeFields.innerHTML = `
        <div class="field">
          <label for="f-text">Text</label>
          <textarea id="f-text" rows="3"></textarea>
        </div>
      `;
    }
  }

  typeSelect.addEventListener('change', () => renderFieldsFor(typeSelect.value as QrType));
  renderFieldsFor('url');

  async function handleGenerate(): Promise<void> {
    errorEl.hidden = true;
    saveStatusEl.hidden = true;
    outputEl.hidden = true;
    try {
      const type = typeSelect.value as QrType;
      let payload: string;
      let label: string;

      if (type === 'url') {
        const url = (typeFields.querySelector<HTMLInputElement>('#f-url')?.value ?? '').trim();
        if (!url) throw new Error('Enter a website URL.');
        payload = buildUrlPayload(url);
        label = url;
      } else if (type === 'wifi') {
        const ssid = (typeFields.querySelector<HTMLInputElement>('#f-ssid')?.value ?? '').trim();
        if (!ssid) throw new Error('Enter a network name.');
        const password = typeFields.querySelector<HTMLInputElement>('#f-pass')?.value ?? '';
        const encryption = (typeFields.querySelector<HTMLSelectElement>('#f-enc')?.value ?? 'WPA') as WifiEncryption;
        const hidden = typeFields.querySelector<HTMLInputElement>('#f-hidden')?.checked ?? false;
        payload = buildWifiPayload({ ssid, password, encryption, hidden });
        label = `Wi-Fi: ${ssid}`;
      } else {
        const text = typeFields.querySelector<HTMLTextAreaElement>('#f-text')?.value ?? '';
        if (!text.trim()) throw new Error('Enter some text.');
        payload = buildTextPayload(text);
        label = text.length > 30 ? `${text.slice(0, 30)}…` : text;
      }

      await renderQrToCanvas(canvas, payload);
      lastGenerated = { type, label, payload };
      outputEl.hidden = false;
    } catch (err) {
      lastGenerated = null;
      errorEl.textContent = err instanceof Error ? err.message : 'Could not generate QR code.';
      errorEl.hidden = false;
    }
  }

  container.querySelector<HTMLButtonElement>('#generate-btn')!.addEventListener('click', () => {
    void handleGenerate();
  });

  downloadBtn.addEventListener('click', () => void saveCanvasImage(canvas, 'qrcode', lastGenerated?.label || 'QR code'));
  viewImageBtn.addEventListener('click', () => showImageOverlay(canvas, lastGenerated?.label || 'QR code'));

  saveHistoryBtn.addEventListener('click', () => {
    if (!lastGenerated) return;
    saveToHistory(lastGenerated.type, lastGenerated.label, lastGenerated.payload);
    saveStatusEl.textContent = 'Saved to history.';
    saveStatusEl.hidden = false;
  });
}
