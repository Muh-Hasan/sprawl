import { forwardRef, useLayoutEffect, useRef } from 'react'
import { cn } from '@/lib/utils'

/** 8 lines of `text-base` (14/22). */
const MAX_HEIGHT = 8 * 22

interface CaptureTextProps {
  value: string
  placeholder: string
  /** The recognized `!date` token, highlighted in place. */
  token: { start: number; end: number } | null
  onChange(value: string): void
  onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>): void
}

/** The textarea's text metrics, shared by the highlight layer behind it so they line up. */
const TEXT = 'm-0 w-full border-0 p-0 text-base leading-[22px] whitespace-pre-wrap break-words'

/**
 * The capture text box (UI_SPEC §5c): borderless, growing to 8 lines. A layer behind the text,
 * with the same metrics, puts a `--muted` highlight under the `!date` token.
 */
export const CaptureText = forwardRef<HTMLTextAreaElement, CaptureTextProps>(function CaptureText(
  { value, placeholder, token, onChange, onKeyDown },
  ref,
) {
  const area = useRef<HTMLTextAreaElement | null>(null)
  const mirror = useRef<HTMLDivElement>(null)

  // Grow with the text up to 8 lines, then scroll (the highlight scrolls along).
  useLayoutEffect(() => {
    const el = area.current
    if (!el) return
    el.style.height = '0px'
    el.style.height = `${Math.min(el.scrollHeight, MAX_HEIGHT)}px`
    if (mirror.current) mirror.current.scrollTop = el.scrollTop
  }, [value])

  return (
    <div className="relative">
      <div
        ref={mirror}
        aria-hidden
        className={cn(
          TEXT,
          'pointer-events-none absolute inset-0 overflow-hidden text-transparent',
        )}
      >
        {token ? (
          <>
            {value.slice(0, token.start)}
            <mark
              data-testid="capture-token"
              className="rounded-[3px] bg-muted text-transparent ring-2 ring-muted"
            >
              {value.slice(token.start, token.end)}
            </mark>
            {value.slice(token.end)}
          </>
        ) : (
          value
        )}
      </div>
      <textarea
        ref={(el) => {
          area.current = el
          if (typeof ref === 'function') ref(el)
          else if (ref) ref.current = el
        }}
        data-testid="capture-input"
        rows={1}
        value={value}
        placeholder={placeholder}
        spellCheck={false}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        onScroll={(e) => {
          if (mirror.current) mirror.current.scrollTop = e.currentTarget.scrollTop
        }}
        className={cn(
          TEXT,
          'relative block resize-none bg-transparent text-foreground outline-none select-text placeholder:text-subtle-foreground',
        )}
      />
    </div>
  )
})
