export type Platform = 'mobile' | 'desktop';

/**
 * Best-effort mobile-OS detection via the User-Agent string. There is no
 * reliable way for a web page to know the real OS — UA can be spoofed or
 * absent — so this is a heuristic, not a guarantee.
 */
export function detectPlatform(): Platform {
  const ua = navigator.userAgent || '';
  return /Android|iPhone|iPad|iPod/i.test(ua) ? 'mobile' : 'desktop';
}
