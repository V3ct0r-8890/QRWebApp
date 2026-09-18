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

/**
 * Composes a full-width logo banner (top) + QR (left) + top-aligned labeled
 * contact text (right) into a single 3:2 canvas, matching the on-screen
 * card-preview layout, for the "Download card image" action.
 */
export async function composeCardImage(card: CardProfile, qrCanvas: HTMLCanvasElement): Promise<HTMLCanvasElement> {
  // All constants below are the previous layout scaled uniformly by 1.5x —
  // this is what makes the QR "50% larger" while keeping every other
  // proportion (banner, padding, text) consistent so nothing overlaps or
  // overflows the 3:2 frame.
  const width = 900;
  const height = 600; // 3:2
  const sidePadding = 39;

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

  let bodyTop = 0;
  if (card.logo) {
    const bannerHeight = 99;
    const logoImg = await loadImage(card.logo);
    // Contain-fit within a fixed box — scaling by the tighter of the two
    // ratios keeps any source aspect ratio uniform instead of stretching it
    // to fill the box, regardless of the uploaded image's own proportions.
    const boxW = 240;
    const boxH = 66;
    const scale = Math.min(boxW / logoImg.width, boxH / logoImg.height);
    const logoWidth = logoImg.width * scale;
    const logoHeight = logoImg.height * scale;
    ctx.drawImage(logoImg, (width - logoWidth) / 2, (bannerHeight - logoHeight) / 2, logoWidth, logoHeight);
    ctx.strokeStyle = BORDER_COLOR;
    ctx.beginPath();
    ctx.moveTo(0, bannerHeight);
    ctx.lineTo(width, bannerHeight);
    ctx.stroke();
    bodyTop = bannerHeight;
  }

  const bodyPadding = 33;
  const qrSize = 345;
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

  const lineHeight = 51;
  const textX = qrX + qrSize + 36;
  let textY = qrY + 33;

  ctx.textBaseline = 'alphabetic';
  for (const field of fields) {
    ctx.font = `600 21px ${FONT_STACK}`;
    ctx.fillStyle = '#6b7280';
    ctx.fillText(field.label, textX, textY);
    const labelWidth = ctx.measureText(field.label).width;

    ctx.font = field.label === 'Name:' ? `700 30px ${FONT_STACK}` : `400 24px ${FONT_STACK}`;
    ctx.fillStyle = '#16181d';
    ctx.fillText(` ${field.value}`, textX + labelWidth, textY);

    textY += lineHeight;
  }

  return canvas;
}
