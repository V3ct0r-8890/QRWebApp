# QR Web App

A mobile-first, installable, offline-capable PWA for generating QR codes —
URLs, Wi-Fi networks, plain text, and saved business cards (up to 10, stored
locally in the browser — nothing leaves the device).

## Develop

```bash
npm install
npm run dev
```

## Build & preview the production bundle

```bash
npm run build
npm run preview
```

`npm run build` is also the correctness gate: it runs `tsc --noEmit` first, so
a type error fails the build before Vite ever bundles anything.

## Deploy to GitHub Pages

1. Push this repository to GitHub.
2. In the repo, go to **Settings → Pages → Source**, and select **GitHub
   Actions**.
3. Push to `main` (or run the "Deploy to GitHub Pages" workflow manually from
   the **Actions** tab). The included workflow
   (`.github/workflows/deploy.yml`) builds and publishes `dist/` automatically.
4. Your app will be live at `https://<username>.github.io/<repo-name>/`.
   The build is configured with relative paths (`base: './'` in
   `vite.config.ts`, relative `start_url`/`scope` in the PWA manifest), so it
   works correctly from that subpath with no further edits.

Once it's live, open the URL on your phone and use your browser's
"Add to Home Screen" / install prompt to install it.

## Notes

- The icons in `public/icons/` are **solid-color placeholders** — swap them
  for real artwork before treating this as finished.
- Wi-Fi passwords and card details are stored **unencrypted** in the browser's
  `localStorage`. That's an accepted trade-off for a single-device, no-backend
  app — don't use this for anything you wouldn't want readable by someone with
  access to the device.
