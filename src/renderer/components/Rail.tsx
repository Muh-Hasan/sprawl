import {
  IconLayoutDashboard,
  IconListCheck,
  IconNotebook,
  IconScribble,
  IconSearch,
  IconSettings,
  type TablerIcon,
} from '@tabler/icons-react'
import markLight from '@/assets/brand/sprawl-mark-light.svg'
import { NAV_SHORTCUTS, shortcutLabel } from '@/lib/shortcuts'
import { useUiStore, type View } from '@/stores/uiStore'
import { IconButton } from './IconButton'

interface NavItem {
  view: View
  label: string
  icon: TablerIcon
  shortcut?: string
}

const NAV: readonly NavItem[] = [
  {
    view: 'canvas',
    label: 'Canvas',
    icon: IconLayoutDashboard,
    shortcut: shortcutLabel(NAV_SHORTCUTS.canvas),
  },
  { view: 'list', label: 'List', icon: IconListCheck, shortcut: shortcutLabel(NAV_SHORTCUTS.list) },
  { view: 'log', label: 'Log', icon: IconNotebook, shortcut: shortcutLabel(NAV_SHORTCUTS.log) },
  {
    view: 'drawings',
    label: 'Drawings',
    icon: IconScribble,
    shortcut: shortcutLabel(NAV_SHORTCUTS.drawings),
  },
]

const SETTINGS_ITEM: NavItem = { view: 'settings', label: 'Settings', icon: IconSettings }

function RailButton({ item }: { item: NavItem }) {
  const active = useUiStore((s) => s.view === item.view)
  const setView = useUiStore((s) => s.setView)
  return (
    <div className="relative flex w-full justify-center">
      {active && (
        <span
          data-testid="rail-active-bar"
          className="absolute top-1/2 left-0 h-4 w-0.5 -translate-y-1/2 rounded-r-[1px] bg-foreground"
        />
      )}
      <IconButton
        data-testid={`rail-${item.view}`}
        icon={item.icon}
        label={item.label}
        shortcut={item.shortcut}
        tooltipSide="right"
        active={active}
        aria-current={active ? 'page' : undefined}
        className="size-9 rounded-lg [&_svg:not([class*='size-'])]:size-[18px]"
        onClick={() => setView(item.view)}
      />
    </div>
  )
}

/** The left rail (UI_SPEC §2): logo, the four views and Search, and Settings at the bottom. */
export function Rail() {
  return (
    <nav
      data-testid="rail"
      aria-label="Views"
      className="flex h-full w-[52px] shrink-0 flex-col items-center border-r border-border bg-surface pb-3"
    >
      <div className="h-10 w-full shrink-0 [-webkit-app-region:drag]" />
      <img src={markLight} alt="" aria-hidden className="mt-3 mb-4 size-[18px]" draggable={false} />
      <div className="flex w-full flex-col items-center gap-1">
        {NAV.map((item) => (
          <RailButton key={item.view} item={item} />
        ))}
        {/* later: phase-10 opens the command palette (Ctrl+K). */}
        <div className="flex w-full justify-center">
          <IconButton
            data-testid="rail-search"
            icon={IconSearch}
            label="Search"
            shortcut="Ctrl+K"
            tooltipSide="right"
            disabled
            className="size-9 rounded-lg [&_svg:not([class*='size-'])]:size-[18px]"
          />
        </div>
      </div>
      <div className="mt-auto w-full">
        <RailButton item={SETTINGS_ITEM} />
      </div>
    </nav>
  )
}
