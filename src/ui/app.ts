import { renderGeneratorTab } from './generator';
import { renderCardsTab } from './cards';

type TabId = 'generate' | 'cards';

export function mountApp(root: HTMLElement): void {
  root.innerHTML = `
    <header class="app-header">
      <div class="logo-mark" aria-hidden="true">▦</div>
      <div>
        <h1>QR Web App</h1>
        <p class="subtitle">Generate &amp; save QR codes, fully offline</p>
      </div>
    </header>
    <nav class="tabs" role="tablist">
      <button id="tab-generate" role="tab" aria-selected="true">Generate</button>
      <button id="tab-cards" role="tab" aria-selected="false">My Cards</button>
    </nav>
    <div id="tab-content"></div>
  `;

  const content = root.querySelector<HTMLDivElement>('#tab-content')!;
  const tabGenerate = root.querySelector<HTMLButtonElement>('#tab-generate')!;
  const tabCards = root.querySelector<HTMLButtonElement>('#tab-cards')!;

  function showTab(tab: TabId): void {
    tabGenerate.setAttribute('aria-selected', String(tab === 'generate'));
    tabCards.setAttribute('aria-selected', String(tab === 'cards'));
    content.innerHTML = '';
    if (tab === 'generate') {
      renderGeneratorTab(content);
    } else {
      renderCardsTab(content);
    }
  }

  tabGenerate.addEventListener('click', () => showTab('generate'));
  tabCards.addEventListener('click', () => showTab('cards'));

  showTab('generate');
}
