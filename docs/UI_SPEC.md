# Sprawl — UI Spec

Exact layout and anatomy for every screen. Behavior lives in `PRODUCT.md`, and tokens and colors in `DESIGN_SYSTEM.md`. Measurements are in CSS px at 100% zoom. Icon names are `@tabler/icons-react` components (DESIGN_SYSTEM §5).

---

## 1. Window

- **Minimum size** 960×600, default 1440×900. The window size and position are remembered.
- **Windows (v1 target):** `titleBarStyle: 'hidden'` with `titleBarOverlay: { color: '#09090B', symbolColor: '#A1A1AA', height: 44 }`. This gives native minimize, maximize and close buttons at the top right, drawn on our dark color.
  - The top 44px of the app is a drag region (`-webkit-app-region: drag`), and every button inside it is `no-drag`.
  - Keep **140px clear on the right of the top 44px of the window** for the overlay buttons. That band is always the window's right edge, whatever is there: the top bar, the note panel's header (§5) or a full-page note. No clickable element goes in it. Use `pr-caption` for it, never a fixed 140px (see the text size below).
  - **Text size** (Small / Default / Large / Larger, DESIGN_SYSTEM §3) zooms the page, but not the caption buttons. So the overlay's height follows the zoomed top bar (44px × the zoom factor), and `pr-caption` is `140px / --app-zoom`, which stays 140 real pixels at every size.
  - Windows 11 rounds the window corners and adds the snap-layouts flyout on the maximize button automatically. Don't fight either.
- (Unofficial macOS: `hiddenInset` with traffic lights at `{ x: 16, y: 14 }`.)
- **Background** is `--background` on the BrowserWindow as well (`backgroundColor: '#09090B'`), so there's no white flash.

```
┌──────────┬────────────────────────────────────────────────┬───────────────┐
│ Sidebar  │  top bar (44px, drag)                          │               │
│ (248px,  ├────────────────────────────────────────────────┤  Note panel   │
│  60px    │                                                │  (420px,      │
│  when    │        main view (canvas / list / log)         │   resizable)  │
│ collapsed│                                                │               │
│  )       │                                                │               │
└──────────┴────────────────────────────────────────────────┴───────────────┘
```

---

## 2. Sidebar (left, 248px; 60px collapsed)

Artboards: `Sidebar`, `Main` (open and collapsed). `--surface` background with a 1px `--border` right edge. Ctrl+\ or its toggle button collapses it to an icon rail and opens it again; the choice is the `sidebarCollapsed` machine setting, so it survives a relaunch. The shell waits for that setting before it lays out, so the canvas never starts at the wrong width. testid `sidebar`, with `data-collapsed`.

**Open (248px)**, top to bottom:
- **Header** (52px, a drag region): `sprawl-mark-light` at 22px, "Sprawl" in `--font-brand` 16px 600 (-0.01em), and on the right the toggle: a 32px ghost icon button with `IconLayoutSidebar`, tooltip "Collapse sidebar" with `Ctrl+\` (testid `sidebar-toggle`, `no-drag`). 16px left and 12px right padding, 10px gaps.
- **Actions** (12px side padding, 4px above, 8px apart), both 38px tall with a 10px radius:
  - **New note** (primary, 600): `IconPlus` 18px, the label, and "Ctrl N" in Geist Mono 12px on the right at 55% of the button text. It does what the palette's New note does (§8). testid `sidebar-new-note`.
  - **Search**: `--background` with a `--border` hairline, `--muted-foreground` text: `IconSearch` 18px, "Search or jump to…", and a `Ctrl K` kbd. It opens the palette (§8). testid `sidebar-search`.
- **Views** (8px side padding, 16px above, 2px apart): Canvas, List and Daily log. Each row is 36px, radius 8, 12px gap: the icon at 19px, the label (`text-sm` 500), and its shortcut on the right ("Ctrl 1", in Geist Mono `text-kbd`, `--subtle-foreground`). testids `sidebar-canvas`, `sidebar-list`, `sidebar-log`.
  - **Rest:** `--muted-foreground`. **Hover:** the ghost hover and `--foreground`. **Active:** `--muted` background and `--foreground`, with `aria-current="page"`.
  - **List badge:** while anything is overdue, a 20px pill takes the shortcut's place: the count in `text-2xs` 600, `--due-overdue` on `--due-overdue-bg`, "99+" past 99. testid `sidebar-list-badge`.
- **Recent** (20px above): a "Recent" heading in `text-2xs` 500 `--subtle-foreground` (12px side padding, 6px below), then the five open notes edited last, newest first. Rows are 32px, radius 8: a 10px swatch (3px radius) in the note's bright hue, and the title in `text-sm` at 85% `--foreground`, truncated ("Untitled" muted when empty). A click opens the note in the panel and glides the canvas to its card, as the palette does. The open note's row is `--muted`. The section is hidden while there are no open notes. testids `sidebar-recent`, `sidebar-recent-note` (with `data-note-id`). It follows every saved edit, so a renamed or finished note updates straight away.
  - *Pinned* notes go above Recent in the next PR (R5b).
- The views and Recent scroll together if the window is short.
- **Bottom** (a 1px `--border` above, 8px padding): Settings, a view row with "Ctrl ,". testid `sidebar-settings`. *Help and shortcuts (`?`) joins it when the shortcuts sheet lands (R13).*

**Collapsed (60px)**, a centered column of 40px icon buttons (radius 10, 20px icons, 4px apart), each with a tooltip on the right naming it and its shortcut:
- The toggle (`IconLayoutSidebar`, "Expand sidebar" with `Ctrl+\`) in a 52px drag strip.
- New note (primary, `IconPlus`), then Search.
- A 24px × 1px `--border` divider, then Canvas, List and Daily log. Active is `--muted` with a `--foreground` icon. The List badge is a 16px pill at the icon's top right.
- Settings at the bottom, 8px up. Recent isn't shown.

---

## 3. Top bar (44px, inside the main area)

A drag region with a 1px bottom border on every view **except the canvas**. On the canvas the top bar is transparent and has no border, so the canvas runs full-bleed and the floating toolbar sits over it. The toolbar and every button in the top bar are `no-drag`. Right-side content ends 140px from the window's right edge (§1). The sidebar's own 52px header sits beside it, not under it.

| View | Left (16px padding) | Right |
|---|---|---|
| Canvas | none | "Show done" toggle (ghost, `IconEye` when on / `IconEyeOff` when off, 28px, pressed state when on; testid `show-done-toggle`) |
| List | none (the view has its own header row, §5b) | none |
| Log | "Daily log" (`text-sm`, 500) | none |
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

### 4.1a Empty canvas
When the canvas has no cards at all, a start screen floats in the middle of the view (`EmptyCanvas` artboard; testid `canvas-empty`). It fades and rises in (500ms, `--ease-out`).
- Centered on the uncovered canvas at 46% height, 640px wide.
- Three tilted sticky-note shapes (sand, sky, sage; 74×64, radius 10) above the title.
- "Your canvas is empty" in `text-title`, then "Double-click anywhere to add a sticky note, or start from one of these." in `text-base` muted.
- Three start tiles in a row (12px gap): `--surface` background, 1px border, radius 14, 16px padding. Each has a 36px icon square on a note color, a `text-base` 600 title and a `text-xs` muted line. On hover the border goes `--border-strong`, the background `--popover`, and the tile rises 2px.
  - **New sticky note** (sand, testid `start-new-note`): "Or press `N` and click where it goes". Makes a note in the middle of the view with its title focused.
  - **Paste a list** (sky, `start-paste`): "Copied text becomes a note, first line as the title". Reads the clipboard; with nothing to paste it shows the toast "Copy some text first, then paste it here".
  - **Open the welcome board** (lilac, `start-welcome-board`): "Sample notes that show everything in a minute". Places the welcome board (§10).
- Under the tiles, in `text-xs` subtle: "Capture from any app with `Ctrl Shift Space`", using the shortcut set in Settings and left out when quick capture has none. R13 adds "· All shortcuts `?`".
- Only the tiles take the pointer: double-clicking anywhere else, even on the title, still makes a note there. It disappears as soon as the canvas has a card, and comes back when the last one is deleted or undone.

### 4.2 Toolbar
- Bottom center, 20px from the bottom. `--popover` background with a 1px border, radius 16, 6px padding, 4px gap, `--shadow-toolbar`.
- It centers on the part of the canvas that isn't covered: `--canvas-inset-right` is the width of whatever floats over the right edge (the floating note panel, R8), and the toolbar slides with it (`left`, 240ms `--ease-out`). The zoom control does the same.
- Six 44×44 tool buttons with 22px icons and an 11px radius: Select, Hand │ Sticky note, Drawing, Image, Link. There's a 1px × 24px divider after Hand.
- The **active tool** is filled white: `--primary` background with a `--primary-foreground` icon. The others are `--muted-foreground` and get a `--muted` background on hover.
- The Sticky note tool has an 8px dot (radius 3, a 2px `--popover` ring) at its bottom right in the color a new note gets (stone).
- Tools that aren't built yet (Drawing in phase 8, Image and Link in phase 7) are dimmed to 40% and `aria-disabled`, and stay hoverable: their tooltip says "Image · coming soon".
- **Note tool:** a click places a default-size note there; a click-and-drag draws the note at the dragged size (snapped, within the note size limits), shown as a dashed card-shaped outline while dragging. Either way the title is focused and the tool goes back to Select.
- Each tooltip opens above the button and shows the label and its single-key shortcut.

### 4.3 Bottom-left status pill
- 16px from the edges, height 36, `--card` background with a border, radius 10, 0 14px padding, `text-xs`, muted. The border turns `--border-strong` on hover.
- Content: the date in `--foreground` 500, a `·`, then "3 done today" or "Nothing done yet" (done entries in today's log, refetched whenever a note is marked done or undone). Clicking it opens today's log. testid `status-pill`.

### 4.4 Bottom-right zoom control
- The same pill (16px from the edges, height 36, radius 10): `−`, the percentage in mono `text-2xs` (48px wide, clicking resets it), `+`, a 1px × 18px divider, then Zoom to fit (Shift+1). The buttons are 32×30 with 16px icons, each with a tooltip above it.
- A `?` button (Help and shortcuts) joins it once the shortcuts sheet exists (R13).

### 4.5 Note card
```
┌──────────────────────────────┐  w default 240 (min 160, max 480)
│ Homepage redo                │  h auto by content (min 64, max 320), unless resized
│ Hero needs a shorter line.   │
│ Show 3 featured projects…    │
│ ┌──────┐ ┌──────┐ ┌──────┐   │
│ │ 3/5  │ │🔗 2  │ │Fri   │   │
│ └──────┘ └──────┘ └──────┘   │
└──────────────────────────────┘
```
- **Box:** note `bg`, 1px note `border`, radius 12, padding 14px 16px, `--shadow-card`.
- **Height:** the stored `h` is a floor. The card grows with its content up to the 320 max, and a resize sets the floor (so it can be made taller than its content, not shorter).
- **New card:** fades in (DESIGN_SYSTEM §6). If it's off screen or the view is below 100%, the view glides to it (240ms), zooming in to 100% around it.
- **Title:** `text-card-title` (15/21, 600) in note `text`, max 2 lines with an ellipsis. An empty title shows "Untitled" in note `text` at 60% opacity (subtle text is too low-contrast on note colors; DESIGN_SYSTEM §2.3).
- **Preview:** `text-xs` at note `text` with 75% opacity, a 6px gap after the title, max 4 lines with a fade-out ellipsis. It's hidden if the body is empty.
- **Chips row:** 12px top margin, 6px gap, wraps.
  - Chips are 22px tall, radius 6, padding 0 7px, `text-2xs` 500, with a 13px icon and 5px gap. The background is `--note-chip` (`rgb(255 255 255 / .08)`) in note `text` color.
  - **Checklist chip:** `IconChecklist` plus "3/5", shown only if the checklist total is above 0.
  - **Links chip:** `IconLink` plus the count.
  - **Attachments chip:** `IconPaperclip` plus the count.
  - **Due chip:** `IconCalendarDue` plus a label ("Today", "Tomorrow", "Fri" or "12 Dec"), styled by state: overdue is `--due-overdue` text on `--due-overdue-bg`, soon (today or tomorrow) is the stronger `--due-soon` white on `--due-soon-bg` (`rgb(250 250 250 / .14)`), and later is `--due-later` on `--due-later-bg`.
- **Hover:** the card lifts 2px with `--shadow-lift` and its border goes one step up (180ms ease-out). The card has no buttons of its own: Open and Mark done are in the selection toolbar (§4.9), so the title uses the card's full width.
- **Done:** the card fades to 0 and shrinks to 0.96 over 180ms (ease-in), then hides. With "Show done" on, a done card stays at 50% opacity with its title struck through, and the selection toolbar's Mark not done undoes it.
- **Dragging:** lifted like hover (2px up, `--shadow-lift`), plus scale 1.02 and 95% opacity.
- **Below 40% zoom:** the card shows only the title at 13px, with the chips and preview hidden.
- **Editing the title on the card:** double-clicking the title text (not the card) edits it inline: a textarea that grows with the text, with the old title selected. Enter saves (one `notes.update`) and moves on to writing the body; clicking away saves; Esc puts the old title back.
- **Writing in the card:** double-clicking anywhere else on the card replaces the preview with the note editor's quick `card` variant, styled exactly like the preview (`text-xs`, 18px line height, the note's text color at 70%, no gap between lines). Plain text: no markdown shortcuts except `[] ` (an 11px checkbox in the text color), no `/` menu, no toolbar, no drag handle, and pasted markdown stays text. A heading made in the panel shows as bold card-size text. The card grows with the text to its 320 max and then scrolls (the wheel scrolls the text, not the canvas, until it reaches the end). Esc or focus going elsewhere ends it, and the preview comes back. An open panel stays open and follows the typing live.

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
- Selection follows DESIGN_SYSTEM §8: a 1.5px white outline 3.5px outside the card. A click selects, Shift+click toggles, a click on empty space clears; resize handles show at the outline's four corners on a single selected card.
- **Marquee:** a 1px `--muted-foreground` dashed outline with a `--marquee-fill` (`rgb(250 250 250 / .04)`) fill. It selects every card it touches (Shift+drag adds to the selection).
- **Selection toolbar:** over selected notes, FigJam-style (DESIGN_SYSTEM §8), centered 14px above the selection. Every button has a tooltip with its name and shortcut:
  - The six color swatches (20px, the card color in a ring of the bright hue); the current color has a white ring.
  - A divider, then **Open** (`IconArrowsDiagonal`, one note only; Enter) and **Mark done** (`IconCheck`, every selected note; Ctrl+Enter). When they're all done (only with "Show done") it reads **Mark not done** and shows pressed.
  - A divider, then **Duplicate** (Ctrl+D) and **Delete** (Del). Bring to front and Send to back stay in the context menu and on Ctrl+] / Ctrl+[.
  - A click doesn't take focus (mousedown is cancelled on the toolbar), so keys keep going to the canvas; Tab still reaches the buttons.
  - testids `selection-toolbar`, `selection-color-<color>`, `selection-open`, `selection-done`, `selection-duplicate`, `selection-delete`.

### 4.10 Context menu
Items in order: Open (Enter) · Mark done (Ctrl+Enter) · Color ▸ (six swatches inline in the submenu, 16px circles) · Due date… · ─ · Duplicate (Ctrl+D) · Bring to front (Ctrl+]) · Send to back (Ctrl+[) · ─ · Delete (Del, destructive text).
- Note-only items (Mark done, Color, Due date…) are hidden for other card kinds. With a multi-selection, the menu applies to every selected item. Right-clicking an unselected card selects just that card first.
- Items appear in the phase that makes them work: phase 3 has Color, Duplicate, Bring to front, Send to back and Delete; Open and Due date… come in phase 4, Mark done in phase 5, New drawing here in phase 8. The selection toolbar repeats the quick actions; the menu stays as the full list.
- **Mark done** applies to every selected note and reads **Mark not done** when they're all done (only possible with "Show done" on). Ctrl+Enter on the canvas does the same. Marking done shows "Marked done · Undo".
- On empty canvas: New note here · New drawing here · Paste · ─ · Zoom to fit (Shift+1).

---

## 5. Note panel (right)

- Default 420px wide, resizable from 320 to 720px through the shadcn `Resizable` handle, which is a 1px `--border` that turns `--border-strong` on hover with a wider 6px hit area. The handle is the panel's left border (the panel has none of its own). The width is saved (`panelWidth`) and stays in px when the window resizes.
- `--surface` background with a 1px left border.
- **Full-page mode** fills the main area minus the sidebar. The content column is centered with a max width of 720px.
- **Esc** steps back one level: full page → side panel → closed (PRODUCT §3.2). Esc inside the editor first leaves any open BlockNote menu.

**Anatomy** (padding 24px horizontal):
1. **Header row** (44px, drag region on its empty parts). It sits in the window's top 44px, so its right side keeps 140px clear for the Windows caption buttons (§1):
   - **Left:** the color dot (10px swatch circle, which opens the color popover) and a breadcrumb in `text-xs` subtle showing "Note", or "Note · not on canvas" for list-only notes (clicking that places it on the canvas).
   - **Right**, ending 140px from the window edge: ghost icon buttons for `IconArrowsDiagonal` (full page, or `IconArrowsDiagonalMinimize2` to go back), `IconDots` (Duplicate, Export as markdown, Delete) and `IconX`.
2. **Title:** a borderless textarea that grows, using `text-title`. The placeholder is "Untitled" in subtle text. 8px top margin. A note opened from the canvas (Enter, Open in the toolbar or menu) gets the cursor at the end of the body, or in the title while it has none; a new list note gets it in the title.
3. **Editor:** BlockNote with 16px top margin (styling in §5.1).
4. **Meta section:** 32px top margin, a 1px top border, 16px padding. Rows are 32px tall and `text-sm`, with a 16px icon in subtle and the label in muted:
   - **Links:** each link is a row showing the domain letter square (16px), the label or URL with an ellipsis, and hover actions (edit, remove). Below them is an "Add link" ghost row; clicking it turns the row into an input with the placeholder "Paste a URL".
   - **Due:** "Add due date" or the formatted date as a chip ("Fri 28 Nov · 15:00"). Clicking either opens the **DuePicker** popover (300px):
     - Left column: quick picks as ghost buttons (Today, Tomorrow, Next week (next Monday), Clear). Right: the Calendar (weeks start on Monday).
     - Below, separated by a 1px border: a **Time** row ("Add time" ghost button, which turns into an `HH:mm` input with 15-minute steps and arrow-key nudging, plus a clear button) and a **Remind me** row (shadcn `Select`: None, At due time, 15 min before, 1 hour before, Morning of (9:00), 1 day before). The options that need a time are disabled until a time is set, with "· Add a time first" after their label (a disabled select item takes no pointer events, so it can't show a tooltip). The time is typed (9, 930, 9:30…) or stepped by 15 minutes with ↑/↓, and saved on Enter or on leaving the field. Clearing the time while one of them is selected resets Remind me to None.
   - **Reminder row** (shown only when a reminder is set): a `IconBell` icon with "Reminds you Fri 14:45", or "Reminded" in subtle text after it fires.
   - **Color:** six 16px swatch circles with an 8px gap. The selected one gets a 2px `--foreground` ring with a 2px offset.
   - **Linked from:** only shown if the note has backlinks. Each backlink is a row with the color dot and title.
5. **Footer:** sticky at the bottom, 56px tall, with a 1px top border and a `--surface` background.
   - **Left:** "Saved" or "Saving…" in `text-xs` subtle.
   - **Right:** a **Mark done** button (default/white, sm, `IconCheck` icon) with `kbd Ctrl ↵` next to it.
   - When done, the footer reads "Done · 18:30" with an **Undo** ghost button instead.
   - Ctrl+Enter anywhere in the panel toggles it, except in a checklist item, where BlockNote uses it to tick the item. On the canvas, marking done from the panel is a canvas step (Ctrl+Z undoes it); the panel stays open on the done note. testids `note-panel-mark-done`, `note-panel-done`, `note-panel-undo-done`.

### 5.1 Editor styling (BlockNote via `@blocknote/shadcn`)
- `@blocknote/shadcn` brings its own shadcn components (on Base UI), styled by the same theme variables, so menus and popovers match (ARCHITECTURE §6, Editor notes). Set `theme="dark"` and override BlockNote's CSS variables to the tokens: editor background transparent, text `--foreground`, menus `--popover`, hover `--muted`, borders `--border`.
- **Body** uses Geist (override BlockNote's font variable so it inherits `--font-sans`) at `text-editor` (16/26) with 4px between blocks. There's one heading level, 18px at weight 600 (smaller than the 28px title, the note's main heading), with 16px above and 4px below. The `/` menu calls it "Heading".
- **Checklist:** a 16px checkbox with radius 4 and a 1.5px `--border-strong` border. Checked boxes are white-filled with a black check, and their text gets `--muted-foreground` with a strike-through.
- **Code block:** Geist Mono 13px on an `--inset` background with a 1px border, radius 8 and 12px padding.
- **Quote:** a 2px `--border-strong` left bar (radius 0), 12px left padding, muted text.
- **Image block:** radius 8 with a 1px border. The caption is `text-xs` subtle.
- **`[[ref]]` pill:** inline-flex, `--muted` background, radius 4, padding 0 4px, the note's color dot (6px) and title in 500 weight. Hover shows a `--muted` +4% white background. Drawing refs use the `IconScribble` 12px icon instead of the dot.
- **Slash menu and side menu (drag handle):** BlockNote's, rendered through its shadcn package. The slash menu lists only PRODUCT §3.2's blocks. The side menu is the drag handle alone (BlockNote's six-dot handle), so it fits the 24px gutter; its menu has Delete only. The formatting toolbar has the block type, bold, italic, underline, strike, code, nest/unnest and link, with no colors or alignment.
- **Placeholder** for an empty paragraph: "Type '/' for blocks" in subtle; phase 9 adds ", '[[' to link".

---

## 5b. List view

- `--background` page. The content column is max 960px wide and centered, with 24px side padding.
- **Header row** (56px): the title "Notes" (`text-lg`) and a count in `text-sm` muted ("24 open"). On the right is a "New note" button (secondary, sm, `IconPlus`).
- **Filter bar** (40px, 12px below the header):
  - Left: a shadcn `ToggleGroup` (Open · Due · Done · All), sm size, ghost style, with the selected item in a `--muted` background.
  - Then six color swatch dots (14px circles). Selected dots get a 2px `--foreground` ring, and with none selected all colors show.
  - Right: a filter input (200px, 28px tall, with a `IconSearch` icon and the placeholder "Filter by title"), then a Sort `Select` (hidden on the Due tab, which always sorts by due date, and on Done, which sorts by done time).
- The header count reads "24 open", "5 due", "12 done" or "40 notes".
- **Rows:** 44px tall, a 1px `--border` bottom, 12px horizontal padding and radius 0. Hover gives a `--muted` background, and the keyboard-selected row gets a `--muted` background plus a 2px white left bar (radius 0).
  - Columns: checkbox (16px, the same style as the editor checklist) · color dot (8px) · **title** (`text-sm` 500, ellipsis) · first body line (`text-sm` subtle, ellipsis, takes the remaining space and is hidden when the window is under 1100px wide) · chips (checklist, due, links; same chips as the cards) · "Not on canvas" tag (`text-2xs`, `--muted` background, only when it applies) · edited time (`text-xs` subtle mono, 64px, right-aligned).
  - Hover actions replace the edited time: `IconFocus2` (Show on canvas; only for a note with a card that isn't done) and `IconDots` (Place on canvas for list-only notes, Duplicate, Delete).
  - Show on canvas switches to the canvas, selects the card and glides it to the middle at 100% or closer.
- **Due tab grouping:** sticky section headings (32px, `text-2xs` 600 subtle, `--background` background), in order: Overdue (heading in `--due-overdue`) · Today · Tomorrow · This week · Later. Empty groups are hidden.
- **Done tab:** rows show the done time instead of the edited time, and the checkbox is checked (unticking undoes done).
- Ticking a row's checkbox fades the row out over 180ms in the Open and Due tabs.
- **Empty states:** see PRODUCT §5. Done: "Nothing done yet. Tick a note and it shows up here." All: "No notes yet." With a color or title filter on: "No notes match these filters."
- **New note** opens the note in the panel with the cursor in the title; its breadcrumb reads "Note · not on canvas" until it's placed.

## 5c. Quick capture window

- A separate frameless window, 520px wide with its height fitted to the content (min 112, max 320). It's centered horizontally at 22% of the active monitor's height (the monitor under the pointer). Transparent window background; the inner card has radius 14, a `--card` background, a 1px `--border-strong` border and `--shadow-popover`.
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
  - On the right: ← and → icon buttons and a `IconCalendar` button that opens a month popover. → is disabled on today: the log never goes past today.
  - **Month popover:** the Calendar (weeks start on Monday) with a 4px dot under days with entries; days after today are disabled. Picking a day closes it.
- **Week strip:** 16px below the header. Seven equal cells, 52px tall, radius 8. It shows the last 7 days ending today while the selected day is among them; further back, the 7 days ending on the selected day.
  - Each cell shows the weekday (`text-2xs` subtle) above the day number (`text-sm` 500).
  - Days with entries get a 4px `--muted-foreground` dot underneath.
  - The selected day has a `--muted` background and white number, and today has a 1px `--border-strong` ring.
- **Summary line:** 20px below the strip, `text-xs` muted, for example "3 done · 2 logged".
- **Entries list:** 8px below the summary. Each row is at least 40px tall, laid out as a grid of 56px (time) and 1fr, with 12px padding and a 1px bottom border.
  - **Time:** Geist Mono (`font-mono`) `text-xs` subtle. Clicking it on a manual entry edits it.
  - **Done entry:** a `IconCircleCheck` 14px white icon, the note title in `text-sm`, and the note's color tag (a chip with the swatch dot and the color name in `text-2xs`). Clicking opens the note panel.
  - **Manual entry:** text in `text-sm` with inline markdown (bold, italic, code, links; links open in the browser). Hovering reveals edit and delete icon buttons on the right. Edit turns the text into an input (Enter or leaving it saves, Esc cancels); the time field reads typed times like the due time (9, 930, 9:30). Delete shows "Deleted · Undo".
  - A done entry whose note is deleted shows the title as it was when done, with no color tag, and doesn't open.
- **Carried over:** a 24px top margin, the label "Carried over from yesterday" in `text-2xs` uppercase-free muted, then compact rows with the color dot, title and an "Open" ghost button.
- **Composer:** pinned to the bottom of the column, 12px from the bottom of the view. On another day, Enter adds the entry at the current time of day on that day.
  - An input 40px tall with radius 10, `--card` background, 1px border and the placeholder "What did you just do?"
  - Inside the input on the right: a `kbd ↵` hint.
  - On submit, the new row slides in at the right time position and gets the highlight from DESIGN_SYSTEM §6. Any entry new since the day last loaded (say, a note marked done on the canvas) gets the same one-time highlight.
- **Keys:** Ctrl+[ and Ctrl+] step back and forward a day while the log is showing.
- testids: `log-page`, `log-date` (with `data-day`), `log-today-tag`, `log-go-today`, `log-prev`, `log-next`, `log-calendar`, `log-month-picker`, `log-strip-day` (with `data-day`, `data-selected`, `data-today`, `data-has-entries`), `log-summary`, `log-entry` (with `data-kind`), `log-entry-time`, `log-entry-text`, `log-entry-color`, `log-entry-open`, `log-entry-edit`, `log-entry-delete`, `log-carried-row`, `log-carried-open`, `log-composer`, `log-empty`.
- **Empty day:** the `IconNotebook` icon with "Nothing logged yet. Mark a note done or write what you just did."

---

## 7. Drawings

> **Being replaced.** Drawings move onto the canvas and the Drawings page goes away (PRODUCT §3.5). Phase 8 rewrites this section to the `DrawInPlace` and `List` mockups in `docs/DESIGN_REFRESH.md`. The grid below becomes the Drawings side of List.

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

Opened with Ctrl+K from anywhere (the note editor too; Ctrl+K again closes it) or the sidebar's search box (§2). Artboard: `CommandPalette`.

- A shadcn `Dialog` holding the `Command` (cmdk) list: 640px wide (at most the window less 32px), 13vh from the top, 16px radius, `--card` with a `--border` hairline and `--shadow-palette`. The overlay is `--overlay` with a 2px backdrop blur.
- **Opens** with a 200ms fade, a 98% scale and a 6px drop (ease-out); with reduce motion it just appears.
- **Input row:** 60px tall, 20px side padding, 1px bottom border. `IconSearch` 20px muted, the input at 17px with the placeholder "Search notes, or type > for commands" in `--subtle-foreground`, and an `Esc` kbd on the right.
- **List:** up to 460px (or 60vh) tall, scrolling, 8px padding. Groups **Notes**, then **Commands**, with headings in `text-2xs` 500 `--subtle-foreground` (12px side padding, 10px above, 6px below).
- **Rows:** 44px, 12px side padding, 10px radius, 12px gap, `text-base`. The selected row (keyboard or hover) gets `--muted`. The first result is selected after every keystroke.
  - **Note:** a 12px swatch (4px radius) in the note's bright hue, the title in 500 (muted "Untitled" when empty), the first line of the body in `text-xs` subtle, truncated, and on the right in `text-2xs` subtle: "Overdue", "Due Fri", "Done", or where it lives ("Canvas", or "List" for a note with no card).
  - **Command:** a 28px `--muted` tile (8px radius) with a 16px icon, the label, and its keys as `kbd`s on the right.
- **What it finds:** with no query, the three open notes edited last, then every command. A query matches note titles (any part, up to eight notes, most recently edited first, done notes included) and commands (every word must start a word of the label or its keywords). `>` lists commands only. *later: phase-10 adds bodies, drawings and log entries, grouped, with highlighted snippets.*
- **Commands:** New note (Ctrl+N), Go to canvas / list / daily log (Ctrl+1 / 2 / 3), Collapse sidebar or Expand sidebar (Ctrl+\, also found by "toggle"), Zoom to fit (Shift+1), Show done notes or Hide done notes, Make text bigger / smaller (Ctrl+Shift+= / -), Reset text size (Ctrl+Shift+0), Open settings (Ctrl+,).
  - New note makes a card in the middle of the canvas view, ready to type in (switching to the canvas first), or a list-only note when the List is showing.
  - Zoom to fit switches to the canvas first.
- **Enter on a note** opens it in the panel. If it has a card on show, the canvas (switching to it if need be) selects the card and glides to center it in the space the panel leaves.
- **Empty:** "No notes or commands match. Press Enter to create a note called “q”." (Enter does it, as New note does, with that title.) With `>`: "No commands match."
- **Footer:** 40px, 1px top border, `text-2xs` subtle hints: `↑↓ move`, `Enter open`, `Esc close`, and "Type > for commands only" on the right.
- **Focus:** after a result runs, focus stays where it put it (a new card's title). Esc gives focus back to what had it before.

---

## 9. Settings

- A centered column (max 640px) with sections separated by 32px. Each section title is `text-sm` 600, and each row is 48px tall with the label and description (`text-xs` muted) on the left and the control on the right.
- **Sections:**
  - **Vault:** the path in mono `text-xs` with a "Change…" button.
  - **Appearance:** Text size (`ToggleGroup`: Small | Default | Large | Larger, with the description "Ctrl+Shift+= and Ctrl+Shift+- change it from anywhere."). For now it's the only row; the settings redesign adds the sidebar and reduce motion rows.
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
- After Start, the canvas loads empty and shows the start screen (§4.1a).
- **Welcome board** ("Open the welcome board"): five notes centered on the view, slightly apart and in five colors, each teaching one thing. They're placed in one batch, so one Ctrl+Z takes them all away. The copy lives in `welcomeBoard.ts` and must match what the app really does.
  - Sand, "Drag me around": "Notes go anywhere. Hold Space and drag to pan, Ctrl + scroll to zoom."
  - Sky, "Open a note": "Select it and press Enter for the full editor: headings, lists and checklists."
  - Rose, "Give it a due date": "Right-click → Due date… It shows up in List, with a reminder if you pick a time."
  - Sage, "Tick it off": "Ctrl + Enter marks it done. It lands in today's log."
  - Lilac, "Find anything": "Ctrl + K searches your notes and runs every command."

---

## 11. Dialogs and toasts

- **Confirm dialog** (AlertDialog): 400px wide, title `text-base` 600, description `text-sm` muted, with Cancel (ghost) and confirm buttons. The confirm button is destructive for deletes: `--destructive` text on `--muted`, and solid only on hover.
  - It's used only for: changing the vault and deleting a drawing.
  - Note deletes don't confirm, because the "Deleted · Undo" toast covers them.
- **Toasts:** "Marked done · Undo", "Deleted · Undo", "Duplicated", "Saved backup", and "Couldn't save. Retrying…" (shown with `--destructive` icon only).
