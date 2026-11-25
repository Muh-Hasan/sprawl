# Sprawl — Product Spec

> One local place for sticky notes, to-dos, Notion-style notes, Excalidraw sketches and a daily log.
> Desktop app (Electron), dark only, local-first, open source (MIT). **v1 targets and is tested on Windows.** The code stays cross-platform, but macOS and Linux builds are unofficial until someone tests them.

Visual design (colors, type, components, logo) lives in `DESIGN_SYSTEM.md`, and exact screen layouts in `UI_SPEC.md`.

---

## 1. The idea

Most people juggle three or four apps: a to-do app, a notes app, a whiteboard and maybe a journal. Sprawl puts them on **one open canvas**:

- **Sticky notes** you drop anywhere on the canvas. A note can be one line or a full page.
- **To-dos** are just notes or checklist items. A note can be marked done, and a due date is optional; most notes won't have one.
- **Notes** open in a Notion-style block editor with a `/` menu, headings, lists, checklists, images, code and quotes.
- **Drawings** are Excalidraw scenes that sit on the canvas as preview cards and open into a full editor.
- **Images and files** can be dropped onto the canvas or into a note.
- The **daily log** is a separate page per day. Finished notes land there automatically with a timestamp, and you can type quick entries by hand.
- A **list view** shows every note in one sortable, filterable list, so you can answer "what's due?" or "what's still open?" without hunting across the canvas.
- **Quick capture** is a global shortcut that pops up a tiny window from anywhere in Windows to save a note or log line in two seconds.
- **Reminders** are Windows notifications for notes with a due date and time, plus an optional morning summary.

### Principles
1. **Small and fast.** It opens instantly and nothing feels heavy. Basic versions of each tool, not full clones.
2. **No forced structure.** There are no columns, statuses or required fields. The user decides where things go.
3. **Local and yours.** Data lives in one folder on disk, and everything is exportable to markdown and `.excalidraw`.
4. **Keyboard-friendly, mouse-first.** Everything works with the mouse, and the common actions have shortcuts.

### Not in v1 (do not build)
Sync or accounts, collaboration, mobile, plugins, databases or tables à la Notion, recurring tasks, snoozing from the notification itself, **groups/frames on the canvas (planned for v0.2)**, tags beyond colors, multiple canvases, light theme, AI features, web clipper.

---

## 2. Core objects

| Object | What it is |
|---|---|
| **Note** | A title plus a block-editor body. It has a color, optional links, an optional due date (with an optional time and reminder) and a done state. It appears on the canvas as a sticky card, and every note appears in the list view. |
| **Drawing** | An Excalidraw scene with a title. It appears on the canvas as a card with a thumbnail. |
| **Image** | An image file dropped on the canvas, shown as a card with the image. |
| **Link card** | A URL dropped or pasted on the canvas, shown as a compact card with its domain and an editable title. |
| **Log entry** | One line in a day's log, either automatic (from marking a note done) or written by hand. |
| **Attachment** | A file stored in the vault's `attachments/` folder, used by images, note embeds and file blocks. |

Everything placed on the canvas is a **canvas item** with a position, a size and a z-order. The item points to a note, drawing, attachment or link.

---

## 3. Views

The left rail has five entries plus settings: **Canvas**, **List**, **Daily log**, **Drawings**, **Search** (which also opens with Ctrl+K), and **Settings** at the bottom.

### 3.1 Canvas (home)
An infinite, pannable and zoomable board with a dotted background.

**Navigation**
- Pan with a space+drag, a middle-mouse drag, a two-finger trackpad scroll, or by dragging an empty spot in Hand mode.
- Zoom with Ctrl+scroll or a trackpad pinch, within 10%–400%. Zoom centers on the cursor.
- Zoom controls sit at the bottom right: −, the percentage (click to reset to 100%) and +. "Zoom to fit" is Shift+1.
- The view position and zoom are remembered between launches.

**Toolbar** (floating, top center): Select (V), Hand (H), Note (N), Link (L), Drawing (D), Image (I, opens a file picker).

**Creating things**
- Double-click an empty area to create a note there and focus its title.
- The Note tool creates a note on click (or, with a click-and-drag, a note of the dragged size), and the tool then reverts to Select.
- A new note gets its title focused. If it's off screen or the view is zoomed out, the view glides to it at 100%.
- Pasting text on the canvas creates a note with that text. Pasting a URL creates a link card. Pasting an image creates an image card.
- Dropping files from the OS: images become image cards, and other files become a note with a file block.
- The Drawing tool creates an empty drawing card and opens the drawing editor.

**Selecting and moving**
- Click to select. Shift+click adds to the selection. Dragging on empty space draws a marquee selection.
- Drag selected items to move them. Moves snap to an 8px grid unless Alt is held.
- Resize from a corner handle. Notes and cards have minimum and maximum sizes, and images keep their aspect ratio.
- Ctrl+A selects all. Esc clears the selection.
- Delete/Backspace removes the selection, with undo. Deleting a note card deletes the note.
- Ctrl+D duplicates. Duplicating a note card creates a **new note** (a copy of the title, body, color and links, but not the due date or done state) with its own card, offset by 24px. A note has **at most one card** on the canvas.
- Ctrl+] brings the selection to the front, and Ctrl+[ sends it to the back.
- Arrow keys nudge by 1px, and Shift+arrow nudges by 8px.
- Selected notes get a floating toolbar above them (FigJam-style): the six colors, Duplicate, Bring to front, Send to back and Delete (UI_SPEC §4.9).
- Right-click opens a context menu: Open, Mark done, Color ▸, Due date…, Duplicate, Bring to front, Send to back, Delete (full layout in UI_SPEC §4.10).
- **Undo/redo** (Ctrl+Z and Ctrl+Shift+Z) covers every canvas operation: create, move, resize, delete, color and done.

**Note card (sticky)**
- It shows the title, the first ~3 lines of body text as plain text, and chips for link count, attachment count, due date, and checklist progress such as "3/5".
- Its color comes from the note's color.
- **Writing in the card:** double-clicking the card's body puts the cursor in the card, with the same editor as the panel: markdown shortcuts (`# `, `- `, `[] `, `> `) and the `/` menu. Double-clicking the title text edits the title; Enter after the title moves on to the body, so a new sticky is title, Enter, write. Esc or clicking away ends it.
- **Enter** (or Open in the menu) opens the note panel, for links, the due date, the color and full page. A note is edited in one place at a time: writing in its card closes the panel, and opening the panel ends writing in the card.
- A done note is hidden from the canvas by default. The "Show done" toggle in the canvas top bar (also in Settings; it's the same setting) shows done notes again, faded and struck through.
- Due chip states: none (most notes), later (more than 2 days away), soon (2 days or less), and overdue.

### 3.2 Note panel
Opening a note (Enter on its selected card or Open in its menu, or clicking it in the list, log or search) shows a right-side panel (default 420px, resizable from 320 to 720px). A single click on a card only selects it. Ctrl+Shift+Enter expands the panel to a full-width page. Esc steps back one level: from full page to the side panel, then from the side panel to closed.

- **Title** is a large single-line input.
- **Body** is a BlockNote editor. Supported blocks: paragraph, heading 1–3, bullet list, numbered list, checklist, quote, code block, divider, image, file, and callout (optional, if cheap).
  - The `/` menu inserts any block, markdown shortcuts work (`# `, `- `, `[] `, `> `, ``` ``` ```), and blocks can be dragged by their handle.
  - Pasting or dropping an image saves it to attachments and inserts an image block.
  - Typing `[[` opens a picker of notes and drawings and inserts an internal link. Clicking the link opens that item.
- **Meta row** below the body:
  - **Links:** a list of URLs, each with a favicon placeholder, the domain and an editable label. "Add link" accepts a pasted URL. Clicking a link opens it in the system browser.
  - **Due:** "Add due date" opens a small date picker with quick picks (Today, Tomorrow, Next week, meaning next Monday) and a clear button.
    - **Time (optional):** "Add time" sets a time of day. Without a time, the note is due "sometime that day".
    - **Remind me:** None (default), At due time, 15 min before, 1 hour before, Morning of (09:00), 1 day before (09:00). The first three need a time. One reminder per note. If the time is removed while one of those three is set, the reminder resets to None.
  - **Color:** six swatches.
  - **Backlinks:** "Linked from" lists the notes that reference this one.
- **Footer:** a "Mark done" button (Ctrl+Enter). A done note shows "Done · 18:30 · Undo" instead.
- Changes autosave after a 500ms pause, with a quiet "Saved" indicator.

### 3.3 List view
All notes in one dense list, for when the canvas is too spread out to scan.

- **Rows** show a done checkbox, the color dot, the title, the first line of the body (muted), and chips for checklist progress, due date and links. On the far right is the "Edited 2h ago" time.
- **Filters** (segmented control at the top): **Open** (default), **Due** (has a due date, sorted soonest first, overdue at the top), **Done**, **All**. There's also a color filter (swatch dots, multi-select) and a text filter box that filters by title as you type.
- **Sort** (Open and All): Recently edited (default), Created, Title A–Z, Due date.
- **Due filter grouping:** Overdue · Today · Tomorrow · This week · Later, each with a small heading.
- **Actions:**
  - Clicking the checkbox marks the note done (creating a log entry, as everywhere else).
  - Clicking a row opens the note panel.
  - "Show on canvas" (row hover button) switches to the canvas and flies to the card.
  - Notes that aren't on the canvas show a small "Not on canvas" tag, and "Place on canvas" puts them at the view center.
  - ↑↓ moves through rows, Enter opens, Space toggles done, and Delete deletes (with an Undo toast).
- **New note** button at the top. Notes created here aren't placed on the canvas until you choose "Place on canvas". This keeps the canvas tidy for people who prefer the list.

### 3.4 Daily log
A separate page per calendar day (using the local timezone).

- The **header** has the date with ← and → arrows (Ctrl+[ and ] when this view is focused), and a "Today" button.
- The **week strip** shows the last 7 days, and days with entries get a dot. Clicking the month name opens a month calendar where days with entries are marked.
- **Entries** are listed by time:
  - Auto entries show "✓ {note title}" with the note's color tag. Clicking one opens the note.
  - Manual entries are free text (markdown inline only) and can be edited or deleted on hover.
- **Composer** at the bottom: "What did you just do?" Enter adds an entry at the current time, and the time can be edited after.
- **Carried over** is a small section listing notes that were *edited* yesterday but not done. It's informational only, with a one-click "Open".
- A **summary line** shows "{n} done · {m} logged".
- Marking a note done creates an auto entry, and undoing done removes it.
- Notes are never created from the log in v1.

### 3.5 Drawings
- The **list view** is a grid of drawing cards (thumbnail, title, last edited), plus a "New drawing" button.
- The **editor** is full-screen in the main area, with a header containing back, an editable title and a "Saved" indicator, and the Excalidraw component below it.
  - Excalidraw runs in dark theme. Its own library and export menu are fine to keep.
  - The scene autosaves after a 1s pause. A thumbnail (PNG, roughly 480px wide) is regenerated on save and used by the canvas card and the list.
  - Images pasted into Excalidraw are stored inside the scene's `files` (Excalidraw's native way). v1 doesn't need to move them to attachments.
- A drawing can be on the canvas (as a card) or not. "Place on canvas" in a drawing's menu adds a card at the center of the view.

### 3.6 Search (Ctrl+K)
- A command palette overlay. Typing searches note titles and bodies, the labels and URLs of links attached to notes, drawing titles and text, and manual log entries. Link cards on the canvas aren't searched in v1.
- Results are grouped (Notes, Drawings, Log), with a highlighted snippet.
- ↑↓ moves through results. Enter opens the result: a note opens its panel and **pans the canvas to its card** if it has one; a log entry opens that day.
- Commands are also listed when the query starts with `>`: New note, New drawing, Go to today's log, Zoom to fit, Export vault, Toggle show done.

### 3.7 Quick capture
A small always-on-top window for getting things out of your head fast, from any app.

- **Global shortcut:** Ctrl+Shift+Space by default, and it can be changed in Settings. It works whenever Sprawl is running, including in the background (see §3.8).
- **The window** is 520×auto, centered near the top of the screen, frameless, with rounded corners. It holds one multi-line text box and a mode switch:
  - **Note** (default): the first line becomes the title and the rest becomes the body. The note is placed on the canvas near the center of the last view, offset so new captures don't stack exactly on top of each other.
  - **Log:** adds a manual entry to today's log at the current time.
  - Tab switches the mode.
- Typing `!today`, `!tomorrow`, `!fri` or `!12dec` anywhere in a note capture sets the due date (and `!fri 15:00` also sets the time). The token is removed from the text.
  - A weekday always means the next one, 1–7 days ahead and never today (use `!today` for today). So `!fri` typed on a Friday means next Friday.
  - A date without a year means this year, or next year if that date has already passed.
- **Enter** saves and closes, **Shift+Enter** adds a new line, and **Esc** closes without saving (unless there's text, in which case Esc first clears it).
- After saving, a tiny "Saved to canvas" or "Logged" flash shows for 600ms before the window hides.
- The main window doesn't come to the front.

### 3.8 Reminders and notifications
Native Windows notifications (toasts), and only for things the user asked for.

- **Due reminders:** a note with a "Remind me" setting fires one notification at its reminder time.
  - Title: the note title. Body: "Due today at 15:00" (or "Due today", or "Due tomorrow"), plus the first checklist item that isn't done, if there is one.
  - Clicking the notification opens Sprawl with that note's panel open.
- **Morning summary** (optional, off by default): one notification at a chosen time (default 09:00), such as "3 due today · 1 overdue". Clicking it opens the List view with the Due filter. It isn't sent if nothing is due or overdue.
- **Overdue nudge:** a note that becomes overdue while still open gets **one** notification (only if it had a reminder set), never repeated.
- **Running in the background:** reminders and quick capture only work while Sprawl is running.
  - "Keep Sprawl running in the background" (on by default) means closing the window hides it to the **system tray** instead of quitting.
  - The tray icon menu has: Open Sprawl · Quick capture · Pause notifications for 1 hour · Quit.
  - "Start Sprawl when Windows starts" (off by default) launches it hidden in the tray.
- **Missed reminders:** if the app wasn't running at reminder time, the next launch shows one summary notification ("2 reminders while you were away") instead of a burst of separate ones, and the overdue notes are marked in the List view.
- **Do not disturb:** Windows Focus Assist is respected automatically by the OS. "Pause notifications for 1 hour" is the app's own switch.
- **Marking done** or clearing the due date cancels any pending reminder for that note.

### 3.9 Settings
- **Vault folder:** shows the path and a "Change…" button (moves or reopens). It defaults to `Documents\Sprawl`.
- **Export:** "Export everything as markdown…" writes a folder of `.md` notes, `.excalidraw` drawings, `attachments/` and `log/YYYY-MM-DD.md`.
- **Backup:** "Back up now" makes a zipped copy of the vault, and there's an option for an automatic daily backup (keeping the last 7).
- **Canvas:** snap to grid on/off, show done on/off.
- Settings that belong to this PC rather than to the data (quick capture shortcut and default mode, background and start-at-login, window position) are kept outside the vault, so switching vaults doesn't change them.
- **Notifications:** due reminders on/off, morning summary on/off plus its time, and a "Send a test notification" button.
- **Quick capture:** the shortcut (click to record a new one; conflicts are shown) and the default mode (Note or Log).
- **System:** keep running in the background (tray), start when Windows starts.
- **About:** version, license and repo link.

---

## 4. Keyboard shortcuts (summary)

| Action | Shortcut |
|---|---|
| Search / command palette | Ctrl+K |
| New note at view center | Ctrl+N |
| New drawing | Ctrl+Shift+D |
| Go to Canvas / List / Log / Drawings | Ctrl+1 / 2 / 3 / 4 |
| Quick capture (global, works from any app) | Ctrl+Shift+Space (configurable) |
| Tools: Select, Hand, Note, Link, Drawing, Image | V, H, N, L, D, I |
| Zoom in / out / reset / fit | Ctrl+= / Ctrl+- / Ctrl+0 / Shift+1 |
| Undo / redo | Ctrl+Z / Ctrl+Shift+Z |
| Open selected note | Enter |
| Mark done (in note) | Ctrl+Enter |
| Expand note to full page | Ctrl+Shift+Enter |
| Close panel / clear selection | Esc |
| Duplicate | Ctrl+D |
| Bring to front / send to back | Ctrl+] / Ctrl+[ (on the canvas) |
| Previous / next day | Ctrl+[ / Ctrl+] (in the daily log) |
| Delete | Delete / Backspace |

Canvas single-key tools only fire when no text input is focused. Shortcuts are matched on the physical key (`KeyboardEvent.code`), so Shift+1 works even though it types `!`.

---

## 5. Empty and edge states
- **First launch:** pick a vault folder (with the default prefilled). Then the canvas shows a welcome note: "Double-click anywhere to add a note. Press Ctrl+K to search." The user can delete it.
- **Empty log day:** "Nothing logged yet. Mark a note done or write what you just did."
- **Empty drawings:** "Sketch something" with a New drawing button.
- **No search results:** "No matches for “{q}”."
- **Empty list (Open filter):** "All clear. Nothing open right now." **Empty Due filter:** "Nothing due. Add a due date to a note to see it here."
- **Notifications blocked by Windows:** the Settings notification section shows "Windows is blocking Sprawl's notifications" with an "Open Windows settings" button (`ms-settings:notifications`).
- **A missing attachment file** shows a placeholder card ("File missing") with "Locate…" and "Remove" options.
- **Database locked or corrupt:** show an error screen with "Open backup folder" and "Choose another vault".

## 6. Definition of done (v1)
- All of section 3 works with the mouse alone, and the shortcuts in section 4 work.
- 1,000 notes on the canvas pan and zoom at 60fps on a mid-range laptop. Cards outside the viewport aren't rendered.
- Cold start is under 1.5s, and search returns in under 50ms on 5,000 notes.
- Quitting at any moment loses at most the last 1s of typing.
- Export produces readable markdown that round-trips the note text, checklists, images and links.
- A reminder fires within 60 seconds of its time while the app is running (window open or in the tray).
- Quick capture opens in under 200ms after the shortcut and never steals the main window's focus.
- The packaged installer installs, launches, survives a reboot (when start-at-login is on) and uninstalls cleanly on Windows 10 and 11.
