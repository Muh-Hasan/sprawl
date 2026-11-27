import { TEXT_SIZE_LABELS, TEXT_SIZES } from '@shared/textSize'
import { SegmentedControl } from '@/components/SegmentedControl'
import { Switch } from '@/components/ui/switch'
import { useSidebarStore } from '@/stores/sidebarStore'
import { useTextSizeStore } from '@/stores/textSizeStore'
import { SettingsRow, SettingsSection } from './SettingsLayout'

const TEXT_SIZE_OPTIONS = TEXT_SIZES.map((value) => ({ value, label: TEXT_SIZE_LABELS[value] }))

const SIDEBAR_OPTIONS = [
  { value: 'labels', label: 'Labels' },
  { value: 'icons', label: 'Icons only' },
] as const

/**
 * Settings → Appearance (UI_SPEC §9): text size and the sidebar, both shared with their shortcuts,
 * and reduce motion. later: the motion PR (DESIGN_REFRESH R14) turns the reduce motion switch on.
 */
export function AppearanceSection() {
  const textSize = useTextSizeStore((s) => s.size)
  const setTextSize = useTextSizeStore((s) => s.set)
  const collapsed = useSidebarStore((s) => s.collapsed)
  const setCollapsed = useSidebarStore((s) => s.setCollapsed)

  return (
    <SettingsSection
      title="Appearance"
      blurb="Make Sprawl easier on your eyes."
      testId="settings-appearance"
    >
      <SettingsRow
        label="Text size"
        description="Scales the whole app. Ctrl+Shift+= and Ctrl+Shift+- work anywhere."
      >
        <SegmentedControl
          label="Text size"
          size="md"
          value={textSize}
          options={TEXT_SIZE_OPTIONS}
          onChange={setTextSize}
          testIdPrefix="settings-text-size"
        />
      </SettingsRow>
      <SettingsRow label="Sidebar" description="Ctrl+\ toggles it.">
        <SegmentedControl
          label="Sidebar"
          size="md"
          value={collapsed ? 'icons' : 'labels'}
          options={SIDEBAR_OPTIONS}
          onChange={(v) => setCollapsed(v === 'icons')}
          testIdPrefix="settings-sidebar"
        />
      </SettingsRow>
      <SettingsRow
        label="Reduce motion"
        description="Turns off slides and lifts. Follows Windows by default."
        soon
        testId="settings-reduce-motion-row"
      >
        <Switch data-testid="settings-reduce-motion" aria-label="Reduce motion" disabled />
      </SettingsRow>
    </SettingsSection>
  )
}
