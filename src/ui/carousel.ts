/**
 * Shared "scroll through one item at a time" viewer — the engine behind
 * both the Cards and History tabs. Renders a single preloaded, cached,
 * loop-navigable preview (wheel / touch-swipe / ▲▼ buttons) plus a
 * caller-defined toolbar, with no separate list of rows alongside it.
 */

export interface CarouselButton<T> {
  label: string;
  className?: string; // defaults to 'secondary'
  onClick: (item: T, index: number) => void;
}

export interface CarouselOptions<T extends { id: string }> {
  items: T[];
  /** Renders (and the caller may cache) the canvas shown for one item. */
  composeCanvas: (item: T) => Promise<HTMLCanvasElement>;
  /** CSS class applied to the composed canvas — controls its aspect ratio/sizing. */
  canvasClassName: string;
  /** CSS class applied to the canvas's host wrapper — controls the preview box. */
  previewHostClassName: string;
  buttons: CarouselButton<T>[];
  emptyMessage: string;
  errorMessage?: string;
  /** Item id to land on initially; falls back to index 0 if not found. */
  initialId?: string;
  /** Optional text shown above the preview (escaped), e.g. a type/label caption. */
  caption?: (item: T) => string;
}

export function renderCarousel<T extends { id: string }>(host: HTMLElement, options: CarouselOptions<T>): void {
  const { items, composeCanvas, canvasClassName, previewHostClassName, buttons, emptyMessage } = options;

  if (items.length === 0) {
    host.innerHTML = `<div class="empty-state">${emptyMessage}</div>`;
    return;
  }

  const startIndex = options.initialId ? items.findIndex((i) => i.id === options.initialId) : -1;
  let index = startIndex >= 0 ? startIndex : 0;

  host.innerHTML = `
    <div class="qr-output">
      <div class="card-viewer" id="carousel-viewer">
        <button class="card-nav-btn" id="carousel-nav-up" type="button" aria-label="Previous" ${items.length < 2 ? 'hidden' : ''}>▲</button>
        ${options.caption ? '<p class="carousel-caption" id="carousel-caption"></p>' : ''}
        <div class="${previewHostClassName}" id="carousel-preview-host"></div>
        <button class="card-nav-btn" id="carousel-nav-down" type="button" aria-label="Next" ${items.length < 2 ? 'hidden' : ''}>▼</button>
      </div>
      <p class="card-position" id="carousel-position" ${items.length < 2 ? 'hidden' : ''}></p>
      <div class="row" id="carousel-toolbar"></div>
      <p class="error-text" id="carousel-error" hidden></p>
    </div>
  `;

  const viewerEl = host.querySelector<HTMLDivElement>('#carousel-viewer')!;
  const captionEl = host.querySelector<HTMLParagraphElement>('#carousel-caption');
  const previewHost = host.querySelector<HTMLDivElement>('#carousel-preview-host')!;
  const positionEl = host.querySelector<HTMLParagraphElement>('#carousel-position')!;
  const errorEl = host.querySelector<HTMLParagraphElement>('#carousel-error')!;
  const navUp = host.querySelector<HTMLButtonElement>('#carousel-nav-up')!;
  const navDown = host.querySelector<HTMLButtonElement>('#carousel-nav-down')!;
  const toolbarEl = host.querySelector<HTMLDivElement>('#carousel-toolbar')!;

  for (const btn of buttons) {
    const el = document.createElement('button');
    el.className = btn.className ?? 'secondary';
    el.type = 'button';
    el.textContent = btn.label;
    el.addEventListener('click', () => btn.onClick(items[index], index));
    toolbarEl.appendChild(el);
  }

  // Preloaded, per-item cache — populated eagerly for every item as soon as
  // the carousel mounts, and reused on every navigation so moving between
  // items is instant rather than re-rendering each time.
  const composedCache = new Map<string, HTMLCanvasElement>();

  async function getComposed(item: T): Promise<HTMLCanvasElement> {
    const cached = composedCache.get(item.id);
    if (cached) return cached;
    const composed = await composeCanvas(item);
    composed.className = canvasClassName;
    composedCache.set(item.id, composed);
    return composed;
  }

  function preloadAll(): void {
    for (const item of items) {
      void getComposed(item).catch(() => {
        // Best-effort — a failed preload just means that one item falls
        // back to on-demand rendering when scrolled to.
      });
    }
  }

  async function renderCurrent(): Promise<void> {
    errorEl.hidden = true;
    const item = items[index];
    positionEl.textContent = `${index + 1} / ${items.length}`;
    if (captionEl && options.caption) {
      captionEl.textContent = options.caption(item);
    }
    try {
      const composed = await getComposed(item);
      previewHost.innerHTML = '';
      previewHost.appendChild(composed);
    } catch (err) {
      errorEl.textContent = options.errorMessage ?? (err instanceof Error ? err.message : 'Could not render the preview.');
      errorEl.hidden = false;
    }
  }

  function go(delta: number): void {
    index = (index + delta + items.length) % items.length;
    void renderCurrent();
  }

  preloadAll();
  void renderCurrent();

  navUp.addEventListener('click', () => go(-1));
  navDown.addEventListener('click', () => go(1));

  let wheelLocked = false;
  viewerEl.addEventListener(
    'wheel',
    (e) => {
      if (items.length < 2) return;
      e.preventDefault();
      if (wheelLocked) return;
      wheelLocked = true;
      go(e.deltaY > 0 ? 1 : -1);
      setTimeout(() => {
        wheelLocked = false;
      }, 350);
    },
    { passive: false },
  );

  let touchStartY: number | null = null;
  viewerEl.addEventListener(
    'touchstart',
    (e) => {
      touchStartY = e.touches[0]?.clientY ?? null;
    },
    { passive: true },
  );
  viewerEl.addEventListener(
    'touchend',
    (e) => {
      if (touchStartY === null || items.length < 2) return;
      const endY = e.changedTouches[0]?.clientY ?? touchStartY;
      const delta = touchStartY - endY;
      touchStartY = null;
      if (Math.abs(delta) < 30) return; // ignore taps / small jitter
      go(delta > 0 ? 1 : -1);
    },
    { passive: true },
  );
}
