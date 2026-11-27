import { useState, type ComponentType } from 'react'
import { TopBar } from '@/components/TopBar'
import { AboutSection, ShortcutsSection } from './AboutSection'
import { AppearanceSection } from './AppearanceSection'
import { CaptureSection } from './CaptureSection'
import { BackupSection, CanvasSection } from './CanvasSection'
import { GeneralSection } from './GeneralSection'
import { NotificationsSection } from './NotificationsSection'
import { SettingsNav } from './SettingsNav'
import type { SettingsSectionId } from './settingsSections'
import { useSettings, type SectionProps } from './useSettings'

const SECTIONS: Record<SettingsSectionId, ComponentType<SectionProps>> = {
  general: GeneralSection,
  appearance: AppearanceSection,
  canvas: CanvasSection,
  notifications: NotificationsSection,
  capture: CaptureSection,
  backup: BackupSection,
  shortcuts: ShortcutsSection,
  about: AboutSection,
}

/**
 * Settings (UI_SPEC §9): the section menu on the left and the chosen section's card of rows on
 * the right, in a column up to 920px wide. It opens on General.
 */
export function SettingsView() {
  const settingsProps = useSettings()
  const [section, setSection] = useState<SettingsSectionId>('general')
  const Section = SECTIONS[section]

  return (
    <div className="flex h-full flex-col bg-background">
      <TopBar />
      <div className="min-h-0 flex-1 overflow-y-auto [scrollbar-gutter:stable]">
        <div
          data-testid="view-settings-content"
          className="mx-auto flex w-full max-w-[920px] gap-10 px-10 py-9"
        >
          <SettingsNav current={section} onPick={setSection} />
          <div className="min-w-0 flex-1 pt-[52px]">
            <Section {...settingsProps} />
          </div>
        </div>
      </div>
    </div>
  )
}
