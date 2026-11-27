import { Button } from '@/components/ui/button'
import { SETTINGS_SECTIONS, type SettingsSectionId } from './settingsSections'

/** The section menu (UI_SPEC §9): the 28px "Settings" title over one 36px row per section. */
export function SettingsNav({
  current,
  onPick,
}: {
  current: SettingsSectionId
  onPick(id: SettingsSectionId): void
}) {
  return (
    <nav aria-label="Settings sections" className="flex w-[200px] shrink-0 flex-col gap-0.5">
      <h1 className="mb-4 ml-3 text-title font-semibold tracking-[-0.02em]">Settings</h1>
      {SETTINGS_SECTIONS.map(({ id, label, icon: Icon }) => {
        const active = id === current
        return (
          <Button
            key={id}
            variant="ghost"
            data-testid={`settings-section-${id}`}
            data-active={active || undefined}
            aria-current={active ? 'page' : undefined}
            onClick={() => onPick(id)}
            className="h-9 justify-start gap-2.5 rounded-lg px-3 text-sm font-medium text-muted-foreground hover:text-foreground data-active:bg-muted data-active:text-foreground dark:data-active:bg-muted"
          >
            <Icon stroke={1.75} className="size-[18px]" />
            {label}
          </Button>
        )
      })}
    </nav>
  )
}
