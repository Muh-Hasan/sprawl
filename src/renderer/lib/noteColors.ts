import type { NoteColor } from '@shared/constants'

interface NoteColorClasses {
  bg: string
  border: string
  text: string
}

/**
 * The theme classes for each note color (DESIGN_SYSTEM §2.3). Written out in full so Tailwind
 * sees every class name.
 */
export const NOTE_COLOR_CLASSES: Record<NoteColor, NoteColorClasses> = {
  stone: { bg: 'bg-note-stone', border: 'border-note-stone-border', text: 'text-note-stone-text' },
  sand: { bg: 'bg-note-sand', border: 'border-note-sand-border', text: 'text-note-sand-text' },
  sage: { bg: 'bg-note-sage', border: 'border-note-sage-border', text: 'text-note-sage-text' },
  sky: { bg: 'bg-note-sky', border: 'border-note-sky-border', text: 'text-note-sky-text' },
  lilac: { bg: 'bg-note-lilac', border: 'border-note-lilac-border', text: 'text-note-lilac-text' },
  rose: { bg: 'bg-note-rose', border: 'border-note-rose-border', text: 'text-note-rose-text' },
}
