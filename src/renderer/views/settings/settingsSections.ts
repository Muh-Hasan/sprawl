import {
  IconAdjustmentsHorizontal,
  IconBell,
  IconBolt,
  IconDownload,
  IconInfoCircle,
  IconKeyboard,
  IconLayoutDashboard,
  IconPalette,
  type TablerIcon,
} from '@tabler/icons-react'

/** The Settings sections, in menu order (UI_SPEC §9). */
export const SETTINGS_SECTIONS = [
  { id: 'general', label: 'General', icon: IconAdjustmentsHorizontal },
  { id: 'appearance', label: 'Appearance', icon: IconPalette },
  { id: 'canvas', label: 'Canvas', icon: IconLayoutDashboard },
  { id: 'notifications', label: 'Notifications', icon: IconBell },
  { id: 'capture', label: 'Quick capture', icon: IconBolt },
  { id: 'backup', label: 'Backup and export', icon: IconDownload },
  { id: 'shortcuts', label: 'Shortcuts', icon: IconKeyboard },
  { id: 'about', label: 'About', icon: IconInfoCircle },
] as const satisfies readonly { id: string; label: string; icon: TablerIcon }[]

export type SettingsSectionId = (typeof SETTINGS_SECTIONS)[number]['id']
