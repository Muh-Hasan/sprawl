import { IconLayoutSidebar, IconPlus, IconSearch } from '@tabler/icons-react'
import markLight from '@/assets/brand/sprawl-mark-light.svg'
import { IconButton } from '@/components/IconButton'
import { ShortcutKbd } from '@/components/ShortcutKbd'
import { Button } from '@/components/ui/button'
import {
  CANVAS_SHORTCUTS,
  PALETTE_SHORTCUT,
  shortcutKeys,
  shortcutLabel,
  SIDEBAR_SHORTCUT,
  type Shortcut,
} from '@/lib/shortcuts'
import { useSidebarStore } from '@/stores/sidebarStore'
import { useUiStore } from '@/stores/uiStore'
import { newNote } from '@/views/search/commands'
import { CollapsedSidebar } from './CollapsedSidebar'
import { RecentNotes } from './RecentNotes'
import { OverdueBadge } from './OverdueBadge'
import { SETTINGS_ITEM, VIEW_ITEMS, type SidebarItem } from './sidebarItems'
import { useOverdueCount } from './useSidebarData'

/** A shortcut as the sidebar's rows hint it, e.g. "Ctrl 1". */
const hint = (s: Shortcut): string => shortcutKeys(s).join(' ')

/** A view row (UI_SPEC §2): icon, label, and the shortcut (or the List's overdue badge). */
function ViewRow({ item }: { item: SidebarItem }) {
  const active = useUiStore((s) => s.view === item.view)
  const setView = useUiStore((s) => s.setView)
  const Icon = item.icon
  return (
    <Button
      variant="ghost"
      data-testid={`sidebar-${item.view}`}
      data-active={active || undefined}
      aria-current={active ? 'page' : undefined}
      onClick={() => setView(item.view)}
      className="h-9 w-full justify-start gap-3 rounded-lg pr-2.5 pl-3 text-sm font-medium text-muted-foreground hover:text-foreground data-active:bg-muted data-active:text-foreground dark:data-active:bg-muted"
    >
      <Icon stroke={1.75} className="size-[19px]" />
      <span className="flex-1 text-left">{item.label}</span>
      {item.view === 'list' ? <ListHint shortcut={item.shortcut} /> : <RowHint s={item.shortcut} />}
    </Button>
  )
}

function RowHint({ s }: { s: Shortcut }) {
  return <span className="font-mono text-kbd font-normal text-subtle-foreground">{hint(s)}</span>
}

/** The overdue badge takes the shortcut's place while anything is overdue. */
function ListHint({ shortcut }: { shortcut: Shortcut }) {
  const count = useOverdueCount()
  return count > 0 ? <OverdueBadge count={count} /> : <RowHint s={shortcut} />
}

/** The open sidebar (UI_SPEC §2): 248px, labelled, with Recent notes. */
function OpenSidebar() {
  const toggle = useSidebarStore((s) => s.toggle)
  return (
    <aside
      data-testid="sidebar"
      data-collapsed="false"
      aria-label="Sidebar"
      className="flex h-full w-[248px] shrink-0 flex-col border-r border-border bg-surface"
    >
      <div className="flex h-[52px] shrink-0 items-center gap-2.5 pr-3 pl-4 [-webkit-app-region:drag]">
        <img src={markLight} alt="" aria-hidden className="size-[22px]" draggable={false} />
        <span className="flex-1 font-brand text-base font-semibold tracking-[-0.01em]">Sprawl</span>
        <IconButton
          data-testid="sidebar-toggle"
          icon={IconLayoutSidebar}
          label="Collapse sidebar"
          shortcut={shortcutLabel(SIDEBAR_SHORTCUT)}
          tooltipSide="right"
          onClick={toggle}
          className="size-8 rounded-lg"
        />
      </div>

      <div className="flex shrink-0 flex-col gap-2 px-3 pt-1">
        <Button
          data-testid="sidebar-new-note"
          onClick={() => newNote()}
          className="h-[38px] justify-start gap-2 rounded-[10px] px-3 font-semibold"
        >
          <IconPlus stroke={2} className="size-[18px]" />
          <span className="flex-1 text-left">New note</span>
          <span className="font-mono text-2xs font-medium text-primary-foreground/55">
            {hint(CANVAS_SHORTCUTS.newNote)}
          </span>
        </Button>
        <Button
          variant="ghost"
          data-testid="sidebar-search"
          onClick={() => useUiStore.getState().setPaletteOpen(true)}
          className="h-[38px] justify-start gap-2 rounded-[10px] border border-border bg-background pr-2.5 pl-3 font-normal text-muted-foreground hover:text-foreground"
        >
          <IconSearch stroke={1.75} className="size-[18px]" />
          <span className="min-w-0 flex-1 truncate text-left">Search or jump to…</span>
          <ShortcutKbd>{hint(PALETTE_SHORTCUT)}</ShortcutKbd>
        </Button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <nav aria-label="Views" className="flex flex-col gap-0.5 px-2 pt-4">
          {VIEW_ITEMS.map((item) => (
            <ViewRow key={item.view} item={item} />
          ))}
        </nav>
        <RecentNotes />
      </div>

      <div className="flex shrink-0 flex-col gap-0.5 border-t border-border p-2">
        <ViewRow item={SETTINGS_ITEM} />
      </div>
    </aside>
  )
}

/**
 * The sidebar (UI_SPEC §2): open with labels, or collapsed to a 60px icon rail with tooltips.
 * Ctrl+\ or its toggle button switches, and the choice is remembered.
 */
export function Sidebar() {
  const collapsed = useSidebarStore((s) => s.collapsed)
  return collapsed ? <CollapsedSidebar /> : <OpenSidebar />
}
