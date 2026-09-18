import { registerSW } from 'virtual:pwa-register';

/**
 * Registers the service worker and surfaces a confirm-before-reload banner
 * when a new version is available — the app must never reload silently
 * out from under the user. Also checks for an update on load and whenever
 * the device regains connectivity, since an installed/offline instance can
 * otherwise sit on a stale service worker indefinitely.
 */
export function initAppUpdate(): void {
  let applyUpdate: ((reload?: boolean) => Promise<void>) | undefined;

  function showUpdateBanner(): void {
    if (document.getElementById('update-banner')) return;
    const banner = document.createElement('div');
    banner.id = 'update-banner';
    banner.className = 'update-banner';
    banner.innerHTML = `
      <span>A new version is available.</span>
      <span class="row" style="flex:none;">
        <button class="primary" id="update-banner-reload" type="button">Reload</button>
        <button class="secondary" id="update-banner-dismiss" type="button" aria-label="Dismiss">✕</button>
      </span>
    `;
    document.body.appendChild(banner);
    banner.querySelector<HTMLButtonElement>('#update-banner-reload')!.addEventListener('click', () => {
      void applyUpdate?.(true);
    });
    banner.querySelector<HTMLButtonElement>('#update-banner-dismiss')!.addEventListener('click', () => {
      banner.remove();
    });
  }

  applyUpdate = registerSW({
    immediate: true,
    onNeedRefresh() {
      showUpdateBanner();
    },
    onRegisteredSW(_swUrl, registration) {
      if (!registration) return;
      const checkForUpdate = () => void registration.update();
      window.addEventListener('online', checkForUpdate);
      // Covers the case where this page's own service worker is already
      // stale from a previous session — check shortly after load too.
      window.setTimeout(checkForUpdate, 3000);
    },
  });
}
