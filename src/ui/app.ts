import { renderGeneratorTab } from './generator';
import { renderCardsTab } from './cards';
import { renderHistoryTab } from './history';
import { detectPlatform } from '../platform';

type TabId = 'cards' | 'generate' | 'history';

export function mountApp(root: HTMLElement): void {
  document.documentElement.dataset.platform = detectPlatform();

  root.innerHTML = `
    <header class="app-header">
      <img class="logo-mark" src="./icons/icon-192.png" alt="" aria-hidden="true" />
      <div>
        <h1>QR Web App</h1>
        <p class="subtitle">Generate &amp; save QR codes, fully offline</p>
      </div>
    </header>
    <div class="layout">
      <nav class="side-tabs" role="tablist" aria-orientation="vertical">
        <button id="tab-cards" role="tab" aria-selected="true">
          <span class="tab-icon" aria-hidden="true">🪪</span><span class="tab-label">My Cards</span>
        </button>
        <button id="tab-generate" role="tab" aria-selected="false">
          <span class="tab-icon" aria-hidden="true">▦</span><span class="tab-label">Generate</span>
        </button>
        <button id="tab-history" role="tab" aria-selected="false">
          <span class="tab-icon" aria-hidden="true">🕘</span><span class="tab-label">History</span>
        </button>
      </nav>
      <div id="tab-content" class="content-area"></div>
    </div>
    <div class="version-badge" aria-hidden="true">v${__APP_VERSION__}</div>
  `;

  const content = root.querySelector<HTMLDivElement>('#tab-content')!;
  const tabGenerate = root.querySelector<HTMLButtonElement>('#tab-generate')!;
  const tabCards = root.querySelector<HTMLButtonElement>('#tab-cards')!;
  const tabHistory = root.querySelector<HTMLButtonElement>('#tab-history')!;

  function showTab(tab: TabId): void {
    tabGenerate.setAttribute('aria-selected', String(tab === 'generate'));
    tabCards.setAttribute('aria-selected', String(tab === 'cards'));
    tabHistory.setAttribute('aria-selected', String(tab === 'history'));
    content.innerHTML = '';
    if (tab === 'generate') {
      renderGeneratorTab(content);
    } else if (tab === 'cards') {
      renderCardsTab(content);
    } else {
      renderHistoryTab(content);
    }
  }

  tabGenerate.addEventListener('click', () => showTab('generate'));
  tabCards.addEventListener('click', () => showTab('cards'));
  tabHistory.addEventListener('click', () => showTab('history'));

  showTab('cards');
}
