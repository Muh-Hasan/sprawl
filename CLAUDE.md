# Sprawl — instructions for Claude Code

Sprawl is a local-first Electron desktop app that combines sticky notes, to-dos, Notion-style notes, Excalidraw drawings and a daily log on one open canvas. It's dark only and open source (MIT).

**Platform: Windows 10/11 only for v1.** Develop, test and package on Windows. Keep code portable where it's free (`path.join`, `app.getPath`), but never spend time on macOS or Linux specifics.

## Read before working
0. `docs/PHASES.md`: **the build plan. Work through it phase by phase.**
1. `docs/PRODUCT.md`: what to build, behaviors, shortcuts, scope and the "not in v1" list.
2. `docs/ARCHITECTURE.md`: stack, processes, data model, IPC API, folder layout and build order.
3. `docs/DESIGN_SYSTEM.md`: brand, tokens, type, motion and the drop-in `globals.css`. The app is **strictly monochrome**: the only color is on sticky notes (plus red for overdue and destructive).
4. `docs/UI_SPEC.md`: exact layout and anatomy of every screen and component.
5. `brand/`: logo files (app icon, marks and lockups).

UI is built with **shadcn/ui + Tailwind v4**, dark only. Use the shadcn component before building your own.

**Never edit files in `src/renderer/components/ui/`.** They come from the shadcn CLI only (`npx shadcn@latest add …`). To extend or customize one, create a new component in `src/renderer/components/` that wraps it. Theme changes go through CSS variables in `globals.css`. Never hard-code colors in components; use theme classes such as `bg-background`, `text-muted-foreground`, `bg-note-sand` and `border-border`.

## How to work
- Build **one phase at a time**, following `docs/PHASES.md` in order. Don't start the next phase until the current phase's **Exit check** is fully green. Ship each finished phase through a pull request (see Git workflow).
- **After phase 6, stop at the dogfood checkpoint** (PHASES.md). Don't start phase 7 until the user says the checkpoint is done and the docs have been updated.
- At the start of each phase, re-read that phase in PHASES.md and the doc sections it points to. At the end, confirm each "It should" line by hand and report what you checked.
- Stay inside the listed stack. Ask before adding a dependency that isn't listed there.
- Nothing from the "Not in v1" list gets built, even partially.
- The renderer never touches Node, `fs` or SQLite. Everything goes through the typed `window.sprawl` API.
- Never write to the DB on every mouse move or keystroke. Batch, debounce and flush on blur or close.
- Keep components small. If a file goes past ~300 lines, split it.

## Testing (see ARCHITECTURE §10)
- Every phase ships with its unit tests (Vitest) **and** its e2e spec (Playwright + Electron) listed under that phase in PHASES.md.
- Validate every IPC input with zod (`src/shared/schemas.ts`).
- Add a `data-testid` to every interactive element you build.

## Git workflow
- **Never commit to `main` directly.** Every unit of work gets its own branch from an up-to-date `main`: `feat/phase-N-<name>` for a phase; `fix/…` or `patch/…` for fixes, including the dogfood `phase-6.x` patches; and `chore/…` or `docs/…` for the rest.
- Commits are meaningful: a few logical commits per branch, with no WIP or "fix typo" noise. shadcn adds go in their own `chore(ui): shadcn add …` commit.
- When the work is done and `npm run check` is green:
  1. Push the branch.
  2. Open a pull request into `main` (`gh pr create`). A phase PR's title is `phase-N: <name>`, and its body summarizes what was built and how the exit check was verified.
  3. Merge it with a merge commit (`gh pr merge --merge`, never squash or rebase), titled `phase-N: <name>` for a phase.
  4. Delete the branch locally and on GitHub, then pull `main`.
- **No git tags.** Ask before creating any (for example `v0.1.0` in phase 12).

## Checks before each commit
- `npm run check` (typecheck, lint, unit tests and e2e tests) must pass.
- `npm run dev`, then exercise the phase's "It should" by hand.
