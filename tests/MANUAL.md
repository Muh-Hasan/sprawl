# Manual test checklist

Things automation can't cover (ARCHITECTURE §10.4). Windows only. Each phase that needs manual checks adds a section here. Tick the items on your own machine before the phase is merged, and run the whole list before each release.

<!-- Phase 12 adds the installer and high-DPI sections. -->

## Phase 6 — quick capture, notifications, tray

Run from `npm run dev` unless an item says otherwise. `npm run dev` registers the dev build as the `sprawl://` handler so toasts can be clicked (set `SPRAWL_NO_PROTOCOL=1` to skip that).

### Quick capture

- [ ] With Sprawl's window open but behind a browser, press **Ctrl+Shift+Space** in the browser: the capture window opens near the top of that monitor, focused, in under a blink.
- [ ] Same from **Explorer**, and from a **fullscreen** app (a fullscreen video or game): the window shows on top.
- [ ] Type `Pay rent !fri 10:00`: `!fri 10:00` gets a grey highlight and the chip reads "Due Fri · 10:00". Enter: "Saved to canvas" flashes, the window hides, and **focus goes back to the browser** (you can keep typing there). The Sprawl main window does **not** come forward.
- [ ] Esc on an empty capture, and clicking outside it, also hide it with focus back in the other app.
- [ ] Tab switches to Log; `Called the bank` + Enter: "Logged", and it's in today's log.
- [ ] With the main window minimized or in the tray, capture still works, and the note is on the canvas when you open Sprawl.
- [ ] Settings → Quick capture → Change: press **Ctrl+Alt+N**; it saves, and Ctrl+Alt+N now opens capture (Ctrl+Shift+Space no longer does). Then try a combo another app holds (for example one bound in PowerToys, or a second copy of a hotkey tool): "Already used by another app", and the old shortcut still works.
- [ ] While recording a new shortcut, pressing the current one doesn't open the capture window.

### Notifications

- [ ] Settings → **Send a test notification**: a real toast with the Sprawl icon and name.
- [ ] Give a note a due time 2 minutes ahead with Remind me "At due time": the toast arrives within a minute of the time, reading "Due today at HH:mm". **Click it with the window open**: Sprawl comes forward with the note in the panel.
- [ ] Same with the window **closed to the tray**: clicking the toast opens Sprawl at the note.
- [ ] Let a reminder go to **Action Center**, quit Sprawl from the tray, start it again, then click the old toast in Action Center: the right note opens.
- [ ] Windows Settings → System → Notifications → turn Sprawl off: Settings in Sprawl shows "Windows is blocking Sprawl's notifications" (refreshes when the window gets focus); "Open Windows settings" opens that page. Turn it back on: the warning goes.
- [ ] Turn on Do not disturb / Focus: a reminder is held by Windows, and Sprawl shows no error.
- [ ] Tray → **Pause notifications for 1 hour**: a reminder in that hour doesn't pop up; the menu now says "Resume notifications"; Resume (or the hour passing) brings the held reminder.
- [ ] Morning summary on, time set a minute or two ahead, with something due today: one quiet toast "Today in Sprawl · 1 due today"; clicking it opens the List view on the Due tab.

### Sleep and the tray

- [ ] Set a reminder 3 minutes ahead, **sleep** the PC, wake it after the time: the reminder shows within a minute of waking (or, if more than one was missed, one "While you were away" toast).
- [ ] Close the window with the X: Sprawl stays in the tray (tooltip "Sprawl", or "Sprawl · 2 overdue"), and a reminder still arrives. Clicking the tray icon opens the window. Tray → Quit Sprawl quits.
- [ ] Settings → System → turn off "Keep Sprawl running in the background", close the window: Sprawl quits (no tray icon left).
- [ ] Turn on "Start Sprawl when Windows starts", **reboot**: Sprawl is in the tray with no window shown, and quick capture works. (In dev the login item starts the last `npm run build`, so build first; turn the setting off again afterwards. The installed app is checked again in phase 12.)
