import { BrowserWindow, dialog, ipcMain, shell, type IpcMainInvokeEvent } from 'electron'
import { z } from 'zod'
import { IPC, type MainEventName, type MainEvents, type NotificationStatus } from '@shared/api'
import {
  canvasApplyInput,
  captureHeightInput,
  captureSubmitInput,
  linksAddInput,
  linksReorderInput,
  linksUpdateInput,
  logAddManualInput,
  logDayInput,
  logMonthInput,
  logUpdateInput,
  noteIdInput,
  notesCreateInput,
  notesListInput,
  notesPlaceInput,
  notesSetDoneInput,
  notesUpdateInput,
  openExternalInput,
  openVaultInput,
  pauseNotificationsInput,
  setShortcutInput,
  settingsGetInput,
  settingsSetInput,
  shortcutPausedInput,
  type SettingKey,
  type Settings,
} from '@shared/schemas'
import type { CaptureService } from '../services/capture'
import type { CanvasService } from '../services/canvas'
import type { LogService } from '../services/log'
import type { NotesService } from '../services/notes'
import type { SettingsService } from '../services/settings'
import type { VaultService } from '../services/vault'
import { parseInput } from './validate'

/** Only our own windows may call main (not, say, a frame that navigated somewhere else). */
function assertTrustedSender(event: IpcMainInvokeEvent): void {
  if (!BrowserWindow.fromWebContents(event.sender)) throw new Error('Untrusted IPC sender')
}

function handle<S extends z.ZodType>(
  channel: string,
  schema: S,
  fn: (input: z.infer<S>, event: IpcMainInvokeEvent) => unknown,
): void {
  ipcMain.handle(channel, (event, input: unknown) => {
    assertTrustedSender(event)
    return fn(parseInput(channel, schema, input), event)
  })
}

const noInput = z.undefined()

/** Sends a main event to every window. */
export function broadcast<E extends MainEventName>(event: E, payload: MainEvents[E]): void {
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) win.webContents.send(event, payload)
  }
}

export interface IpcDeps {
  vault: VaultService
  settings: SettingsService
  notes: NotesService
  canvas: CanvasService
  log: LogService
  /** The renderer of `sender`'s window has saved everything (the close handshake). */
  onReadyToClose: (sender: Electron.WebContents) => void
  capture: CaptureService
  /** The quick-capture window's contents (its calls are only taken from there). */
  isCaptureWindow: (sender: Electron.WebContents) => boolean
  hideCapture: () => void
  setCaptureHeight: (px: number) => void
  system: SystemControl
  /** The world point at the middle of the last canvas view (where placed notes go). */
  viewCenter: () => { x: number; y: number }
  /** After every write to notes or the canvas: re-check reminders, refresh the tray. */
  afterWrite: () => void
}

/** Notifications, the capture shortcut and pausing (ARCHITECTURE §5, `system`). */
export interface SystemControl {
  testNotification(): void
  notificationStatus(): Promise<NotificationStatus>
  openNotificationSettings(): Promise<void>
  setShortcut(accel: string): { ok: boolean; conflict?: boolean }
  pauseShortcut(paused: boolean): void
  pauseNotifications(minutes: number): void
}

/** Registers one handler per API method (ARCHITECTURE §5). */
export function registerIpc({
  vault,
  settings,
  notes,
  canvas,
  log,
  onReadyToClose,
  capture,
  isCaptureWindow,
  hideCapture,
  setCaptureHeight,
  system,
  viewCenter,
  afterWrite,
}: IpcDeps): void {
  /** A handler that writes: reminders and the tray follow once it's done. */
  const write = <S extends z.ZodType>(
    channel: string,
    schema: S,
    fn: (input: z.infer<S>, event: IpcMainInvokeEvent) => unknown,
  ): void =>
    handle(channel, schema, (input, event) => {
      const result = fn(input, event)
      afterWrite()
      return result
    })

  /** A handler only the quick-capture window may call. */
  const captureOnly = <S extends z.ZodType>(
    channel: string,
    schema: S,
    fn: (input: z.infer<S>) => unknown,
  ): void =>
    handle(channel, schema, (input, event) => {
      if (!isCaptureWindow(event.sender)) throw new Error(`${channel} is for the capture window`)
      return fn(input)
    })

  // app ----------------------------------------------------------------------------------
  handle(IPC.app.getVaultInfo, noInput, () => vault.info())

  handle(IPC.app.pickVaultFolder, noInput, async (_input, event) => {
    const parent = BrowserWindow.fromWebContents(event.sender)
    const options: Electron.OpenDialogOptions = {
      title: 'Choose a folder for your Sprawl vault',
      defaultPath: vault.info().path ?? vault.defaultPath,
      properties: ['openDirectory', 'createDirectory'],
    }
    const result = parent
      ? await dialog.showOpenDialog(parent, options)
      : await dialog.showOpenDialog(options)
    return result.canceled ? null : (result.filePaths[0] ?? null)
  })

  handle(IPC.app.openVault, openVaultInput, (path) => {
    const info = vault.open(path)
    broadcast('vault:changed', info)
    return info
  })

  handle(IPC.app.openExternal, openExternalInput, async (url) => {
    await shell.openExternal(url)
  })

  handle(IPC.app.readyToClose, noInput, (_input, event) => onReadyToClose(event.sender))

  // settings -----------------------------------------------------------------------------
  handle(IPC.settings.getAll, noInput, () => settings.getAll())
  handle(IPC.settings.get, settingsGetInput, (key) => settings.get(key))
  handle(IPC.settings.set, settingsSetInput, ({ key, value }) =>
    settings.set(key as SettingKey, value as Settings[SettingKey]),
  )

  // notes --------------------------------------------------------------------------------
  handle(IPC.notes.list, notesListInput, (query) => notes.list(query))
  handle(IPC.notes.overdueCount, noInput, () => notes.overdueCount())
  write(IPC.notes.placeOnCanvas, notesPlaceInput, ({ id, at }) =>
    canvas.placeNote(id, at ?? viewCenter()),
  )
  handle(IPC.notes.get, noteIdInput, (id) => notes.get(id))
  write(IPC.notes.create, notesCreateInput, (note) => notes.create(note))
  write(IPC.notes.update, notesUpdateInput, ({ id, patch }) => notes.update(id, patch))
  write(IPC.notes.duplicate, noteIdInput, (id) => notes.duplicate(id))
  write(IPC.notes.setDone, notesSetDoneInput, ({ id, done }) => notes.setDone(id, done))
  write(IPC.notes.remove, noteIdInput, (id) => notes.remove(id))
  write(IPC.notes.restore, noteIdInput, (id) => notes.restore(id))
  handle(IPC.notes.links.add, linksAddInput, ({ noteId, url, label }) =>
    notes.addLink(noteId, url, label),
  )
  handle(IPC.notes.links.update, linksUpdateInput, ({ id, patch }) => notes.updateLink(id, patch))
  handle(IPC.notes.links.remove, noteIdInput, (id) => notes.removeLink(id))
  handle(IPC.notes.links.reorder, linksReorderInput, ({ noteId, ids }) =>
    notes.reorderLinks(noteId, ids),
  )

  // canvas -------------------------------------------------------------------------------
  handle(IPC.canvas.load, noInput, () => canvas.load())
  write(IPC.canvas.apply, canvasApplyInput, (ops) => canvas.apply(ops))

  // daily log ----------------------------------------------------------------------------
  handle(IPC.log.day, logDayInput, (day) => log.day(day))
  handle(IPC.log.addManual, logAddManualInput, ({ day, text, at }) =>
    log.addManual(day, text.trim(), at),
  )
  handle(IPC.log.update, logUpdateInput, ({ id, patch }) =>
    log.update(id, patch.text === undefined ? patch : { ...patch, text: patch.text.trim() }),
  )
  handle(IPC.log.remove, noteIdInput, (id) => log.remove(id))
  handle(IPC.log.daysWithEntries, logMonthInput, (month) => log.daysWithEntries(month))
  handle(IPC.log.carriedOver, logDayInput, (day) => log.carriedOver(day))

  // quick capture ------------------------------------------------------------------------
  captureOnly(IPC.capture.submit, captureSubmitInput, ({ mode, text }) => {
    const result = capture.submit(mode, text)
    afterWrite()
    broadcast('data:changed', undefined)
    return result
  })
  captureOnly(IPC.capture.hide, noInput, () => hideCapture())
  captureOnly(IPC.capture.setHeight, captureHeightInput, (px) => setCaptureHeight(px))

  // system -------------------------------------------------------------------------------
  handle(IPC.system.testNotification, noInput, () => system.testNotification())
  handle(IPC.system.notificationStatus, noInput, () => system.notificationStatus())
  handle(IPC.system.openNotificationSettings, noInput, () => system.openNotificationSettings())
  handle(IPC.system.setShortcut, setShortcutInput, (accel) => system.setShortcut(accel))
  handle(IPC.system.pauseShortcut, shortcutPausedInput, (paused) => system.pauseShortcut(paused))
  handle(IPC.system.pauseNotifications, pauseNotificationsInput, (minutes) =>
    system.pauseNotifications(minutes),
  )
}
