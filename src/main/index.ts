import { app, BrowserWindow, Menu } from 'electron'
import { env } from './env'
import { createMainWindow } from './window'

// Must happen before `ready`: userData also keys the single-instance lock (phase 1).
if (env.userData) app.setPath('userData', env.userData)

// No application menu: Electron's default one would steal Ctrl+0 / Ctrl+= / Ctrl+- (page zoom),
// Ctrl+R (reload) and Ctrl+Shift+I (devtools). See ARCHITECTURE §2.
Menu.setApplicationMenu(null)

void app.whenReady().then(() => {
  createMainWindow()
})

app.on('window-all-closed', () => {
  app.quit()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createMainWindow()
})
