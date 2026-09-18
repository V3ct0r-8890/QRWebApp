import type { CardProfile } from './store';

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Could not load the logo image.'));
    img.src = src;
  });
}

const FONT_STACK = '"Segoe UI", system-ui, -apple-system, Roboto, sans-serif';
const BORDER_COLOR = '#e3e5eb';

/** Greedy word-wrap capped at `maxLines`; overflow on the last line gets an ellipsis. */
function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines: number): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (current && ctx.measureText(candidate).width > maxWidth) {
      lines.push(current);
      current = word;
      if (lines.length === maxLines) break;
    } else {
      current = candidate;
    }
  }
  if (lines.length < maxLines && current) {
    lines.push(current);
  }

  const wordsUsed = lines.reduce((n, line) => n + line.split(/\s+/).length, 0);
  if (wordsUsed < words.length && lines.length === maxLines) {
    let last = lines[maxLines - 1];
    while (last.length > 0 && ctx.measureText(`${last}…`).width > maxWidth) {
      last = last.slice(0, -1).trimEnd();
    }
    lines[maxLines - 1] = `${last}…`;
  }

  return lines;
}

/**
 * Composes a full-width logo banner (top) + QR (left) + top-aligned labeled
 * contact text (right) + a wrapped address line (bottom) into a single 3:2
 * canvas, matching the on-screen card-preview layout, for the "Download
 * card image" action.
 */
export async function composeCardImage(card: CardProfile, qrCanvas: HTMLCanvasElement): Promise<HTMLCanvasElement> {
  // Actual rendered resolution is 1200x800 (3:2) — 2x the CSS display size
  // (600x400, set on .card-preview-inner) for a sharp/retina download.
  const width = 1200;
  const height = 800; // 3:2
  const sidePadding = 36; // tightened so the layout spans closer to the card edge

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas rendering is not available.');

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = BORDER_COLOR;
  ctx.lineWidth = 1;
  ctx.strokeRect(0.5, 0.5, width - 1, height - 1);

  // The banner area is always reserved at this height, whether or not the
  // card has a logo — so the rest of the layout (QR, details, address)
  // never shifts depending on whether a logo is set. Without a logo, the
  // banner is simply left blank above the divider line.
  const bannerHeight = 283;
  if (card.logo) {
    const logoImg = await loadImage(card.logo);
    // Contain-fit within a fixed box — scaling by the tighter of the two
    // ratios keeps any source aspect ratio uniform instead of stretching it
    // to fill the box, regardless of the uploaded image's own proportions.
    const boxW = 632;
    const boxH = 184;
    const scale = Math.min(boxW / logoImg.width, boxH / logoImg.height);
    const logoWidth = logoImg.width * scale;
    const logoHeight = logoImg.height * scale;
    ctx.drawImage(logoImg, (width - logoWidth) / 2, (bannerHeight - logoHeight) / 2, logoWidth, logoHeight);
  }
  ctx.strokeStyle = BORDER_COLOR;
  ctx.beginPath();
  ctx.moveTo(0, bannerHeight);
  ctx.lineTo(width, bannerHeight);
  ctx.stroke();
  const bodyTop = bannerHeight;

  // bodyPadding and qrSize both trimmed slightly from the previous round to
  // make room for the new address block at the bottom, within the fixed
  // 1200x800 frame.
  const bodyPadding = 40;
  const qrSize = 380;
  const qrX = sidePadding;
  const qrY = bodyTop + bodyPadding;
  ctx.drawImage(qrCanvas, qrX, qrY, qrSize, qrSize);

  type Field = { label: string; value?: string };
  const fields: Field[] = [
    { label: 'Name:', value: card.fullName },
    { label: 'Title:', value: card.title },
    { label: 'Company:', value: card.org },
    { label: 'Email:', value: card.email },
    { label: 'Mobile:', value: card.phone },
  ].filter((f) => f.value) as Field[];

  const lineHeight = 68;
  const textX = qrX + qrSize + 40;
  let textY = qrY + 40;

  ctx.textBaseline = 'alphabetic';
  for (const field of fields) {
    ctx.font = `600 28px ${FONT_STACK}`;
    ctx.fillStyle = '#6b7280';
    ctx.fillText(field.label, textX, textY);
    const labelWidth = ctx.measureText(field.label).width;

    ctx.font = field.label === 'Name:' ? `700 40px ${FONT_STACK}` : `400 32px ${FONT_STACK}`;
    ctx.fillStyle = '#16181d';
    ctx.fillText(` ${field.value}`, textX + labelWidth, textY);

    textY += lineHeight;
  }

  if (card.address) {
    const addressLabel = 'Address:';
    const addressLineHeight = 32;
    ctx.font = `600 26px ${FONT_STACK}`;
    const labelWidth = ctx.measureText(addressLabel).width;
    const labelGap = 8;

    ctx.font = `400 26px ${FONT_STACK}`;
    // Reserve room for the label on every wrapped line — slightly
    // conservative on line 2 (which has no label), but guarantees line 1
    // never overflows past where the label pushes the text start.
    const addressMaxWidth = width - sidePadding * 2 - labelWidth - labelGap;
    const lines = wrapText(ctx, card.address, addressMaxWidth, 2);
    let addressY = qrY + qrSize + 18 + 24; // gap below the QR row, then first-line baseline

    ctx.font = `600 26px ${FONT_STACK}`;
    ctx.fillStyle = '#6b7280';
    ctx.fillText(addressLabel, sidePadding, addressY);

    ctx.font = `400 26px ${FONT_STACK}`;
    ctx.fillStyle = '#16181d';
    for (const line of lines) {
      ctx.fillText(line, sidePadding + labelWidth + labelGap, addressY);
      addressY += addressLineHeight;
    }
  }

  return canvas;
}
