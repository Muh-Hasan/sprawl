import { summaryTiles } from './days'

/**
 * The log's summary tiles (UI_SPEC §6): notes done, things logged, and how many days in a row
 * have entries. The streak shows once it has loaded.
 */
export function LogSummary({
  done,
  logged,
  streak,
}: {
  done: number
  logged: number
  streak: number | null
}) {
  return (
    <div data-testid="log-summary" className="mt-6 flex gap-3">
      {summaryTiles(done, logged, streak).map((tile) => (
        <div
          key={tile.id}
          data-testid={`log-summary-${tile.id}`}
          className="min-w-0 flex-1 rounded-xl border border-border bg-card px-4 py-3.5"
        >
          <div className="text-[24px] leading-[30px] font-semibold tabular-nums">{tile.value}</div>
          <div className="truncate text-xs text-muted-foreground">{tile.label}</div>
        </div>
      ))}
    </div>
  )
}
