import { resolve } from 'node:path'
import { defineConfig } from 'electron-vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import type { Plugin } from 'vite'

const sharedAlias = { '@shared': resolve(__dirname, 'src/shared') }

/**
 * Injects the Content-Security-Policy <meta>. The production policy is strict;
 * dev additionally allows Vite's inline React-refresh preamble and its HMR websocket.
 */
function cspPlugin(): Plugin {
  const base = [
    "default-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: sprawl-file:",
    "font-src 'self' data:",
    "object-src 'none'",
    "base-uri 'none'",
    "form-action 'none'",
  ]
  return {
    name: 'sprawl-csp',
    transformIndexHtml(html, ctx) {
      const dev = Boolean(ctx.server)
      const policy = [
        ...base,
        dev ? "script-src 'self' 'unsafe-inline'" : "script-src 'self'",
        dev ? "connect-src 'self' ws://localhost:* http://localhost:*" : "connect-src 'self'",
      ].join('; ')
      return html.replace(
        '<!-- csp -->',
        `<meta http-equiv="Content-Security-Policy" content="${policy}" />`,
      )
    },
  }
}

export default defineConfig({
  main: {
    resolve: { alias: sharedAlias },
  },
  preload: {
    resolve: { alias: sharedAlias },
  },
  renderer: {
    resolve: {
      alias: { ...sharedAlias, '@': resolve(__dirname, 'src/renderer') },
    },
    plugins: [react(), tailwindcss(), cspPlugin()],
    // electron-vite doesn't minify by default; a smaller renderer bundle parses faster on cold start.
    build: { minify: true },
  },
})
