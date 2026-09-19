import QRCode from 'qrcode';

/** Renders `payload` as a QR code onto `canvas`. Throws on empty/invalid payload. */
export async function renderQrToCanvas(canvas: HTMLCanvasElement, payload: string): Promise<void> {
  if (!payload.trim()) {
    throw new Error('Nothing to encode yet.');
  }
  await QRCode.toCanvas(canvas, payload, {
    errorCorrectionLevel: 'M',
    margin: 2,
    width: 280,
  });
}

/**
 * Triggers a browser download of the canvas contents as a PNG. The link must
 * be attached to the document for `.click()` to reliably fire a download in
 * every browser (some mobile browsers silently no-op on a detached anchor).
 *
 * iOS Safari (and the installed-PWA WebKit view) ignores the `download`
 * attribute on `data:` URLs entirely, so this path never works there —
 * `saveCanvasImage` below is the entry point actually wired to UI buttons.
 */
export function downloadCanvasAsPng(canvas: HTMLCanvasElement, filename: string): void {
  const link = document.createElement('a');
  link.href = canvas.toDataURL('image/png');
  link.download = filename.endsWith('.png') ? filename : `${filename}.png`;
  document.body.appendChild(link);
  link.click();
  link.remove();
}

function canvasToPngBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Could not export the image.'));
    }, 'image/png');
  });
}

/**
 * Saves canvas contents as a PNG, preferring the native share sheet
 * (`navigator.share` with a file) when available — this is what actually
 * works for "save image" on iOS, where the anchor `download` attribute is a
 * no-op. Falls back to `downloadCanvasAsPng` everywhere else. A user
 * cancelling the share sheet (AbortError) is treated as success, not a
 * failure needing a fallback.
 */
export async function saveCanvasImage(canvas: HTMLCanvasElement, filename: string, title?: string): Promise<void> {
  const name = filename.endsWith('.png') ? filename : `${filename}.png`;
  const canShareFiles = typeof navigator.share === 'function' && typeof navigator.canShare === 'function';
  if (canShareFiles) {
    try {
      const blob = await canvasToPngBlob(canvas);
      const file = new File([blob], name, { type: 'image/png' });
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title });
        return;
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return;
      // Fall through to the anchor-download fallback below.
    }
  }
  downloadCanvasAsPng(canvas, name);
}
