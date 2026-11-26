import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/globals.css'
import { startClock } from './stores/clockStore'
import { CaptureBox } from './views/capture/CaptureBox'
import { listenForShow } from './views/capture/showStore'

/**
 * The quick-capture window's entry (ARCHITECTURE §2, UI_SPEC §5c). It shares the preload, API
 * and styles with the main window but loads only the capture box.
 */
listenForShow()
startClock()

const root = document.getElementById('root')
if (!root) throw new Error('#root is missing from capture.html')

createRoot(root).render(
  <StrictMode>
    <CaptureBox />
  </StrictMode>,
)
