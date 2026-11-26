import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/globals.css'
import { listenToMain } from './lib/mainEvents'
import { App } from './App'

// Before the first render: a deep link can arrive as soon as the page has loaded.
listenToMain()

const root = document.getElementById('root')
if (!root) throw new Error('#root is missing from index.html')

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
