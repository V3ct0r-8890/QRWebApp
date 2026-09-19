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
 */
export function downloadCanvasAsPng(canvas: HTMLCanvasElement, filename: string): void {
  const link = document.createElement('a');
  link.href = canvas.toDataURL('image/png');
  link.download = filename.endsWith('.png') ? filename : `${filename}.png`;
  document.body.appendChild(link);
  link.click();
  link.remove();
}
