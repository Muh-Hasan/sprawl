import { cn } from '@/lib/utils'

/** Faded sticky notes around the welcome card: a hint of what the canvas will hold. */
const NOTES = [
  'left-[12%] top-[18%] h-24 w-[150px] -rotate-[7deg] bg-note-sand border-note-sand-border opacity-55',
  'right-[13%] top-[22%] h-[104px] w-[170px] rotate-[5deg] bg-note-sky border-note-sky-border opacity-55',
  'left-[17%] bottom-[16%] h-[100px] w-40 rotate-[4deg] bg-note-sage border-note-sage-border opacity-50',
  'right-[16%] bottom-[18%] h-[92px] w-[140px] -rotate-[6deg] bg-note-rose border-note-rose-border opacity-50',
]

/**
 * The onboarding background (UI_SPEC §10): the canvas dot grid and four faded notes. Purely
 * decorative, so it's hidden from assistive tech and ignores the pointer.
 */
export function OnboardingBackdrop() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle,var(--canvas-dot)_1px,transparent_1.3px)] bg-size-[24px_24px] opacity-70" />
      {NOTES.map((note) => (
        <span key={note} className={cn('absolute rounded-xl border', note)} />
      ))}
    </div>
  )
}
