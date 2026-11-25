import type { ReactNode } from 'react'
import { parseInline, type InlineToken } from '@/lib/inlineMarkdown'

/** Renders inline tokens. Links open in the system browser (`app.openExternal`). */
function renderInline(tokens: readonly InlineToken[]): ReactNode[] {
  return tokens.map((t, i) => {
    switch (t.kind) {
      case 'text':
        return t.text
      case 'bold':
        return <strong key={i}>{renderInline(t.children)}</strong>
      case 'italic':
        return <em key={i}>{renderInline(t.children)}</em>
      case 'code':
        return (
          <code key={i} className="rounded-[4px] bg-muted px-1 font-mono text-[0.92em]">
            {t.text}
          </code>
        )
      case 'link':
        return (
          <a
            key={i}
            href={t.url}
            className="underline underline-offset-4 hover:text-foreground"
            onClick={(e) => {
              e.preventDefault()
              void window.sprawl.app.openExternal(t.url)
            }}
          >
            {renderInline(t.children)}
          </a>
        )
    }
  })
}

/** A line of inline markdown as React nodes. */
export function InlineMarkdown({ text }: { text: string }) {
  return <>{renderInline(parseInline(text))}</>
}
