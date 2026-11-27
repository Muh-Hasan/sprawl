import { useEffect, useState } from 'react'
import type { NoteListRow } from '@shared/types'
import { NOTE_RESULTS, RECENT_NOTES } from './paletteQuery'

/**
 * The notes whose title holds `term`, most recently edited first; with no term, the few open
 * notes edited last. None while `enabled` is off (commands only). Late answers for an older term are
 * dropped, and the last results stay up until the new ones arrive, so the list doesn't flicker.
 * later: phase-10 searches bodies, drawings and the log, with snippets.
 */
export function useNoteResults(term: string, enabled: boolean): NoteListRow[] {
  const [rows, setRows] = useState<NoteListRow[]>([])
  useEffect(() => {
    if (!enabled) return
    let live = true
    void window.sprawl.notes
      .list({ tab: term ? 'all' : 'open', colors: [], text: term, sort: 'edited' })
      .then((all) => live && setRows(all.slice(0, term ? NOTE_RESULTS : RECENT_NOTES)))
      .catch(() => live && setRows([]))
    return () => {
      live = false
    }
  }, [term, enabled])
  return enabled ? rows : []
}
