import {
  IconLayoutDashboard,
  IconListCheck,
  IconNotebook,
  IconSettings,
  type TablerIcon,
} from '@tabler/icons-react'
import { NAV_SHORTCUTS, type Shortcut } from '@/lib/shortcuts'
import type { View } from '@/stores/uiStore'

export interface SidebarItem {
  view: View
  label: string
  icon: TablerIcon
  shortcut: Shortcut
}

/** The three views, in the order the sidebar lists them. */
export const VIEW_ITEMS: readonly SidebarItem[] = [
  { view: 'canvas', label: 'Canvas', icon: IconLayoutDashboard, shortcut: NAV_SHORTCUTS.canvas },
  { view: 'list', label: 'List', icon: IconListCheck, shortcut: NAV_SHORTCUTS.list },
  { view: 'log', label: 'Daily log', icon: IconNotebook, shortcut: NAV_SHORTCUTS.log },
]

export const SETTINGS_ITEM: SidebarItem = {
  view: 'settings',
  label: 'Settings',
  icon: IconSettings,
  shortcut: NAV_SHORTCUTS.settings,
}
