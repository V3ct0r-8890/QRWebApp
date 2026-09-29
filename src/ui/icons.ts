const PATHS = {
  card: '<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="11" r="2"/><path d="M6 16c.6-1.3 1.7-2 3-2s2.4.7 3 2"/><path d="M14.5 10h3.5M14.5 14h2.5"/>',
  qr: '<rect x="3.5" y="3.5" width="6.5" height="6.5" rx="1"/><rect x="14" y="3.5" width="6.5" height="6.5" rx="1"/><rect x="3.5" y="14" width="6.5" height="6.5" rx="1"/><path d="M14 14h2.5v2.5H14zM20.5 14v.01M14 20.5h.01M18 20.5h2.5V18"/>',
  history: '<path d="M3 12a9 9 0 1 0 2.6-6.4L3 8"/><path d="M3 3v5h5"/><path d="M12 7.5V12l3 2"/>',
  download: '<path d="M12 3.5v11"/><path d="m7.5 10 4.5 4.5 4.5-4.5"/><path d="M5 20h14"/>',
  image: '<rect x="3.5" y="4.5" width="17" height="15" rx="2"/><circle cx="9" cy="9.5" r="1.5"/><path d="m20.5 15-4.5-4.5L6 19.5"/>',
  eye: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="2.75"/>',
  bookmark: '<path d="M18 20.5 12 17l-6 3.5V5a1.5 1.5 0 0 1 1.5-1.5h9A1.5 1.5 0 0 1 18 5z"/>',
  edit: '<path d="M12.5 20H20"/><path d="M16.2 4.3a2 2 0 0 1 2.9 2.9L7.5 18.8 4 19.8l1-3.5z"/>',
  trash: '<path d="M4 6.5h16"/><path d="M9 6.5V4.5h6v2"/><path d="m18.5 6.5-.9 13a1.5 1.5 0 0 1-1.5 1.4H7.9a1.5 1.5 0 0 1-1.5-1.4l-.9-13"/><path d="M10 11v5.5M14 11v5.5"/>',
  rotate: '<path d="M20.5 12a8.5 8.5 0 1 1-2.5-6L20.5 8.5"/><path d="M20.5 3.5v5h-5"/>',
  close: '<path d="M18 6 6 18M6 6l12 12"/>',
  chevronUp: '<path d="m18 15-6-6-6 6"/>',
  chevronDown: '<path d="m6 9 6 6 6-6"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M4.6 4.6 6 6M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4 6 18M18 6l1.4-1.4"/>',
  moon: '<path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z"/>',
  monitor: '<rect x="3" y="4" width="18" height="12.5" rx="2"/><path d="M8.5 20.5h7M12 16.5v4"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
} as const;

export type IconName = keyof typeof PATHS;

/** Inline SVG line icon, sized to the surrounding font and colored by `currentColor`. */
export function icon(name: IconName): string {
  return `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${PATHS[name]}</svg>`;
}
