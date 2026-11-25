import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron'
import { IPC, MAIN_EVENTS, type SprawlAPI } from '@shared/api'

/**
 * The typed bridge (ARCHITECTURE §5). The renderer only ever sees `window.sprawl`; every
 * input is validated again in main, so nothing here is trusted.
 */
const api: SprawlAPI = {
  app: {
    getVaultInfo: () => ipcRenderer.invoke(IPC.app.getVaultInfo),
    pickVaultFolder: () => ipcRenderer.invoke(IPC.app.pickVaultFolder),
    openVault: (path) => ipcRenderer.invoke(IPC.app.openVault, path),
    openExternal: (url) => ipcRenderer.invoke(IPC.app.openExternal, url),
    readyToClose: () => ipcRenderer.invoke(IPC.app.readyToClose),
  },
  settings: {
    getAll: () => ipcRenderer.invoke(IPC.settings.getAll),
    get: (key) => ipcRenderer.invoke(IPC.settings.get, key),
    set: (key, value) => ipcRenderer.invoke(IPC.settings.set, { key, value }),
  },
  notes: {
    get: (id) => ipcRenderer.invoke(IPC.notes.get, id),
    create: (note) => ipcRenderer.invoke(IPC.notes.create, note),
    update: (id, patch) => ipcRenderer.invoke(IPC.notes.update, { id, patch }),
    duplicate: (id) => ipcRenderer.invoke(IPC.notes.duplicate, id),
    setDone: (id, done) => ipcRenderer.invoke(IPC.notes.setDone, { id, done }),
    remove: (id) => ipcRenderer.invoke(IPC.notes.remove, id),
    restore: (id) => ipcRenderer.invoke(IPC.notes.restore, id),
    links: {
      add: (noteId, url, label) => ipcRenderer.invoke(IPC.notes.links.add, { noteId, url, label }),
      update: (id, patch) => ipcRenderer.invoke(IPC.notes.links.update, { id, patch }),
      remove: (id) => ipcRenderer.invoke(IPC.notes.links.remove, id),
      reorder: (noteId, ids) => ipcRenderer.invoke(IPC.notes.links.reorder, { noteId, ids }),
    },
  },
  canvas: {
    load: () => ipcRenderer.invoke(IPC.canvas.load),
    apply: (ops) => ipcRenderer.invoke(IPC.canvas.apply, ops),
  },
  log: {
    day: (day) => ipcRenderer.invoke(IPC.log.day, day),
    addManual: (day, text, at) => ipcRenderer.invoke(IPC.log.addManual, { day, text, at }),
    update: (id, patch) => ipcRenderer.invoke(IPC.log.update, { id, patch }),
    remove: (id) => ipcRenderer.invoke(IPC.log.remove, id),
    daysWithEntries: (month) => ipcRenderer.invoke(IPC.log.daysWithEntries, month),
    carriedOver: (day) => ipcRenderer.invoke(IPC.log.carriedOver, day),
  },
  on: (event, listener) => {
    if (!MAIN_EVENTS.includes(event)) throw new Error(`Unknown event: ${event}`)
    const wrapped = (_e: IpcRendererEvent, payload: unknown): void =>
      listener(payload as Parameters<typeof listener>[0])
    ipcRenderer.on(event, wrapped)
    return () => {
      ipcRenderer.removeListener(event, wrapped)
    }
  },
}

contextBridge.exposeInMainWorld('sprawl', api)
