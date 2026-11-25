import { BrowserWindow, dialog, ipcMain, shell, type IpcMainInvokeEvent } from 'electron'
import { z } from 'zod'
import { IPC, type MainEventName, type MainEvents } from '@shared/api'
import {
  canvasApplyInput,
  linksAddInput,
  linksReorderInput,
  linksUpdateInput,
  logAddManualInput,
  logDayInput,
  logMonthInput,
  logUpdateInput,
  noteIdInput,
  notesCreateInput,
  notesSetDoneInput,
  notesUpdateInput,
  openExternalInput,
  openVaultInput,
  settingsGetInput,
  settingsSetInput,
  type SettingKey,
  type Settings,
} from '@shared/schemas'
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
}

/** Registers one handler per API method (ARCHITECTURE §5). */
export function registerIpc({
  vault,
  settings,
  notes,
  canvas,
  log,
  onReadyToClose,
}: IpcDeps): void {
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
  handle(IPC.notes.get, noteIdInput, (id) => notes.get(id))
  handle(IPC.notes.create, notesCreateInput, (note) => notes.create(note))
  handle(IPC.notes.update, notesUpdateInput, ({ id, patch }) => notes.update(id, patch))
  handle(IPC.notes.duplicate, noteIdInput, (id) => notes.duplicate(id))
  handle(IPC.notes.setDone, notesSetDoneInput, ({ id, done }) => notes.setDone(id, done))
  handle(IPC.notes.remove, noteIdInput, (id) => notes.remove(id))
  handle(IPC.notes.restore, noteIdInput, (id) => notes.restore(id))
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
  handle(IPC.canvas.apply, canvasApplyInput, (ops) => canvas.apply(ops))

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
}
