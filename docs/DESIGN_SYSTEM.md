# Sprawl — Design System

**Dark only. Strictly monochrome:** black, white and zinc. The **only color in the app is on the sticky notes** (the user's own color tags), plus red reserved for overdue dates and destructive actions. White is the accent.

Built on **shadcn/ui + Tailwind v4**. Everything below maps to CSS variables in `src/renderer/styles/globals.css` (full file in §9). Components never use raw hex values.

Reference feel: Linear, Vercel, Raycast. Quiet chrome, sharp type, content first.

---

## 1. Brand

### Logo
The mark is **two thick arcs from a Truchet tile**: a square tile with two quarter-circle curves. Rotated at random and placed side by side, Truchet tiles join into an endless winding pattern. One tile is a single note; many tiles are the sprawl.

**`brand/README.md` is the source of truth** for the geometry, every brand file and where each one is copied in the repo (`build/icon.ico`, `resources/icon.ico`, `resources/tray.ico`, `src/renderer/assets/brand/`). In the app:
- The rail logo is `sprawl-mark-light.svg` (flat white).
- Onboarding and About use `sprawl-mark-gradient.svg` (white → zinc-400).
- The window, taskbar and installer use `icon.ico`, and the tray uses `tray.ico`.

**Rules:**
- The wordmark is always lowercase: **sprawl**. It's set in Sora SemiBold, outlined in the brand SVGs (see §3 for where Sora appears in the app).
- Keep clear space around the mark of at least half the stroke width.
- Don't recolor the mark beyond white, black or the white→zinc-400 gradient. Don't rotate it, outline it, add effects to it or swap the arcs.
- The minimum size is 16px for the mark and the tray, and 96px wide for the lockup.

### Voice (UI copy)
Short, plain and lowercase-friendly. Use sentence case everywhere, with no exclamation marks and no "successfully". Examples: "Saved", "Marked done", "Nothing logged yet."

---

## 2. Color

### 2.1 Neutrals (zinc)

| Token | Hex | Use |
|---|---|---|
| `--background` | `#09090B` | App background, canvas |
| `--surface` | `#0F0F11` | Rail, note panel, log page |
| `--card` | `#141416` | Cards, palette, menus |
| `--popover` | `#18181B` | Popovers, dropdowns, tooltips |
| `--muted` / `--accent` (shadcn) | `#1F1F23` | Hover fills, selected rows, chips |
| `--border` | `#27272A` | Hairlines and dividers |
| `--border-strong` | `#3F3F46` | Input borders on focus-within, capture window border |
| `--muted-foreground` | `#A1A1AA` | Secondary text |
| `--subtle-foreground` | `#808089` | Placeholders, timestamps, captions |
| `--foreground` | `#FAFAFA` | Primary text, icons |
| `--primary` | `#FAFAFA` | Primary button background (white button, black text) |
| `--primary-foreground` | `#09090B` | Text on primary |
| `--ring` | `#D4D4D8` | Focus ring |
| `--selection` | `#FAFAFA` | Canvas selection outline and handles |
| `--canvas-dot` | `#27272A` | Canvas dot grid |
| `--inset` | `#0C0C0E` | Recessed areas: drawing thumbnails, code blocks |
| `--overlay` | `rgb(0 0 0 / 0.55)` | Behind the command palette, with a 2px backdrop blur |

### 2.2 Functional (the only non-note colors)

| Token | Hex | Use |
|---|---|---|
| `--destructive` | `#F87171` | Delete actions, error text |
| `--due-overdue` | `#F87171` | Overdue chip text, with `--due-overdue-bg` `#2A1517` |
| `--due-soon` | `#FAFAFA` | Due-soon chip: white text on `#27272A` (monochrome emphasis) |
| `--due-later` | `#A1A1AA` | Later chip (more than 2 days away): muted text on `#1F1F23` |
| `--success` | `#FAFAFA` | Done checkmarks stay white. Don't add green. |

### 2.3 Note colors (user tags)
Soft tints: each card is clearly its color, but dark enough that a canvas full of notes stays calm on black, with light text. (Chosen in phase 3 from a side-by-side preview; the first spec's tints were too dark to tell apart, and bright pastels and mid-tones were too loud.) Each color has a card background, a border, a text color and a **swatch**: the bright hue used for log tags and small color dots.

| Name | `bg` | `border` | `text` | `swatch` |
|---|---|---|---|---|
| `stone` (default) | `#202024` | `#323238` | `#F4F4F5` | `#71717A` |
| `sand` | `#382E15` | `#4E4020` | `#FBE7AE` | `#E9C46A` |
| `sage` | `#173022` | `#224430` | `#C8F0D6` | `#6FCF97` |
| `sky` | `#162940` | `#223B5A` | `#CFE3FB` | `#6AA8F0` |
| `lilac` | `#282141` | `#3A305C` | `#E3DAFB` | `#A991F0` |
| `rose` | `#3B1B24` | `#552733` | `#FAD3DC` | `#EC7A95` |

The token names are `--note-{name}-{bg|border|text|swatch}` plus `--note-{name}-border-hover` (the border +12% white), and the Tailwind classes are `bg-note-sand`, `border-note-sand-border` and so on (see §9).

**Color pickers** (the selection toolbar, the context menu, and the panel's ColorSwatches) show each swatch as the **card color inside a 2px ring of the bright hue**, so what you pick is what the card looks like, and the six stay easy to tell apart on the dark popover (`NOTE_COLOR_CLASSES[c].pickerSwatch`).

**Contrast** (WCAG):
- Each note `text` on its `bg` is ≥ 10.9:1 (stone 14.8:1), so the 70% preview text is still well above AA.
- `--muted-foreground` on `--background` is 7.8:1.
- `--subtle-foreground` is 5.1:1 on `--background`, 4.9:1 on `--surface`, 4.7:1 on `--card` and 4.5:1 on `--popover`. Don't use it on note cards; use the note's `text` color at 60% opacity instead (for example the "Untitled" placeholder).
- Never use subtle text below 12px.

---

## 3. Typography

Three fonts, all bundled locally as `.woff2` with `@font-face` in `globals.css` (never loaded from the network):

| Font | Class | Use | Package |
|---|---|---|---|
| **Geist** (variable, 100–900) | `font-sans` (default) | The whole app UI and note text | `geist` |
| **Geist Mono** (variable) | `font-mono` | Times, `kbd`, code blocks, the zoom %, the vault path, the List row's edited time | `geist` |
| **Sora** SemiBold (600 only) | `font-brand` | **Only** the onboarding title "Welcome to sprawl" and the app name in About. The logo wordmark is already outlined in the brand SVGs, so Sora appears nowhere else. | `@fontsource/sora` |

| Token | Size / line height | Weight | Use |
|---|---|---|---|
| `text-kbd` | 11 / 16 | 400 | `kbd` hints only (Geist Mono). The smallest text in the app |
| `text-2xs` | 12 / 16 | 500 | Chips, badges, counts |
| `text-xs` | 13 / 18 | 400 | Card body preview, captions, meta, timestamps |
| `text-sm` | 14 / 20 | 400 / 500 | **Default UI text**: menus, buttons, tooltips, rows, log entries |
| `text-base` | 15 / 22 | 400 | Inputs, list titles, panel meta rows, settings |
| `text-editor` | 16 / 26 | 400 | Note body in the editor |
| `text-card-title` | 15 / 21 | 600 | Note card title |
| `text-lg` | 20 / 28 | 600 | Section titles, log date header (−0.01em tracking) |
| `text-title` | 28 / 36 | 600 | View and panel titles, the note title in the panel (−0.02em tracking) |
| `text-page-title` | 36 / 44 | 600 | The note title on the full page (−0.02em tracking) |
| Editor heading | 18 / 26 | 600 | The editor's one heading level |

- **Weights:** 400 for body text; **500 for UI labels and buttons** (settings row labels, tooltip labels, top-bar labels, button text); **600 for titles** (card title, panel title, log date, view titles, editor headings). Never below 400, and no 700+ anywhere in the app.
- **Tracking:** −0.01em at 20px, −0.02em at 28px and above, and 0 below.
- **Smallest text:** 12px everywhere, except 11px `text-kbd` for shortcut keys.
- **Numbers:** every time display (log entry times, reminder times, due chip times, the zoom %, the List edited time) uses `font-mono`, so times line up. Counts such as the checklist chip "3/5" stay in Geist. Don't add `tabular-nums` to Geist text.
- **App text size:** Settings → Appearance and Ctrl+Shift+= / Ctrl+Shift+- / Ctrl+Shift+0 pick Small, Default, Large or Larger. Each is an Electron zoom factor (0.9 / 1 / 1.1 / 1.25) on every window, quick capture included, so the whole UI scales together and the tokens above never change. Design at Default. Nothing measures in device pixels except the caption-button band (`pr-caption`, UI_SPEC §1).
- **Third-party surfaces:** the BlockNote editor must inherit Geist (override its font variable if it sets its own), and its code blocks use Geist Mono. Leave Excalidraw's hand-drawn font alone.

---

## 4. Spacing, radius, elevation

- **Spacing:** 4px base. Use 4, 8, 12, 16, 20, 24 and 32. Component padding is usually 8 or 12, and section gaps 16 or 24.
- **Radius:** shadcn `--radius: 0.5rem` (8px).
  - Buttons, inputs and chips: 6px (`rounded-md`); chips can be 5px.
  - Note cards and canvas cards: 12px (`rounded-card`).
  - Menus and popovers: 12px (`rounded-menu`). The command palette: 16px (`rounded-2xl`).
  - Panels and dialogs: 12px (`rounded-xl`).
  - Quick capture window: 14px (`rounded-capture`).
- **Borders:** 1px `--border` everywhere. No double borders, and panels separate from the canvas with one hairline.
- **Shadows** are used sparingly, because on black most depth comes from surface steps:
  - `--shadow-card`: `0 1px 0 0 rgb(255 255 255 / 0.03) inset, 0 1px 2px rgb(0 0 0 / 0.4)`
  - `--shadow-lift` (hovered or dragged card): `0 12px 32px -8px rgb(0 0 0 / 0.7), 0 0 0 1px rgb(255 255 255 / 0.06)`
  - `--shadow-popover`: `0 16px 48px -12px rgb(0 0 0 / 0.8), 0 0 0 1px #27272A`
  - `--shadow-palette` (the command palette): `0 32px 80px -20px rgb(0 0 0 / 0.9)`

---

## 5. Iconography

- Use **Tabler** (`@tabler/icons-react`) with a 1.75 stroke (`stroke={1.75}`): 18px by default (in icon buttons), 16px inline in text and in small row buttons, 14px in chips, 19px in the sidebar and 22px in the canvas toolbar. Size icons with Tailwind `size-*` classes (or let the wrapping button size them); don't rely on Tabler's 24px default.
- Icons are `--muted-foreground` at rest and `--foreground` on hover or when active.
- Stock shadcn components keep their own internal `lucide-react` glyphs (check marks, chevrons, close X); don't edit them to swap icons (ARCHITECTURE §1).
- Icon assignments (UI_SPEC uses these component names):

| Purpose | Icon |
|---|---|
| Canvas | `IconLayoutDashboard` |
| List | `IconListCheck` |
| Log | `IconNotebook` |
| Drawings, drawing tool, drawing refs | `IconScribble` |
| Search | `IconSearch` |
| Settings | `IconSettings` |
| Select tool | `IconPointer` |
| Hand tool | `IconHandStop` |
| Note tool | `IconNote` |
| Link tool, links chip | `IconLink` |
| Image tool | `IconPhotoPlus` |
| Due date | `IconCalendarDue` |
| Checklist chip | `IconChecklist` |
| Done | `IconCheck` / `IconCircleCheck` |
| Attachment | `IconPaperclip` |
| Reminder | `IconBell` |
| Show on canvas | `IconFocus2` |
| Quick capture | `IconBolt` |
| Show done toggle | `IconEye` / `IconEyeOff` |
| Full page / back to panel | `IconArrowsDiagonal` / `IconArrowsDiagonalMinimize2` |
| More menu | `IconDots` |
| Close | `IconX` |
| Open in browser | `IconExternalLink` |
| Month picker | `IconCalendar` |
| New | `IconPlus` |
| Drag handle | `IconGripVertical` |
| Duplicate | `IconCopy` |
| Bring to front / send to back | `IconStackFront` / `IconStackBack` |
| Delete | `IconTrash` |

---

## 6. Motion

- **Durations:** fast 120ms (hover, press, chips), base 180ms (popovers, panel), slow 260ms (view switch fade).
- **Easing:** `cubic-bezier(0.2, 0.8, 0.2, 1)` (ease-out) for entering, and `cubic-bezier(0.4, 0, 1, 1)` for exiting.
- **Note panel:** slides in 16px plus fades over 180ms.
- **Card lift on drag:** scale 1.02 with `--shadow-lift` over 120ms.
- **New card:** fades in over 150ms. Opacity only: a scale-in moves the card's hit area while it runs, so a quick grab right after creating a note would miss.
- **Mark done:** the card fades to 0 and scales to 0.96 over 180ms, then is removed. The log gets a one-time row highlight (a `--muted` background fading out over 600ms).
- **Canvas:** wheel, pinch and drag pans and zooms are direct (never animated). Commands glide, FigJam-style: zoom steps and reset (Ctrl+= / Ctrl+- / Ctrl+0 and the pill) over 180ms, and "zoom to fit", "jump to note" and bringing a new note into view over 240ms, all ease-out. A repeated zoom step builds on where the glide is heading, so a held Ctrl+= never lags.
- **Reduced motion:** respect `prefers-reduced-motion` and drop all transforms (keep opacity fades at 80ms).

---

## 7. Component styling (shadcn overrides)

Never edit `components/ui/*`. Theme shadcn components through the CSS variables, and build the Sprawl-specific variants below as **wrapper components** in `components/` (using `cva` + `cn()`):

- **Button:**
  - `default` is white with black text, used once per view at most (for example "Mark done").
  - `secondary` is `--muted` with white text.
  - `ghost` is transparent with a `--muted` hover. Most toolbar and rail buttons use it.
  - Height is 36px (`sm`, 32px). Icon buttons (`IconButton`) are 36×36 with an 18px icon; `size="sm"` is 28×28 with a 16px icon, for buttons inside rows. The canvas toolbar's are 44×44.
- **Top bar:** 44px, the same as the native title-bar overlay (`TITLE_BAR_HEIGHT`).
- **Input:** 36px, transparent background with a `--border` border; on focus the border is `--border-strong` plus a 2px `--ring` at 30% alpha.
- **Kbd:** Geist Mono 11px (`text-kbd`), `--muted` background, 1px `--border`, 4px radius, 2px 5px padding.
- **Tooltip:** `--popover` background, 13px text with the shortcut `kbd` on the right, 400ms delay.
- **Command (palette):** 640px wide, 16px radius, `--card` background with a `--border` hairline, `--shadow-palette`, over `--overlay`. Input row 60px, items 44px tall with a 10px radius and a `--muted` selected background. See UI_SPEC §8.
- **Context menu and dropdown:** use the content and item wrappers in `components/Menu.tsx`: `--popover` background, 12px radius, 6px padding, `--shadow-popover`, items 34px tall at 14px with an 8px radius, separators in `--border`.
- **Toast (Sonner):** bottom center, `--popover` background, 14px text, optional "Undo" action. Shown for 4s.
- **Calendar:** today has a 1px `--foreground` ring, the selected day is white with black text, and days with log entries get a 3px `--muted-foreground` dot beneath.

---

## 8. Patterns

- **Selection on the canvas:** a 1.5px `--selection` outline with a 2px offset, plus 8×8 white square handles with 2px radius and a 1px `--background` border at the corners. Multi-select adds a dashed bounding box in `--border-strong`.
- **Hover on cards:** border goes up one step (note `border` → `border-hover`, +12% white) plus `--shadow-lift`, with no movement.
- **Selection toolbar (FigJam-style):** a floating `--card` bar (border, radius 12, `--shadow-popover`, 4px padding, 44px tall) centered 14px above the selection, or below it when there's no room under the canvas toolbar. It holds the six color swatches, a divider, then Duplicate, Bring to front, Send to back and Delete (36×36 ghost icon buttons with tooltips). It hides while a move, resize or marquee runs.
- **Done state (when "Show done" is on):** 45% opacity and a struck-through title.
- **Focus:** every interactive element has a visible `--ring` focus. Never remove an outline without replacing it.
- **Empty states:** a Tabler icon at 20px in `--subtle-foreground`, one 14px line, and an optional ghost button. No illustrations.

---

## 9. `globals.css` (drop-in)

```css
@import 'tailwindcss';
@import 'tw-animate-css';

/* Stock shadcn components use `dark:` variants. Tie them to <html class="dark"> (always set)
   rather than the OS color scheme, so they render the same whatever Windows' theme is. */
@custom-variant dark (&:is(.dark *));

/* BlockNote's shadcn UI ships its components' Tailwind classes uncompiled; scan them so its
   menus and popovers are styled with our theme variables (ARCHITECTURE §6, UI_SPEC §5.1). */
@source '../../../node_modules/@blocknote/shadcn/dist';

/* UI and note text. Bundled locally; never loaded from the network. */
@font-face {
  font-family: 'Geist';
  src: url('../assets/fonts/Geist-Variable.woff2') format('woff2');
  font-weight: 100 900;
  font-display: block;
}
/* Brand only: the onboarding title and the About name (font-brand). */
@font-face {
  font-family: 'Sora';
  src: url('../assets/fonts/sora-latin-600-normal.woff2') format('woff2');
  font-weight: 600;
  font-display: block;
}
/* Times, kbd, code, zoom %, paths. */
@font-face {
  font-family: 'Geist Mono';
  src: url('../assets/fonts/GeistMono-Variable.woff2') format('woff2');
  font-weight: 100 900;
  font-display: block;
}

:root {
  color-scheme: dark;
  --radius: 0.5rem;

  /* the app text size's zoom factor, set by the renderer (DESIGN_SYSTEM §3) */
  --app-zoom: 1;

  /* shadcn core (dark only) */
  --background: #09090b;
  --foreground: #fafafa;
  --card: #141416;
  --card-foreground: #fafafa;
  --popover: #18181b;
  --popover-foreground: #fafafa;
  --primary: #fafafa;
  --primary-foreground: #09090b;
  --secondary: #1f1f23;
  --secondary-foreground: #fafafa;
  --muted: #1f1f23;
  --muted-foreground: #a1a1aa;
  --accent: #1f1f23;
  --accent-foreground: #fafafa;
  --destructive: #f87171;
  --border: #27272a;
  --input: #27272a;
  --ring: #d4d4d8;

  /* sprawl neutrals */
  --surface: #0f0f11;
  --border-strong: #3f3f46;
  --subtle-foreground: #808089;
  --selection: #fafafa;
  --canvas-dot: #27272a;
  --inset: #0c0c0e;

  /* due */
  --due-overdue: #f87171;
  --due-overdue-bg: #2a1517;
  --due-soon: #fafafa;
  --due-soon-bg: #27272a;
  --due-later: #a1a1aa;
  --due-later-bg: #1f1f23;

  /* notes */
  --note-stone-bg: #202024;
  --note-stone-border: #323238;
  --note-stone-text: #f4f4f5;
  --note-stone-swatch: #71717a;
  --note-sand-bg: #382e15;
  --note-sand-border: #4e4020;
  --note-sand-text: #fbe7ae;
  --note-sand-swatch: #e9c46a;
  --note-sage-bg: #173022;
  --note-sage-border: #224430;
  --note-sage-text: #c8f0d6;
  --note-sage-swatch: #6fcf97;
  --note-sky-bg: #162940;
  --note-sky-border: #223b5a;
  --note-sky-text: #cfe3fb;
  --note-sky-swatch: #6aa8f0;
  --note-lilac-bg: #282141;
  --note-lilac-border: #3a305c;
  --note-lilac-text: #e3dafb;
  --note-lilac-swatch: #a991f0;
  --note-rose-bg: #3b1b24;
  --note-rose-border: #552733;
  --note-rose-text: #fad3dc;
  --note-rose-swatch: #ec7a95;
  /* card hover: the note border one step up, +12% white (DESIGN_SYSTEM §8) */
  --note-stone-border-hover: color-mix(in srgb, var(--note-stone-border), white 12%);
  --note-sand-border-hover: color-mix(in srgb, var(--note-sand-border), white 12%);
  --note-sage-border-hover: color-mix(in srgb, var(--note-sage-border), white 12%);
  --note-sky-border-hover: color-mix(in srgb, var(--note-sky-border), white 12%);
  --note-lilac-border-hover: color-mix(in srgb, var(--note-lilac-border), white 12%);
  --note-rose-border-hover: color-mix(in srgb, var(--note-rose-border), white 12%);

  /* selected text inside a note card: a little stronger than the app-wide one on tinted cards */
  --note-text-selection: rgb(255 255 255 / 0.24);
  /* Card chips (UI_SPEC §4.5): a faint white over the note color, in the note's text color. */
  --note-chip: rgb(255 255 255 / 0.06);

  /* canvas marquee (UI_SPEC §4.9) */
  --marquee-fill: rgb(250 250 250 / 0.04);

  /* behind the command palette (UI_SPEC §8) */
  --overlay: rgb(0 0 0 / 0.55);

  /* elevation & motion */
  --shadow-card: 0 1px 0 0 rgb(255 255 255 / 0.03) inset, 0 1px 2px rgb(0 0 0 / 0.4);
  --shadow-lift: 0 12px 32px -8px rgb(0 0 0 / 0.7), 0 0 0 1px rgb(255 255 255 / 0.06);
  --shadow-popover: 0 16px 48px -12px rgb(0 0 0 / 0.8), 0 0 0 1px #27272a;
  --shadow-palette: 0 32px 80px -20px rgb(0 0 0 / 0.9);
  --ease-out: cubic-bezier(0.2, 0.8, 0.2, 1);
  --ease-in: cubic-bezier(0.4, 0, 1, 1);
}

@theme inline {
  --font-sans: 'Geist', ui-sans-serif, system-ui, sans-serif;
  --font-mono: 'Geist Mono', ui-monospace, monospace;
  --font-brand: 'Sora', 'Geist', sans-serif;

  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-popover: var(--popover);
  --color-popover-foreground: var(--popover-foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-destructive: var(--destructive);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);
  --color-surface: var(--surface);
  --color-border-strong: var(--border-strong);
  --color-subtle-foreground: var(--subtle-foreground);
  --color-selection: var(--selection);
  --color-canvas-dot: var(--canvas-dot);
  --color-inset: var(--inset);
  --color-marquee-fill: var(--marquee-fill);
  --color-overlay: var(--overlay);
  --color-note-text-selection: var(--note-text-selection);
  --color-note-chip: var(--note-chip);
  --color-due-overdue: var(--due-overdue);
  --color-due-overdue-bg: var(--due-overdue-bg);
  --color-due-soon: var(--due-soon);
  --color-due-soon-bg: var(--due-soon-bg);
  --color-due-later: var(--due-later);
  --color-due-later-bg: var(--due-later-bg);

  --color-note-stone: var(--note-stone-bg);
  --color-note-stone-border: var(--note-stone-border);
  --color-note-stone-text: var(--note-stone-text);
  --color-note-stone-swatch: var(--note-stone-swatch);
  --color-note-stone-border-hover: var(--note-stone-border-hover);
  --color-note-sand: var(--note-sand-bg);
  --color-note-sand-border: var(--note-sand-border);
  --color-note-sand-text: var(--note-sand-text);
  --color-note-sand-swatch: var(--note-sand-swatch);
  --color-note-sand-border-hover: var(--note-sand-border-hover);
  --color-note-sage: var(--note-sage-bg);
  --color-note-sage-border: var(--note-sage-border);
  --color-note-sage-text: var(--note-sage-text);
  --color-note-sage-swatch: var(--note-sage-swatch);
  --color-note-sage-border-hover: var(--note-sage-border-hover);
  --color-note-sky: var(--note-sky-bg);
  --color-note-sky-border: var(--note-sky-border);
  --color-note-sky-text: var(--note-sky-text);
  --color-note-sky-swatch: var(--note-sky-swatch);
  --color-note-sky-border-hover: var(--note-sky-border-hover);
  --color-note-lilac: var(--note-lilac-bg);
  --color-note-lilac-border: var(--note-lilac-border);
  --color-note-lilac-text: var(--note-lilac-text);
  --color-note-lilac-swatch: var(--note-lilac-swatch);
  --color-note-lilac-border-hover: var(--note-lilac-border-hover);
  --color-note-rose: var(--note-rose-bg);
  --color-note-rose-border: var(--note-rose-border);
  --color-note-rose-text: var(--note-rose-text);
  --color-note-rose-swatch: var(--note-rose-swatch);
  --color-note-rose-border-hover: var(--note-rose-border-hover);

  --radius-sm: calc(var(--radius) - 2px);
  --radius-md: calc(var(--radius) - 2px);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) + 4px);
  --radius-card: 12px;
  --radius-menu: 12px;
  --radius-capture: 14px;

  /* the 140px the native caption buttons take (UI_SPEC §1): they don't zoom with the page */
  --spacing-caption: calc(140px / var(--app-zoom));

  /* the daily log's one-time row highlight (DESIGN_SYSTEM §6) */
  --animate-row-highlight: row-highlight 600ms var(--ease-out);
  @keyframes row-highlight {
    from {
      background-color: var(--muted);
    }
    to {
      background-color: transparent;
    }
  }

  /* weights listed here are defaults; override with font-* where the type table allows */
  --text-kbd: 11px;
  --text-kbd--line-height: 16px;
  --text-2xs: 12px;
  --text-2xs--line-height: 16px;
  --text-2xs--font-weight: 500;
  --text-xs: 13px;
  --text-xs--line-height: 18px;
  --text-sm: 14px;
  --text-sm--line-height: 20px;
  --text-base: 15px;
  --text-base--line-height: 22px;
  --text-editor: 16px;
  --text-editor--line-height: 26px;
  --text-card-title: 15px;
  --text-card-title--line-height: 21px;
  --text-card-title--font-weight: 600;
  --text-lg: 20px;
  --text-lg--line-height: 28px;
  --text-lg--letter-spacing: -0.01em;
  --text-lg--font-weight: 600;
  --text-title: 28px;
  --text-title--line-height: 36px;
  --text-title--letter-spacing: -0.02em;
  --text-title--font-weight: 600;
  --text-page-title: 36px;
  --text-page-title--line-height: 44px;
  --text-page-title--letter-spacing: -0.02em;
  --text-page-title--font-weight: 600;
}

@layer base {
  * {
    @apply border-border;
  }
  html,
  body,
  #root {
    height: 100%;
  }
  body {
    @apply bg-background text-foreground font-sans text-sm antialiased;
    -webkit-font-smoothing: antialiased;
    user-select: none; /* app chrome; re-enable in editors/inputs */
  }
  input,
  textarea,
  [contenteditable='true'] {
    user-select: text;
  }
  ::selection {
    background: rgb(250 250 250 / 0.18);
  }
  :focus-visible {
    outline: 2px solid var(--ring);
    outline-offset: 2px;
  }
  ::-webkit-scrollbar {
    width: 10px;
    height: 10px;
  }
  ::-webkit-scrollbar-thumb {
    background: var(--border);
    border-radius: 10px;
    border: 3px solid transparent;
    background-clip: content-box;
  }
  @media (prefers-reduced-motion: reduce) {
    * {
      animation-duration: 80ms !important;
      transition-duration: 80ms !important;
    }
  }
}
```

Note-color classes are built from a map in `lib/noteColors.ts`, so Tailwind sees full class names:

```ts
export const NOTE_COLORS = ['stone','sand','sage','sky','lilac','rose'] as const;
export const noteClass: Record<NoteColor, string> = {
  stone: 'bg-note-stone border-note-stone-border text-note-stone-text',
  sand:  'bg-note-sand border-note-sand-border text-note-sand-text',
  sage:  'bg-note-sage border-note-sage-border text-note-sage-text',
  sky:   'bg-note-sky border-note-sky-border text-note-sky-text',
  lilac: 'bg-note-lilac border-note-lilac-border text-note-lilac-text',
  rose:  'bg-note-rose border-note-rose-border text-note-rose-text',
};
export const swatchClass: Record<NoteColor, string> = {
  stone: 'bg-note-stone-swatch', sand: 'bg-note-sand-swatch', sage: 'bg-note-sage-swatch',
  sky: 'bg-note-sky-swatch', lilac: 'bg-note-lilac-swatch', rose: 'bg-note-rose-swatch',
};
```
