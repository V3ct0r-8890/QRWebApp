import { buildTextPayload, buildUrlPayload, buildWifiPayload, type WifiEncryption } from '../qr/encode';
import { downloadCanvasAsPng, renderQrToCanvas } from '../qr/render';

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
      <button class="secondary" id="download-btn" type="button">Download PNG</button>
    </div>
  `;

  const typeSelect = container.querySelector<HTMLSelectElement>('#qr-type')!;
  const typeFields = container.querySelector<HTMLDivElement>('#type-fields')!;
  const errorEl = container.querySelector<HTMLParagraphElement>('#generate-error')!;
  const outputEl = container.querySelector<HTMLDivElement>('#qr-output')!;
  const canvas = container.querySelector<HTMLCanvasElement>('#qr-canvas')!;
  const downloadBtn = container.querySelector<HTMLButtonElement>('#download-btn')!;

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
    outputEl.hidden = true;
    try {
      const type = typeSelect.value as QrType;
      let payload: string;

      if (type === 'url') {
        const url = (typeFields.querySelector<HTMLInputElement>('#f-url')?.value ?? '').trim();
        if (!url) throw new Error('Enter a website URL.');
        payload = buildUrlPayload(url);
      } else if (type === 'wifi') {
        const ssid = (typeFields.querySelector<HTMLInputElement>('#f-ssid')?.value ?? '').trim();
        if (!ssid) throw new Error('Enter a network name.');
        const password = typeFields.querySelector<HTMLInputElement>('#f-pass')?.value ?? '';
        const encryption = (typeFields.querySelector<HTMLSelectElement>('#f-enc')?.value ?? 'WPA') as WifiEncryption;
        const hidden = typeFields.querySelector<HTMLInputElement>('#f-hidden')?.checked ?? false;
        payload = buildWifiPayload({ ssid, password, encryption, hidden });
      } else {
        const text = typeFields.querySelector<HTMLTextAreaElement>('#f-text')?.value ?? '';
        if (!text.trim()) throw new Error('Enter some text.');
        payload = buildTextPayload(text);
      }

      await renderQrToCanvas(canvas, payload);
      outputEl.hidden = false;
    } catch (err) {
      errorEl.textContent = err instanceof Error ? err.message : 'Could not generate QR code.';
      errorEl.hidden = false;
    }
  }

  container.querySelector<HTMLButtonElement>('#generate-btn')!.addEventListener('click', () => {
    void handleGenerate();
  });

  downloadBtn.addEventListener('click', () => downloadCanvasAsPng(canvas, 'qrcode'));
}
