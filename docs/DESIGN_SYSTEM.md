# Sprawl — Design System

**Dark only. Strictly monochrome:** black, white and zinc. The **only color in the app is on the sticky notes** (the user's own color tags), plus red reserved for overdue dates and destructive actions. White is the accent.

Built on **shadcn/ui + Tailwind v4**. Everything below maps to CSS variables in `src/renderer/styles/globals.css` (full file in §9). Components never use raw hex values.

Reference feel: Linear, Vercel, Raycast. Quiet chrome, sharp type, content first.

---

## 1. Brand

### Logo
The mark is **three parallel strokes**, like quick marker lines across a page or ideas spreading out. The middle stroke is longest, and the outer two are offset in opposite directions, so the shape leans and moves.

Files are in `brand/` (copy them to `resources/` and `build/` in the repo):

| File | Use |
|---|---|
| `sprawl-icon.svg` / `sprawl-icon-1024.png` | App icon (dock, taskbar, installer). electron-builder builds `.icns` and `.ico` from the 1024px PNG. |
| `sprawl-mark-light.svg` | Mark only, white, for dark backgrounds (in-app, README dark). Also the **Windows tray icon** (export 16 and 32px PNGs and a multi-size `.ico`). |
| `sprawl-mark-dark.svg` | Mark only, black, for light backgrounds (README light mode, docs). |
| `sprawl-mark-gradient.svg` | White-to-zinc gradient mark for hero moments (onboarding, About). |
| `sprawl-lockup-dark-bg.svg` / `-light-bg.svg` | Mark plus the "sprawl" wordmark (Geist SemiBold, outlined). README header, website. |

**Rules:**
- The wordmark is always lowercase: **sprawl**.
- Keep clear space around the mark equal to one stroke's thickness.
- Don't recolor the mark beyond white, black or the white→zinc-400 gradient, and don't rotate, outline or add effects to it.
- The minimum size is 16px for the mark and 80px wide for the lockup.

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

### 2.2 Functional (the only non-note colors)

| Token | Hex | Use |
|---|---|---|
| `--destructive` | `#F87171` | Delete actions, error text |
| `--due-overdue` | `#F87171` | Overdue chip text, with `--due-overdue-bg` `#2A1517` |
| `--due-soon` | `#FAFAFA` | Due-soon chip: white text on `#27272A` (monochrome emphasis) |
| `--due-later` | `#A1A1AA` | Later chip (more than 2 days away): muted text on `#1F1F23` |
| `--success` | `#FAFAFA` | Done checkmarks stay white. Don't add green. |

### 2.3 Note colors (user tags)
Muted, dark tints, so a canvas full of notes stays calm on black. Each color has a card background, a border, a text color and a **swatch** (the brighter color used in the picker, log tags and the small color dot).

| Name | `bg` | `border` | `text` | `swatch` |
|---|---|---|---|---|
| `stone` (default) | `#1A1A1D` | `#2C2C31` | `#E4E4E7` | `#71717A` |
| `sand` | `#262116` | `#3A321E` | `#F1DFA8` | `#E9C46A` |
| `sage` | `#162219` | `#223527` | `#BFE3CB` | `#6FCF97` |
| `sky` | `#151E29` | `#21314A` | `#BCD7F5` | `#6AA8F0` |
| `lilac` | `#1E1A29` | `#302845` | `#D8CCF6` | `#A991F0` |
| `rose` | `#28181C` | `#42252D` | `#F3C6D0` | `#EC7A95` |

The token names are `--note-{name}-{bg|border|text|swatch}`, and the Tailwind classes are `bg-note-sand`, `border-note-sand-border` and so on (see §9).

**Contrast** (WCAG):
- Each note `text` on its `bg` is ≥ 9:1.
- `--muted-foreground` on `--background` is 7.8:1.
- `--subtle-foreground` is 5.1:1 on `--background`, 4.9:1 on `--surface`, 4.7:1 on `--card` and 4.5:1 on `--popover`. It's AA everywhere except on note cards, where it drops just under 4.5:1. On a note card, use the note's `text` color at 60% opacity instead (for example the "Untitled" placeholder).
- Never use subtle text below 12px.

---

## 3. Typography

**Geist Sans** for UI and notes, **Geist Mono** for code, times and shortcuts. Install the `geist` npm package and bundle the `.woff2` files locally with `@font-face` in `globals.css`. Don't load fonts from the network.

| Token | Size / line height | Weight | Use |
|---|---|---|---|
| `text-2xs` | 11 / 16 | 500 | Chip labels, kbd, meta |
| `text-xs` | 12 / 16 | 400 | Card body preview, timestamps, captions |
| `text-sm` | 13 / 20 | 400 / 500 | **Default UI text**: menus, buttons, rail tooltips, log entries |
| `text-base` | 14 / 22 | 400 | Panel meta rows, settings |
| `text-editor` | 15 / 26 | 400 | Note body in the editor |
| `text-card-title` | 13 / 18 | 600 | Note card title |
| `text-lg` | 18 / 26 | 600 | Log date header, view titles |
| `text-title` | 24 / 32 | 600 | Note title in the panel (−0.01em tracking) |
| Editor H1 / H2 / H3 | 24 / 20 / 17 | 600 | |

- **Tracking:** −0.01em at 18px and above, and 0 below.
- **Numbers:** use `font-variant-numeric: tabular-nums` for times, zoom percentages and counts.
- **Mono:** log times, `kbd`, code blocks and the zoom percentage.

---

## 4. Spacing, radius, elevation

- **Spacing:** 4px base. Use 4, 8, 12, 16, 20, 24 and 32. Component padding is usually 8 or 12, and section gaps 16 or 24.
- **Radius:** shadcn `--radius: 0.5rem` (8px).
  - Buttons, inputs and chips: 6px (`rounded-md`); chips can be 5px.
  - Note cards and canvas cards: 10px (`rounded-card`).
  - Menus, popovers and the palette: 10px (`rounded-card`).
  - Panels and dialogs: 12px (`rounded-xl`).
  - Quick capture window: 14px (`rounded-capture`).
- **Borders:** 1px `--border` everywhere. No double borders, and panels separate from the canvas with one hairline.
- **Shadows** are used sparingly, because on black most depth comes from surface steps:
  - `--shadow-card`: `0 1px 0 0 rgb(255 255 255 / 0.03) inset, 0 1px 2px rgb(0 0 0 / 0.4)`
  - `--shadow-lift` (hovered or dragged card): `0 12px 32px -8px rgb(0 0 0 / 0.7), 0 0 0 1px rgb(255 255 255 / 0.06)`
  - `--shadow-popover`: `0 16px 48px -12px rgb(0 0 0 / 0.8), 0 0 0 1px #27272A`

---

## 5. Iconography

- Use **lucide-react** at 16px with a 1.75 stroke (`strokeWidth={1.75}`) by default, 14px in chips and 18px in the rail and toolbar.
- Icons are `--muted-foreground` at rest and `--foreground` on hover or when active.
- Icon assignments:

| Purpose | Icon |
|---|---|
| Canvas | `LayoutDashboard` |
| List | `ListTodo` |
| Log | `NotebookText` |
| Drawings | `PenTool` |
| Search | `Search` |
| Settings | `Settings2` |
| Select tool | `MousePointer2` |
| Hand tool | `Hand` |
| Note tool | `StickyNote` |
| Link tool | `Link2` |
| Drawing tool | `PenTool` |
| Image tool | `ImagePlus` |
| Due date | `CalendarClock` |
| Done | `Check` / `CircleCheck` |
| Attachment | `Paperclip` |
| Reminder | `Bell` |
| Show on canvas | `Crosshair` |
| Quick capture | `Zap` |

---

## 6. Motion

- **Durations:** fast 120ms (hover, press, chips), base 180ms (popovers, panel), slow 260ms (view switch fade).
- **Easing:** `cubic-bezier(0.2, 0.8, 0.2, 1)` (ease-out) for entering, and `cubic-bezier(0.4, 0, 1, 1)` for exiting.
- **Note panel:** slides in 16px plus fades over 180ms.
- **Card lift on drag:** scale 1.02 with `--shadow-lift` over 120ms.
- **Mark done:** the card fades to 0 and scales to 0.96 over 180ms, then is removed. The log gets a one-time row highlight (a `--muted` background fading out over 600ms).
- **Canvas:** pan and zoom are never animated, except "zoom to fit" and "jump to note" (240ms ease-out).
- **Reduced motion:** respect `prefers-reduced-motion` and drop all transforms (keep opacity fades at 80ms).

---

## 7. Component styling (shadcn overrides)

Never edit `components/ui/*`. Theme shadcn components through the CSS variables, and build the Sprawl-specific variants below as **wrapper components** in `components/` (using `cva` + `cn()`):

- **Button:**
  - `default` is white with black text, used once per view at most (for example "Mark done").
  - `secondary` is `--muted` with white text.
  - `ghost` is transparent with a `--muted` hover. Most toolbar and rail buttons use it.
  - Height is 32px (`sm`, 28px). Icon buttons are 32×32 (rail and toolbar are 36×36).
- **Input:** 32px, transparent background with a `--border` border; on focus the border is `--border-strong` plus a 2px `--ring` at 30% alpha.
- **Kbd:** Geist Mono 11px, `--muted` background, 1px `--border`, 4px radius, 2px 5px padding.
- **Tooltip:** `--popover` background, 12px text with the shortcut `kbd` on the right, 400ms delay.
- **Command (palette):** 560px wide, 12px radius, `--card` background, `--shadow-popover`, input height 48px, and items 36px tall with a `--muted` selected background.
- **Context menu and dropdown:** `--popover` background, 10px radius, items 30px tall at 13px, separators in `--border`.
- **Toast (Sonner):** bottom center, `--popover` background, 13px text, optional "Undo" action. Shown for 4s.
- **Calendar:** today has a 1px `--foreground` ring, the selected day is white with black text, and days with log entries get a 3px `--muted-foreground` dot beneath.

---

## 8. Patterns

- **Selection on the canvas:** a 1.5px `--selection` outline with a 2px offset, plus 8×8 white square handles with 2px radius and a 1px `--background` border at the corners. Multi-select adds a dashed bounding box in `--border-strong`.
- **Hover on cards:** border goes up one step (note `border` → +8% white) plus `--shadow-lift`, with no movement.
- **Done state (when "Show done" is on):** 45% opacity and a struck-through title.
- **Focus:** every interactive element has a visible `--ring` focus. Never remove an outline without replacing it.
- **Empty states:** a lucide icon at 20px in `--subtle-foreground`, one 13px line, and an optional ghost button. No illustrations.

---

## 9. `globals.css` (drop-in)

```css
@import "tailwindcss";
@import "tw-animate-css";

@font-face { font-family: "Geist"; src: url("../assets/fonts/Geist-Variable.woff2") format("woff2"); font-weight: 100 900; font-display: block; }
@font-face { font-family: "Geist Mono"; src: url("../assets/fonts/GeistMono-Variable.woff2") format("woff2"); font-weight: 100 900; font-display: block; }

:root {
  color-scheme: dark;
  --radius: 0.5rem;

  /* shadcn core (dark only) */
  --background: #09090B;
  --foreground: #FAFAFA;
  --card: #141416;            --card-foreground: #FAFAFA;
  --popover: #18181B;         --popover-foreground: #FAFAFA;
  --primary: #FAFAFA;         --primary-foreground: #09090B;
  --secondary: #1F1F23;       --secondary-foreground: #FAFAFA;
  --muted: #1F1F23;           --muted-foreground: #A1A1AA;
  --accent: #1F1F23;          --accent-foreground: #FAFAFA;
  --destructive: #F87171;
  --border: #27272A;
  --input: #27272A;
  --ring: #D4D4D8;

  /* sprawl neutrals */
  --surface: #0F0F11;
  --border-strong: #3F3F46;
  --subtle-foreground: #808089;
  --selection: #FAFAFA;
  --canvas-dot: #27272A;
  --inset: #0C0C0E;

  /* due */
  --due-overdue: #F87171;  --due-overdue-bg: #2A1517;
  --due-soon: #FAFAFA;     --due-soon-bg: #27272A;
  --due-later: #A1A1AA;    --due-later-bg: #1F1F23;

  /* notes */
  --note-stone-bg:#1A1A1D; --note-stone-border:#2C2C31; --note-stone-text:#E4E4E7; --note-stone-swatch:#71717A;
  --note-sand-bg:#262116;  --note-sand-border:#3A321E;  --note-sand-text:#F1DFA8;  --note-sand-swatch:#E9C46A;
  --note-sage-bg:#162219;  --note-sage-border:#223527;  --note-sage-text:#BFE3CB;  --note-sage-swatch:#6FCF97;
  --note-sky-bg:#151E29;   --note-sky-border:#21314A;   --note-sky-text:#BCD7F5;   --note-sky-swatch:#6AA8F0;
  --note-lilac-bg:#1E1A29; --note-lilac-border:#302845; --note-lilac-text:#D8CCF6; --note-lilac-swatch:#A991F0;
  --note-rose-bg:#28181C;  --note-rose-border:#42252D;  --note-rose-text:#F3C6D0;  --note-rose-swatch:#EC7A95;

  /* elevation & motion */
  --shadow-card: 0 1px 0 0 rgb(255 255 255 / .03) inset, 0 1px 2px rgb(0 0 0 / .4);
  --shadow-lift: 0 12px 32px -8px rgb(0 0 0 / .7), 0 0 0 1px rgb(255 255 255 / .06);
  --shadow-popover: 0 16px 48px -12px rgb(0 0 0 / .8), 0 0 0 1px #27272A;
  --ease-out: cubic-bezier(.2,.8,.2,1);
}

@theme inline {
  --font-sans: "Geist", ui-sans-serif, system-ui, sans-serif;
  --font-mono: "Geist Mono", ui-monospace, monospace;

  --color-background: var(--background);   --color-foreground: var(--foreground);
  --color-card: var(--card);               --color-card-foreground: var(--card-foreground);
  --color-popover: var(--popover);         --color-popover-foreground: var(--popover-foreground);
  --color-primary: var(--primary);         --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary);     --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);             --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);           --color-accent-foreground: var(--accent-foreground);
  --color-destructive: var(--destructive);
  --color-border: var(--border);           --color-input: var(--input);   --color-ring: var(--ring);
  --color-surface: var(--surface);         --color-border-strong: var(--border-strong);
  --color-subtle-foreground: var(--subtle-foreground);
  --color-selection: var(--selection);     --color-canvas-dot: var(--canvas-dot);
  --color-inset: var(--inset);
  --color-due-overdue: var(--due-overdue); --color-due-overdue-bg: var(--due-overdue-bg);
  --color-due-soon: var(--due-soon);       --color-due-soon-bg: var(--due-soon-bg);
  --color-due-later: var(--due-later);     --color-due-later-bg: var(--due-later-bg);

  --color-note-stone: var(--note-stone-bg); --color-note-stone-border: var(--note-stone-border); --color-note-stone-text: var(--note-stone-text); --color-note-stone-swatch: var(--note-stone-swatch);
  --color-note-sand: var(--note-sand-bg);   --color-note-sand-border: var(--note-sand-border);   --color-note-sand-text: var(--note-sand-text);   --color-note-sand-swatch: var(--note-sand-swatch);
  --color-note-sage: var(--note-sage-bg);   --color-note-sage-border: var(--note-sage-border);   --color-note-sage-text: var(--note-sage-text);   --color-note-sage-swatch: var(--note-sage-swatch);
  --color-note-sky: var(--note-sky-bg);     --color-note-sky-border: var(--note-sky-border);     --color-note-sky-text: var(--note-sky-text);     --color-note-sky-swatch: var(--note-sky-swatch);
  --color-note-lilac: var(--note-lilac-bg); --color-note-lilac-border: var(--note-lilac-border); --color-note-lilac-text: var(--note-lilac-text); --color-note-lilac-swatch: var(--note-lilac-swatch);
  --color-note-rose: var(--note-rose-bg);   --color-note-rose-border: var(--note-rose-border);   --color-note-rose-text: var(--note-rose-text);   --color-note-rose-swatch: var(--note-rose-swatch);

  --radius-sm: calc(var(--radius) - 2px);
  --radius-md: calc(var(--radius) - 2px);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) + 4px);
  --radius-card: 10px;
  --radius-capture: 14px;

  /* weights listed here are defaults; override with font-* where the type table allows */
  --text-2xs: 11px;  --text-2xs--line-height: 16px;  --text-2xs--font-weight: 500;
  --text-xs: 12px;   --text-xs--line-height: 16px;
  --text-sm: 13px;   --text-sm--line-height: 20px;
  --text-base: 14px; --text-base--line-height: 22px;
  --text-editor: 15px; --text-editor--line-height: 26px;
  --text-card-title: 13px; --text-card-title--line-height: 18px; --text-card-title--font-weight: 600;
  --text-lg: 18px;   --text-lg--line-height: 26px;   --text-lg--letter-spacing: -0.01em;   --text-lg--font-weight: 600;
  --text-title: 24px; --text-title--line-height: 32px; --text-title--letter-spacing: -0.01em; --text-title--font-weight: 600;
}

@layer base {
  * { @apply border-border; }
  html, body, #root { height: 100%; }
  body {
    @apply bg-background text-foreground font-sans text-sm antialiased;
    font-feature-settings: "ss01", "cv11";
    -webkit-font-smoothing: antialiased;
    user-select: none;               /* app chrome; re-enable in editors/inputs */
  }
  input, textarea, [contenteditable="true"] { user-select: text; }
  ::selection { background: rgb(250 250 250 / .18); }
  :focus-visible { outline: 2px solid var(--ring); outline-offset: 2px; }
  ::-webkit-scrollbar { width: 10px; height: 10px; }
  ::-webkit-scrollbar-thumb { background: var(--border); border-radius: 10px; border: 3px solid transparent; background-clip: content-box; }
  @media (prefers-reduced-motion: reduce) { * { animation-duration: 80ms !important; transition-duration: 80ms !important; } }
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
