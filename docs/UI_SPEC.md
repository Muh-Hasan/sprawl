# Sprawl — UI Spec

Exact layout and anatomy for every screen. Behavior lives in `PRODUCT.md`, and tokens and colors in `DESIGN_SYSTEM.md`. Measurements are in CSS px at 100% zoom. Icon names are `@tabler/icons-react` components (DESIGN_SYSTEM §5).

---

## 1. Window

- **Minimum size** 960×600, default 1440×900. The window size and position are remembered.
- **Windows (v1 target):** `titleBarStyle: 'hidden'` with `titleBarOverlay: { color: '#09090B', symbolColor: '#A1A1AA', height: 40 }`. This gives native minimize, maximize and close buttons at the top right, drawn on our dark color.
  - The top 40px of the app is a drag region (`-webkit-app-region: drag`), and every button inside it is `no-drag`.
  - Keep **140px clear on the right of the top 40px of the window** for the overlay buttons. That band is always the window's right edge, whatever is there: the top bar, the note panel's header (§5) or a full-page note. No clickable element goes in it.
  - Windows 11 rounds the window corners and adds the snap-layouts flyout on the maximize button automatically. Don't fight either.
- (Unofficial macOS: `hiddenInset` with traffic lights at `{ x: 16, y: 14 }`.)
- **Background** is `--background` on the BrowserWindow as well (`backgroundColor: '#09090B'`), so there's no white flash.

```
┌────┬──────────────────────────────────────────────────────────┬───────────────┐
│    │  top bar (40px, drag)                                    │               │
│ R  ├──────────────────────────────────────────────────────────┤  Note panel   │
│ a  │                                                          │  (420px,      │
│ i  │           main view (canvas / list / log / drawings)     │   resizable)  │
│ l  │                                                          │               │
│52px│                                                          │               │
└────┴──────────────────────────────────────────────────────────┴───────────────┘
```

---

## 2. Rail (left, 52px)

- `--surface` background with a 1px right border.
- **Top:** a 40px drag area.
- **Logo:** `sprawl-mark-light` at 18px, centered, 12px below the drag area. Not clickable.
- **Nav buttons** (36×36, radius 8, 4px gap): Canvas, List, Log, Drawings, Search.
  - **Active:** `--muted` background, `--foreground` icon, plus a 2px × 16px white bar on the rail's left edge (radius 0 1px 1px 0).
  - **Hover:** `--muted` background.
  - **Tooltip** on the right, with the label and shortcut (for example "Canvas Ctrl+1").
- **Bottom:** the Settings button, 12px from the bottom.
- **List badge:** when anything is overdue, a small count (for example "2") in `text-2xs` 600 shows at the top-right of the List icon: `--due-overdue` text on `--due-overdue-bg`, as a 16px-tall pill. Nothing shows when nothing is overdue.

---

## 3. Top bar (40px, inside the main area)

A drag region with a 1px bottom border on every view **except the canvas**. On the canvas the top bar is transparent and has no border, so the canvas runs full-bleed and the floating toolbar sits over it. The toolbar and every button in the top bar are `no-drag`. Right-side content ends 140px from the window's right edge (§1).

| View | Left (16px padding) | Right |
|---|---|---|
| Canvas | none | "Show done" toggle (ghost, `IconEye` / `IconEyeOff`, 28px) |
| List | none (the view has its own header row, §5b) | none |
| Log | "Daily log" (`text-sm`, 500) | none |
| Drawings | "Drawings" | "New drawing" button (secondary, sm) |
| Drawing editor | ← back (ghost icon), editable title input (`text-sm`, 500, borderless) | "Saved" / "Saving…" (`text-xs`, subtle) |
| Settings | "Settings" | none |

---

## 4. Canvas

### 4.1 Surface
- `--background` background with a dot grid: `radial-gradient(circle, var(--canvas-dot) 1px, transparent 1.2px)`.
  - The grid spacing is `20px × zoom`. Below 50% zoom it doubles to 40px, and it keeps doubling each time the zoom halves after that (80px below 25%, and so on), so the dots are **never hidden** and stay at least 10px apart however far out you zoom.
  - The dots sit on the world grid (a dot on the origin), so when the spacing doubles every other dot stays in place.
  - `background-position` follows the pan.
- The cursor is `default`. It's `grab`/`grabbing` in Hand mode or while space is held, and `crosshair` for the Note and Link tools.
- The canvas element itself never scrolls (focus and find-in-page could scroll even an overflow-hidden box); any scroll is reset at once.

### 4.2 Floating toolbar
- Positioned top center, 12px from the top. `--card` background with a 1px border, radius 10, `--shadow-popover`, and 4px padding.
- Six 32×32 ghost icon buttons (18px icons): Select, Hand │ Note, Link, Drawing, Image. There's a 1px × 16px divider after Hand.
- The **active tool** gets a `--muted` background and a `--foreground` icon.
- **Note tool:** a click places a default-size note there; a click-and-drag draws the note at the dragged size (snapped, within the note size limits), shown as a dashed card-shaped outline while dragging. Either way the title is focused and the tool goes back to Select.
- Each tooltip shows the label and its single-key shortcut.

### 4.3 Bottom-left status pill
- 12px from the edges, height 28, `--card` background with a border, radius 8, 0 10px padding, `text-xs`, muted.
- Content: `Tue 24 Nov · 3 done today`. Clicking it opens today's log.

### 4.4 Bottom-right zoom control
- Same pill style: `−` (24px icon button), the percentage in mono `text-xs` (44px wide, clicking resets it), and `+`.

### 4.5 Note card
```
┌──────────────────────────────┐  w default 220 (min 160, max 480)
│ Homepage redo           ●    │  h auto by content (min 64, max 320), unless resized
│ Hero needs a shorter line.   │  ● = due/overdue indicator dot (optional)
│ Show 3 featured projects…    │
│ ┌──────┐ ┌──────┐ ┌──────┐   │
│ │ 3/5  │ │🔗 2  │ │Fri   │   │
│ └──────┘ └──────┘ └──────┘   │
└──────────────────────────────┘
```
- **Box:** note `bg`, 1px note `border`, radius 10, padding 12px 14px, `--shadow-card`.
- **Height:** the stored `h` is a floor. The card grows with its content up to the 320 max, and a resize sets the floor (so it can be made taller than its content, not shorter).
- **New card:** fades in (DESIGN_SYSTEM §6). If it's off screen or the view is below 100%, the view glides to it (240ms), zooming in to 100% around it.
- **Title:** `text-card-title` (13/18, 600) in note `text`, max 2 lines with an ellipsis. An empty title shows "Untitled" in note `text` at 60% opacity (subtle text is too low-contrast on note colors; DESIGN_SYSTEM §2.3).
- **Preview:** `text-xs` at note `text` with 70% opacity, an 8px gap after the title, max 4 lines with a fade-out ellipsis. It's hidden if the body is empty.
- **Chips row:** 10px top margin, 6px gap, wraps.
  - Chips are 20px tall, radius 5, padding 0 6px, `text-2xs` 500, with a 12px icon and 4px gap. The background is `rgb(255 255 255 / .06)` in note `text` color.
  - **Checklist chip:** `IconChecklist` plus "3/5", shown only if the checklist total is above 0.
  - **Links chip:** `IconLink` plus the count.
  - **Attachments chip:** `IconPaperclip` plus the count.
  - **Due chip:** `IconCalendarDue` plus a label ("Today", "Tomorrow", "Fri" or "12 Dec"), styled by state: overdue is `--due-overdue` text on `--due-overdue-bg`, soon is `--due-soon` on `--due-soon-bg`, and later is `--due-later` on `--due-later-bg`.
- **Hover:** border +8% white and `--shadow-lift`. A **checkmark button** fades in at the top-right (20×20, ghost, `IconCheck` 14px) for a one-click Mark done.
- **Dragging:** scale 1.02, `--shadow-lift`, 95% opacity.
- **Below 40% zoom:** the card shows only the title at 13px, with the chips and preview hidden.
- **Editing the title on the card:** double-clicking the title text (not the card) edits it inline: a textarea that grows with the text, with the old title selected. Enter or clicking away saves (one `notes.update`), Esc puts the old title back. Double-clicking elsewhere opens the panel; until the panel exists (phase 4) it edits the title too.

### 4.6 Drawing card
- Default 280×200. `--card` background with a 1px `--border` and radius 10, plus 6px padding.
- **Thumbnail:** fills the card minus a 28px footer, radius 6, `object-fit: contain`, on an `--inset` background. The image source is `sprawl-file://thumb/<drawingId>?v=<updated_at>` (ARCHITECTURE §3).
- **Footer:** `IconScribble` 12px plus the title in `text-xs` 500, ellipsis, and the muted "Open" text on hover.
- Double-clicking opens the editor.

### 4.7 Image card
- Uses the natural aspect ratio, with a default longest side of 320. Radius 10 with overflow hidden, a 1px `--border` and no padding.
- On hover, a bottom gradient bar (`linear-gradient(transparent, rgb(0 0 0 / .7))`) shows the file name in `text-2xs`.
- Double-clicking opens a lightbox (a fullscreen overlay with `rgb(0 0 0 / .9)` background and the image fit to the window; Esc closes it).

### 4.8 Link card
- 260×56. `--card` background, border, radius 10, padding 10px 12px.
- **Left:** a 24×24 rounded square in `--muted` with the first letter of the domain (white, 12px, 600). No remote favicons.
- **Right:** the label (`text-sm` 500, 1 line) and the domain (`text-2xs`, subtle).
- Clicking selects it, and **Ctrl+click** or the hover `IconExternalLink` button opens the URL in the browser.

### 4.9 Selection and marquee
- Selection follows DESIGN_SYSTEM §8. A click selects, Shift+click toggles, a click on empty space clears; resize handles show on a single selected card.
- **Marquee:** a 1px `--muted-foreground` dashed outline with a `--marquee-fill` (`rgb(250 250 250 / .04)`) fill. It selects every card it touches (Shift+drag adds to the selection).
- **Selection toolbar:** over selected notes, FigJam-style (DESIGN_SYSTEM §8): the six color swatches, then Duplicate, Bring to front, Send to back and Delete. testids `selection-toolbar`, `selection-color-<color>`, `selection-duplicate`, `selection-front`, `selection-back`, `selection-delete`.

### 4.10 Context menu
Items in order: Open (Enter) · Mark done (Ctrl+Enter) · Color ▸ (six swatches inline in the submenu, 16px circles) · Due date… · ─ · Duplicate (Ctrl+D) · Bring to front (Ctrl+]) · Send to back (Ctrl+[) · ─ · Delete (Del, destructive text).
- Note-only items (Mark done, Color, Due date…) are hidden for other card kinds. With a multi-selection, the menu applies to every selected item. Right-clicking an unselected card selects just that card first.
- Items appear in the phase that makes them work: phase 3 has Color, Duplicate, Bring to front, Send to back and Delete; Open and Due date… come in phase 4, Mark done in phase 5, New drawing here in phase 8. The selection toolbar repeats the quick actions; the menu stays as the full list.
- On empty canvas: New note here · New drawing here · Paste · ─ · Zoom to fit (Shift+1).

---

## 5. Note panel (right)

- Default 420px wide, resizable from 320 to 720px through the shadcn `Resizable` handle, which is a 1px `--border` that turns `--border-strong` on hover with a wider 6px hit area.
- `--surface` background with a 1px left border.
- **Full-page mode** fills the main area minus the rail. The content column is centered with a max width of 720px.
- **Esc** steps back one level: full page → side panel → closed (PRODUCT §3.2). Esc inside the editor first leaves any open BlockNote menu.

**Anatomy** (padding 24px horizontal):
1. **Header row** (40px, drag region on its empty parts). It sits in the window's top 40px, so its right side keeps 140px clear for the Windows caption buttons (§1):
   - **Left:** the color dot (10px swatch circle, which opens the color popover) and a breadcrumb in `text-xs` subtle showing "Note", or "Note · not on canvas" for list-only notes (clicking that places it on the canvas).
   - **Right**, ending 140px from the window edge: ghost icon buttons for `IconArrowsDiagonal` (full page, or `IconArrowsDiagonalMinimize2` to go back), `IconDots` (Duplicate, Export as markdown, Delete) and `IconX`.
2. **Title:** a borderless textarea that grows, using `text-title`. The placeholder is "Untitled" in subtle text. 8px top margin.
3. **Editor:** BlockNote with 16px top margin (styling in §5.1).
4. **Meta section:** 32px top margin, a 1px top border, 16px padding. Rows are 32px tall and `text-sm`, with a 16px icon in subtle and the label in muted:
   - **Links:** each link is a row showing the domain letter square (16px), the label or URL with an ellipsis, and hover actions (edit, remove). Below them is an "Add link" ghost row; clicking it turns the row into an input with the placeholder "Paste a URL".
   - **Due:** "Add due date" or the formatted date as a chip ("Fri 28 Nov · 15:00"). Clicking either opens the **DuePicker** popover (300px):
     - Left column: quick picks as ghost buttons (Today, Tomorrow, Next week, Clear). Right: the Calendar.
     - Below, separated by a 1px border: a **Time** row ("Add time" ghost button, which turns into an `HH:mm` input with 15-minute steps and arrow-key nudging, plus a clear button) and a **Remind me** row (shadcn `Select`: None, At due time, 15 min before, 1 hour before, Morning of (9:00), 1 day before). The options that need a time are disabled until a time is set, with a tooltip saying "Add a time first". Clearing the time while one of them is selected resets Remind me to None.
   - **Reminder row** (shown only when a reminder is set): a `IconBell` icon with "Reminds you Fri 14:45", or "Reminded" in subtle text after it fires.
   - **Color:** six 16px swatch circles with an 8px gap. The selected one gets a 2px `--foreground` ring with a 2px offset.
   - **Linked from:** only shown if the note has backlinks. Each backlink is a row with the color dot and title.
5. **Footer:** sticky at the bottom, 56px tall, with a 1px top border and a `--surface` background.
   - **Left:** "Saved" or "Saving…" in `text-xs` subtle.
   - **Right:** a **Mark done** button (default/white, sm, `IconCheck` icon) with `kbd Ctrl ↵` next to it.
   - When done, the footer reads "Done · 18:30" with an **Undo** ghost button instead.

### 5.1 Editor styling (BlockNote via `@blocknote/shadcn`)
- Pass the app's shadcn components into `BlockNoteView` so menus and popovers match. Set `theme="dark"` and override BlockNote's CSS variables to the tokens: editor background transparent, text `--foreground`, menus `--popover`, hover `--muted`, borders `--border`.
- **Body** uses Outfit (override BlockNote's font variable so it inherits `--font-sans`) at `text-editor` (15/26) with 4px between blocks. H1, H2 and H3 are 24, 20 and 17px at weight 600, with 20px above and 4px below.
- **Checklist:** a 16px checkbox with radius 4 and a 1.5px `--border-strong` border. Checked boxes are white-filled with a black check, and their text gets `--muted-foreground` with a strike-through.
- **Code block:** Geist Mono 13px on an `--inset` background with a 1px border, radius 8 and 12px padding.
- **Quote:** a 2px `--border-strong` left bar (radius 0), 12px left padding, muted text.
- **Image block:** radius 8 with a 1px border. The caption is `text-xs` subtle.
- **`[[ref]]` pill:** inline-flex, `--muted` background, radius 4, padding 0 4px, the note's color dot (6px) and title in 500 weight. Hover shows a `--muted` +4% white background. Drawing refs use the `IconScribble` 12px icon instead of the dot.
- **Slash menu and side menu (drag handle):** BlockNote defaults rendered through shadcn. The drag handle uses `IconGripVertical` at 16px in subtle.
- **Placeholder** for an empty paragraph: "Type '/' for blocks, '[[' to link" in subtle.

---

## 5b. List view

- `--background` page. The content column is max 960px wide and centered, with 24px side padding.
- **Header row** (56px): the title "Notes" (`text-lg`) and a count in `text-sm` muted ("24 open"). On the right is a "New note" button (secondary, sm, `IconPlus`).
- **Filter bar** (40px, 12px below the header):
  - Left: a shadcn `ToggleGroup` (Open · Due · Done · All), sm size, ghost style, with the selected item in a `--muted` background.
  - Then six color swatch dots (14px circles). Selected dots get a 2px `--foreground` ring, and with none selected all colors show.
  - Right: a filter input (200px, 28px tall, with a `IconSearch` icon and the placeholder "Filter by title"), then a Sort `Select` (hidden on the Due tab, which always sorts by due date).
- **Rows:** 44px tall, a 1px `--border` bottom, 12px horizontal padding and radius 0. Hover gives a `--muted` background, and the keyboard-selected row gets a `--muted` background plus a 2px white left bar (radius 0).
  - Columns: checkbox (16px, the same style as the editor checklist) · color dot (8px) · **title** (`text-sm` 500, ellipsis) · first body line (`text-sm` subtle, ellipsis, takes the remaining space and is hidden when the window is under 1100px wide) · chips (checklist, due, links; same chips as the cards) · "Not on canvas" tag (`text-2xs`, `--muted` background, only when it applies) · edited time (`text-xs` subtle mono, 64px, right-aligned).
  - Hover actions replace the edited time: `IconFocus2` (Show on canvas) and `IconDots` (Place on canvas, Duplicate, Delete).
- **Due tab grouping:** sticky section headings (32px, `text-2xs` 600 subtle, `--background` background), in order: Overdue (heading in `--due-overdue`) · Today · Tomorrow · This week · Later. Empty groups are hidden.
- **Done tab:** rows show the done time instead of the edited time, and the checkbox is checked (unticking undoes done).
- Ticking a row's checkbox fades the row out over 180ms in the Open and Due tabs.
- **Empty states:** see PRODUCT §5.

## 5c. Quick capture window

- A separate frameless window, 520px wide with its height fitted to the content (min 112, max 320). It's centered horizontally at 22% of the active monitor's height. Transparent window background; the inner card has radius 14, a `--card` background, a 1px `--border-strong` border and `--shadow-popover`.
- **Layout** (padding 14px):
  - Top row: `sprawl-mark-light` at 14px, then a `ToggleGroup` (Note | Log, xs, 24px tall), and on the right a `kbd Tab` hint in `text-2xs` subtle.
  - The text area: borderless and transparent, `text-base` (14/22), auto-growing up to 8 lines.
    - Placeholder in Note mode: "Write a note… first line is the title. Try !tomorrow 15:00"
    - Placeholder in Log mode: "What did you just do?"
  - **Date token preview:** when a `!date` is recognized, it gets a `--muted` background highlight in the text, and a chip appears under the text area: `IconCalendarDue` with "Due Tomorrow · 15:00".
  - Footer row (`text-2xs` subtle): `↵ save · shift ↵ new line · esc close` on the left, and the destination on the right ("→ Canvas" or "→ Today's log").
- **Saved flash:** the card's contents are replaced by a centered `IconCheck` icon and "Saved to canvas" or "Logged" (`text-sm`) for 600ms, then the window hides. Under reduced motion there's no scale animation, only a fade.
- **Open animation:** opacity 0→1 and translateY 6px→0 over 120ms.

## 5d. Tray and notifications

- **Tray icon:** `resources/tray.ico` (white arcs, multi-size for high-DPI) on a transparent background. The tooltip says "Sprawl" plus " · 2 overdue" when something is overdue.
- **Tray menu** (native): Open Sprawl · Quick capture (with its shortcut) · ─ · Pause notifications for 1 hour (shows "Resume notifications" while paused) · ─ · Quit Sprawl.
- **Toasts** are native Windows toasts, so the OS controls their look. Content rules:
  - The app name and icon come from the AppUserModelId and the installer shortcut.
  - **Title:** the note title, at most 60 characters.
  - **Body:** "Due today at 15:00", "Due today", "Due tomorrow at 09:00" or "Overdue since Mon", plus " · Next: {first unchecked item}" if there is one.
  - **Morning summary:** the title "Today in Sprawl" and the body "3 due today · 1 overdue".
  - **Missed summary:** the title "While you were away" and the body "2 reminders · 1 now overdue".
  - Use `silent: false` (the default Windows sound) for reminders and `silent: true` for the morning summary.

## 6. Daily log

- `--surface` page with a centered column, max width 680px, padding 32px 24px.
- **Header:**
  - The date in `text-lg` ("Tuesday, 24 November"). Next to it, a `text-xs` muted "Today" tag, or a "Go to today" ghost button when viewing another day.
  - On the right: ← and → icon buttons and a `IconCalendar` button that opens a month popover.
- **Week strip:** 16px below the header. Seven equal cells, 52px tall, radius 8.
  - Each cell shows the weekday (`text-2xs` subtle) above the day number (`text-sm` 500).
  - Days with entries get a 4px `--muted-foreground` dot underneath.
  - The selected day has a `--muted` background and white number, and today has a 1px `--border-strong` ring.
- **Summary line:** 20px below the strip, `text-xs` muted, for example "3 done · 2 logged".
- **Entries list:** 8px below the summary. Each row is at least 40px tall, laid out as a grid of 56px (time) and 1fr, with 12px padding and a 1px bottom border.
  - **Time:** Geist Mono (`font-mono`) `text-xs` subtle. Clicking it on a manual entry edits it.
  - **Done entry:** a `IconCircleCheck` 14px white icon, the note title in `text-sm`, and the note's color tag (a chip with the swatch dot and the color name in `text-2xs`). Clicking opens the note panel.
  - **Manual entry:** text in `text-sm` with inline markdown (bold, italic, code, links). Hovering reveals edit and delete icon buttons on the right.
- **Carried over:** a 24px top margin, the label "Carried over from yesterday" in `text-2xs` uppercase-free muted, then compact rows with the color dot, title and an "Open" ghost button.
- **Composer:** pinned to the bottom of the column, 12px from the bottom of the view.
  - An input 40px tall with radius 10, `--card` background, 1px border and the placeholder "What did you just do?"
  - Inside the input on the right: a `kbd ↵` hint.
  - On submit, the new row slides in at the right time position and gets the highlight from DESIGN_SYSTEM §6.
- **Empty day:** the `IconNotebook` icon with "Nothing logged yet. Mark a note done or write what you just did."

---

## 7. Drawings

### 7.1 Grid
- Padding 24px, a CSS grid of `repeat(auto-fill, minmax(220px, 1fr))` with 16px gaps.
- **Tile:** `--card` background, border, radius 10, and a thumbnail area with a 4:3 aspect ratio on `--inset`.
- The tile footer is 44px tall with the title (`text-sm` 500) and "Edited 2h ago" (`text-2xs` subtle).
- **Hover:** border-strong and a `IconDots` menu (Rename, Place on canvas, Duplicate, Delete).
- **Empty:** the `IconScribble` icon with "Sketch something" and a New drawing button.

### 7.2 Editor
- The top bar from §3, with Excalidraw filling the rest.
- Excalidraw settings: `theme="dark"`, `viewBackgroundColor: '#09090B'`, and `gridModeEnabled: false`.
- Set its CSS variables in `globals.css` so Excalidraw's island and toolbar background matches `--card` and its borders match `--border`: `.excalidraw.theme--dark { --island-bg-color: var(--card); --default-border-color: var(--border); --color-primary: var(--primary); --color-primary-darker: var(--ring); --color-primary-light: var(--border-strong); }`. This makes Excalidraw's own accent white, consistent with the monochrome rule.
- `viewBackgroundColor` is a scene value, not CSS, so it's the one place the hex `#09090B` is passed in code. Keep it in `shared/constants.ts` as `APP_BG`, next to the `titleBarOverlay` and `backgroundColor` values in main.

---

## 8. Command palette (Ctrl+K)

- shadcn `CommandDialog`, 560px wide, positioned 18vh from the top, with an `rgb(0 0 0 / .6)` overlay and no blur.
- **Input row:** 48px tall with a `IconSearch` 16px icon and the placeholder "Search notes, drawings, log… or type > for commands".
- **Groups:** headings in `text-2xs` 500 subtle, 8px 12px padding.
- **Items:** 36px tall, 8px 12px padding.
  - Left: the icon (the color dot for notes, `IconScribble` for drawings, `IconNotebook` for log entries).
  - Then the title, followed by a snippet in `text-xs` muted on the same line, truncated. Matches are highlighted with `--foreground` and 600 weight, with no background color.
  - Right: the context, such as "Today", "3 days ago" or "in Portfolio", in `text-2xs` subtle.
- **Footer:** 32px tall, 1px top border, `text-2xs` subtle hints: `↑↓ navigate · ↵ open · esc close`.
- **Empty:** "No matches for “q”."

---

## 9. Settings

- A centered column (max 640px) with sections separated by 32px. Each section title is `text-sm` 600, and each row is 48px tall with the label and description (`text-xs` muted) on the left and the control on the right.
- **Sections:**
  - **Vault:** the path in mono `text-xs` with a "Change…" button.
  - **Canvas:** Snap to grid (Switch), Show done notes (Switch).
  - **Notifications:** Due reminders (Switch); Morning summary (Switch plus a time `Select` in 30-minute steps); "Send a test notification" (secondary). If Windows blocks Sprawl's notifications, the section shows a one-line warning in `--due-overdue` text with an "Open Windows settings" button.
  - **Quick capture:** Shortcut (a `ShortcutRecorder` showing the current combo as `kbd` keys; click "Change", press the new combo, and conflicts show "Already used by another app" in destructive text); Default mode (`ToggleGroup`: Note | Log).
  - **System:** Keep Sprawl running in the background (Switch, with the description "Needed for reminders and quick capture. Closing the window hides Sprawl to the tray."); Start Sprawl when Windows starts (Switch).
  - **Backup:** Daily backup (Switch), "Back up now" (secondary), and the last backup time.
  - **Export:** "Export as markdown…" (secondary).
  - **About:** `sprawl-mark-gradient` at 32px, "sprawl" in `font-brand` with the version, the MIT license and a GitHub link.

---

## 10. Onboarding (first launch only)

- A full window on `--background` with a centered stack 360px wide.
  - `sprawl-mark-gradient` at 48px.
  - "Welcome to sprawl" in `text-title` with `font-brand` (Sora 600).
  - "Notes, to-dos, sketches and a daily log. All on one canvas, all on your machine." in `text-sm` muted.
  - A vault picker row: a read-only input showing `Documents\Sprawl` with a "Choose…" button.
  - A **Start** button (default/white, full width, 36px).
- After Start, the canvas loads with one welcome note at the center (stone):
  - Title "Start here".
  - Body: "Double-click anywhere to add a note. Press Ctrl+K to search. Mark notes done and they show up in your daily log. Delete this when you're ready."

---

## 11. Dialogs and toasts

- **Confirm dialog** (AlertDialog): 400px wide, title `text-base` 600, description `text-sm` muted, with Cancel (ghost) and confirm buttons. The confirm button is destructive for deletes: `--destructive` text on `--muted`, and solid only on hover.
  - It's used only for: changing the vault and deleting a drawing.
  - Note deletes don't confirm, because the "Deleted · Undo" toast covers them.
- **Toasts:** "Marked done · Undo", "Deleted · Undo", "Duplicated", "Saved backup", and "Couldn't save. Retrying…" (shown with `--destructive` icon only).
