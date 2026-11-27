import markGradient from '@/assets/brand/sprawl-mark-gradient.svg'
import { ShortcutKbd } from '@/components/ShortcutKbd'
import {
  CANVAS_SHORTCUTS,
  NAV_SHORTCUTS,
  PALETTE_SHORTCUT,
  shortcutKeys,
  SIDEBAR_SHORTCUT,
  TEXT_SIZE_SHORTCUTS,
} from '@/lib/shortcuts'
import { SettingsRow, SettingsSection } from './SettingsLayout'
import type { SectionProps } from './useSettings'

const REPO_URL = 'https://github.com/Muh-Hasan/sprawl'

/** The shortcuts that work in every view (PRODUCT §4), as rows of keys. */
const APP_SHORTCUTS = [
  { id: 'palette', label: 'Search and commands', keys: shortcutKeys(PALETTE_SHORTCUT) },
  { id: 'new-note', label: 'New note', keys: shortcutKeys(CANVAS_SHORTCUTS.newNote) },
  { id: 'canvas', label: 'Go to Canvas', keys: shortcutKeys(NAV_SHORTCUTS.canvas) },
  { id: 'list', label: 'Go to List', keys: shortcutKeys(NAV_SHORTCUTS.list) },
  { id: 'log', label: 'Go to Daily log', keys: shortcutKeys(NAV_SHORTCUTS.log) },
  { id: 'settings', label: 'Settings', keys: shortcutKeys(NAV_SHORTCUTS.settings) },
  { id: 'sidebar', label: 'Toggle sidebar', keys: shortcutKeys(SIDEBAR_SHORTCUT) },
  { id: 'bigger', label: 'Bigger text', keys: shortcutKeys(TEXT_SIZE_SHORTCUTS.bigger) },
  { id: 'smaller', label: 'Smaller text', keys: shortcutKeys(TEXT_SIZE_SHORTCUTS.smaller) },
  { id: 'reset', label: 'Default text size', keys: shortcutKeys(TEXT_SIZE_SHORTCUTS.reset) },
] as const

function Keys({ keys }: { keys: readonly string[] }) {
  return (
    <span className="flex items-center gap-1">
      {keys.map((k) => (
        <ShortcutKbd key={k} className="h-[26px] px-2 text-2xs font-normal">
          {k}
        </ShortcutKbd>
      ))}
    </span>
  )
}

/**
 * Settings → Shortcuts (UI_SPEC §9): the app-wide shortcuts, plus quick capture's, which changes
 * under Quick capture. later: the shortcuts sheet (DESIGN_REFRESH R13) lists every shortcut.
 */
export function ShortcutsSection({ settings }: SectionProps) {
  return (
    <SettingsSection
      title="Shortcuts"
      blurb="The ones that work everywhere in Sprawl."
      testId="settings-shortcuts"
    >
      {APP_SHORTCUTS.map((s) => (
        <SettingsRow key={s.id} label={s.label} testId={`settings-shortcut-${s.id}`}>
          <Keys keys={s.keys} />
        </SettingsRow>
      ))}
      <SettingsRow
        label="Quick capture"
        description="Works from any app. Change it under Quick capture."
        testId="settings-shortcut-capture"
      >
        {settings && <Keys keys={settings.captureShortcut.split('+')} />}
      </SettingsRow>
    </SettingsSection>
  )
}

/** Settings → About (UI_SPEC §9): the mark, the name, the license and the repo link. later: phase-12 (version). */
export function AboutSection() {
  return (
    <SettingsSection title="About" blurb="License and source." testId="settings-about">
      <div className="flex items-center gap-3.5 px-[18px] py-4">
        <img src={markGradient} alt="" aria-hidden className="size-10" draggable={false} />
        <div className="flex flex-col">
          <span data-testid="settings-about-name" className="font-brand text-lg font-semibold">
            Sprawl
          </span>
          <span className="text-xs text-muted-foreground">
            Open source under the MIT license ·{' '}
            <button
              type="button"
              data-testid="settings-about-github"
              className="underline-offset-4 hover:text-foreground hover:underline"
              onClick={() => void window.sprawl.app.openExternal(REPO_URL)}
            >
              GitHub
            </button>
          </span>
        </div>
      </div>
    </SettingsSection>
  )
}
