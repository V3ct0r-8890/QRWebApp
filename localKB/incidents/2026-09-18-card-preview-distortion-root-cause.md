---
supersedes: 2026-09-18-card-preview-drift.md (identifies the concrete bug that memo could only speculate about)
---

# Incident: web-preview QR distortion — round 003, root cause found

**Date:** 2026-09-18
**Defect:** "Web view QR is distort" (`screenshots/04.png`) despite the saved
download (`screenshots/03.png`) rendering correctly — same underlying defect
reported across rounds 001-003; this round finally pinpointed it.

## Root cause

`.qr-output canvas` (styling the Generate-tab's square 1:1 QR canvas) is a
descendant selector with specificity `(0,1,1)`. `.card-canvas-preview` (the
composed 3:2 card canvas added in round 002 to unify preview/download) is a
single class selector, specificity `(0,1,0)`. Because `(0,1,1) > (0,1,0)`,
the Generate-tab rule silently won regardless of source order and forced the
card's 3:2 canvas into `aspect-ratio: 1/1`, squashing/distorting it — even
though the JS was already rendering the identical composed-canvas element
used for download (round 002's fix was correct; this CSS specificity bug
undid it visually).

## Fix

`.qr-output canvas` → `.qr-output canvas:not(.card-canvas-preview)`, so it
no longer matches the composed-card canvas at all. `.card-canvas-preview`
also now declares `aspect-ratio: 3/2` explicitly rather than relying on
`height:auto` intrinsic sizing, so a similarly-specific future rule can't
silently reintroduce this.

## Why this matters going forward

**A bare-tag descendant selector (`.parent tag`) can outrank a single class
selector** on a sibling-ish element even when the class rule is written
later in the file — CSS specificity, not source order, decides when both
could match the same element type. Any time two visually-different renderers
of the same element type (`canvas`, `img`, etc.) coexist on a page, give
BOTH selectors equal or explicitly ordered specificity (or scope one out via
`:not()`, as done here) rather than assuming later-in-file wins.
