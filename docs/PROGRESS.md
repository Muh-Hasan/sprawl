# Sprawl — Progress

A running log of the build, one phase per session (see `PHASES.md`). Read this first at the start of every session. Each phase records what was built, how the exit check was verified, decisions that differ from or add to the docs, and anything left open.

| Phase | Status | Date |
|---|---|---|
| 0 — Project setup | ✅ Done | 2026-11-24 |
| 1 — Vault, database and app shell | ✅ Done | 2026-11-25 |
| 2 — Canvas foundations | ✅ Done | 2026-11-25 |
| 3 — Notes on the canvas | ⏭ Next | |
| 4–6 | Not started | |
| Dogfood checkpoint | Not started | |
| 7–12 | Not started | |

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
- **Phase 3:**
  - The `restore` and `setColor` ops, undo, selection, marquee, the Note tool and the real NoteCard (preview, hover, chips room).
  - The Select tool's left-drag on empty space is free for the marquee.
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
- **From phase 3:** component tests need `jsdom` and `@testing-library/react`.

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
