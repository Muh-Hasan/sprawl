<p align="center">
  <img src="brand/readme-header.svg" alt="Sprawl" width="100%" />
</p>

Sticky notes, to-dos, Notion-style notes, Excalidraw sketches and a daily log, all on one open canvas. Local-first, dark only, and open source.

> **Status:** early development. Sprawl is being built phase by phase (see [`docs/PHASES.md`](docs/PHASES.md) and [`docs/PROGRESS.md`](docs/PROGRESS.md)). Nothing is usable yet.

## Develop

Windows 10/11 x64. You need **Node ≥ 22.12** and **npm ≥ 11** (`npm i -g npm@11`). Older npm tries to compile better-sqlite3 instead of using its prebuilt binary.

```sh
npm install
npm run dev        # run the app with hot reload
npm run check      # typecheck, lint, unit tests and e2e tests
```

| Script              | What it does                                         |
| ------------------- | ---------------------------------------------------- |
| `npm run dev`       | Start the app in development mode                    |
| `npm run build`     | Build main, preload and renderer into `out/`         |
| `npm run typecheck` | TypeScript, strict                                   |
| `npm run lint`      | ESLint and Prettier check (`npm run format` to fix)  |
| `npm test`          | Unit tests (Vitest)                                  |
| `npm run test:e2e`  | Build, then end-to-end tests (Playwright + Electron) |
| `npm run dist`      | Build the Windows installer                          |

`npm install` also sets up git hooks (Husky). Before each commit, ESLint and Prettier fix the staged files (lint-staged). Commit messages must follow [Conventional Commits](https://www.conventionalcommits.org), e.g. `feat(list): group due notes by day` (commitlint).

## Docs

- [`docs/PRODUCT.md`](docs/PRODUCT.md): what Sprawl does
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md): stack, data model, IPC and testing
- [`docs/DESIGN_SYSTEM.md`](docs/DESIGN_SYSTEM.md) and [`docs/UI_SPEC.md`](docs/UI_SPEC.md): how it looks
- [`docs/PHASES.md`](docs/PHASES.md): the build plan

## License

[MIT](LICENSE). The bundled fonts (Outfit, Sora and Geist Mono) are under the [SIL Open Font License 1.1](https://openfontlicense.org).
