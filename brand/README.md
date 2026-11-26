# Sprawl — Brand

## The mark
Two thick arcs from a **Truchet tile**, a square tile with two quarter-circle curves. Rotated at random and placed side by side, Truchet tiles join into an endless winding pattern. One tile is a single note; many tiles are the sprawl.

- **Geometry** (512 grid): a 280×280 tile at (116, 116). The arcs have radius 140, centred on the tile's top-left and bottom-right corners. Stroke 64 with round caps.
- **Finish:** a white (`#FFFFFF`) to zinc-400 (`#A1A1AA`) linear gradient, top-left to bottom-right. Use flat white or black when a gradient isn't possible.
- **Wordmark:** "sprawl", always lowercase, in **Sora SemiBold** with −0.05em tracking. It's outlined to paths in the SVGs, so no font is needed. The app UI itself uses **Geist** (see `docs/DESIGN_SYSTEM.md` §3).

## Files

| File | Use |
|---|---|
| `sprawl-icon.svg` | App icon source (black rounded square + gradient arcs) |
| `icon.ico` | Windows app icon (16–256, multi-size): the window, taskbar and the NSIS installer |
| `tray-source.svg` | Tray icon source. White arcs, slightly thicker (stroke 76) so they stay clear at 16px. |
| `tray.ico` | System tray icon (multi-size, built from `tray-source.svg`) |
| `sprawl-mark-gradient.svg` | Mark only, gradient. For hero moments (onboarding, About, website). |
| `sprawl-mark-light.svg` | Mark only, flat white. For in-app use on dark (the rail logo) and dark READMEs. |
| `sprawl-mark-dark.svg` | Mark only, flat black, for light backgrounds |
| `sprawl-lockup-dark-bg.svg` / `-light-bg.svg` | Mark + wordmark on a solid background |
| `readme-header.svg` | GitHub README banner (the Truchet pattern + lockup) |

## Rules
- Keep clear space around the mark of at least half the stroke width (≥ 32 units on the 512 grid).
- The minimum size is 16px for the icon and the tray, and 96px wide for the lockup.
- Don't recolor the mark beyond white, black or the white→zinc-400 gradient. Don't rotate it, outline it, add shadows to it, or swap the arcs' order.
- The pattern is decoration only. Keep it low contrast (`#18181B`–`#27272A` lines on `#09090B`), and never put body text directly on it without a solid backing.

## In the repo
Copies, not links, so the app build never reads `brand/`:
- `build/icon.ico` ← `icon.ico` (electron-builder: installer and exe icon)
- `resources/icon.ico` ← `icon.ico` (the BrowserWindow icon in dev and the packaged app)
- `resources/tray.ico` ← `tray.ico` (the tray, phase 6)
- `src/renderer/assets/brand/` ← `sprawl-mark-light.svg`, `sprawl-mark-gradient.svg`

When a brand file changes, copy it to these places again.
