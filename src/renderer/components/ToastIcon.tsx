import type { TablerIcon } from '@tabler/icons-react'
import { cn } from '@/lib/utils'

/** A toast's 18px icon on the left: `--foreground` for what you just did, muted otherwise. */
export function ToastIcon({ icon: Icon, className }: { icon: TablerIcon; className?: string }) {
  return <Icon stroke={1.75} aria-hidden className={cn('size-[18px]', className)} />
}
