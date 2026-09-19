import type { CardProfile, CardTheme } from './store';

interface Palette {
  background: string;
  border: string;
  labelColor: string;
  valueColor: string;
}

const THEMES: Record<CardTheme, Palette> = {
  light: { background: '#ffffff', border: '#e3e5eb', labelColor: '#6b7280', valueColor: '#16181d' },
  dark: { background: '#1c1e24', border: '#33363f', labelColor: '#9aa0ae', valueColor: '#f2f3f5' },
  blue: { background: '#eaf2fb', border: '#c7dcf3', labelColor: '#3b6ea5', valueColor: '#1c3a57' },
  pink: { background: '#fbeaf0', border: '#f3c7d7', labelColor: '#a5476b', valueColor: '#571c33' },
};

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Could not load the logo image.'));
    img.src = src;
  });
}

const FONT_STACK = '"Segoe UI", system-ui, -apple-system, Roboto, sans-serif';

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

  const palette = THEMES[card.theme ?? 'light'];
  const logoAlign = card.logoAlign ?? 'center';

  ctx.fillStyle = palette.background;
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = palette.border;
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
    const logoY = (bannerHeight - logoHeight) / 2;
    const logoX =
      logoAlign === 'left'
        ? sidePadding
        : logoAlign === 'right'
          ? width - sidePadding - logoWidth
          : (width - logoWidth) / 2;
    ctx.drawImage(logoImg, logoX, logoY, logoWidth, logoHeight);
  }
  ctx.strokeStyle = palette.border;
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
  // The QR itself always stays plain black-on-white for scan reliability —
  // a white backing chip (with its own quiet-zone margin) keeps it readable
  // against dark/pastel theme backgrounds instead of tinting its modules.
  const qrChipMargin = 14;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(qrX - qrChipMargin, qrY - qrChipMargin, qrSize + qrChipMargin * 2, qrSize + qrChipMargin * 2);
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
    ctx.fillStyle = palette.labelColor;
    ctx.fillText(field.label, textX, textY);
    const labelWidth = ctx.measureText(field.label).width;

    ctx.font = field.label === 'Name:' ? `700 40px ${FONT_STACK}` : `400 32px ${FONT_STACK}`;
    ctx.fillStyle = palette.valueColor;
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
    ctx.fillStyle = palette.labelColor;
    ctx.fillText(addressLabel, sidePadding, addressY);

    ctx.font = `400 26px ${FONT_STACK}`;
    ctx.fillStyle = palette.valueColor;
    for (const line of lines) {
      ctx.fillText(line, sidePadding + labelWidth + labelGap, addressY);
      addressY += addressLineHeight;
    }
  }

  return canvas;
}
