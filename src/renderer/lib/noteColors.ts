import type { NoteColor } from '@shared/constants'

interface NoteColorClasses {
  bg: string
  border: string
  /** The hover border, one step up (DESIGN_SYSTEM §8). */
  hoverBorder: string
  text: string
  /** The bright hue: log tags, color dots, and the ring of a picker swatch. */
  swatch: string
  /** A picker swatch: the card color inside a ring of the bright hue, so it matches the card. */
  pickerSwatch: string
}

/**
 * The theme classes for each note color (DESIGN_SYSTEM §2.3). Written out in full so Tailwind
 * sees every class name.
 */
export const NOTE_COLOR_CLASSES: Record<NoteColor, NoteColorClasses> = {
  stone: {
    bg: 'bg-note-stone',
    border: 'border-note-stone-border',
    hoverBorder: 'hover:border-note-stone-border-hover',
    text: 'text-note-stone-text',
    swatch: 'bg-note-stone-swatch',
    pickerSwatch: 'border-2 border-note-stone-swatch bg-note-stone',
  },
  sand: {
    bg: 'bg-note-sand',
    border: 'border-note-sand-border',
    hoverBorder: 'hover:border-note-sand-border-hover',
    text: 'text-note-sand-text',
    swatch: 'bg-note-sand-swatch',
    pickerSwatch: 'border-2 border-note-sand-swatch bg-note-sand',
  },
  sage: {
    bg: 'bg-note-sage',
    border: 'border-note-sage-border',
    hoverBorder: 'hover:border-note-sage-border-hover',
    text: 'text-note-sage-text',
    swatch: 'bg-note-sage-swatch',
    pickerSwatch: 'border-2 border-note-sage-swatch bg-note-sage',
  },
  sky: {
    bg: 'bg-note-sky',
    border: 'border-note-sky-border',
    hoverBorder: 'hover:border-note-sky-border-hover',
    text: 'text-note-sky-text',
    swatch: 'bg-note-sky-swatch',
    pickerSwatch: 'border-2 border-note-sky-swatch bg-note-sky',
  },
  lilac: {
    bg: 'bg-note-lilac',
    border: 'border-note-lilac-border',
    hoverBorder: 'hover:border-note-lilac-border-hover',
    text: 'text-note-lilac-text',
    swatch: 'bg-note-lilac-swatch',
    pickerSwatch: 'border-2 border-note-lilac-swatch bg-note-lilac',
  },
  rose: {
    bg: 'bg-note-rose',
    border: 'border-note-rose-border',
    hoverBorder: 'hover:border-note-rose-border-hover',
    text: 'text-note-rose-text',
    swatch: 'bg-note-rose-swatch',
    pickerSwatch: 'border-2 border-note-rose-swatch bg-note-rose',
  },
}

/** The names shown in tooltips and read by screen readers. */
export const COLOR_NAMES: Record<NoteColor, string> = {
  stone: 'Stone',
  sand: 'Sand',
  sage: 'Sage',
  sky: 'Sky',
  lilac: 'Lilac',
  rose: 'Rose',
}
