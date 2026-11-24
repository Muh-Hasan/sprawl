# Sprawl — Progress

A running log of the build, one phase per session (see `PHASES.md`). Read this first at the start of every session. Each phase records what was built, how the exit check was verified, decisions that differ from or add to the docs, and anything left open.

| Phase | Status | Date |
|---|---|---|
| 0 — Project setup | ✅ Done | 2026-11-24 |
| 1 — Vault, database and app shell | ⏭ Next | |
| 2–6 | Not started | |
| Dogfood checkpoint | Not started | |
| 7–12 | Not started | |

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
- **Phase 12 packaging:** electron-builder is installed but `npm run dist` hasn't been run. Set `npmRebuild: false`, make sure `better-sqlite3/prebuilds/*.node` is unpacked from the asar, and generate the multi-size `build/icon.ico`.
- **Phase 1:** the AppUserModelId, the single-instance lock (it'll be keyed on `SPRAWL_USER_DATA` automatically), and making `SPRAWL_VAULT` skip onboarding. `env.vault` and `env.e2e` are read but not used yet.
- **From phase 3:** component tests need `jsdom` and `@testing-library/react` added (listed in the stack, not installed yet).
