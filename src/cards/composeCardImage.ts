import type { CardProfile } from './store';

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Could not load the logo image.'));
    img.src = src;
  });
}

/**
 * Composes logo (top, centered) + QR (left) + contact text (right) into a
 * single canvas, matching the on-screen card-preview layout, for the
 * "Download card image" action.
 */
export async function composeCardImage(card: CardProfile, qrCanvas: HTMLCanvasElement): Promise<HTMLCanvasElement> {
  const width = 480;
  const logoRowHeight = card.logo ? 100 : 0;
  const bodyHeight = 220;
  const padding = 20;
  const height = logoRowHeight + bodyHeight + padding * 2;

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
    const logoSize = 72;
    ctx.drawImage(logoImg, (width - logoSize) / 2, padding, logoSize, logoSize);
    bodyTop = padding + logoRowHeight;
  }

  const qrSize = bodyHeight - 20;
  const qrX = padding;
  const qrY = bodyTop + 10;
  ctx.drawImage(qrCanvas, qrX, qrY, qrSize, qrSize);

  const textX = qrX + qrSize + 24;
  let textY = qrY + 28;
  ctx.fillStyle = '#16181d';
  ctx.textBaseline = 'alphabetic';

  ctx.font = '700 22px "Segoe UI", system-ui, -apple-system, Roboto, sans-serif';
  ctx.fillText(card.fullName, textX, textY);
  textY += 30;

  ctx.font = '400 16px "Segoe UI", system-ui, -apple-system, Roboto, sans-serif';
  ctx.fillStyle = '#4b5563';
  const lines = [card.title, card.org, card.email, card.phone].filter((v): v is string => Boolean(v));
  for (const line of lines) {
    ctx.fillText(line, textX, textY);
    textY += 24;
  }

  return canvas;
}
