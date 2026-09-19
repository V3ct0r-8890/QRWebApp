/**
 * Full-screen overlay showing a canvas as a plain <img>. Several mobile
 * browsers (iOS Safari, and most in-app webviews such as Instagram/Line/
 * WeChat) ignore the `download` attribute on a data: URL, so the
 * programmatic download button silently does nothing there. This is the
 * universal fallback: a plain image the user can press-and-hold on to
 * save via the browser/OS's own "Save Image" action, which works even
 * where scripted downloads don't.
 */
export function showImageOverlay(canvas: HTMLCanvasElement, title: string): void {
  const overlay = document.createElement('div');
  overlay.className = 'image-overlay';
  overlay.innerHTML = `
    <div class="image-overlay-bar">
      <span>${escapeHtml(title)}</span>
      <button class="secondary" id="image-overlay-close" type="button" aria-label="Close">✕</button>
    </div>
    <p class="image-overlay-hint">Press and hold the image, then choose "Save Image" to save it.</p>
    <div class="image-overlay-body">
      <img id="image-overlay-img" alt="${escapeHtml(title)}" />
    </div>
  `;
  document.body.appendChild(overlay);

  const img = overlay.querySelector<HTMLImageElement>('#image-overlay-img')!;
  img.src = canvas.toDataURL('image/png');

  function close(): void {
    overlay.remove();
  }
  overlay.querySelector<HTMLButtonElement>('#image-overlay-close')!.addEventListener('click', close);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });
}

function escapeHtml(s: string): string {
  const div = document.createElement('div');
  div.textContent = s;
  return div.innerHTML;
}
