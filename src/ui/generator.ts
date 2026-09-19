import {
  buildEmailPayload,
  buildEventPayload,
  buildGeoPayload,
  buildPhonePayload,
  buildSmsPayload,
  buildTextPayload,
  buildUrlPayload,
  buildWhatsAppPayload,
  buildWifiPayload,
  type WifiEncryption,
} from '../qr/encode';
import { renderQrToCanvas, saveCanvasImage } from '../qr/render';
import { saveToHistory } from '../history/store';
import { showImageOverlay } from './imageViewer';

type QrType = 'url' | 'wifi' | 'text' | 'email' | 'phone' | 'sms' | 'geo' | 'event' | 'whatsapp';

export function renderGeneratorTab(container: HTMLElement): void {
  container.innerHTML = `
    <div class="field">
      <label for="qr-type">QR type</label>
      <select id="qr-type">
        <option value="url">Website / URL</option>
        <option value="wifi">Wi-Fi network</option>
        <option value="text">Plain text</option>
        <option value="email">Email</option>
        <option value="phone">Phone call</option>
        <option value="sms">SMS</option>
        <option value="geo">Geo location</option>
        <option value="event">Calendar event</option>
        <option value="whatsapp">WhatsApp message</option>
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
    } else if (type === 'text') {
      typeFields.innerHTML = `
        <div class="field">
          <label for="f-text">Text</label>
          <textarea id="f-text" rows="3"></textarea>
        </div>
      `;
    } else if (type === 'email') {
      typeFields.innerHTML = `
        <div class="field">
          <label for="f-email-to">To</label>
          <input id="f-email-to" type="email" inputmode="email" placeholder="name@example.com" />
        </div>
        <div class="field">
          <label for="f-email-subject">Subject (optional)</label>
          <input id="f-email-subject" type="text" />
        </div>
        <div class="field">
          <label for="f-email-body">Message (optional)</label>
          <textarea id="f-email-body" rows="3"></textarea>
        </div>
      `;
    } else if (type === 'phone') {
      typeFields.innerHTML = `
        <div class="field">
          <label for="f-phone">Phone number</label>
          <input id="f-phone" type="tel" inputmode="tel" placeholder="+1 555 123 4567" />
        </div>
      `;
    } else if (type === 'sms') {
      typeFields.innerHTML = `
        <div class="field">
          <label for="f-sms-phone">Phone number</label>
          <input id="f-sms-phone" type="tel" inputmode="tel" placeholder="+1 555 123 4567" />
        </div>
        <div class="field">
          <label for="f-sms-message">Message (optional)</label>
          <textarea id="f-sms-message" rows="3"></textarea>
        </div>
      `;
    } else if (type === 'geo') {
      typeFields.innerHTML = `
        <div class="field">
          <label for="f-geo-lat">Latitude</label>
          <input id="f-geo-lat" type="text" inputmode="decimal" placeholder="13.7563" />
        </div>
        <div class="field">
          <label for="f-geo-lon">Longitude</label>
          <input id="f-geo-lon" type="text" inputmode="decimal" placeholder="100.5018" />
        </div>
      `;
    } else if (type === 'event') {
      typeFields.innerHTML = `
        <div class="field">
          <label for="f-event-title">Title</label>
          <input id="f-event-title" type="text" />
        </div>
        <div class="field">
          <label for="f-event-start">Start</label>
          <input id="f-event-start" type="datetime-local" />
        </div>
        <div class="field">
          <label for="f-event-end">End</label>
          <input id="f-event-end" type="datetime-local" />
        </div>
        <div class="field">
          <label for="f-event-location">Location (optional)</label>
          <input id="f-event-location" type="text" />
        </div>
      `;
    } else {
      typeFields.innerHTML = `
        <div class="field">
          <label for="f-wa-phone">Phone number</label>
          <input id="f-wa-phone" type="tel" inputmode="tel" placeholder="+1 555 123 4567" />
        </div>
        <div class="field">
          <label for="f-wa-message">Message (optional)</label>
          <textarea id="f-wa-message" rows="3"></textarea>
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
      } else if (type === 'text') {
        const text = typeFields.querySelector<HTMLTextAreaElement>('#f-text')?.value ?? '';
        if (!text.trim()) throw new Error('Enter some text.');
        payload = buildTextPayload(text);
        label = text.length > 30 ? `${text.slice(0, 30)}…` : text;
      } else if (type === 'email') {
        const to = (typeFields.querySelector<HTMLInputElement>('#f-email-to')?.value ?? '').trim();
        if (!to) throw new Error('Enter a recipient email address.');
        const subject = typeFields.querySelector<HTMLInputElement>('#f-email-subject')?.value ?? '';
        const body = typeFields.querySelector<HTMLTextAreaElement>('#f-email-body')?.value ?? '';
        payload = buildEmailPayload({ to, subject, body });
        label = `Email: ${to}`;
      } else if (type === 'phone') {
        const phone = (typeFields.querySelector<HTMLInputElement>('#f-phone')?.value ?? '').trim();
        if (!phone) throw new Error('Enter a phone number.');
        payload = buildPhonePayload(phone);
        label = `Call: ${phone}`;
      } else if (type === 'sms') {
        const phone = (typeFields.querySelector<HTMLInputElement>('#f-sms-phone')?.value ?? '').trim();
        if (!phone) throw new Error('Enter a phone number.');
        const message = typeFields.querySelector<HTMLTextAreaElement>('#f-sms-message')?.value ?? '';
        payload = buildSmsPayload({ phone, message });
        label = `SMS: ${phone}`;
      } else if (type === 'geo') {
        const lat = (typeFields.querySelector<HTMLInputElement>('#f-geo-lat')?.value ?? '').trim();
        const lon = (typeFields.querySelector<HTMLInputElement>('#f-geo-lon')?.value ?? '').trim();
        if (!lat || !lon) throw new Error('Enter both latitude and longitude.');
        payload = buildGeoPayload({ lat, lon });
        label = `Location: ${lat}, ${lon}`;
      } else if (type === 'event') {
        const title = (typeFields.querySelector<HTMLInputElement>('#f-event-title')?.value ?? '').trim();
        const start = typeFields.querySelector<HTMLInputElement>('#f-event-start')?.value ?? '';
        const end = typeFields.querySelector<HTMLInputElement>('#f-event-end')?.value ?? '';
        if (!title) throw new Error('Enter an event title.');
        if (!start || !end) throw new Error('Enter both a start and end date/time.');
        const location = typeFields.querySelector<HTMLInputElement>('#f-event-location')?.value ?? '';
        payload = buildEventPayload({ title, start, end, location });
        label = `Event: ${title}`;
      } else {
        const phone = (typeFields.querySelector<HTMLInputElement>('#f-wa-phone')?.value ?? '').trim();
        if (!phone) throw new Error('Enter a phone number.');
        const message = typeFields.querySelector<HTMLTextAreaElement>('#f-wa-message')?.value ?? '';
        payload = buildWhatsAppPayload({ phone, message });
        label = `WhatsApp: ${phone}`;
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
