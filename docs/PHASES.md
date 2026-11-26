# Sprawl — Build Phases

Build in this order, one phase at a time. There are 13 phases (0–12). Everything is built and tested on **Windows**. **Don't start a phase until the previous one's exit check is fully green.**

A phase is a roadmap milestone, not a branch. It ships as several small pull requests, one per feature or fix, named by what they change (see the Git workflow in `CLAUDE.md`). Phase numbers never appear in branch names, commit messages or PR titles.

Each phase has the same five parts:
- **Goal:** one line.
- **Build:** what to implement. Refer to PRODUCT, ARCHITECTURE, DESIGN_SYSTEM and UI_SPEC for the details.
- **Tests:** the unit tests (Vitest) and e2e specs (Playwright) to write in this phase.
- **It should:** what a person sees and can do by hand when the phase is done.
- **Exit check:** all of these must be true before moving to the next phase.

Rules for every phase:
- `npm run check` passes on your Windows machine (typecheck, lint, unit tests and e2e tests).
- Nothing in `components/ui/` was hand-edited.
- No console errors or warnings when the app runs, apart from third-party ones listed (with a reason) in `tests/e2e/known-warnings.ts`.
- There's no leftover TODO for this phase's scope. Things for later phases are fine if they're written as `// later: phase-N`.

---

## Phase 0 — Project setup
**Goal:** an empty app that launches, with all the tooling in place.

**Build**
- electron-vite + React 19 + TypeScript strict, with the folder layout from ARCHITECTURE §6.
- Security settings (contextIsolation, sandbox, CSP), the window settings from UI_SPEC §1 (dark background, title bar style), and no application menu (`Menu.setApplicationMenu(null)`, ARCHITECTURE §2).
- Tailwind v4 + `shadcn init` (new-york, zinc), with the full `globals.css` from DESIGN_SYSTEM §9. Fonts bundled locally (DESIGN_SYSTEM §3).
- ESLint + Prettier (ignoring `components/ui/**`), and the npm scripts from ARCHITECTURE §10.5.
- Vitest configured. better-sqlite3's N-API prebuild loads in both Node and Electron with no rebuild (ARCHITECTURE §10.2). Prove it with a test that opens an in-memory DB.
- The Playwright e2e fixture (`tests/e2e/fixtures.ts`) with a temp vault, a temp userData, the `SPRAWL_E2E`, `SPRAWL_USER_DATA` and `SPRAWL_VAULT` variables (ARCHITECTURE §10.3), and the console check with an empty `tests/e2e/known-warnings.ts`.
- An empty `tests/MANUAL.md`. (No CI workflow in v1; see ARCHITECTURE §10.6.)
- `README.md` (short), `LICENSE` (MIT), and the `brand/` files copied to `resources/` and `build/`.

**Tests**
- Unit: a trivial `cn()` test to prove Vitest runs, and a `better-sqlite3` in-memory open-and-query test to prove the native module loads.
- E2E: `launch.spec.ts` checks that the window opens, the title is "Sprawl", the body background is `#09090B`, there are no console errors, and Ctrl+0 / Ctrl+= don't change the page zoom (`webContents.getZoomFactor()` stays 1).

**It should:** open a black window with the Sprawl icon in the taskbar, with native minimize, maximize and close buttons drawn on the dark title bar. Nothing else yet.

**Exit check:** `npm run dev` works, and `npm run check` is green.

---

## Phase 1 — Vault, database and app shell
**Goal:** data has a home, and the app has its frame.

**Build**
- Vault: the onboarding screen (UI_SPEC §10), choosing a folder, and remembering it in `config.json`. Skipped when `SPRAWL_VAULT` is set.
- DB: better-sqlite3 + Drizzle, the **full schema** from ARCHITECTURE §4 as migration 0001, WAL and pragmas, and the FTS5 table.
- IPC skeleton: the typed preload API, zod schemas in `shared/schemas.ts`, and `register.ts` with validation. Only implement `app.*` and `settings.*` now.
- The settings service with a zod schema and defaults. It routes vault keys to the `settings` table and machine keys to `config.json` (ARCHITECTURE §4) behind one `settings.get/set/getAll` API.
- App shell: the Rail (UI_SPEC §2), the top bar (§3, with the 140px caption-button clearance), empty Canvas, List, Log, Drawings and Settings views, and Ctrl+1/2/3/4 navigation.
- Windows plumbing: `setAppUserModelId` (the `process.execPath` fallback in dev), the single-instance lock (a second launch focuses the first), the `sprawl://` protocol registration and argv routing (ARCHITECTURE §2; routes can be no-ops until their phase), and the window state remembered in `config.json`.
- The Settings view shows the vault path and a "Change…" button that works. Other rows are placeholders.

**Tests**
- Unit: migrations apply to an in-memory DB; settings return defaults, reject bad values, and land in the right store (vault or machine); every zod schema accepts good fixtures and rejects bad ones.
- E2E:
  - `vault.spec.ts`: first launch (with the E2E flag off for this one test) shows onboarding, Start creates `sprawl.db`, and a relaunch skips onboarding.
  - `shell.spec.ts`: rail clicks and Ctrl+1–4 switch views, and the active rail item has the white bar.

**It should:** on first run, ask where to keep your notes. After that, open straight into the app frame. You can click between Canvas, List, Log, Drawings and Settings, and `sprawl.db` appears in the chosen folder.

**Exit check:** relaunching keeps the vault, deleting `config.json` brings onboarding back, launching a second copy just focuses the first, and all tests pass.

---

## Phase 2 — Canvas foundations
**Goal:** an infinite canvas that feels smooth.

**Build**
- Viewport: pan (space+drag, middle mouse, trackpad), zoom around the cursor with Ctrl+scroll or a touchpad pinch (10–400%), the dot grid (UI_SPEC §4.1), the zoom control pill, Ctrl+0, Ctrl+= and Ctrl+-, and the viewport saved to settings.
- The floating toolbar (UI_SPEC §4.2) with Select and Hand working. The other tools are visible but disabled until their phase.
- The canvas store and the `canvas.load` / `canvas.apply` IPC, batched on pointerup.
- Spatial culling (512px buckets) and the 40%-zoom simplified rendering hook.
- A dev-only "Seed 1,000 cards" command (behind `import.meta.env.DEV`) that places placeholder note items, for perf testing.

**Tests**
- Unit: screen↔world conversion, zoom keeps the point under the cursor fixed, culling returns the correct items, and `canvas.apply` persists create, update and delete.
- E2E: `canvas-viewport.spec.ts` checks that dragging the background with space pans it, Ctrl+scroll changes the zoom percentage, and the viewport is restored after relaunch.

**It should:** let you glide around an endless dotted board and zoom in and out smoothly. With 1,000 seeded cards it still feels smooth.

**Exit check:** pan and zoom with 1,000 cards hold about 60fps (check with the Chrome performance panel and note the result in the commit message), and all tests pass.

---

## Phase 3 — Notes on the canvas
**Goal:** create, move and manage sticky notes.

**Build**
- The notes service and IPC (`create`, `get`, `update`, `duplicate`, `remove`, `restore`) with soft delete, plus the 30-day purge on launch (ARCHITECTURE §4).
- The canvas ops from ARCHITECTURE §5: a note card's `create` carries the new note, and `delete`/`restore` soft-delete and restore the note, all in one transaction.
- The NoteCard (UI_SPEC §4.5): title, preview, color and hover. Chips can come later, but leave room for them.
- Creating a note with a double-click on empty space, the Note tool (N), Ctrl+N or by pasting text.
- Inline title editing on the card.
- Selection: click, Shift+click, marquee, Ctrl+A and Esc, with the visual from DESIGN_SYSTEM §8.
- Move (8px snap, Alt to skip), resize with corner handles and min/max limits, nudging with the arrow keys.
- Delete (Del) with a "Deleted · Undo" toast, duplicate (Ctrl+D creates new notes with their own cards, PRODUCT §3.1), and bring to front or send to back (Ctrl+] / Ctrl+[).
- **Undo/redo** history for every canvas op (ARCHITECTURE §6).
- The context menu (UI_SPEC §4.11) for the items available so far.

**Tests**
- Unit: op inversion for every op type, the 200-step history cap, snap math, a note-card create/delete/restore round trip leaving no orphan rows, the one-card-per-note constraint, and the purge removing only items older than 30 days.
- E2E: `canvas.spec.ts` (as in ARCHITECTURE §10.3) plus `canvas-select.spec.ts` (marquee selects 3 of 4 notes; Ctrl+D duplicates the selection; undo removes the duplicates).

**It should:** let you double-click anywhere to make a sticky, type a title, drag it around, resize it and delete it. Ctrl+Z undoes it all, and everything is still there after a restart.

**Exit check:** there's no DB write during a drag (check with a spy on `canvas.apply` in a unit test), and all tests pass.

---

## Phase 4 — Note panel and editor
**Goal:** notes become real documents.

**Build**
- The NotePanel (UI_SPEC §5): open with Enter (a double-click writes in the card, added during the phase), resizable from 320 to 720px, full-page mode, and Esc stepping back (full page → panel → closed).
- BlockNote via `@blocknote/shadcn`, lazy-loaded, with only the blocks in PRODUCT §3.2 (schema in `shared/blocknoteSchema.ts`), styled as in UI_SPEC §5.1.
- Autosave (500ms debounce, flushed on blur, close and quit), and the "Saved / Saving…" indicator.
- Derived fields on save (`body_text`, checklist counts, `attach_count`) and the card preview and checklist chip using them.
- The meta section: links (`note_links` CRUD), the DuePicker (Popover + Calendar, quick picks, **optional time and the Remind me select**; UI_SPEC §5), ColorSwatches, and the due chip states on the card.
- Due stored as `due_day` + optional `due_time` (ARCHITECTURE §4), the `remind_at` derivation on save, and resetting `remind` to none when the time is cleared. Reminders are **stored** in this phase but don't fire until phase 6.
- `note_activity` upsert on save.

**Tests**
- Unit: derive.ts (text extraction, checklist and attachment counts), due-state calculation (overdue, soon, later at the day boundaries, with and without a time), `remind_at` derivation for every option (including across a DST change and the time-cleared reset), and link reordering.
- E2E: `note-panel.spec.ts` (ARCHITECTURE §10.3) plus `autosave.spec.ts` (type, close the app within 1s, relaunch, and the text is there).

**It should:** let you write right in a card when you double-click it, and open the note in the side panel with Enter, with a Notion-style editor in both (type `/` for blocks, make checklists). The card updates live with "2/5", a link count and a due chip. You can pick colors, and nothing is ever lost.

**Exit check:** quitting at any moment loses at most 1s of typing, and all tests pass.

---

## Phase 5 — Done and the daily log
**Goal:** finishing things gets recorded.

**Build**
- The `setDone` transaction (done_at plus a log entry with a snapshot of the title) and undo-done (ARCHITECTURE §4).
- Mark done from the panel footer (Ctrl+Enter), from the card's hover checkmark, and from the context menu, plus the done animation (DESIGN_SYSTEM §6).
- The "Show done" toggle in the canvas top bar, which shows done cards faded and struck through.
- The Log view (UI_SPEC §6): header, week strip, month popover, summary line, entries (done and manual), the composer, editing and deleting manual entries, editing a manual entry's time, carried over, and the empty state.
- The canvas bottom-left status pill ("3 done today"), which opens the log when clicked.
- An injectable clock in main for tests.

**Tests**
- Unit: day keys across timezones, DST and midnight; carried-over selection; done and undo-done keep the DB consistent.
- E2E: `done-and-log.spec.ts` (ARCHITECTURE §10.3) plus `log-days.spec.ts` (with a fixed clock: entries land on the correct day, the ← and → arrows move between days, and the week strip dots match).

**It should:** let you tick a note done. It fades off the canvas and appears in today's log with the time. You can type "Called the bank" into the log, flip back to yesterday, and see what you did then.

**Exit check:** the done → log → undo round trip leaves no orphan rows, and all tests pass.

---

## Phase 6 — Daily driver: list view, quick capture and reminders
**Goal:** everything you need to actually use Sprawl every day.

**Build**
- **List view** (PRODUCT §3.3, UI_SPEC §5b):
  - the `notes.list` query (filters, sorts, color filter, title filter) and the `placeOnCanvas` IPC
  - rows, the Due tab grouping, keyboard navigation, "Show on canvas" (fly to the card), and list-only notes
  - the filter remembered in settings, and the overdue count badge on the List rail icon
- **Quick capture** (PRODUCT §3.7, UI_SPEC §5c):
  - the hidden capture window and its renderer entry, plus the global shortcut (default Ctrl+Shift+Space, configurable via the ShortcutRecorder in Settings)
  - Note and Log modes, `parseCapture` for `!date` tokens (PRODUCT §3.7 rules for weekdays and years) with the live preview chip, and the save flash
  - the main window must not take focus, including when capture hides (minimize then hide, ARCHITECTURE §2)
- **Reminders** (PRODUCT §3.8, UI_SPEC §5d):
  - the scheduler (`services/reminders.ts`) with the injectable clock, the powerMonitor resume re-check and the 60s safety interval
  - `notify.ts` with `toastXml` protocol activation (`sprawl://note/<id>`), which records instead of showing in E2E mode
  - due reminders, the optional morning summary, the one-time overdue nudge, and the "while you were away" summary on launch
  - clicking a notification opens the note (`nav:open-note`), and the morning summary opens the List view's Due tab
  - pause for 1 hour
- **Tray and background:**
  - the tray icon and menu
  - closing the window hides it to the tray when "keep running" is on (default)
  - start when Windows starts (`--hidden`)
- The Settings rows for Notifications, Quick capture and System (UI_SPEC §9), including "Send a test notification" and the "Windows is blocking notifications" warning (registry check, ARCHITECTURE §2).

**Tests**
- Unit: the `notes.list` query builder; `parseCapture` (all forms); the scheduler with a fake clock (arms the soonest, never fires twice, done cancels, missed reminders are summarized, morning summary skipped when there's nothing due); and ShortcutRecorder conflict handling.
- E2E: `list.spec.ts`, `capture.spec.ts`, `reminders.spec.ts` (ARCHITECTURE §10.3).
- Manual (`tests/MANUAL.md`): the real shortcut from other apps, and focus returning to that app after capture; real toasts and clicking them, with the window open, from the tray, and from Action Center after a restart; the blocked-notifications warning; sleep and wake through a reminder; reboot with start-at-login on.

**It should:**
- Press Ctrl+Shift+Space while in your browser, type "Pay rent !fri 10:00", hit Enter, and keep working.
- On Friday at 10:00, a Windows notification pops up. Clicking it opens that note.
- The List tab shows everything that's open or due at a glance.
- Closing the window keeps Sprawl in the tray, so reminders still arrive.

**Exit check:** all the automated tests pass, and every item in the phase 6 section of `tests/MANUAL.md` has been ticked on your Windows machine.

---

## Phase 7 — Attachments, images and links
**Goal:** files and URLs live in Sprawl too.

**Build**
- The files service: copy into `attachments/YYYY/MM/`, SHA-256 de-duplication, and the `attachments` table.
- The `sprawl-file://attachment/<id>` protocol route, which serves only files inside the vault (ARCHITECTURE §3).
- Editor: paste or drop an image to create an image block, drop any other file to create a file block, through BlockNote's upload handler.
- Canvas: the Image tool (I) and paste or drop images to create an ImageCard (UI_SPEC §4.7, with lightbox). Dropping other files creates a note with a file block.
- The Link tool (L) and pasting a URL create a LinkCard (§4.8). Ctrl+click opens the link in the browser via `shell.openExternal` (http, https and mailto only).
- Missing-file placeholder with "Locate…" and "Remove".

**Tests**
- Unit: hash de-duplication, path building, the protocol handler rejects paths outside the vault, and the URL scheme allow-list.
- E2E: `attachments.spec.ts` (ARCHITECTURE §10.3) plus `links.spec.ts` (paste a URL to get a link card; the label can be edited; the open handler is called, checked with a stub in E2E mode).

**It should:** let you drag a screenshot onto the canvas or into a note and see it appear. The file is saved in your vault's attachments folder, and pasting a link gives you a neat link card.

**Exit check:** the same image dropped twice gives one file on disk, and all tests pass.

---

## Phase 8 — Drawings (Excalidraw)
**Goal:** sketch inside the app.

**Build**
- The drawings service and IPC (including `duplicate`, `placeOnCanvas` and `restore`), and the `drawings` table.
- The `sprawl-file://thumb/<id>` protocol route for thumbnails (ARCHITECTURE §3).
- The Drawings grid (UI_SPEC §7.1) with an empty state and a tile menu (Rename, Place on canvas, Duplicate, Delete with confirmation).
- The DrawingEditor (§7.2): lazy-loaded Excalidraw with its fonts bundled locally (`EXCALIDRAW_ASSET_PATH`, no CDN), the dark monochrome overrides, a 1s debounced save, and the thumbnail export.
- The Drawing tool (D) on the canvas creates a drawing and opens it. A DrawingCard (§4.6) appears on the canvas, and a double-click opens it.
- Ctrl+Shift+D creates a new drawing.

**Tests**
- Unit: scene save and load round trip, and thumbnails are generated at the right width.
- E2E: `drawings.spec.ts` (ARCHITECTURE §10.3), up to "the thumbnail shows on the card". The `[[` part comes in phase 9.

**It should:** let you hit D, sketch a quick flow in Excalidraw and go back. A thumbnail of your sketch now sits on the canvas, and all your drawings are in the Drawings tab.

**Exit check:** Excalidraw isn't in the main bundle (check the build output, where it should be a separate chunk), opening a drawing makes no network requests (check the devtools Network tab), and all tests pass.

---

## Phase 9 — Linking
**Goal:** connect notes and drawings.

**Build**
- The `ref` inline content in BlockNote, and typing `[[` opens a picker of notes and drawings. The pill style comes from UI_SPEC §5.1, and clicking a pill opens the target.
- `refs` derived on save, and the backlinks ("Linked from") section in the panel.
- Pills look up titles at render time, so renaming a note updates every pill.

**Tests**
- Unit: refs extraction (notes and drawings, duplicates, refs removed on edit).
- E2E: `refs.spec.ts` (ARCHITECTURE §10.3) and the `[[drawing]]` step of `drawings.spec.ts`.

**It should:** let you type `[[` in any note to link to another note or a sketch, like in Notion, and see where each note is referenced from.

**Exit check:** renaming a note updates every pill that points to it, deleting a linked note shows the pill as "Deleted note" (struck through), and all tests pass.

---

## Phase 10 — Search and command palette
**Goal:** find anything in a second.

**Build**
- FTS index maintenance for notes, drawings (title plus text elements) and manual log entries, inside the same transactions as the writes.
- The CommandPalette (UI_SPEC §8) on Ctrl+K, with grouped results and highlighted snippets.
- Opening a result: a note opens its panel and pans the canvas to its card (240ms animation); a drawing opens the editor; a log entry opens that day.
- `>` commands (PRODUCT §3.5).
- All remaining shortcuts from PRODUCT §4, with tooltips showing them.

**Tests**
- Unit: index upkeep on create, update, delete and restore; query building (prefix matching, escaping quotes and special characters); search speed under 50ms on 5,000 seeded notes.
- E2E: `search.spec.ts` (ARCHITECTURE §10.3) plus `shortcuts.spec.ts` (every shortcut in PRODUCT §4 does its thing and doesn't fire while typing in an input).

**It should:** let you press Ctrl+K, type a word from any note, sketch or log entry, and land right on it. The canvas flies over to the card.

**Exit check:** the performance target is met (put the number in the commit message), and all tests pass.

---

## Phase 11 — Export, backup and settings
**Goal:** your data is safe and portable.

**Build**
- Markdown export in main (ARCHITECTURE §7) via `@blocknote/server-util`, with front matter, rewritten image paths and `[[Title]]` refs.
- Backup now plus the daily auto-backup (keep 7) as a zip via fflate.
- Every remaining row of the Settings view working (UI_SPEC §9).
- Recovery from a corrupt or locked DB (PRODUCT §5).
- "Export as markdown" for a single note from the panel menu.

**Tests**
- Unit: export of a note with a checklist, image and ref matches a stored snapshot; the backup rotation keeps 7; the settings switches persist.
- E2E: `export.spec.ts` (ARCHITECTURE §10.3) plus `backup.spec.ts` (Back up now creates a zip that contains `sprawl.db` and the attachments).

**It should:** let you export everything to a folder of plain markdown files and drawings that open in any editor, and keep a daily backup without you thinking about it.

**Exit check:** an exported vault opens readably in VS Code or GitHub preview (checked by hand once), and all tests pass.

---

## Phase 12 — Polish and release
**Goal:** it feels finished.

**Build**
- A full pass against DESIGN_SYSTEM and UI_SPEC on every screen: spacing, type, states, focus rings, motion and reduced motion.
- All empty states and the onboarding welcome note (UI_SPEC §10).
- Fill in `relaunch.spec.ts`.
- An accessibility pass: everything can be reached by keyboard, focus is visible, ARIA labels are on icon buttons, and contrast is checked.
- The electron-builder **NSIS** config (per-user install, Start-menu shortcut with the AppUserModelId, desktop shortcut optional, uninstaller keeps the vault) with the icons from `build/` (`icon.ico` multi-size), and the app version shown in Settings. The installer is built locally with `npm run dist`.
- Docs: README with screenshots and the lockup, CONTRIBUTING, and a short architecture overview for contributors.

**Tests**
- E2E: `relaunch.spec.ts` and a full regression run.
- Manual: run the whole of `tests/MANUAL.md` on the installed build (install, upgrade, uninstall, high-DPI, sleep and wake), and repeat the "It should" of every phase.

**It should:** feel like a finished, calm, fast app that you'd happily use every day and put on GitHub.

**Exit check:** cold start is under 1.5s, all PRODUCT §6 "Definition of done" items are true, `npm run check` is green, and the NSIS installer builds, installs and runs on Windows 10 and 11 (11 at minimum, if 10 isn't available). Tag `v0.1.0`.
