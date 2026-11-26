# Sprawl — Progress

A running log of the build, one phase per session (see `PHASES.md`). Read this first at the start of every session. Each phase records what was built, how it was verified, decisions that differ from or add to the docs, and anything left open.

| Phase | Status | Date |
|---|---|---|
| 0 — Project setup | ✅ Done | 2026-11-24 |
| 1 — Vault, database and app shell | ✅ Done | 2026-11-25 |
| 2 — Canvas foundations | ✅ Done | 2026-11-25 |
| 3 — Notes on the canvas | ✅ Done | 2026-11-25 |
| 4 — Note panel and editor | ✅ Done | 2026-11-25 |
| 5 — Done and the daily log | ✅ Done | 2026-11-25 |
| 6 — Daily driver: list view, quick capture and reminders | ✅ Merged (PR #7) | 2026-11-26 |
| 7–12 | Not started | |

---

## Phase 6 — Daily driver: list view, quick capture and reminders ✅

**Branch:** `feat/phase-6-daily-driver` → merged into `main` (PR #7). The last phase shipped as a single phase branch; from phase 7 on, work ships as small conventional branches and PRs (see `CLAUDE.md`).

### Built
- **List view** (`views/list/`):
  - `notes.list` (`services/noteList.ts`): Open, Due, Done and All, colors, the title filter and the sorts. Due groups: Overdue · Today · Tomorrow · This week · Later, with sticky headings.
  - Rows: checkbox, color dot, title, first body line (from 1100px), chips, "Not on canvas", edited (or done) time; hover actions Show on canvas and ⋯ (Place on canvas, Duplicate, Delete).
  - Ticking done fades the row out of Open, Due and Done (180ms), logs it, and shows "Marked done · Undo". Delete has Undo.
  - Keys: ↑↓, Enter, Space, Delete. ↓ from the filter box goes to the rows.
  - New note makes a list-only note, open in the panel with the cursor in the title. Show on canvas switches view, selects the card and glides it to the middle. Place on canvas puts a card in the middle of the last view.
  - The filter (tab, colors, sort) is remembered in `listFilter`. The rail's List icon shows the overdue count.
  - The panel: "Note · not on canvas" for list-only notes; Duplicate and Delete work for notes without a loaded card (`notes.duplicate`, `notes.remove` with Undo).
- **Quick capture:**
  - The hidden capture window (`main/captureWindow.ts`, `capture.html` + `views/capture/`). Note and Log modes (Tab), the `!date` highlight and "Due Tomorrow · 15:00" chip, Enter / Shift+Enter / Esc, the 600ms "Saved to canvas" / "Logged" flash, and minimize-then-hide.
  - `shared/parseCapture.ts`. `services/capture.ts` saves a note, its due date (a time adds an "At due time" reminder) and its card in one transaction, stepped 24px over 8 places.
  - The global shortcut (`CaptureShortcut`). The Settings `ShortcutRecorder` lets go of the old shortcut while recording and shows conflicts. Accelerators are checked by `shared/accelerator.ts`.
- **Reminders** (`services/reminders.ts`, `services/notify.ts`):
  - One timer for the soonest of reminders, overdue nudges, the morning summary and the end of a pause; a 60s interval; `powerMonitor` resume and unlock.
  - Missed (over 2 minutes late) items: one shows as itself, two or more become "While you were away". The morning summary goes once a day (`morningSummarySentOn`).
  - Due reminders off skips them; a pause holds them. Pending `remind_at` is re-derived on vault open and on a timezone change.
  - Toasts use `toastXml` protocol activation (`sprawl://note/<id>`, `sprawl://list/due`) and are recorded in E2E mode. `nav:open-note` and `nav:open-list-due` are handled (`lib/mainEvents.ts`, subscribed before React renders).
- **Tray and background:** `main/tray.ts` (Open · Quick capture · Pause/Resume · Quit, tooltip with the overdue count). Closing hides to the tray when "keep running" is on (`closeGuard`'s `hideInstead`). `--hidden` start, login item synced from `openAtLogin`. `npm run dev` registers the dev `sprawl://` handler (`SPRAWL_NO_PROTOCOL=1` skips it).
- **Settings:** Notifications (Due reminders, Morning summary + time, Send a test notification, the blocked warning with Open Windows settings), Quick capture (Shortcut, Default mode), System (Keep running, Start with Windows). Split into `NotificationsSection`, `CaptureSection`, `useSettings`.
- shadcn `toggle-group` and `checkbox` added (own commit); `SegmentedControl` wraps the toggle group.
- **Bundle:** the main page loads 351 kB of its own plus a 226 kB shared chunk (React, Radix and friends) that the capture page shares; the capture page's own code is 7 kB.
- **Tests:**
  - 373 unit tests (+95): `parseCapture` (every form, weekdays, years, leap day, punctuation, what it leaves alone), accelerators, the list query builder and `notes.list` through SQLite (each tab, sort, colors, title, `firstLine`, `onCanvas`), `countOverdue`, `placeNote`, the capture service, the scheduler with a fake clock and timers (arming, firing once, done cancels, deleted, same-time pairs, off, pause, missed summary, single missed, the 2-minute grace, wake from sleep, nudges, the morning summary, timezones, toast wording), list logic (groups, labels), `ShortcutRecorder` (record, conflict, hint, cancel), `NoteRow`, and the new schemas.
  - E2E (+20): `list.spec.ts` (7), `capture.spec.ts` (6), `reminders.spec.ts` (7). Page objects `ListPage`; fixture helpers `notifications`, `openLink`, `openCapture`, `captureVisible`, `trayState`.

### Exit check
- ✅ `npm run check` is green: typecheck (3 projects), ESLint + Prettier, 373 unit tests and 77 E2E tests. The last run used one retry, on phase 4's panel-resize drag in `note-panel.spec.ts` (a drag that registered only partly; 8/8 on repeat). Earlier runs showed `instance.spec.ts` racing the main window's first show and two canvas drags failing once; creating the capture window after `ready-to-show` fixed those (instance 10/10, the canvas drags 16/16).
- ⏳ **`tests/MANUAL.md`, phase 6:** to be ticked on your machine (real shortcut from other apps and focus going back, real toasts and clicking them with the window open, from the tray and from Action Center after a restart, the blocked warning, sleep through a reminder, reboot with start at login).

### "It should" (checked by automation)
- ✅ Capture "Call Ali !tomorrow 15:00" + Enter: a note with the title, due date, time and reminder, on the canvas, and the capture window hides (`capture.spec.ts`). From your browser: manual.
- ✅ At the reminder time a notification is recorded, once, and opening its link opens that note (`reminders.spec.ts`). The real toast: manual.
- ✅ The List tab shows what's open or due at a glance: tabs, groups, colors, title filter, the badge (`list.spec.ts`).
- ⏳ Closing the window keeps Sprawl in the tray: manual (the tray is off in E2E).

### Decisions and findings (the docs are updated)
- **A capture with a time gets an "At due time" reminder**, so "Pay rent !fri 10:00" notifies on Friday at 10:00 (the phase's own "It should"). A day without a time sets no reminder.
- **The overdue nudge reuses `reminded_at`** (no migration): it fires when a reminded note's due moment passes while `reminded_at` is still before it. "At due time" reminders don't nudge.
- **Late = more than 2 minutes behind.** That covers launch, sleep and pauses with one rule; on-time pairs still get a toast each.
- **Due reminders off skips; a pause holds.**
- **The morning summary** also goes out on a start later the same day, and is remembered per day (`morningSummarySentOn`, a new vault setting).
- **"This week" runs to Sunday.** **Done sorts by done time**, so the sort select hides on Due and Done. **Ties go to the most recently created** (`rowid DESC`), which also keeps fixed-clock tests stable.
- **The capture window is the app's second window.** Specs that reached for `getAllWindows()[0]` now pick the main window by title (the capture window's URL is empty for a moment at startup; its title isn't). It's created after the main window's `ready-to-show`, so `firstWindow()` stays the main one and the main window's first paint isn't slowed (creating it on `did-finish-load` delayed the main window's show enough to race `instance.spec.ts`).
- **Closing to the tray** hides instead of running the save handshake; the main window's `closed` now quits the app, since the capture window would keep it alive.
- **Panel color changes go through the canvas only while it's loaded**; from the list they're note updates (the canvas reloads when it opens).
- **Title focus for a new list note** is a request the panel takes when the note shows (`titleFocusRequested`), not a timed poll.

### Open / carried forward
- The `notificationStatus` per-app check reads the key under the AppUserModelId, which only exists for the packaged app (`dev.sprawl.app`); unpackaged, only the "all notifications off" switch is detected. Re-check in phase 12.
- Start at login in dev runs the last `npm run build`. The installed app is the real check (phase 12).
- Pointer-drag E2E tests (panel resize, canvas resize and marquee) can occasionally register a partial drag when the machine is busy. Worth hardening (wait a frame between drag steps) if it keeps showing up.
- `gh` still isn't installed: the PR is opened and merged in the browser.

---

## Phase 5 — Done and the daily log ✅

**Branch:** `feat/phase-5-daily-log` → PR into `main` (no tag).

### Built
- **Mark done** (`services/log.ts setNoteDone`), one transaction: `done_at` plus a `done` log entry with the title snapshot. Undo deletes that entry (matched on `at = done_at`) and clears `done_at`.
  - Two ways in: the undoable `setDone` canvas op, and `notes.setDone` for notes without a card (phase 6's list).
  - A reminder that came due while the note was done is marked fired on undo, so it doesn't go off late; one still ahead stays armed. Done itself cancels the reminder through `done_at`, which the reminder index already skips.
- **Daily log service and IPC:** `log.day`, `addManual`, `update` (text, or an `HH:mm` time on the entry's own day), `remove` (manual entries only), `daysWithEntries`, `carriedOver`. All inputs are zod-validated. Done entries show the note's live title and color, and fall back to the snapshot once the note is deleted or purged.
- **Injectable clock** (`services/clock.ts`), used by every service and the purge. In E2E mode `setNow` fixes it and tells the renderer (`clock:changed`), so "today" agrees on both sides.
- **On the canvas:**
  - Mark done from the card's hover check, the menu (Mark done / Mark not done) and Ctrl+Enter.
  - The card fades to 0 and shrinks to 0.96 over 180ms, then hides, with "Marked done · Undo"; Ctrl+Z undoes it too.
  - Done cards stay in the store but leave the spatial grid, so culling, the marquee, select all and zoom to fit skip them.
  - "Show done" in the top bar (and the now-live Settings switch, the same setting) shows them at 50% with the title struck through.
  - The bottom-left status pill reads "Wed 25 Nov · 1 done today" and opens today's log.
- **In the panel:** Mark done in the footer (with `Ctrl ↵`), then "Done · 09:42 · Undo". Ctrl+Enter toggles it from anywhere in the panel, except in a checklist item, where BlockNote uses it to tick the item.
- **Log view** (UI_SPEC §6):
  - Header: the date, "Today" or "Go to today", ← → (Ctrl+[ / Ctrl+]; never past today), and the month popover with dots on days with entries.
  - The week strip with its dots, and the "2 done · 1 logged" summary.
  - Entries: done ones with the color tag, opening the note; manual ones with inline markdown (bold, italic, code, links), edit and delete on hover (Delete has Undo), and a click on the time to change it.
  - New rows get the one-time highlight. Also: carried over with Open, the composer, and the empty state.
- **Bundle:** the Log view and its month calendar are lazy-loaded. The renderer's main chunk is 461 kB (574 kB after phase 4; the calendar now loads only with the panel or the log).
- **Tests:**
  - 278 unit tests (+52). `log.test.ts`: day keys across midnight, three timezones and both London DST changes; done just before and after midnight; done in another timezone; the done/undo transaction (no orphan rows, done twice, re-done, undone on a later day, deleted notes, both reminder cases); live title vs snapshot through delete and purge; the `setDone` op (round trip, gone card, rollback on a link card, delete and restore of a done card); manual entries; days with entries; carried-over selection, today and on a past day.
  - Also: `setDone` reduce and invert, the schemas, the week strip and day stepping, inline markdown, the canvas store (fade then hide, grid, selection, undo, Show done, log refresh), and the log `Entry` component.
  - 57 E2E tests (+5):
    - `done-and-log.spec.ts`: hover check → card hides → status pill → today's log has the entry with the time and color → Ctrl+Z removes it with no rows left; the menu, toast Undo, Ctrl+Enter, the panel footer and its Undo, Ctrl+Enter in the panel, Show done and un-doing from there; manual entries (add, markdown, edit time and text, delete and Undo, days, relaunch).
    - `log-days.spec.ts` (fixed clock): done at 23:59:50 lands on the 24th and at 00:00:05 on the 25th; a manual entry at 09:15 on the 26th; ←, →, Ctrl+[ and Ctrl+]; the week strip's days, today, selection and dots, also further back; the month picker; carried over and its Open.
    - `pages/LogPage.ts`, plus `setNow(app, page, ms)` in the fixtures.

### Exit check
- ✅ `npm run check` is green: typecheck (3 projects), ESLint + Prettier, 278 unit tests and 57 E2E tests (no retries used).
- ✅ **The done → log → undo round trip leaves no orphan rows:**
  - unit: `notes.setDone` and the `setDone` op, each through done → undo, leave no `log_entries` for the note and no `done_at`, while other notes' entries stay;
  - E2E: after Ctrl+Z, `log.day(today)` is empty and the note's `doneAt` is null.

### "It should" (checked by automation and screenshots)
- ✅ Tick a note done; it fades off the canvas (screenshots at 80ms and after) and shows in today's log with the time (E2E checks the stored `at` against the row).
- ✅ Type "Called the bank" into the log, go back to yesterday and see what was done then (E2E in both specs).
- ⚠️ **To try by hand with `npm run dev`:** the feel of the fade, the hover check next to the open button on small cards, and the log's month popover.

### Decisions and findings (the docs are updated)
- **Test hooks aren't IPC channels:** the E2E clock is a main-process global that Playwright calls through `app.evaluate`, so nothing test-only can be reached from a renderer (ARCHITECTURE §10.3 said `test:setNow` IPC).
- **Mark done toggles** on the canvas and in the panel: with "Show done" on, Mark done on done notes reads "Mark not done". Without it, done notes had no way back on the canvas apart from undo.
- **Carried over** = notes edited the day before that weren't done **by the end of the day shown**. Today that's what's still open; on a past day, what was still open then.
- **The log stops at today** (→ is disabled, future days can't be picked). **The week strip** shows the last 7 days while the selected day is among them, then the 7 days ending on it.
- **Manual entries:** the time is edited as `HH:mm` on the entry's own day, so an entry never changes day. A new entry on another day takes the current time of day. Deleting one has Undo (it's re-added with the same text and time).
- **Done isn't an edit:** marking done doesn't touch `updated_at` or `note_activity`.
- **The card title keeps 36px clear** for the open and done buttons (14px before).
- **The FTS update** in the done transaction waits for phase 10, where the search index starts being maintained.
- **Hidden done cards leave the spatial grid,** so the visible-ids hook now also recomputes when a card finishes fading out or "Show done" flips. It wasn't recomputing at first, and the E2E caught it.
- Added the `--ease-in` token and the `row-highlight` animation to `globals.css` (and the drop-in copy in DESIGN_SYSTEM).

### Open / carried forward
- **Phase 6:** the reminder scheduler (it must skip done notes, which the index already does); Mark done from the list's checkbox goes through `notes.setDone`; "Show done"'s Settings switch is live, the rest of Settings still isn't.
- **Phase 10:** index manual log entries, and update the FTS on done.
- **Small polish for later:** a toast shown just before switching to the log can briefly cover the composer (toasts sit bottom-center).
- `gh` still isn't installed: the PR is opened and merged in the browser.

---

## Phase 4 — Note panel and editor ✅

**Branch:** `feat/phase-4-editor` → PR into `main` (no tag).

### Built
- **Notes service:** `update` takes the body and due fields and derives the rest in the same transaction:
  - the body → `body_text` and the checklist and attachment counts (`db/derive.ts deriveBody`, which walks nested blocks);
  - the due fields → normalized (no day means no time and no reminder, and a time-based reminder without a time becomes none) and `remind_at` (`shared/due.ts`); a change clears `reminded_at`.
  - Every save, link changes included, upserts `note_activity` for today. `get` returns the note's links.
- **Note links:** `notes.links.{add, update, remove, reorder}` (http, https and mailto only; a reorder must list exactly the note's links).
- **Close handshake** (`main/closeGuard.ts`, `lib/flushes.ts`): the window's close waits until the renderer has sent every pending write (note autosave, canvas batch, viewport, panel width), or 2s.
- **Card chips:** checklist "2/5", links, attachments and the due chip (Today / Tomorrow / weekday / "12 Dec"; overdue, soon and later colors), from `CardNote`'s new fields. A shared 30s clock (`clockStore`) rolls due states over without a timer per card.
- **Note panel** (lazy-loaded with everything behind it):
  - opens with Enter or the menu's Open; resizable 320–720px through the shadcn handle (the width is saved); full page (Ctrl+Shift+Enter or the header button); Esc steps back after any open menu or popover;
  - header: color dot with a swatch popover, "Note", full page, ⋯ (Duplicate, Delete with Undo), close;
  - title (Enter moves to the body), the BlockNote body, and the meta section: links (add by pasting, edit the label, remove, drag to reorder; a click opens the browser), the due date (DuePicker: quick picks, calendar, an optional time typed or stepped by 15 min, Remind me), the reminder line ("Reminds you Fri 14:45"), colors;
  - footer: "Saved" / "Saving…" (and "Couldn't save. Retrying…").
- **Editor:** BlockNote 0.57 via `@blocknote/shadcn` with PRODUCT §3.2's blocks (`shared/blocknoteSchema.ts`), markdown shortcuts and a `/` menu limited to those blocks. No colors and no text alignment; the drag handle is the only side-menu control.
- **Autosave** (`stores/noteStore.ts`): 500ms after the last change, flushed on blur, panel close, `beforeunload` and the close handshake. The body is serialized only when the save runs, an unchanged body isn't written, and a failed save keeps the edit and retries every 2s.
- **Writing in the card** (requested during the phase, see below): a double-click on a card's body is quick plain text right in the card (only `[] ` makes a checklist item); Enter after a card's title goes on to the body. The panel stays open and follows the card live, and cards get a hover open button.
- **Canvas:** Enter opens the selected note; the menu gets Open and Due date… (which opens the panel with the date picker showing). Canvas keys ignore everything inside the panel. A color picked in the panel is an undoable canvas step.
- **shadcn:** `popover`, `calendar`, `select`, `resizable`, `dropdown-menu`. **New deps:** `@blocknote/core`, `@blocknote/react`, `@blocknote/shadcn`, `date-fns` (all in the stack), plus `react-day-picker` and `react-resizable-panels` from the shadcn adds. Dev: `jsdom`, `@testing-library/react`, `@testing-library/dom` (planned in phase 3's notes).
- **Tests:**
  - 226 unit tests (+85): `deriveBody` (text, nesting, counts, junk), `shared/due.ts` in Europe/London (every remind option, both DST changes, the time-cleared reset, due states at the day and time boundaries, labels), the notes service (body, due, re-arming, activity, links CRUD and reorder), the new schemas, time parsing and nudging, URL normalizing, link reordering (`moveItem`), the note store (debounce, one write, lazy serializing, flush on close, retry, card sync), and component tests in jsdom for CardChips, ColorSwatches and DuePicker.
  - 52 E2E tests (+13): `note-panel.spec.ts` (the full ARCHITECTURE §10.3 flow plus a relaunch; Esc and full page; the panel following the card live, including typing in the panel then switching to the card before the save; the menu's Open and Due date…; panel colors undone with Ctrl+Z; delete from the panel with Undo; resize limits and the saved width), `autosave.spec.ts` (close within the debounce, and mid-save, then relaunch), `card-writing.spec.ts` (plain text and `[] ` in a card, title → Enter → body, no menus and plain paste, a panel heading staying card-sized).

### Exit check
- ✅ `npm run check` is green: typecheck (3 projects), ESLint + Prettier, 226 unit tests and 52 E2E tests.
- ✅ **Quitting loses at most 1s of typing:** `autosave.spec.ts` closes the window like a user (the window's `close` event) while the edit is still inside the 500ms debounce, and while a save is on its way; after a relaunch the title, body and checklist are there. With the close handshake turned off the test still passed (the `beforeunload` flush alone got there), so the handshake is a second safety net that makes the order explicit.

### "It should" (checked by automation and screenshots)
- ✅ Write in a card with a double-click, or open the note in the side panel (Enter, or the hover button): `card-writing.spec.ts`, `note-panel.spec.ts`.
- ✅ A Notion-style editor: `/` for blocks, `[] ` checklists, `# ` headings (E2E in both places).
- ✅ The card updates live with "1/2", a link count and a due chip (E2E).
- ✅ Colors (E2E, including undo).
- ✅ Nothing is lost (see the exit check).
- ⚠️ **To try by hand with `npm run dev`:** the feel of typing in a card and in the panel, dragging the panel edge, the date picker and time field, and the slash menu at different zooms.

### Changes requested during the phase (the docs are updated)
- **Write right in the card** ("why doesn't the note square let me edit the note?"). A double-click on the body writes in the card (PRODUCT §3.1, UI_SPEC §4.5); the panel is for links, the due date and the rest. A first version had the full editor (markdown, `/` menu) in the card; after trying it you asked for quick plain text instead ("typing the markdown heading in the notes doesn't look good"), so the card is plain text styled like its preview, with `[] ` checklists as the one shortcut.
- **One heading level** (same feedback: an H1 under the small card title, or bigger than the panel title, looked wrong). The schema has one heading, 16px in the panel and bold card-size text in a card.
- **The panel stays open while writing in the card** and follows it live (and the other way round), and **a hover open button** on cards opens the panel (with double-click now writing in the card, Enter alone was too hidden).

### Decisions and findings (the docs are updated)
- **Caught while building the live panel:** a card's editor first started from the body as loaded, not from what had just been typed in the panel, and the live sync then copied that stale document back over the panel's text. New editors now start from the live editor's document (or the latest saved body), and an editor that goes away hands its document to the store. `note-panel.spec.ts` covers it (type in the panel, switch to the card before the save).
- **Panel titles are saved trimmed** (spaces stay while typing), like the card's inline title edit. A full-check run once stored a title with a trailing space (1 of 7 runs of that test; every body space was intact, and the cause wasn't pinned down); trimming on save makes titles consistent either way.
- **React's `stopPropagation` can't stop the canvas gestures:** React listens at the app root, above the canvas's native listeners. The gestures skip `[data-card-action]` and `[data-card-editor]` themselves.
- **BlockNote 0.57's shadcn package brings its own components on Base UI,** so the app's Radix ones can't be passed in. They use the same token classes; an `@source` in `globals.css` makes Tailwind generate them, and `views/note/editor.css` maps the `--bn-*` variables onto our tokens.
- **No colors in the editor:** the schema leaves out text and background colors (monochrome), and the drag-handle menu has Delete only. Text alignment is out too (not in the note model, and markdown can't keep it). The "+" next to blocks is gone, so the drag handle fits the panel's 24px gutter.
- **Image and file blocks** are in the schema (so counts work) but not in the `/` menu until phase 7 adds attachments.
- **The placeholder** is "Type '/' for blocks"; phase 9 adds "'[[' to link" with the feature.
- **Esc:** BlockNote marks Esc handled when it only blurs the editor; the panel treats that as its own Esc. Radix popovers keep their dismiss layer through the ~150ms exit animation, so an Esc pressed during it is swallowed (the tests wait for the picker to close, as a person does).
- **"Add a time first"** shows inline on the disabled reminder options: a disabled select item takes no pointer events, so it can't show a tooltip.
- **"Next week" is next Monday,** and the calendar starts weeks on Monday.
- **Bundle:** the renderer's main chunk is 574 kB (490 kB after phase 3). The panel, the date picker and BlockNote load the first time a note opens (the editor chunk is about 1 MB, and BlockNote's locale files are separate chunks that only load on demand).
- **BlockNote warns without `interactive-widget=resizes-content`** in the viewport meta tag; it's added (harmless on desktop) rather than allow-listed.
- **Title double-clicks** now aim at the title text (`[data-card-title-text]`); the two phase-3 tests that double-clicked the middle of the title line were pointed at the text.
- `noteStore.ts` takes the place of ARCHITECTURE's planned `notesCache.ts`.

### Open / carried forward
- **Possible follow-up:** cards show their body as plain text when you're not writing in them (from `body_text`), so checkboxes and headings appear as plain lines. Showing the formatting on idle cards would mean loading each card's body JSON; worth deciding before polish (phase 12).
- **Phase 5:** Mark done in the panel footer (Ctrl+Enter), "Done · 18:30 · Undo", the hover check button on cards, and Mark done in the menu.
- **Phase 6:** the reminders stored now start firing; the `nav:open-note` handler; "Note · not on canvas" in the panel breadcrumb; Duplicate and Delete in the panel for notes without a card.
- **Phase 7:** image and file blocks in the `/` menu, with the upload handler.
- **Phase 9:** `[[` links, the `ref` inline content and "Linked from".
- **Phase 11:** Export as markdown in the panel's ⋯ menu.
- `gh` still isn't installed: the PR is opened and merged in the browser. Your npm is still 9.5; this phase installed with `npx npm@11`.

---

## Phase 3 — Notes on the canvas ✅

**Branch:** `feat/phase-3-notes` → merged into `main` (no tag).

### Built
- **Notes service and IPC** (`services/notes.ts`): `get`, `create`, `update` (title and color so far), `duplicate` (copies the title, body, color, links and refs, not the due date or done state), `remove` and `restore` (soft delete). The **30-day purge** runs on every vault open (launch and switch), removing notes and drawings with their cards, refs (both directions) and search rows; links and activity go by cascade and log entries keep their title snapshot.
- **Canvas ops:** `restore` (puts the card back with its old id and un-deletes its note; fails if the note was purged) and `setColor`. A note card's `create` can carry a pasted `body` (one paragraph per line) or `copyOf` (a canvas duplicate). Cards now carry a `preview` (the first 400 characters of `body_text`).
- **NoteCard:** title (2 lines), plain-text preview (4 lines, hidden when empty and below 40%), color, hover border and lift, selection outline and corner handles that stay the same size on screen at any zoom, drag lift, and a fade-in for new cards. The stored height is a floor: the card grows with its content up to 320. Room is left for the phase-4 chips.
- **Creating notes:** double-click on empty space, the Note tool (click for a default note, or **drag to draw one at that size**), Ctrl+N (view center), pasting text (first line → title, the rest → body), and "New note here" in the menu. The title is focused, and a note that's off screen or made while zoomed out glides into view at 100%.
- **Inline title editing:** a textarea that grows with the text; Enter or clicking away saves (one `notes.update`), Esc reverts. Until the panel exists, a double-click anywhere on a card edits its title.
- **Selection:** click, Shift+click, marquee (touching cards, Shift adds), Ctrl+A, Esc, and a dashed box around a multi-selection.
- **Move, resize, nudge:** drag (8px snap of the grabbed card, Alt skips; the `snap` setting is respected), corner handles (160–480 × 64–320), arrow keys (1px, Shift 8px; a held key is written once on keyup). All shown through transient rects and written in one batch at the end.
- **Commands:** Delete/Backspace with a "Deleted · Undo" toast, Ctrl+D duplicate (new notes and cards, 24px offset, "Duplicated" toast), Ctrl+] / Ctrl+[ restack, color.
- **Undo/redo** (Ctrl+Z / Ctrl+Shift+Z) for every canvas op, 200 steps (`historyStore.ts`); a toast's Undo works even after later steps or an undo/redo round trip.
- **Selection toolbar** (FigJam-style, requested during the phase): colors, Duplicate, Bring to front, Send to back, Delete, floating above the selection.
- **Context menu** (UI_SPEC §4.10) with this phase's items: Color ▸, Duplicate, Bring to front, Send to back, Delete; on empty space New note here, Paste, Zoom to fit.
- **Smoother canvas** (requested): zoom steps and reset glide (180ms), fit and reveal glide (240ms), drags are folded to one update per frame, and the dot grid is now **endless**: the phase-2 grid (20px × zoom, doubled below 50%) keeps doubling instead of hiding below 25%. Two other grids were tried during the phase (constant density, then board-pinned with fading layers); you preferred going back to the original, just never hidden.
- **shadcn:** `context-menu`, `sonner` (+ `lucide-react` for their stock glyphs, and `next-themes` that the stock Sonner file imports). Wrappers `Toaster.tsx` and `UndoToast.tsx`.
- **Tests:**
  - 141 unit tests (+39): op inversion for every op type and round trips back to the start, the 200-step cap and stable step ids, snap/resize/draw/restack math, `revealViewport`, the dot grid, the store's undo/redo/undoStep, **no `canvas.apply` during a drag (spy) and one batch at the end**, `renameNote` ordering, the notes service (CRUD, paste body, duplicate, soft delete), the canvas service (create/delete/restore round trip with no orphan rows, purged-note restore rollback, one card per note, setColor, paste and copy), and the purge (only items older than 30 days, with their rows).
  - 39 E2E tests (+12): `canvas.spec.ts` (double-click → title → drag with snap and Alt → relaunch; Note tool click and drag, Ctrl+N, paste; title editing; resize limits; marquee + delete + undo/redo + toast Undo; Ctrl+Z through delete, resize, move and create; colors from the toolbar and menu, restack from keys and toolbar, nudge and undo; reveal at 100%) and `canvas-select.spec.ts` (marquee 3 of 4 → Ctrl+D → undo removes the duplicates; click, Shift+click, Ctrl+A, group drag, Esc; single-key tools don't fire while typing).

### Exit check
- ✅ `npm run check` is green: typecheck (3 projects), ESLint + Prettier, 141 unit tests and 39 E2E tests. The two canvas specs also passed 3 runs in a row on their own.
- ✅ **No DB write during a drag:** `canvasStore.test.ts` drives 60 transient updates with a spy on `canvas.apply`: zero calls, then exactly one batch on commit.

### "It should" (checked by automation; you exercised it with `npm run dev` during the phase)
- ✅ Double-click anywhere to make a sticky and type a title (E2E).
- ✅ Drag it around, resize it and delete it (E2E, including snapping and the size limits).
- ✅ Ctrl+Z undoes it all, one step at a time (E2E: delete → resize → move → create).
- ✅ Everything is still there after a restart (E2E relaunch).
- ⚠️ **Still to confirm by hand with a fresh `npm run dev`:** the glide feel of zoom steps and reveal, the dot grid while zooming, and live dragging (see below).

### Changes requested during the phase (the docs are updated)
- **Note colors → "soft tints"** (DESIGN_SYSTEM §2.3). Chosen from a rendered side-by-side preview after trying bright pastels and dusty mid-tones in the app: richer than the first spec's very dark tints, still light text (≥ 10.9:1). The picker shows each color as the card color ringed in the bright hue (`pickerSwatch`), so it matches the card.
- **FigJam-style selection toolbar** with the colors and quick actions (UI_SPEC §4.9, DESIGN_SYSTEM §8). The right-click menu stays as the full list (your call was "what do you suggest?": kept, because it's invisible until used, right-click is a desktop reflex, and Open, Mark done and Due date… land there in phases 4–5).
- **Note tool:** click places, drag sizes.
- **Smoothness:** gliding zoom commands and reveal (DESIGN_SYSTEM §6 now allows command glides; wheel, pinch and drags stay direct), per-frame drag updates, new notes glide into view.
- **Dot grid** (UI_SPEC §4.1): back to the phase-2 grid, but never hidden when zoomed out.
- **Double-click on a card** edits its title until phase 4 gives the rest of the card to the panel.

### Decisions and findings (the docs are updated)
- **Pointer capture retargets `dblclick`** to the board, so a double-click on a card looked like one on empty space and made a new note (you hit this). Double-clicks now hit-test `elementFromPoint`.
- **Focusing scrolls overflow-hidden boxes:** an autofocused title could scroll the canvas element itself, shifting every card away from where the pointer math puts it. The title focuses with `preventScroll`, and the canvas resets any scroll.
- **No scale-in for new cards:** a scale animation moves the hit area while it runs, and it stalls in a window that isn't painting, so a quick grab missed (the flaky E2E). New cards fade in only.
- **The menu's closing animation keeps focus inside it,** so shortcuts right after a menu action were swallowed; the key handler now only defers to menus that are still open.
- **Title edits aren't canvas undo steps** (PRODUCT lists create, move, resize, delete, color and done); undoing a create still removes the note.
- **Main's created rows don't overwrite local changes:** only `createdAt` (and the note, if the local copy has none) is taken, since a card can move before the batch answers.
- **Dot alignment:** a `radial-gradient(circle …)` tile draws its dot in its center. The two-layer grid tried mid-phase put its coarse dots in the middle of the fine squares (you spotted it as "5 dots"). The final single-layer grid is offset by half a tile (`dotLayerPosition`) so a dot sits on the world origin and doubling keeps every other dot in place.
- **Background windows stall:** Chromium throttles a window that isn't in front, so animation frames, ResizeObserver and animations stop, and the canvas tests flaked while you used the machine. E2E windows turn `backgroundThrottling` off (real windows keep the default). The canvas size is also measured synchronously on mount, and a reveal never runs against an unmeasured (0×0) canvas; that was gliding new notes to the top-left corner.
- **Known flake:** the "resizing from a corner" E2E has failed once or twice under heavy load (never alone, 5/5); Playwright's single retry covers it. Worth a look if it shows up again.
- **Bundle:** the renderer is 490 kB minified (396 kB before this phase); the growth is Radix's menu/popper and Sonner, both in the stack.
- If dragging ever looks "not live" under `npm run dev`, restart it: hot-reloading the Zustand stores many times can leave cards listening to an old store copy.

### Open / carried forward
- **Your request: writing on the canvas without a note** (free text, like FigJam's text tool). Not in the spec yet: it needs a new card kind (`text`) and a Text tool. To decide: which phase it goes in (it fits with phase 7's link and image cards) before it's built.
- **Your request: markdown and checklists in notes** is phase 4 (BlockNote: `/` menu, `[] ` checklists, headings, and the "2/5" chip on the card).
- **Phase 4:** Open (Enter / double-click off the title) → the panel; Due date… in the menu; the chips row (chip backgrounds should be checked against the new soft tints); ColorSwatches in the panel reuse `pickerSwatch`.
- **Phase 5:** Mark done (menu, hover check button), `setDone`, the "Show done" toggle and the status pill.
- `gh` still isn't installed: the PR is opened and merged in the browser.

---

## Phase 2 — Canvas foundations ✅

**Branch:** `feat/phase-2-canvas` → merged into `main` (no tag).

### Built
- **Canvas IPC:**
  - `canvas.load()` / `canvas.apply(ops)`. `services/canvas.ts` runs each batch in one transaction.
  - The ops so far are `create` (a note card can carry its new note), `update` and `delete` (a note or drawing card's delete soft-deletes it).
  - The types are in `shared/types.ts`, and the zod op schemas validate kind-specific rules: a link card needs a url, other cards need a refId, and only http, https or mailto urls are allowed.
- **Viewport** (`views/canvas/Viewport.ts`):
  - Pan with space+drag, a middle-mouse drag, the Hand tool or the wheel (Shift+wheel scrolls sideways).
  - Zoom around the cursor with Ctrl+wheel or a pinch, within 10–400%.
  - Ctrl+= / Ctrl+- / Ctrl+0, and zoom to fit with Shift+1 (animated over 240ms).
  - The dot grid follows UI_SPEC §4.1.
  - The viewport is saved to settings (debounced, and flushed on blur, close and leaving the view).
- **Floating toolbar** (UI_SPEC §4.2): Select (V) and Hand (H) work. Note, Link, Drawing and Image show but are disabled.
- **Zoom pill** (UI_SPEC §4.4): −, the percentage (click resets to 100%) and +.
- **Canvas store** (`stores/canvasStore.ts`): applies ops optimistically and batches every op from the same tick into one `canvas.apply`.
- **Culling:** a 512px `SpatialGrid` with a 200px margin. `useSimplified()` covers zoom below 40%.
- **Placeholder `NoteCard`:** color, title and "Untitled". Phase 3 fills it in.
- **Dev seed:** Ctrl+Alt+Shift+S with `npm run dev` (ARCHITECTURE §6).
- **Tests:**
  - 102 unit tests (+39): viewport math (round trips, zoom keeps the cursor point fixed, stops, fit, dot grid), the spatial grid (including a brute-force comparison over 1,000 random cards), `CanvasService` (create, update and delete persist; atomic rollback; refusing a missing ref), the canvas op schemas, the canvas shortcuts, and the store's batching and debounced viewport save.
  - 27 E2E tests (+8): `canvas-viewport.spec.ts` (space-drag, Hand, middle and wheel pan; Ctrl+scroll zoom around the cursor; shortcuts and pill limits; restored after relaunch; culling and simplified rendering; Shift+1 fit; invalid ops rejected), plus a `pages/CanvasPage.ts` page object.

### Exit check
- ✅ `npm run check` is green: typecheck (3 projects), ESLint + Prettier, 102 unit tests and 27 E2E tests.
- ✅ **Performance with 1,000 cards.** Measured on this laptop with Playwright driving the built app: rAF frame intervals plus CDP `Performance.getMetrics` for main-thread time per frame.
  - This display runs at **49–50 Hz**, so the frame rate is capped there. Every pan and zoom held it, with p95 equal to the average (20.2ms) and no dropped frames apart from one frame crossing the 40% threshold.
  - Main-thread cost per frame against the 16.7ms budget for 60fps:

    | Gesture | Main thread per frame |
    |---|---|
    | Pan at 100% (88 cards rendered) | 2.7ms |
    | Zoom from 100% down to 10% | 3.6ms |
    | Pan at 10% with all 1,000 cards rendered (worst case) | 8.7ms |
    | Zoom from 10% up to 400% | 1.1ms |

  - There's headroom for 60fps or more. **To confirm by eye** on a 60Hz+ screen with the DevTools performance panel if you like.
- ✅ `npm run dev` (temp profile, over CDP): the real dev seed command stored 1,000 cards in one batch, 88 render at 100%, and Shift+1 fit renders all 1,000 at 12%. No console warnings or errors.

### "It should" (checked by automation and screenshots)
- ✅ Glide around an endless dotted board: the pan E2E tests, plus screenshots at 100% and 12% (dots hidden below 25%, as specified).
- ✅ Zoom in and out smoothly: the Ctrl+scroll and shortcut E2E tests; the zoom keeps the point under the cursor fixed (unit and E2E).
- ✅ Still smooth with 1,000 seeded cards: see the measurements above.
- ⚠️ **To confirm by hand with `npm run dev`:** a real touchpad pinch and two-finger scroll (tests send synthetic ctrl+wheel and wheel events), and the feel of space+drag.

### Decisions and findings (the docs are updated)
- **Renderer-chosen ids:** new cards and notes get their nanoid in the renderer, so optimistic copies keep their id. `update` and `delete` of a missing card are no-ops; anything else rolls back the batch, and the store then reloads.
- **`canvas.load()` joins the note's card fields** (`note: { title, color }`) onto note cards, so the canvas needs one call. Phase 3 extends `CardNote` with the preview and chip counts.
- **Below 40% zoom** the card keeps its 13px (world) title and drops the shadow. 13 *screen* px couldn't fit a card that's 22px wide at 10%.
- **The viewport skips React** and is written straight to the DOM. `will-change` is toggled only while the view moves (ARCHITECTURE §6).
- **Zoom stops** for the shortcuts and the pill, and continuous Ctrl+wheel zoom capped at about 22% a notch.
- **Zoom to fit never zooms past 100%,** and with no cards it centers the origin at 100%.
- `tsconfig.e2e.json` now includes `src/shared/**` so specs can import shared types.

### Open / carried forward
- **Phase 3:** done (see above).
- **Phase 5:** `setDone`, the "Show done" toggle and the bottom-left status pill (UI_SPEC §4.3; it needs "done today").
- **README header:** the `docs/readme-header` branch (`brand/readme-header.svg` as the banner) is pushed. Its PR is to be opened and merged in the browser (`gh` isn't installed).

---

## Phase 1 — Vault, database and app shell ✅

**Branch:** `feat/phase-1-vault-shell` → merged into `main` (no tag).

### Built
- **DB:** the full ARCHITECTURE §4 schema in Drizzle (`main/db/schema.ts`). drizzle-kit generated `0000_init.sql`, with the FTS5 `search_index` appended by hand. A small runner tracks `PRAGMA user_version`, and the SQL is bundled via `?raw` imports. WAL, `foreign_keys` and `synchronous=NORMAL` are set.
- **Vault** (`services/vault.ts`): onboarding when there's no vault. `SPRAWL_VAULT` skips onboarding and isn't remembered. The vault path is remembered in `config.json`. A remembered folder that's gone brings onboarding back (rather than an empty vault in its place). Settings → Change… opens or creates the chosen folder's vault after a confirm dialog.
- **config.json** (`main/config.ts`): the vault path, the window state and the machine settings. Each field is validated on its own, and writes are atomic.
- **Settings service:** one zod schema with defaults for every key (`shared/schemas.ts`). Vault keys go to the `settings` table and machine keys to `config.json`. Bad stored values fall back to the default.
- **IPC:** the typed preload API (`app.getVaultInfo/pickVaultFolder/openVault/openExternal`, `settings.get/set/getAll`, and `on(event)` for main events). Every input is zod-validated in main, with typed `[invalid-input]` errors, and only our own windows may call.
- **Windows plumbing:**
  - The AppUserModelId (with the `process.execPath` fallback in dev).
  - The single-instance lock: a second launch restores and focuses the first.
  - The `sprawl://` registration (packaged builds only) and argv routing (`shared/deepLink.ts`), which sends `nav:*` events the renderer will handle from phases 4 and 6.
  - The window state remembered, with off-screen protection.
- **Shell:**
  - The Rail (logo, the four views, Search disabled until phase 10, and Settings) with the white active bar and label + shortcut tooltips.
  - The 40px top bar (drag region, 140px caption clearance, transparent on the canvas).
  - Empty Canvas, List, Log and Drawings views (using the PRODUCT §5 empty states), and Ctrl+1/2/3/4.
- **Onboarding** (UI_SPEC §10) and **Settings** (UI_SPEC §9): Vault works; the other rows show their stored values but are disabled until their phase. About has a working GitHub link.
- **Wrappers** (no edits to `components/ui`): `IconButton`, `HintTooltip` (popover-colored, no arrow, 400ms delay), `ShortcutKbd`, `TopBar`, `EmptyState`, `ConfirmDialog`.
- **Tests:**
  - 63 unit tests: migrations, the config store, settings (defaults, rejection, which store each key lands in, corrupt values), the vault service, window bounds, deep links, every IPC schema, and the shortcut matcher.
  - 19 E2E tests: `vault`, `shell`, `instance`, `settings`, plus `launch` extended.

### Changes requested during the phase
- **Icons → Tabler** (`@tabler/icons-react`); `lucide-react` was removed. DESIGN_SYSTEM §5 has the full icon map, and UI_SPEC now uses Tabler names. `components.json` keeps `iconLibrary: "lucide"` on purpose: the shadcn CLI doesn't rewrite icons for the new-york style, and stock components (checkbox, select, …) will bring `lucide-react` back for their internal glyphs when they're added.
- **New brand** (Truchet arcs). `brand/` was pruned to the sources and the two `.ico` files. `build/icon.ico`, `resources/icon.ico` (window icon), `resources/tray.ico` and `src/renderer/assets/brand/` were synced from it. `brand/README.md` is the source of truth.
- **Fonts → Outfit** (UI), **Geist Mono** (times, kbd, code, paths) and **Sora 600** (`font-brand`, only the onboarding title and the About name). Weights: 500 for labels and buttons, 600 for titles. Font files come from `@fontsource-variable/outfit` and `@fontsource/sora`, and Geist Sans was removed. The E2E suite checks the _rendered_ fonts via CDP. There's no third-party notices file (removed on request).
- **shadcn MCP server** added in `.mcp.json` (wrapped in `cmd /c` for Windows).

### Exit check
- ✅ `npm run check` is green: typecheck (3 projects), ESLint + Prettier, 63 unit tests and 19 E2E tests.
- ✅ Relaunching keeps the vault (`vault.spec`: Start, close, relaunch → shell).
- ✅ Deleting `config.json` brings onboarding back, and the vault on disk is untouched (`vault.spec`).
- ✅ Launching a second copy just focuses the first (`instance.spec`: minimize, spawn a second process on the same profile → it exits 0, and the first window is restored, visible and still alone).
- ✅ `npm run dev` (on an isolated temp profile): over CDP, the renderer console only showed Vite's debug lines and React's DevTools notice. The shell rendered in Outfit, and no network requests were made.

### "It should" (checked by automation and screenshots)
- ✅ First run asks where to keep your notes: the onboarding screen with Documents\Sprawl prefilled, Choose… and Start (screenshot).
- ✅ After that it opens straight into the app frame (relaunch test).
- ✅ You can click between Canvas, List, Log, Drawings and Settings (rail and Ctrl+1–4 tests, white bar position checked).
- ✅ `sprawl.db` appears in the chosen folder (vault and launch tests).
- ⚠️ **To confirm by eye with `npm run dev`:** the real Windows folder picker (tests stub it), dragging the window by the top bar, the caption buttons not overlapping anything, and the new icon in the taskbar.

### Decisions and findings (the docs are updated)
- **API:** `chooseVault()` became `pickVaultFolder()` (dialog only) plus `openVault(path)`, so onboarding and Settings can confirm before opening. `VaultInfo` is `{ path | null, defaultPath }`. All API methods return promises.
- **Migrations** start at `0000_init.sql` (drizzle-kit's numbering), not 0001.
- **Change vault** opens or creates; it doesn't move data. The old vault stays put.
- **Protocol registration is packaged-only**, so dev and E2E never touch the machine's `sprawl://` handler. The `vault.spec` first-run tests do run with `SPRAWL_E2E=0` as PHASES asks.
- **shadcn registry change:** stock components import `cn` from the shadcn-maintained `cn` package and primitives from `radix-ui`. Both were added (`cn` approved by you). Our own code keeps `@/lib/utils`.
- **`@custom-variant dark (&:is(.dark *))`** in `globals.css`, so stock `dark:` classes follow `<html class="dark">` rather than the Windows theme.
- **Playwright's `app.close()` doesn't fire the window `close` event.** The window-state test closes the window the way a user does.
- **esbuild** (pulled in by drizzle-kit) is denied in `allowScripts`; drizzle-kit works without its postinstall.

### Open / carried forward
- **Your machine still has npm 9.5.** The shadcn CLI shells out to `npm`, so `shadcn add` fails on `engine-strict` until you run `npm i -g npm@11`.
- **Phase 2:** the canvas viewport, dot grid, toolbar and zoom pill go into the empty `Canvas`. The `viewport` setting already exists.
- **Later phases:**
  - Phase 4: the `nav:open-note` handler.
  - Phase 5: the "Show done" top-bar toggle.
  - Phase 6: the List rail badge, the `nav:open-list-due` handler, tray and keep-in-tray (`window-all-closed` still quits), and possibly a dev protocol registration for clicking real toasts.
  - Phase 10: the Search rail button.
  - Phase 11: the corrupt or locked DB screen (a remembered vault that fails to open currently logs and shows onboarding).
  - Phase 12: the welcome note, the version in About, and the Settings placeholders still to wire up.
- **Phase 12 packaging:** `build/icon.ico` is now ready. Still to do: `npmRebuild: false` and unpacking `better-sqlite3/prebuilds/*.node`. The bundled fonts are OFL-licensed, and OFL expects its license text to ship with the font files, so decide then whether the installer includes it.
- **From phase 4:** component tests need `jsdom` and `@testing-library/react` (phase 3 needed none).

---

## Phase 0 — Project setup ✅

**Branch:** `feat/phase-0-setup` → merged into `main` (no tag).

### Built
- electron-vite 6 + Vite 8 + React 19 + TypeScript 6 (strict, plus `noUncheckedIndexedAccess`). The layout follows ARCHITECTURE §6: `src/{main,preload,shared,renderer}`.
- **Main:** `env.ts` (`SPRAWL_USER_DATA`, `SPRAWL_VAULT`, `SPRAWL_E2E`), `window.ts` (UI_SPEC §1 window: 1440×900 with a 960×600 minimum, `titleBarStyle: 'hidden'` plus the dark `titleBarOverlay`, `#09090B` background, the icon), and `Menu.setApplicationMenu(null)`.
- **Security:** `contextIsolation`, `sandbox`, no `nodeIntegration`; the window-open and navigation guards (only http, https and mailto go to the browser); the CSP injected by a Vite plugin (strict in builds, plus inline scripts and the HMR websocket in dev).
- **Preload:** an empty typed `window.sprawl` bridge (`shared/api.ts`).
- **Renderer:** Tailwind v4, `globals.css` from DESIGN_SYSTEM §9, Geist Sans and Mono variable fonts bundled locally (`src/renderer/assets/fonts`, with OFL.txt), `lib/utils.ts` (`cn`), and `components.json` (new-york, zinc, lucide).
- **Tooling:**
  - ESLint 10 flat config: typescript-eslint, react-hooks, react-refresh, `components/ui/**` ignored, and Node, fs, electron and SQLite imports banned in the renderer.
  - Prettier.
  - `.gitattributes` (LF everywhere), `.npmrc` (`engine-strict`).
  - `engines` (Node ≥ 22.12, npm ≥ 11).
- **Tests:**
  - Vitest: `cn`, `readEnv`, and better-sqlite3 opening an in-memory DB with FTS5.
  - Playwright E2E harness (`tests/e2e/fixtures.ts`): a temp vault and a temp userData per test, a `launchApp()` helper for relaunch tests, and the console check with `known-warnings.ts`.
  - `launch.spec.ts`: title, `#09090B` background, Geist fonts load, renderer sandboxed (`window.sprawl` present, no `require` or `process`), Ctrl+= / Ctrl+- / Ctrl+0 don't change the page zoom, and the app runs on the isolated test profile.
- README, LICENSE (MIT), an empty `tests/MANUAL.md`, and the brand icon copied to `resources/` and `build/`.

### Exit check
- `npm run check` is green: typecheck (3 projects), ESLint plus Prettier, 6 unit tests and 5 E2E tests.
- `npm run dev` works. The renderer console over the DevTools protocol showed only Vite's debug lines and React's DevTools info notice, with no warnings, errors or CSP violations, and the HMR websocket connected.
- The console check itself was verified: an injected `console.warn` failed the test.

### "It should" (checked by hand)
- ✅ A black window opens. A screen capture of the real window shows the native minimize, maximize and close buttons in muted gray on the dark title bar.
- ⚠️ **Sprawl icon in the taskbar:** set via `BrowserWindow.icon` but not visually confirmed (it can't be captured from automation). **To confirm by eye with `npm run dev`.**

### Decisions and findings (the docs are already updated where needed)
- **npm ≥ 11 is required.** npm 9.5 (the global version on this machine) ignores better-sqlite3's `"gypfile": false` and tries to compile it, which fails without Visual Studio. This session used `npx npm@11`. **Action for you:** `npm i -g npm@11`.
- **better-sqlite3 13 ships N-API prebuilds**, and the same binary loads in Node 26 and Electron 45 (verified). So there's no rebuild step, no `postinstall`, and Vitest runs in plain Node. The earlier doc plan (a Vitest-in-Electron wrapper) was dropped (ARCHITECTURE §10.2).
- **npm 11 `allowScripts`:** better-sqlite3 (implicit node-gyp) and electron-winstaller (Squirrel, which we don't use) are denied in `package.json`. Electron 45 has no install script; it downloads its binary the first time it's required.
- **TypeScript is pinned to `~6.0`**, because typescript-eslint 8.74 doesn't support TS 7 yet. Try TS 7 once typescript-eslint supports it.
- **shadcn CLI 4.x:** `init` now centers on presets. Instead, `components.json` was written by hand with the documented new-york/zinc config, and `shadcn add button --dry-run` confirmed the CLI resolves it into `src/renderer/components/ui/`. **Add components only with `npx shadcn@latest add …`.**
- **Visual zoom:** Electron disables it by default, and calling `setVisualZoomLevelLimits` at window creation threw "Render frame was disposed", so it was removed (ARCHITECTURE §2 updated).
- **The renderer bundle is minified** (electron-vite defaults to no minify): 565 kB → 219 kB, for cold start.
- **E2E specs have their own `tsconfig.e2e.json`** (they need DOM types for `page.evaluate`), so main-process code doesn't get DOM globals.
- **The Vitest config is `vitest.config.mts`** (ESM), to avoid Vite's CommonJS-config warning.

### Open / carried forward
- All carried items moved to phase 1's list above (the phase 1 ones are done).
