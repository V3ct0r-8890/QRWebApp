---
work_order: WO-260918-002
created:    2026-09-18
status:     HANDED-OFF
checkpoint: 98ec41d
restore_verified: yes
restore_cmd: git reset --hard 98ec41d && git clean -fdx
---

# Task Plan · WO-260918-002 · PWA QR generator — general types + saved business cards

## Steps
| # | Step | Writes | Commands | Status | Result |
|---|------|--------|----------|--------|--------|
| 1 | Project scaffold | package.json, .npmrc, .gitignore, tsconfig.json, vite.config.ts, index.html, src/main.ts, src/style.css | — | ✅ done | |
| 2 | Install dependencies | package-lock.json | `npm install` | ✅ done | 372 packages, 0 vulnerabilities |
| 3 | Encoder module | src/qr/encode.ts | — | ✅ done | |
| 4 | QR rendering + download | src/qr/render.ts | — | ✅ done | |
| 5 | Generator UI | src/ui/generator.ts, src/ui/app.ts | — | ✅ done | |
| 6 | Card-slots storage | src/cards/store.ts | — | ✅ done | |
| 7 | Card-slots UI | src/ui/cards.ts | — | ✅ done | |
| 8 | PWA config + icons | public/icons/*.png, vite-plugin-pwa config, src/vite-env.d.ts (added mid-step to fix a build error) | — | ✅ done | icons are solid-color placeholders, not real artwork |
| 9 | GitHub Pages readiness | .github/workflows/deploy.yml, README.md | — | ✅ done | deploy execution left to user |
| 10 | Build & static verification | — | `npm run build` | ✅ done | tsc clean, build 0 errors, gzip ≈18KB |
| 11 | Local T3 verification | — | `npm run preview` (backgrounded) | ⚙ running | server up, mechanical checks pass (T2); real-browser checks (T3) require the user |
| 12 | Commit | — | `git add` / `git commit` | ▶ declared | this step |

## AC coverage map
| AC | Covered by step(s) | Status |
|----|--------------------|--------|
| AC1 | 10 | ✅ CLOSED — T0 |
| AC2 | 11 | ⛔ OPEN — needs user, real browser |
| AC3 | 11 | ⛔ OPEN — needs user, real browser (DevTools) |
| AC4 | 11 | ⛔ OPEN — needs user, real browser offline test |
| AC5 | 3,4,5,11 | ⛔ OPEN — needs user, real browser + independent decoder |
| AC6 | 6,7 | ⛔ OPEN — needs user's phone, post-deploy |
| AC7 | 6,7 | ⛔ OPEN — needs user, real browser |
| AC8 | 6,7 | ⛔ OPEN — needs user, real browser |
| AC9 | 4,5 | ⛔ OPEN — needs user, real browser |
| AC10 | (CSS) | ⛔ OPEN — needs user, real device/DevTools viewport |
| AC11 | 9 (readiness only) | ⛔ OPEN — needs user to deploy + install on phone |

## Approved commands
| Command | Gated artifact | Hash at approval | Runs | Last confirmed |
|---------|----------------|-------------------|------|-----------------|
| `npm install` | package.json+package-lock.json | (first install, no prior lockfile) | 1 | step 2 |
| `npm run build` | package.json scripts + vite.config.ts + tsconfig.json | see git log | 2 | step 10 |
| `npm run preview` | same as above | unchanged | 1 | step 11 (long-running) |

## Long-running processes
| Started | Command | PID | Log path | Stop with |
|---------|---------|-----|----------|-----------|
| step 11 | `npm run preview -- --host 127.0.0.1 --port 4173` | 9301 (sh), 9302 (node) | `/tmp/claude-1000/-mnt-g-Development-new-QRwebApp/d285d57e-7f7a-4959-9d28-2ccedee689a8/scratchpad/preview.log` | `kill 9301 9302` or `pkill -f "vite preview"` |

## Destructive-command log
| When | Command | Class | Destroys | Reason | Backup verified | Confirmed |
|------|---------|-------|----------|--------|------------------|-----------|
| step 2 | `npm install` | D3 | n/a — first install | Install pinned deps | n/a | user, this session |

## Deviations from the Work Order
| When | Deviation | Returned to Architect | Approved by |
|------|-----------|------------------------|-------------|
| step 8 | Added `src/vite-env.d.ts` (not listed in WO Files-in-scope) to fix a build error (`tsc` couldn't resolve the CSS side-effect import without the Vite client type reference) | no — trivial, standard Vite/TS boilerplate, no behavioral or scope impact | self (documented here per transparency; not a scope change requiring Architect) |

## Blockers
| When | Blocker | Needs |
|------|---------|-------|
| step 11 | AC2–AC5, AC7–AC10 (real-browser T3), AC6/AC11 (phone, post-deploy T4) | User to open http://127.0.0.1:4173/ now, and to deploy + test on phone later |
