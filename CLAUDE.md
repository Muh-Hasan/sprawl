# Sprawl — instructions for Claude Code

Sprawl is a local-first Electron desktop app that combines sticky notes, to-dos, Notion-style notes, Excalidraw drawings and a daily log on one open canvas. It's dark only and open source (MIT).

**Platform: Windows 10/11 only for v1.** Develop, test and package on Windows. Keep code portable where it's free (`path.join`, `app.getPath`), but never spend time on macOS or Linux specifics.

## Read before working
0. `docs/PHASES.md`: **the build plan. Work through it phase by phase.** Right now the **design refresh** is in progress: `docs/DESIGN_REFRESH.md` is its tracker. Start each session there and take the first unticked PR.
1. `docs/PRODUCT.md`: what to build, behaviors, shortcuts, scope and the "not in v1" list.
2. `docs/ARCHITECTURE.md`: stack, processes, data model, IPC API, folder layout and build order.
3. `docs/DESIGN_SYSTEM.md`: brand, tokens, type, motion and the drop-in `globals.css`. The app is **strictly monochrome**: the only color is on sticky notes (plus red for overdue and destructive).
4. `docs/UI_SPEC.md`: exact layout and anatomy of every screen and component.
5. `brand/`: logo files (app icon, marks and lockups).

UI is built with **shadcn/ui + Tailwind v4**, dark only. Use the shadcn component before building your own.

**Never edit files in `src/renderer/components/ui/`.** They come from the shadcn CLI only (`npx shadcn@latest add …`). To extend or customize one, create a new component in `src/renderer/components/` that wraps it. Theme changes go through CSS variables in `globals.css`. Never hard-code colors in components; use theme classes such as `bg-background`, `text-muted-foreground`, `bg-note-sand` and `border-border`.

## How to work
- `docs/PHASES.md` is the roadmap. Work through its phases in order and don't start the next phase until the current phase's **Exit check** is fully green. A phase is a milestone only: it ships as several small branches and pull requests, one per feature or fix (see Git workflow).
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
Standard open source flow: small branches, Conventional Commits, one pull request per change, merged into `main` with a merge commit so every commit is kept.

**Branches.** Never commit to `main` directly. Branch from an up-to-date `main` as `<type>/<short-kebab-description>`, describing the change, never the phase:
- `feat/` a new feature (`feat/image-paste`), `fix/` a bug fix (`fix/capture-focus-return`), `perf/`, `refactor/`, `test/`, `docs/`, `ci/`, `build/` (packaging, deps), `chore/` (tooling and the rest).
- One feature or fix per branch. A phase is split into several branches; never put a whole phase on one branch.

**Commits.** [Conventional Commits](https://www.conventionalcommits.org): `type(scope): subject`, imperative and lowercase, e.g. `feat(list): group due notes by day`. Scopes are areas of the app (`canvas`, `list`, `capture`, `reminders`, `editor`, `log`, `settings`, `db`, `ipc`, `ui`, `deps`, `ci`). A few logical commits per branch, with no WIP or "fix typo" noise: every commit lands on `main` as written, so each one should build and pass on its own. shadcn adds go in their own `chore(ui): shadcn add …` commit. Never mention phase numbers.

**Pull requests.** When the work is done and `npm run check` is green:
1. Push the branch and open a PR into `main` (`gh pr create` when `gh` is installed; otherwise give the user the title and body to paste).
2. **Title:** a Conventional Commit line (`feat(capture): add quick capture window`).
3. **Body:** follow `.github/pull_request_template.md`. Explain what the PR does and why, then list everything it added, changed, removed and fixed, with screenshots for UI changes and the tests it adds. Don't mention phases or exit checks.
4. Merge with a **merge commit** (`gh pr merge --merge`), never squash or rebase. `main`'s ruleset allows it (no linear-history rule).
5. Delete the branch locally and on GitHub, then pull `main`.

**No git tags.** Ask before creating any (for example `v0.1.0` at release).

## Checks before each commit
- `npm run check` (typecheck, lint, unit tests and e2e tests) must pass.
- `npm run dev`, then exercise what you changed by hand.
