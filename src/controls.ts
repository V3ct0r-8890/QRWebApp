/**
 * Controls layout: "default" (current layout) or "bottom" (one-hand mode —
 * every control moved within thumb reach). Applied as `data-controls` on
 * <html>; style.css only acts on it for mobile (data-platform='mobile').
 * index.html runs an inline copy of the initial apply step before first
 * paint — keep CONTROLS_STORAGE_KEY in sync with that script.
 */
export type ControlsMode = 'default' | 'bottom';

export const CONTROLS_STORAGE_KEY = 'qrwebapp.controls';
/** Fired on window when the mode changes, so every toggle (header, image viewer) stays in sync. */
export const CONTROLS_CHANGE_EVENT = 'qrwebapp:controlschange';

export function getControlsMode(): ControlsMode {
  try {
    return localStorage.getItem(CONTROLS_STORAGE_KEY) === 'bottom' ? 'bottom' : 'default';
  } catch {
    return 'default';
  }
}

export function applyControlsMode(mode: ControlsMode): void {
  const root = document.documentElement;
  if (mode === 'bottom') {
    root.dataset.controls = 'bottom';
  } else {
    delete root.dataset.controls;
  }
}

export function setControlsMode(mode: ControlsMode): void {
  try {
    if (mode === 'bottom') {
      localStorage.setItem(CONTROLS_STORAGE_KEY, 'bottom');
    } else {
      localStorage.removeItem(CONTROLS_STORAGE_KEY);
    }
  } catch {
    // Best-effort — if storage is blocked, the choice just lasts this session.
  }
  applyControlsMode(mode);
  window.dispatchEvent(new CustomEvent<ControlsMode>(CONTROLS_CHANGE_EVENT, { detail: mode }));
}
