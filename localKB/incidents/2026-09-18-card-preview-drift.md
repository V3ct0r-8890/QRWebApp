# Incident: card preview/saved-image drift — round 002

**Date:** 2026-09-18
**Defect:** Card QR size / logo aspect-ratio complaints (round 002 of the same
user-reported defect; round 001 was `ed5470b`/`e5d2bd0`).

## What was wrong with round 001

Round 001 fixed the logo aspect-ratio math (fixed box + `object-fit:contain`
in CSS, and the equivalent `Math.min` contain-fit scale in
`composeCardImage.ts`) and enlarged the QR. The math was correct, but the
**on-screen preview and the downloaded PNG were two independent
implementations** — one HTML/CSS (`cards.ts` + `style.css`), one
`<canvas>` composition (`composeCardImage.ts`) — built from the same data but
never guaranteed to render identically. The user's round-002 feedback
("Logo still not keep aspect image ratio... implement the same display as
saved image") could not be conclusively root-caused from code alone: it was
ambiguous whether it referred to a genuine remaining bug, a stale/cached
build, or the two renderers simply looking slightly different from each
other.

## Fix (round 002)

Removed the duplicate implementation. `showViewer()` in `src/ui/cards.ts` now
renders the exact `HTMLCanvasElement` returned by `composeCardImage()`
directly into the DOM (scaled responsively via CSS `width:100%; height:auto`
on `.card-canvas-preview`), instead of rebuilding an equivalent layout in
HTML/CSS. The same canvas object is what "Download card image" saves.

Also bumped the composed-card QR by the requested 50% (`qrSize` 230 → 345),
scaling the whole composition canvas and every other constant uniformly
(900×600 instead of 600×400, all paddings/fonts ×1.5) so the larger QR still
fits inside the 3:2 frame without overlapping the text column.

## Why this matters going forward

**Never maintain two independent renderers of the same visual artifact**
(one DOM/CSS, one canvas) when pixel parity between "what you see" and "what
you download" is a stated requirement. Render once, display that result,
export that result. Any future "preview ≠ export" complaint on this project
should be treated as a structural question first (are there two code paths?)
before it's treated as an arithmetic/CSS bug to chase.
