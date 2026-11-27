import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import type { NotificationStatus } from '@shared/api'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { SettingsRow, SettingsSection } from './SettingsLayout'
import type { SectionProps } from './useSettings'

/** 00:00 to 23:30 in 30-minute steps (UI_SPEC §9). */
const HALF_HOURS = Array.from({ length: 48 }, (_, i) => {
  const h = String(Math.floor(i / 2)).padStart(2, '0')
  return `${h}:${i % 2 === 0 ? '00' : '30'}`
})

/** Whether Windows blocks Sprawl's toasts, asked again whenever the window comes back. */
function useNotificationStatus(): NotificationStatus | null {
  const [status, setStatus] = useState<NotificationStatus | null>(null)
  useEffect(() => {
    let live = true
    const read = (): void =>
      void window.sprawl.system.notificationStatus().then((s) => live && setStatus(s))
    read()
    window.addEventListener('focus', read)
    return () => {
      live = false
      window.removeEventListener('focus', read)
    }
  }, [])
  return status
}

/**
 * Notifications (UI_SPEC §9, PRODUCT §3.8): due reminders, the morning summary and its time, a
 * test toast, and the warning when Windows blocks Sprawl's notifications.
 */
export function NotificationsSection({ settings, update }: SectionProps) {
  const status = useNotificationStatus()
  const morning = settings?.morningSummary
  return (
    <SettingsSection
      title="Notifications"
      blurb="Reminders arrive as Windows notifications."
      testId="settings-notifications"
    >
      {status === 'blocked' && (
        <div
          data-testid="settings-notifications-blocked"
          className="flex min-h-16 items-center justify-between gap-4 px-[18px] py-3"
        >
          <span className="text-sm text-due-overdue">
            Windows is blocking Sprawl's notifications
          </span>
          <Button
            data-testid="settings-open-notification-settings"
            variant="secondary"
            onClick={() => void window.sprawl.system.openNotificationSettings()}
          >
            Open Windows settings
          </Button>
        </div>
      )}
      <SettingsRow label="Due reminders" description="A notification at each note's reminder time.">
        <Switch
          data-testid="settings-reminders"
          aria-label="Due reminders"
          checked={settings?.remindersOn ?? false}
          disabled={!settings}
          onCheckedChange={(on) => update('remindersOn', on)}
        />
      </SettingsRow>
      <SettingsRow
        label="Morning summary"
        description="What's due today and overdue, once a day. Skipped when there's nothing."
      >
        <Select
          value={morning?.time ?? '09:00'}
          disabled={!morning?.on}
          onValueChange={(time) => morning && update('morningSummary', { ...morning, time })}
        >
          <SelectTrigger
            data-testid="settings-morning-time"
            aria-label="Morning summary time"
            className="w-24 font-mono text-xs"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="max-h-64">
            {HALF_HOURS.map((t) => (
              <SelectItem key={t} value={t} className="font-mono text-xs">
                {t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Switch
          data-testid="settings-morning"
          aria-label="Morning summary"
          checked={morning?.on ?? false}
          disabled={!morning}
          onCheckedChange={(on) => morning && update('morningSummary', { ...morning, on })}
        />
      </SettingsRow>
      <SettingsRow
        label="Test notification"
        description="Check that Windows shows Sprawl's notifications."
      >
        <Button
          data-testid="settings-test-notification"
          variant="secondary"
          onClick={() => {
            void window.sprawl.system.testNotification()
            toast('Test notification sent')
          }}
        >
          Send a test
        </Button>
      </SettingsRow>
    </SettingsSection>
  )
}
