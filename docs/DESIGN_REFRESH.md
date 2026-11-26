# Sprawl — Design refresh

A milestone between phase 6 and phase 7 that makes Sprawl feel larger, calmer and easier to learn. It changes how the app looks and how features are found. It doesn't change what the app does, apart from the few additions listed below.

**This file is the tracker.** Each pull request below is one session: open a new session, read this file, take the first unticked PR, ship it, and tick it in the same PR.

## Mockups

Every screen, including the ones later phases build, is mocked up on one design canvas:

**https://claude.ai/artifact/6xMRztkeF5DP7SnQYzGgGz** (private to the repo owner)

Read the artboard named in a PR with the Artifact tool (`action: "read"`, `path: "project/<Artboard>.dc.html"`) before building it. The mockup is the target for layout, sizes and copy. The numbers below are the source of truth if the two disagree.

| Artboard | Shows | Built in |
|---|---|---|
| `Main` | Sidebar, canvas, cards, bottom toolbar, selection toolbar, floating note panel. Also image, link and drawing cards | Refresh (R5–R8). Image and link cards in phase 7, drawing card in phase 8 |
| `EmptyCanvas` | First launch: empty canvas, start tiles, welcome board, collapsed sidebar | R6 |
| `DrawInPlace` | Drawing on the canvas, with Excalidraw inside the card | Phase 8 |
| `CommandPalette` | Ctrl+K: notes and commands | R4 (titles and commands), phase 10 (full-text snippets) |
| `List` | Notes grouped by due, with a Notes / Drawings switch | R9. Drawings tab in phase 8 |
| `NotePage` | Full-page note: image block, file block, `[[link]]` pills and picker, backlinks | R8 (layout). Phase 7 (image and file blocks), phase 9 (links) |
| `DailyLog` | Log with week strip, summary tiles and composer | R10 |
| `Settings` | Settings with a section menu, including Appearance | R11. Backup and export rows work in phase 11 |
| `Shortcuts` | The `?` sheet with every shortcut | R13 |
| `Onboarding` | Choosing a vault on first launch | R12 |
| `QuickCapture` | The quick capture window | R12 |
| `MenusToasts` | Context menu, confirm dialog, multi-select toolbar, tooltips, toasts, empty states | R13 |
| `TypeScale` | Today vs refresh type and sizing | R2 |
| `Sidebar` | The sidebar component on its own | R5 |

## Decisions

These were agreed with the repo owner on 2026-11-26.

1. **Font:** Geist Sans for all UI and note text (bundled from the `geist` package, which is already a dependency for Geist Mono). Sora stays for the logo, the onboarding title and About. Outfit is removed.
2. **Larger type and controls** (table below). The smallest text anywhere is 11px, and only for `kbd` hints.
3. **A labelled sidebar** (248px) replaces the 52px icon rail. It holds New note, a search box that opens the palette, the views, pinned and recent notes, Settings and Help. Ctrl+\ collapses it to a 60px icon rail with tooltips. The choice is remembered.
4. **One canvas, no Drawings page.** Drawings live on the canvas like notes and are edited in place there (phase 8). The List page gets a Notes / Drawings switch so every drawing can still be found. Ctrl+4 is dropped.
5. **Discoverable by default.** Every icon button has a tooltip with its name and shortcut. The canvas toolbar moves to the bottom with larger buttons. An empty canvas explains how to start. Ctrl+K finds every action. `?` opens a shortcuts sheet.
6. **App text size:** Small / Default / Large / Larger in Settings → Appearance, plus Ctrl+Shift+= / Ctrl+Shift+- / Ctrl+Shift+0. It uses Electron's zoom factor (0.9 / 1 / 1.1 / 1.25), so the whole UI scales. Plain Ctrl+= / Ctrl+- stay as canvas zoom.
7. **Motion:** short ease-out transitions on hover, panels, menus and view changes. Everything respects reduce motion (Windows setting, plus a switch in Appearance).
8. The palette (Ctrl+K) moves forward from phase 10. The refresh version searches note and drawing titles and runs commands. Phase 10 adds the full-text index and snippets.

### Type scale

| Token | Used for | Before | Refresh |
|---|---|---|---|
| `--font-sans` | All UI and note text | Outfit | Geist |
| `text-2xs` | Chips, badges, counts | 11/16 | 12/16 |
| `text-xs` | Previews, captions, meta | 12/16 | 13/18 |
| `text-sm` | Default UI text, menus, rows | 13/20 | 14/20 |
| `text-base` | Inputs, list titles | 14/22 | 15/22 |
| `text-editor` | Note body | 15/26 | 16/26 |
| `text-card-title` | Card title | 13/18 600 | 15/21 600 |
| `text-lg` | Section titles | 18/26 | 20/28 |
| `text-title` | View and panel titles | 24/32 | 28/36 (full-page note 36/44) |

### Sizes

| Thing | Before | Refresh |
|---|---|---|
| Buttons (default / sm) | 32 / 28 | 36 / 32 |
| Icon buttons | 32 | 36 (toolbar 44) |
| Icons | 16 (rail and toolbar 18) | 18 (sidebar 19, toolbar 22) |
| Top bar | 40 | 44 |
| Navigation | 52px icon rail | 248px sidebar, 60px collapsed |
| List rows | 44 | 52 |
| Card | radius 10, padding 12/14, width 220 | radius 12, padding 14/16, width 240 |
| Note panel | docked, 420px | floating over the canvas: 440px, 12px inset, radius 16 |
| Menus and popovers | radius 8 | radius 12, item height 34 |

Colors don't change. The palette in DESIGN_SYSTEM §2 stays, including the strictly monochrome rule.

## How to work on a refresh PR

1. Read this file, then the PR's artboard in the mockup and the DESIGN_SYSTEM and UI_SPEC sections it lists.
2. Branch from an up-to-date `main` with the branch name given, and follow the Git workflow in `CLAUDE.md`.
3. Build it to match the artboard. Keep existing `data-testid`s working, and add new ones for new elements.
4. **Update the specs in the same PR.** Rewrite the DESIGN_SYSTEM and UI_SPEC sections you changed so they describe the new design. After the last refresh PR, those docs describe the app as it is.
5. Update or add tests. Specs that check sizes, fonts or layout will need new numbers.
6. `npm run check` must pass. Then `npm run dev` and compare the screen with the artboard by hand.
7. Tick the PR below and add its number, in the same PR.

## Pull requests

- [x] **R1 · `docs/design-refresh-plan`** (#12): this tracker, the drawings decision in PRODUCT and PHASES.
- [x] **R2 · `feat/ui-type-scale`** (#13): Geist Sans and the new type scale and sizes.
  - `globals.css` tokens (`--font-sans`, every `text-*` token, `--radius-card`), the Geist variable font bundled locally, Outfit removed.
  - shadcn button, input and menu sizes come from theme variables and wrapper components, never edits in `components/ui/`.
  - Specs: DESIGN_SYSTEM §3 (type), §5 (spacing and sizes), §7 (components). Artboard: `TypeScale`.
  - Tests: update the `renderedFonts` checks that expect Outfit.
- [ ] **R3 · `feat/app-text-size`**: app text size.
  - Small / Default / Large / Larger stored in config, applied with `webContents.setZoomFactor` in every window, including capture.
  - Ctrl+Shift+= / Ctrl+Shift+- / Ctrl+Shift+0, and a temporary row in the current Settings view (R11 moves it to Appearance).
  - Tests: unit for the zoom steps; e2e that the shortcut changes the zoom factor and that it's restored on relaunch.
- [ ] **R4 · `feat/command-palette`**: Ctrl+K palette with note titles and commands.
  - The shadcn `Command` dialog, styled like the `CommandPalette` artboard. Searches note titles (and drawing titles once they exist). Commands: New note, Go to Canvas / List / Log, Zoom to fit, Toggle sidebar, Text size, Settings, Toggle show done.
  - `>` shows commands only. Enter on a note opens its panel and glides the canvas to its card.
  - Specs: UI_SPEC §8. Tests: `palette.spec.ts`.
- [ ] **R5 · `feat/sidebar`**: the labelled sidebar.
  - Replaces `Rail.tsx`. New note, search (opens the palette), Canvas / List / Daily log with shortcuts, the overdue badge on List, Recent (the five most recently edited notes), Settings and Help at the bottom.
  - Ctrl+\ collapses to the 60px rail; the choice is saved in config.
  - **Pinned** needs a `pinned` column and a Pin / Unpin item in the note menus. It ships as its own PR (R5b) right after this one.
  - Specs: UI_SPEC §2 (rewrite as Sidebar), §3. Artboard: `Sidebar`, `Main`. Tests: update `shell.spec.ts`; add collapse and persistence.
- [ ] **R5b · `feat/pin-notes`**: pin notes to the sidebar.
  - Migration adding `notes.pinned`, the IPC and zod schema, Pin / Unpin in the context menu and panel menu, and the Pinned list in the sidebar (drag to reorder is not in scope).
  - Tests: unit for the migration; e2e that a pinned note shows in the sidebar and opens.
- [ ] **R6 · `feat/canvas-toolbar`**: bottom toolbar, empty state and welcome board.
  - The toolbar moves to the bottom center: 44px buttons, 22px icons, tooltips with names and keys, the sticky-note tool's color dot. It shifts left while the note panel is open.
  - Empty canvas: the start tiles from `EmptyCanvas`. "Open the welcome board" places five sample notes that each teach one thing (it replaces UI_SPEC §10's single welcome note).
  - Status pill and zoom control restyled; a `?` button opens the shortcuts sheet once R13 lands (until then it's hidden).
  - Specs: UI_SPEC §4.1–4.4, §10. Tests: update canvas specs that click the toolbar.
- [ ] **R7 · `feat/card-redesign`**: cards and selection.
  - New card size, padding, radius and shadow; lift on hover and drag; hover actions (Done, Open) at 26px; the stronger "soon" due chip; the selection outline and floating selection toolbar from `Main`.
  - Fix: pasted text and quick-captured notes land at the cursor or view center and fan out instead of stacking.
  - Specs: UI_SPEC §4.5, §4.9, DESIGN_SYSTEM §8. Tests: update card and selection specs.
- [ ] **R8 · `feat/note-panel`**: floating note panel and full page.
  - The panel floats over the canvas (12px inset, radius 16, slide-in), keeps the resizable width (320 to 720, default 440) and the breadcrumb header; the meta rows sit under the title. Full page uses the `NotePage` layout (720px column, 36px title).
  - Specs: UI_SPEC §5, §5.1. Tests: update `note-panel.spec.ts`.
- [ ] **R9 · `feat/list-redesign`**: List view.
  - `List` artboard: 52px rows, larger filters, due groups (Overdue, Today, This week, Later, No date) in the Open tab too, hover actions. The Notes / Drawings switch shows only Notes until phase 8.
  - Specs: UI_SPEC §5b. Tests: update `list.spec.ts`.
- [ ] **R10 · `feat/log-redesign`**: Daily log.
  - `DailyLog` artboard: larger week strip, the three summary tiles (done, logged, days in a row), roomier entries, the floating composer.
  - Specs: UI_SPEC §6. Tests: update `log-days.spec.ts` and `done-and-log.spec.ts`; unit for the streak count.
- [ ] **R11 · `feat/settings-redesign`**: Settings.
  - `Settings` artboard: section menu (General, Appearance, Canvas, Notifications, Quick capture, Backup and export, Shortcuts, About), grouped rows in cards, Appearance with text size, sidebar and reduce motion. Rows that only work after phase 11 (backup, export) are shown disabled with "Coming soon" until then.
  - Specs: UI_SPEC §9. Tests: update `settings.spec.ts`.
- [ ] **R12 · `feat/onboarding-capture-redesign`**: onboarding and quick capture.
  - `Onboarding` and `QuickCapture` artboards. Copy and behavior stay; sizes, type and the saved state change.
  - Specs: UI_SPEC §5c, §10. Tests: update `vault.spec.ts` and `capture.spec.ts`.
- [ ] **R13 · `feat/menus-and-shortcuts-sheet`**: menus, dialogs, toasts and the `?` sheet.
  - `MenusToasts` and `Shortcuts` artboards. Context menu with icons and keys, the confirm dialog, toasts with Undo, tooltips everywhere, empty states with a next step. `?` (and Help in the sidebar) opens the sheet.
  - Specs: UI_SPEC §4.10, §11, new §12 (shortcuts sheet). Tests: `shortcuts-sheet.spec.ts`.
- [ ] **R14 · `feat/motion`**: motion and reduced motion.
  - DESIGN_SYSTEM §6 rewritten: durations, easings and what moves (panel slide, menu and popover scale-in, card lift, view cross-fade, toolbar shift). The reduce motion switch and the Windows setting both turn it off.
  - Tests: e2e that reduce motion sets the attribute the CSS keys off.

When all of these are ticked, the refresh is done and phase 7 starts.

## After the refresh

The later phases build their screens to the mockup:
- **Phase 7** image and link cards (`Main`), image and file blocks (`NotePage`).
- **Phase 8** drawing on the canvas (`DrawInPlace`), the drawing card (`Main`), the Drawings tab in List (`List`).
- **Phase 9** `[[` picker, link pills and "Linked from" (`NotePage`).
- **Phase 10** full-text results and snippets in the palette (`CommandPalette`).
- **Phase 11** the Backup and export rows (`Settings`).
- **Phase 12** checks every screen against the mockup.
