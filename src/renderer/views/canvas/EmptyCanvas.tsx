import { useEffect, useState, type ReactNode } from 'react'
import { IconClipboardText, IconNote, IconSparkles, type TablerIcon } from '@tabler/icons-react'
import { ShortcutKbd } from '@/components/ShortcutKbd'
import { showToast } from '@/components/toasts'
import { cn } from '@/lib/utils'
import { CANVAS_SHORTCUTS, shortcutKeys } from '@/lib/shortcuts'
import { useCanvasStore } from '@/stores/canvasStore'
import { createNoteAt, createNoteFromText, viewCenter } from './actions'
import { openWelcomeBoard } from './welcomeBoard'

/** Each tile's icon sits on a sticky-note color, the one place color is allowed (DESIGN_SYSTEM §2). */
const ICON_TINTS = {
  sand: 'bg-note-sand text-note-sand-swatch',
  sky: 'bg-note-sky text-note-sky-swatch',
  lilac: 'bg-note-lilac text-note-lilac-swatch',
} as const

interface TileProps {
  testId: string
  icon: TablerIcon
  tint: keyof typeof ICON_TINTS
  title: string
  children: ReactNode
  onClick: () => void
}

function StartTile({ testId, icon: Icon, tint, title, children, onClick }: TileProps) {
  return (
    <button
      type="button"
      data-testid={testId}
      onClick={onClick}
      className="flex flex-col gap-2.5 rounded-[14px] border border-border bg-surface p-4 text-left outline-none transition-[background-color,border-color,translate] duration-150 ease-(--ease-out) hover:-translate-y-0.5 hover:border-border-strong hover:bg-popover focus-visible:ring-2 focus-visible:ring-ring/50"
    >
      <span
        aria-hidden
        className={cn('flex size-9 items-center justify-center rounded-[10px]', ICON_TINTS[tint])}
      >
        <Icon className="size-5" stroke={1.75} />
      </span>
      <span className="text-base font-semibold text-foreground">{title}</span>
      <span className="text-xs text-muted-foreground">{children}</span>
    </button>
  )
}

/** A shortcut as one `kbd` with spaces between its keys, e.g. Ctrl Shift Space. */
function Keys({ keys }: { keys: readonly string[] }) {
  return <ShortcutKbd className="text-foreground/85">{keys.join(' ')}</ShortcutKbd>
}

/** The quick capture shortcut, as set in Settings (empty when it's turned off). */
function useCaptureKeys(): string[] {
  const [keys, setKeys] = useState<string[]>([])
  useEffect(() => {
    let live = true
    void window.sprawl.settings.get('captureShortcut').then((accelerator) => {
      if (live) setKeys(accelerator ? accelerator.split('+') : [])
    })
    return () => {
      live = false
    }
  }, [])
  return keys
}

async function pasteList(): Promise<void> {
  const text = await navigator.clipboard.readText().catch(() => '')
  if (!createNoteFromText(text))
    showToast('Copy some text first, then paste it here', { icon: IconClipboardText })
}

/** Three tilted sticky notes above the title. */
function Stack() {
  return (
    <div aria-hidden className="relative mb-7 h-[92px] w-[132px]">
      <span className="absolute top-3.5 left-0 h-16 w-[74px] -rotate-8 rounded-[10px] border border-note-sand-border bg-note-sand" />
      <span className="absolute top-0 left-[30px] h-16 w-[74px] rotate-3 rounded-[10px] border border-note-sky-border bg-note-sky" />
      <span className="absolute top-6 left-[58px] h-16 w-[74px] rotate-9 rounded-[10px] border border-note-sage-border bg-note-sage shadow-(--shadow-lift)" />
    </div>
  )
}

/**
 * The empty canvas (UI_SPEC §4.1a): how to start, with three start tiles. Only the tiles take
 * the pointer, so double-clicking anywhere else still makes a note right there.
 */
export function EmptyCanvas() {
  const empty = useCanvasStore((s) => s.ready && s.items.size === 0)
  const captureKeys = useCaptureKeys()
  if (!empty) return null

  return (
    <section
      data-testid="canvas-empty"
      aria-label="Your canvas is empty"
      className="pointer-events-none absolute top-[46%] left-[calc((100%_-_var(--canvas-inset-right,0px))/2)] z-[5] flex w-[640px] max-w-[calc(100%_-_48px)] -translate-x-1/2 -translate-y-1/2 animate-in flex-col items-center text-center duration-500 ease-(--ease-out) fade-in slide-in-from-bottom-2"
    >
      <Stack />
      <h1 className="text-title text-foreground">Your canvas is empty</h1>
      <p className="mt-2.5 text-base text-muted-foreground">
        Double-click anywhere to add a sticky note, or start from one of these.
      </p>
      <div
        data-canvas-chrome
        className="pointer-events-auto mt-8 grid w-full grid-cols-3 gap-3 [-webkit-app-region:no-drag]"
      >
        <StartTile
          testId="start-new-note"
          icon={IconNote}
          tint="sand"
          title="New sticky note"
          onClick={() => createNoteAt(viewCenter(), { edit: true })}
        >
          Or press <Keys keys={shortcutKeys(CANVAS_SHORTCUTS.toolNote)} /> and click where it goes
        </StartTile>
        <StartTile
          testId="start-paste"
          icon={IconClipboardText}
          tint="sky"
          title="Paste a list"
          onClick={() => void pasteList()}
        >
          Copied text becomes a note, first line as the title
        </StartTile>
        <StartTile
          testId="start-welcome-board"
          icon={IconSparkles}
          tint="lilac"
          title="Open the welcome board"
          onClick={openWelcomeBoard}
        >
          Sample notes that show everything in a minute
        </StartTile>
      </div>
      {captureKeys.length > 0 && (
        <p data-testid="canvas-empty-capture" className="mt-7 text-xs text-subtle-foreground">
          Capture from any app with <Keys keys={captureKeys} />
        </p>
      )}
    </section>
  )
}
