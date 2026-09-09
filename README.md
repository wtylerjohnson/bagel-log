# Bagel Log

A single-page PWA for logging homemade bagel batches: the variables you changed,
photos of the result, and four 1–5 scores. Vanilla JS, no framework, no build step,
no backend. Every batch — photos included — lives in IndexedDB on the phone.

## Files

| File | What it is |
| --- | --- |
| `index.html` | The entire app: markup, CSS and JS in one file |
| `manifest.json` | Web app manifest (name, icons, standalone display) |
| `sw.js` | Service worker — caches the app shell so it opens with no signal |
| `icon-180.png` | `apple-touch-icon`, used by the iOS Home Screen |
| `icon-192.png` / `icon-512.png` | Manifest icons |
| `icon-maskable-512.png` | Maskable icon for Android launchers |

Nothing else is required at runtime. No CDN, no fonts to download, no network calls at all.

## Deploy to GitHub Pages

A service worker only runs over HTTPS (or `localhost`), which is exactly what Pages gives you.

1. Create an empty repo on GitHub, e.g. `bagel-log`.
2. From this folder:

```bash
git init -b main && git add . && git commit -m "Bagel Log" && git remote add origin https://github.com/YOUR-USERNAME/bagel-log.git && git push -u origin main
```

3. On GitHub: **Settings → Pages → Build and deployment → Source: Deploy from a branch**,
   branch `main`, folder `/ (root)`. Save.
4. Wait for the green check on the Pages build, then open
   `https://YOUR-USERNAME.github.io/bagel-log/`.

Every path in the app is relative, so the subdirectory URL works as-is. No Jekyll
config is needed; if you ever add a folder starting with `_`, drop an empty
`.nojekyll` file in the root.

**Publishing to a public repo makes the app source public — your batch data is never
part of it.** Data only ever exists in the browser on your phone.

### Updating after an edit

Bump the cache name at the top of `sw.js` (`bagel-log-v5` → `-v6`) whenever you change
`index.html`, then push. Phones pick up the new build on the next launch and show a
"New version ready — Reload" prompt.

## Install on iPhone

1. Open the Pages URL in **Safari** (not Chrome — only Safari can install to the Home Screen).
2. Share button → **Add to Home Screen** → Add.
3. Launch it from the Home Screen. It opens full-screen with no browser chrome and
   works with no signal.

## Using it

A bottom tab bar switches between **Batches**, **Compare** and **Settings**. Editing a
batch takes over the whole screen and hides the tabs — it has its own Back and Save.

**Batch list** — newest first, showing batch number, date, total score out of 20 and the
first photo. Tap a card to edit it.

**New batch** — the variable fields are pre-filled from your most recent batch, so you
only change what you actually changed. Date defaults to today. Scores start blank;
tap a number to set it, tap the same number again to clear it. A batch with no scores
reads "unscored" in the list rather than 0/20.

**Photos** — *Take photo* opens the rear camera, *Add from library* picks one or more
existing shots. Both are resized to 1280px on the longest edge and re-encoded as JPEG
before being stored, so a batch with five photos costs a few hundred KB, not 20 MB.
Tap a thumbnail to view it full-screen, tap ✕ on the thumbnail to delete it.

**Compare** — every batch as a column, oldest on the left and newest on the right, with
a row for each variable plus the four scores and the total. The table scrolls sideways
and the variable-name column stays pinned. The batch with the best rise score is tinted
and badged; if several tie at the top score, all of them are marked.

Below the table, **What changed** puts each batch against the one before it, newest pair
first: the variables whose value actually moved, then the change in total score and in
rise score as their own pills — gold when the score went up, red when it went down, grey
when either batch is unscored. A pair with identical variables reads "No variable changes"
and still shows both score deltas, which is how you tell a process change from a fluke.

Compare is read-only; it reads whatever is already stored, so it needs no data of its own.

**Settings** — add, rename, re-order (↑ ↓) and delete variables. Edits save as you type.
Deleting a variable stops new batches from asking for it; past batches keep the value
they recorded, it just stops being displayed, and it still round-trips through export.

Seeded variables and their starting defaults — change any of them in Settings:

| Variable | Unit | Default |
| --- | --- | --- |
| Humidity | % | *(blank — you measure it each bake)* |
| Flour | g | 1000 |
| Water | g | 580 |
| Diastatic malt powder | g | 10 |
| Salt | g | 20 |
| Yeast | g | 6 |
| Proof time | min | 60 |
| Boil time | sec | 30 |
| Oven temp | F | 500 |

## Backup and restore

**Export all data** writes one JSON file containing every batch, every variable
definition and every photo as base64. On iPhone it goes through the share sheet
(save to Files, mail it to yourself, AirDrop it); elsewhere it downloads.

**Import from file** offers two modes:

- **Replace everything** — wipes the current log and restores the file exactly. Use this
  when moving to a new phone or recovering.
- **Merge into this log** — adds batches and variables whose IDs you don't already have.
  Importing the same file twice is a no-op. Merged batches that would collide on batch
  number get the next free number instead.

The list screen shows a **Back up** banner whenever a batch has changed since your last
export. That banner is the only reminder you get — take it seriously:

- Safari clears script-writable storage for websites you haven't opened in seven days.
  Adding the app to the Home Screen moves it into its own container that isn't subject
  to that sweep, which is the main reason to install it rather than use it as a tab.
- Deleting the Home Screen app deletes its IndexedDB with it.
- "Clear History and Website Data" in Safari settings wipes it too.

## Design notes

- **Storage** — three IndexedDB stores: `batches` (keyed by id, indexed on `number` and
  `date`), `vars` (indexed on `order`), and `meta` (seed flag, last export time). Photos
  are stored as real `Blob`s, not data URLs, and rendered through `URL.createObjectURL`
  with the object URLs revoked on every screen change.
- **Batch numbers** are `max(existing) + 1`, read off the `number` index. Deleting the
  newest batch does not recycle its number and imports can't create a duplicate.
- **Records carry `createdAt` / `updatedAt`** beyond the fields in the spec — `updatedAt`
  is what the backup banner compares against the last export time.
- **Compare adds no state.** Rows come from the current VariableDefs, so a variable you
  deleted stops appearing there even though past batches still hold its value. Columns and
  diffs are derived at render time from the batches as stored — nothing is cached or
  written back.
- **`aiNotes`** is a plain nullable text field on each batch, kept out of the way under
  Notes, preserved through export/import. Nothing writes to it automatically; there is no
  backend and no network call anywhere in the app.
- **`capture="environment"`** is on the *Take photo* input as specified. iOS treats that
  attribute as "camera only, one shot at a time", so a second input without `capture`
  provides multi-select from the photo library — otherwise "multiple photos" would mean
  re-opening the camera once per shot.
- **No animation, no transitions.** System font, 48px minimum tap targets, 17px inputs
  (below 16px iOS zooms the page on focus), safe-area insets honoured top and bottom,
  and a light/dark palette that follows the phone's appearance setting.

## Running it locally

Any static file server works; the service worker needs `localhost` rather than `file://`.

```bash
python3 -m http.server --directory . 8791
```

Then open `http://localhost:8791`.
