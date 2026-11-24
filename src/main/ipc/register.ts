import { BrowserWindow, dialog, ipcMain, shell, type IpcMainInvokeEvent } from 'electron'
import { z } from 'zod'
import { IPC, type MainEventName, type MainEvents } from '@shared/api'
import {
  openExternalInput,
  openVaultInput,
  settingsGetInput,
  settingsSetInput,
  type SettingKey,
  type Settings,
} from '@shared/schemas'
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
}

/** Registers one handler per API method (ARCHITECTURE §5). Phase 1: `app.*` and `settings.*`. */
export function registerIpc({ vault, settings }: IpcDeps): void {
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

  // settings -----------------------------------------------------------------------------
  handle(IPC.settings.getAll, noInput, () => settings.getAll())
  handle(IPC.settings.get, settingsGetInput, (key) => settings.get(key))
  handle(IPC.settings.set, settingsSetInput, ({ key, value }) =>
    settings.set(key as SettingKey, value as Settings[SettingKey]),
  )
}
