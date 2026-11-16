import { renderGeneratorTab } from './generator';
import { renderCardsTab } from './cards';
import { renderHistoryTab } from './history';
import { detectPlatform } from '../platform';
import { icon, type IconName } from './icons';
import { applyTheme, getThemePreference, nextThemePreference, setThemePreference, type ThemePreference } from '../theme';
import { applyControlsMode, CONTROLS_CHANGE_EVENT, getControlsMode, setControlsMode } from '../controls';

type TabId = 'cards' | 'generate' | 'history';

const THEME_ICON: Record<ThemePreference, IconName> = { system: 'monitor', light: 'sun', dark: 'moon' };
const THEME_LABEL: Record<ThemePreference, string> = { system: 'System', light: 'Light', dark: 'Dark' };

export function mountApp(root: HTMLElement): void {
  document.documentElement.dataset.platform = detectPlatform();

  root.innerHTML = `
    <header class="app-header">
      <img class="logo-mark" src="./icons/icon-192.png" alt="" aria-hidden="true" />
      <div>
        <h1>QR Web App</h1>
        <p class="subtitle">Generate &amp; save QR codes, fully offline</p>
      </div>
      <div class="header-actions">
        <button class="theme-toggle" id="controls-toggle" type="button"></button>
        <button class="theme-toggle" id="theme-toggle" type="button"></button>
      </div>
    </header>
    <div class="layout">
      <nav class="side-tabs" role="tablist" aria-orientation="vertical">
        <button id="tab-cards" role="tab" aria-selected="true">
          <span class="tab-icon" aria-hidden="true">${icon('card')}</span><span class="tab-label">My Cards</span>
        </button>
        <button id="tab-generate" role="tab" aria-selected="false">
          <span class="tab-icon" aria-hidden="true">${icon('qr')}</span><span class="tab-label">Generate</span>
        </button>
        <button id="tab-history" role="tab" aria-selected="false">
          <span class="tab-icon" aria-hidden="true">${icon('history')}</span><span class="tab-label">History</span>
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

  const themeToggle = root.querySelector<HTMLButtonElement>('#theme-toggle')!;
  let themePref = getThemePreference();
  // index.html already set data-theme pre-paint; this also syncs the theme-color metas.
  applyTheme(themePref);
  function renderThemeToggle(): void {
    const next = nextThemePreference(themePref);
    themeToggle.innerHTML = icon(THEME_ICON[themePref]);
    themeToggle.title = `Theme: ${THEME_LABEL[themePref]} (switch to ${THEME_LABEL[next]})`;
    themeToggle.setAttribute('aria-label', `Theme: ${THEME_LABEL[themePref]}. Switch to ${THEME_LABEL[next]}`);
  }
  renderThemeToggle();
  themeToggle.addEventListener('click', () => {
    themePref = nextThemePreference(themePref);
    setThemePreference(themePref);
    renderThemeToggle();
  });

  // One-hand mode (mobile only — the button is hidden on desktop via CSS).
  const controlsToggle = root.querySelector<HTMLButtonElement>('#controls-toggle')!;
  applyControlsMode(getControlsMode());
  function renderControlsToggle(): void {
    const bottom = getControlsMode() === 'bottom';
    // Icon shows where the controls will move to on tap.
    controlsToggle.innerHTML = icon(bottom ? 'dockTop' : 'dockBottom');
    const label = bottom ? 'Controls: Bottom (one-hand). Switch to Default' : 'Controls: Default. Switch to Bottom (one-hand)';
    controlsToggle.title = label;
    controlsToggle.setAttribute('aria-label', label);
    controlsToggle.setAttribute('aria-pressed', String(bottom));
  }
  renderControlsToggle();
  controlsToggle.addEventListener('click', () => {
    setControlsMode(getControlsMode() === 'bottom' ? 'default' : 'bottom');
  });
  window.addEventListener(CONTROLS_CHANGE_EVENT, renderControlsToggle);

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
