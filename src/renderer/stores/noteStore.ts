import { toast } from 'sonner'
import { create } from 'zustand'
import { AUTOSAVE_MS, PREVIEW_CHARS, type NoteColor } from '@shared/constants'
import { deriveRemindAt, normalizeDue } from '@shared/due'
import type { CardNote, Note, NoteLink, NoteLinkPatch, NotePatch } from '@shared/types'
import { debounce } from '@/lib/debounce'
import { registerFlush } from '@/lib/flushes'
import { useCanvasStore } from './canvasStore'
import { useUiStore } from './uiStore'

/** "Saved" / "Saving…" in the panel footer (UI_SPEC §5). */
export type SaveStatus = 'saved' | 'saving' | 'error'

/** The patch fields edited directly (the body goes through `bodyChanged`, color `setColor`). */
export type NoteEdit = Pick<NotePatch, 'title' | 'dueDay' | 'dueTime' | 'remind'>

interface NoteState {
  /** The note open in the panel, with local edits applied. */
  note: Note | null
  status: SaveStatus
  /** Loads a note into the panel (saving the previous one first). */
  open(id: string): Promise<void>
  /** Saves what's pending and forgets the note (the panel closed). */
  close(): void
  /** Edits the title or due fields. Due edits are discrete choices, so they save at once. */
  edit(patch: NoteEdit): void
  /**
   * The editor's document changed. It's serialized only when the save runs, so typing never
   * pays for `JSON.stringify` of the whole body.
   */
  bodyChanged(serialize: () => string): void
  /** On the canvas this is an undoable `setColor` op (PRODUCT §3.1); otherwise a note update. */
  setColor(color: NoteColor): void
  addLink(url: string, label: string | null): Promise<void>
  updateLink(id: string, patch: NoteLinkPatch): Promise<void>
  removeLink(id: string): Promise<void>
  reorderLinks(ids: string[]): Promise<void>
  /** Sends the pending save now (on blur, panel close and window close). */
  flush(): void
}

/** After a failed save, try again this much later (with whatever is pending by then). */
const RETRY_MS = 2000

let pending: NotePatch = {}
let bodySource: (() => string) | null = null
/** The body main last confirmed for the open note: a change back to it needn't be sent. */
let savedBody = '[]'
let inFlight = 0
let loadToken = 0
let retryTimer: ReturnType<typeof setTimeout> | null = null

const hasPending = (): boolean => bodySource !== null || Object.keys(pending).length > 0

/** The card fields that follow from a saved note. */
export function cardFieldsOf(note: Note): Partial<CardNote> {
  return {
    title: note.title,
    preview: note.bodyText.slice(0, PREVIEW_CHARS),
    checkTotal: note.checkTotal,
    checkDone: note.checkDone,
    attachCount: note.attachCount,
    linkCount: note.links.length,
    dueDay: note.dueDay,
    dueTime: note.dueTime,
  }
}

const canvas = () => useCanvasStore.getState()

export const useNoteStore = create<NoteState>()((set, get) => {
  const save = (): void => {
    saveSoon.cancel()
    if (retryTimer) clearTimeout(retryTimer)
    retryTimer = null
    const note = get().note
    if (!note || !hasPending()) return
    const patch: NotePatch = { ...pending }
    const source = bodySource
    if (source) {
      delete patch.bodyJson
      // BlockNote can report a change that leaves the document as it was (say, on load).
      const json = source()
      if (json !== savedBody) patch.bodyJson = json
    }
    pending = {}
    bodySource = null
    if (Object.keys(patch).length === 0) {
      if (inFlight === 0) set({ status: 'saved' })
      return
    }
    inFlight++
    set({ status: 'saving' })

    window.sprawl.notes.update(note.id, patch).then(
      (saved) => {
        inFlight--
        const current = get().note
        if (current?.id === saved.id && patch.bodyJson !== undefined) savedBody = patch.bodyJson
        if (current?.id === saved.id) {
          // Keep local edits made while this save was out; take what main derived.
          set({
            note: {
              ...current,
              bodyText: saved.bodyText,
              checkTotal: saved.checkTotal,
              checkDone: saved.checkDone,
              attachCount: saved.attachCount,
              remindAt: saved.remindAt,
              remindedAt: saved.remindedAt,
              updatedAt: saved.updatedAt,
            },
          })
        }
        const { title: _title, ...fields } = cardFieldsOf(saved)
        canvas().syncNote(saved.id, fields)
        if (inFlight === 0 && !hasPending()) set({ status: 'saved' })
      },
      (err: unknown) => {
        inFlight--
        console.error('[note] save failed', err)
        if (get().note?.id !== note.id) return
        // A note deleted elsewhere can't be saved; there's nothing to retry.
        if (String(err).includes('missing note')) {
          pending = {}
          bodySource = null
          set({ status: 'saved' })
          return
        }
        // Put the patch back under anything newer, and try again.
        pending = { ...patch, ...pending }
        // A newer body (typed since) replaces the one that failed.
        if (bodySource) delete pending.bodyJson
        set({ status: 'error' })
        toast.error("Couldn't save. Retrying…", { id: 'note-save-error' })
        retryTimer = setTimeout(save, RETRY_MS)
      },
    )
  }
  const saveSoon = debounce(save, AUTOSAVE_MS)

  const queue = (patch: NotePatch, now = false): void => {
    pending = { ...pending, ...patch }
    set({ status: 'saving' })
    if (now) save()
    else saveSoon()
  }

  return {
    note: null,
    status: 'saved',

    open: async (id) => {
      if (get().note?.id === id) return
      save()
      const token = ++loadToken
      const note = await window.sprawl.notes.get(id)
      if (token !== loadToken) return
      savedBody = note.bodyJson
      hadCard = useCanvasStore.getState().cardOf(id) !== null
      set({ note, status: 'saved' })
    },

    close: () => {
      save()
      loadToken++
      set({ note: null, status: 'saved' })
    },

    edit: (patch) => {
      const note = get().note
      if (!note) return
      const touchesDue = 'dueDay' in patch || 'dueTime' in patch || 'remind' in patch
      let next: Note = { ...note, ...patch }
      if (touchesDue) {
        const due = normalizeDue(next)
        next = { ...next, ...due, remindAt: deriveRemindAt(due), remindedAt: null }
      }
      set({ note: next })
      canvas().syncNote(note.id, {
        title: next.title,
        dueDay: next.dueDay,
        dueTime: next.dueTime,
      })
      queue(patch, touchesDue)
    },

    bodyChanged: (serialize) => {
      if (!get().note) return
      bodySource = serialize
      set({ status: 'saving' })
      saveSoon()
    },

    setColor: (color) => {
      const note = get().note
      if (!note || note.color === color) return
      set({ note: { ...note, color } })
      const card = canvas().cardOf(note.id)
      if (card !== null) canvas().apply([{ op: 'setColor', id: card, color }])
      else queue({ color }, true)
    },

    addLink: async (url, label) => {
      const note = get().note
      if (!note) return
      const link = await window.sprawl.notes.links.add(note.id, url, label)
      setLinks(note.id, (links) => [...links, link])
    },

    updateLink: async (id, patch) => {
      const note = get().note
      if (!note) return
      const link = await window.sprawl.notes.links.update(id, patch)
      setLinks(note.id, (links) => links.map((l) => (l.id === id ? link : l)))
    },

    removeLink: async (id) => {
      const note = get().note
      if (!note) return
      setLinks(note.id, (links) => links.filter((l) => l.id !== id))
      await window.sprawl.notes.links.remove(id)
    },

    reorderLinks: async (ids) => {
      const note = get().note
      if (!note) return
      const byId = new Map(note.links.map((l) => [l.id, l]))
      setLinks(note.id, () => ids.flatMap((id) => byId.get(id) ?? []))
      const links = await window.sprawl.notes.links.reorder(note.id, ids)
      setLinks(note.id, () => links)
    },

    flush: save,
  }

  function setLinks(noteId: string, fn: (links: NoteLink[]) => NoteLink[]): void {
    const note = get().note
    if (note?.id !== noteId) return
    const links = fn(note.links)
    set({ note: { ...note, links } })
    canvas().syncNote(noteId, { linkCount: links.length })
  }
})

registerFlush(() => useNoteStore.getState().flush())

/** Whether the open note had a card when it was last checked (so losing it means a delete). */
let hadCard = false

/**
 * The card's title and color can change from the canvas while the panel is open (an inline
 * title edit, a color from the toolbar, undo); the panel follows them. If the card goes (a
 * delete, or undoing its create), the note went with it and the panel closes.
 */
useCanvasStore.subscribe((s, prev) => {
  if (s.items === prev.items) return
  const note = useNoteStore.getState().note
  if (!note) return
  const id = s.cardOf(note.id)
  const card = id === null ? undefined : s.items.get(id)?.note
  if (!card) {
    if (hadCard && s.ready) {
      hadCard = false
      pending = {}
      bodySource = null
      useUiStore.getState().closeNote()
    }
    return
  }
  hadCard = true
  const titleChanged = card.title !== note.title && !('title' in pending)
  if (card.color !== note.color || titleChanged) {
    useNoteStore.setState({
      note: { ...note, color: card.color, title: titleChanged ? card.title : note.title },
    })
  }
})
