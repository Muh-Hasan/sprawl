import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface TopBarProps {
  /** The view title or controls on the left (16px padding). */
  left?: ReactNode
  right?: ReactNode
  /** The canvas top bar is transparent with no border, so the canvas runs full-bleed. */
  transparent?: boolean
}

/**
 * The 40px top bar of the main area (UI_SPEC §3). It's the window's drag region, and it keeps
 * the right 140px clear for the native minimize, maximize and close buttons (UI_SPEC §1).
 * Children are `no-drag` so they stay clickable.
 */
export function TopBar({ left, right, transparent = false }: TopBarProps) {
  return (
    <header
      data-testid="top-bar"
      className={cn(
        'flex h-10 shrink-0 items-center justify-between pr-[140px] pl-4 [-webkit-app-region:drag]',
        !transparent && 'border-b border-border',
      )}
    >
      <div className="flex min-w-0 items-center gap-2 text-sm font-medium [&>*]:[-webkit-app-region:no-drag]">
        {left}
      </div>
      <div className="flex items-center gap-2 [&>*]:[-webkit-app-region:no-drag]">{right}</div>
    </header>
  )
}
