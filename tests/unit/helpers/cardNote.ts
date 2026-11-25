import type { CardNote } from '../../../src/shared/types'

/** A note card's fields with blank chips, overridden by `over`. */
export function cardNote(over: Partial<CardNote> = {}): CardNote {
  return {
    title: '',
    color: 'stone',
    preview: '',
    checkTotal: 0,
    checkDone: 0,
    attachCount: 0,
    linkCount: 0,
    dueDay: null,
    dueTime: null,
    doneAt: null,
    ...over,
  }
}
