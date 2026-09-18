import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf-8')) as { version: string };

// base: './' keeps every asset reference relative, so the same build works
// whether it's served from a domain root or a GitHub Pages subpath
// (e.g. username.github.io/QRwebApp/) with no path edits required.
export default defineConfig({
  base: './',
  // Bakes the package.json version into the client bundle as a constant,
  // read by the version badge in the bottom-right corner of the app.
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  server: {
    // /mnt/g is a Windows drive mounted into WSL2 (DrvFs). Its filesystem
    // events don't reliably reach inotify, so Vite's default watcher can
    // silently stop picking up changes. Polling trades a little CPU for
    // watching that actually works here.
    watch: {
      usePolling: true,
    },
  },
  plugins: [
    VitePWA({
      // 'prompt': a new service worker installs and waits rather than
      // taking over immediately — the app must explicitly confirm the
      // update (see src/update.ts) before it activates and reloads.
      registerType: 'prompt',
      includeAssets: ['icons/*.png'],
      manifest: {
        name: 'QR Web App',
        short_name: 'QR App',
        description: 'Generate QR codes for URLs, Wi-Fi, text, and saved business cards — fully offline.',
        // Relative start_url/scope so installability survives a GitHub Pages
        // subpath deployment without any manifest edits at deploy time.
        start_url: '.',
        scope: './',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#1d4ed8',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico}'],
      },
    }),
  ],
});
