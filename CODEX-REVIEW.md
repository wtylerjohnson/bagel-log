# Review request: Bagel Log PWA

You are reviewing a small, finished-but-undemoed app. I want findings and
suggestions, not a rewrite. Read everything before commenting.

## What it is

A single-file PWA for logging homemade bagel batches: the variables changed each
bake, photos of the result, four 1-5 scores, and a Compare screen. It is meant to
live on the author's iPhone Home Screen and work with no signal.

Files, all in this directory:

- `index.html` (~1370 lines) — the entire app: markup, CSS, JS in one file
- `manifest.json`, `sw.js` — PWA shell, offline cache
- `icon-180/192/512.png`, `icon-maskable-512.png`
- `README.md` — behaviour, deploy steps, design notes. Read this first.

## Hard constraints (do not propose violating these)

- ONE `index.html`. No framework, no build step, no bundler, no transpile.
- Vanilla JS only. No dependencies, no CDN, no external fonts. A strict reading:
  the app must make zero network requests at runtime.
- No backend. No API calls. No telemetry.
- Data model is FIXED. Do not propose changing it:
  - `VariableDef { id, name, unit, defaultValue, order }`
  - `Batch { id, number, date, notes, photos: [Blob], variables: {defId: value},
    scores: {crust, rise, chew, flavor} each 1-5 or null, total (of 20),
    aiNotes: string|null }`
  - Implementation adds `createdAt` / `updatedAt` to Batch; those may stay.
- All data in IndexedDB on the device. Photos stored as real Blobs, downscaled to
  1280px on the longest edge at capture time.
- Mobile-first, iPhone Safari. Plain and fast: system font, large tap targets,
  no animation, no transitions. Keep it that way.

## What has been verified, and how

Verified by driving the running app in a **Chromium** engine at a 375x812
viewport (not Safari, not a real device):

- Fresh install seeds 9 variables; new batches clone the previous batch's values.
- Photo pipeline: a 2400x1600 input stored as 1280x853 JPEG Blob, 48KB -> 18KB.
- Scores tap to set / re-tap to clear; totals correct; unscored reads "unscored".
- Export produces JSON with base64 photos that decode back to the right pixels.
  Import Replace restored exactly; Merge added only unseen IDs and renumbered
  colliding batch numbers; re-merging the same file was a no-op.
- Killed the server, reloaded: app booted from the service worker cache and saved
  a new batch fully offline.
- Compare: columns oldest-left/newest-right, sticky first column, best-rise
  highlight (including a two-way tie), per-pair diffs with total and rise deltas.
- Edge cases: 0 batches, 1 batch, an all-unscored set.

## What has NEVER been exercised

This is where I most want your eyes. None of the following has run even once:

1. **Real iOS Safari.** Nothing has touched a physical device or WebKit.
2. **The real camera path.** `<input type="file" accept="image/*"
   capture="environment">` was tested by injecting a File via `DataTransfer`,
   which is not the same code path a camera return takes.
3. **EXIF orientation.** `createImageBitmap(file, {imageOrientation:'from-image'})`
   with a fallback to an `<img>` element. Real portrait iPhone photos could come
   out rotated. The synthetic test images had no EXIF.
4. **`navigator.share({files})`** — the primary export path on iOS. The test
   browser reported `canShare({files})` false, so that entire branch fell through
   to the `<a download>` fallback and **has never executed**.
5. **Blobs in IndexedDB under WebKit**, Home Screen install, standalone display,
   `apple-touch-icon` rendering, safe-area insets on a notched device.
6. **Real 12MP photos**: resize time on phone hardware, memory, storage growth.

## What I want from you

Go through the code and report findings ranked by **risk to a live demo on an
iPhone**. For each: file and line, what breaks, under what conditions, and the
smallest fix. Be concrete; I would rather have five real defects than twenty
style notes.

Prioritised areas:

1. **WebKit / iOS Safari correctness.** Anything in the CSS or JS that behaves
   differently or fails outright in Safari: `position: sticky` in the Compare
   table, `env(safe-area-inset-*)`, `color-scheme`, form control rendering,
   `Blob.text()`, `createImageBitmap`, `canvas.toBlob`, object URL lifetime,
   the Web Share API guard, file input `capture` behaviour, iOS zoom-on-focus.
2. **IndexedDB transaction discipline.** IDB transactions auto-commit when the
   microtask queue drains. Find any place a request is issued after an `await`
   inside a live transaction, or any read-then-write that should be atomic and
   is not. Check `saveDraft`, `importFile` (both modes), `reorderVar`,
   `deleteVar`, `flushVarSaves`, `ensureSeed`, `nextNumber`.
3. **Data integrity.** Batch numbering under delete + import. Export/import
   round-trip fidelity, including `aiNotes: null`, unscored batches, and values
   belonging to deleted VariableDefs. Anything that could silently lose a photo
   or a batch.
4. **Failure modes.** Quota exceeded mid-save with photos attached. A truncated
   or hand-edited import file. Storage evicted between sessions. Two tabs open.
   Does the user always find out, and is the app still usable afterwards?
5. **The Compare screen** (`renderCompare`, around line 886). Sort order, tie
   handling, unscored batches, a variable deleted after batches recorded it,
   many batches (20+) or long variable names. It must stay read-only and must
   not write anything.
6. **Demo embarrassment.** Anything that would look broken in front of someone:
   layout at 320px width, a 40-character variable name, a batch with 12 photos,
   the update-available toast, tap targets under 44px.

Also tell me, briefly:

- Anything in the README that overstates what the code actually does.
- Anything you would cut. The app is 1370 lines and I would rather it were
  shorter than have another feature.

## How to run it

```
python3 -m http.server --directory . 8791
```

Then `http://localhost:8791`. A service worker needs `localhost` or HTTPS; it
will not register from `file://`. Note that `sw.js` caches the shell, so bump
`CACHE` at the top of `sw.js` if you edit `index.html` and get a stale page.

## Output

A ranked list of findings, then your suggestions. For each suggestion say
whether you would do it before a demo or defer it. Do not send a patch unless a
fix is a one-liner; describe it and I will decide.
