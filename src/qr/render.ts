import QRCode from 'qrcode';
import { detectPlatform } from '../platform';

export type MaskPattern = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;

const MASK_COUNT = 8;
let lastMask: MaskPattern | null = null;

/**
 * Picks a mask pattern different from the previous pick. The 8 masks draw
 * the dots differently but every one decodes to exactly the same text, so
 * regenerating identical content still gives a visibly new QR code.
 */
export function pickNewMaskPattern(): MaskPattern {
  let next: MaskPattern;
  do {
    next = Math.floor(Math.random() * MASK_COUNT) as MaskPattern;
  } while (next === lastMask);
  lastMask = next;
  return next;
}

/**
 * Renders `payload` as a QR code onto `canvas`. Throws on empty/invalid
 * payload. Pass `maskPattern` to reproduce a specific look (e.g. a saved
 * history entry); without it the library's own best-scoring mask is used.
 */
export async function renderQrToCanvas(
  canvas: HTMLCanvasElement,
  payload: string,
  maskPattern?: MaskPattern,
): Promise<void> {
  if (!payload.trim()) {
    throw new Error('Nothing to encode yet.');
  }
  await QRCode.toCanvas(canvas, payload, {
    errorCorrectionLevel: 'M',
    margin: 2,
    width: 280,
    maskPattern,
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
 * Saves canvas contents as a PNG. On phones and tablets it prefers the
 * native share sheet (`navigator.share` with a file) — this is what actually
 * works for "save image" on iOS, where the anchor `download` attribute is a
 * no-op. Desktop browsers always get a plain download, since their share
 * dialog has no "save to disk". Falls back to `downloadCanvasAsPng`. A user
 * cancelling the share sheet (AbortError) is treated as success, not a
 * failure needing a fallback.
 */
export async function saveCanvasImage(canvas: HTMLCanvasElement, filename: string, title?: string): Promise<void> {
  const name = filename.endsWith('.png') ? filename : `${filename}.png`;
  // iPadOS Safari reports a Macintosh user agent by default; touch points tell it apart.
  const isTouchDevice =
    detectPlatform() === 'mobile' || (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1);
  const canShareFiles =
    isTouchDevice && typeof navigator.share === 'function' && typeof navigator.canShare === 'function';
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
