import { useState } from 'react'
import { ShortcutKbd } from '@/components/ShortcutKbd'

/**
 * The log composer (UI_SPEC §6), pinned to the bottom of the column: "What did you just do?"
 * Enter adds the line at the current time.
 */
export function Composer({ onSubmit }: { onSubmit: (text: string) => Promise<void> }) {
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  return (
    <form
      className="relative"
      onSubmit={(e) => {
        e.preventDefault()
        const line = text.trim()
        if (!line || busy) return
        setBusy(true)
        void onSubmit(line)
          .then(() => setText(''))
          .finally(() => setBusy(false))
      }}
    >
      <input
        data-testid="log-composer"
        aria-label="Add to the log"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="What did you just do?"
        maxLength={10_000}
        className="h-10 w-full rounded-[10px] border border-border bg-card pr-12 pl-3 text-sm outline-none placeholder:text-subtle-foreground focus:border-border-strong focus:ring-2 focus:ring-ring/30"
      />
      <ShortcutKbd
        className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2"
        aria-hidden
      >
        ↵
      </ShortcutKbd>
    </form>
  )
}
