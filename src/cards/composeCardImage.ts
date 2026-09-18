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

/**
 * Composes logo (top, centered) + QR (left) + labeled contact text (right)
 * into a single 3:2 canvas, matching the on-screen card-preview layout, for
 * the "Download card image" action.
 */
export async function composeCardImage(card: CardProfile, qrCanvas: HTMLCanvasElement): Promise<HTMLCanvasElement> {
  const width = 600;
  const height = 400; // 3:2
  const padding = 28;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas rendering is not available.');

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  let bodyTop = padding;
  if (card.logo) {
    const logoImg = await loadImage(card.logo);
    const logoSize = 110;
    ctx.drawImage(logoImg, (width - logoSize) / 2, padding, logoSize, logoSize);
    bodyTop = padding + logoSize + 18;
  }

  const qrSize = 100;
  const bodyAvailable = height - padding - bodyTop;
  const qrX = padding;
  const qrY = bodyTop + (bodyAvailable - qrSize) / 2;
  ctx.drawImage(qrCanvas, qrX, qrY, qrSize, qrSize);

  type Field = { label: string; value?: string };
  const fields: Field[] = [
    { label: 'Name:', value: card.fullName },
    { label: 'Title:', value: card.title },
    { label: 'Company:', value: card.org },
    { label: 'Email:', value: card.email },
    { label: 'Mobile:', value: card.phone },
  ].filter((f) => f.value) as Field[];

  const lineHeight = 30;
  const textBlockHeight = fields.length * lineHeight;
  const textX = qrX + qrSize + 28;
  let textY = bodyTop + (bodyAvailable - textBlockHeight) / 2 + lineHeight * 0.7;

  ctx.textBaseline = 'alphabetic';
  for (const field of fields) {
    ctx.font = `600 15px ${FONT_STACK}`;
    ctx.fillStyle = '#6b7280';
    ctx.fillText(field.label, textX, textY);
    const labelWidth = ctx.measureText(field.label).width;

    ctx.font = field.label === 'Name:' ? `700 22px ${FONT_STACK}` : `400 18px ${FONT_STACK}`;
    ctx.fillStyle = '#16181d';
    ctx.fillText(` ${field.value}`, textX + labelWidth, textY);

    textY += lineHeight;
  }

  return canvas;
}
