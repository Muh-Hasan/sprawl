import { useState, type Ref } from 'react'
import { IconPencil } from '@tabler/icons-react'
import { ShortcutKbd } from '@/components/ShortcutKbd'

/**
 * The log composer (UI_SPEC §6), floating at the bottom of the view: "What did you just do?"
 * Enter adds the line at the current time.
 */
export function Composer({
  onSubmit,
  inputRef,
}: {
  onSubmit: (text: string) => Promise<void>
  /** The input, for the empty state's Log something. */
  inputRef?: Ref<HTMLInputElement>
}) {
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  return (
    <form
      className="flex h-[52px] items-center gap-2.5 rounded-[14px] border border-border bg-card pr-2 pl-[18px] shadow-(--shadow-toolbar) transition-colors duration-120 focus-within:border-border-strong"
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
      <IconPencil
        className="size-[18px] shrink-0 text-subtle-foreground"
        stroke={1.75}
        aria-hidden
      />
      <input
        ref={inputRef}
        data-testid="log-composer"
        aria-label="Add to the log"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="What did you just do?"
        maxLength={10_000}
        className="h-full min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-subtle-foreground"
      />
      <ShortcutKbd
        className="pointer-events-none h-[34px] rounded-[9px] border-0 px-3 text-2xs"
        aria-hidden
      >
        Enter
      </ShortcutKbd>
    </form>
  )
}
