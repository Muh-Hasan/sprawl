import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { openDatabase, type DbHandle } from '../../../../src/main/db/client'
import { NotesService } from '../../../../src/main/services/notes'
import { localInstant } from '../../../../src/shared/due'

let handle: DbHandle
let now = 0
let notes: NotesService

beforeEach(() => {
  handle = openDatabase(':memory:')
  now = new Date(2026, 10, 25, 10, 0).getTime()
  notes = new NotesService({ db: () => handle, now: () => now })
  notes.create({ id: 'n1', title: 'Plan', color: 'stone' })
})
afterEach(() => handle.close())

const rows = (sql: string): unknown[] => handle.sqlite.prepare(sql).all()

const body = JSON.stringify([
  { type: 'paragraph', content: [{ type: 'text', text: 'Intro', styles: {} }], children: [] },
  { type: 'checkListItem', props: { checked: true }, content: [], children: [] },
  { type: 'checkListItem', props: { checked: false }, content: [], children: [] },
  { type: 'image', props: { url: 'x' }, children: [] },
])

describe('notes.update: the body', () => {
  it('stores the body and derives the text and counts in the same save', () => {
    const note = notes.update('n1', { bodyJson: body })
    expect(note).toMatchObject({
      bodyJson: body,
      bodyText: 'Intro',
      checkTotal: 2,
      checkDone: 1,
      attachCount: 1,
    })
  })

  it('leaves the derived fields alone when the patch has no body', () => {
    notes.update('n1', { bodyJson: body })
    expect(notes.update('n1', { title: 'New' })).toMatchObject({ title: 'New', checkTotal: 2 })
  })
})

describe('notes.update: due date and reminder', () => {
  it('derives remind_at from the day, time and reminder', () => {
    const note = notes.update('n1', { dueDay: '2026-11-28', dueTime: '15:00', remind: '1h' })
    expect(note).toMatchObject({ dueDay: '2026-11-28', dueTime: '15:00', remind: '1h' })
    expect(note.remindAt).toBe(localInstant('2026-11-28', '14:00'))
  })

  it('re-derives when only one field changes', () => {
    notes.update('n1', { dueDay: '2026-11-28', dueTime: '15:00', remind: 'at' })
    expect(notes.update('n1', { dueTime: '16:30' }).remindAt).toBe(
      localInstant('2026-11-28', '16:30'),
    )
    expect(notes.update('n1', { remind: 'morning' }).remindAt).toBe(
      localInstant('2026-11-28', '09:00'),
    )
  })

  it('resets a time-based reminder to none when the time is cleared', () => {
    notes.update('n1', { dueDay: '2026-11-28', dueTime: '15:00', remind: '15m' })
    const note = notes.update('n1', { dueTime: null })
    expect(note).toMatchObject({ dueTime: null, remind: 'none', remindAt: null })
  })

  it('keeps a morning reminder when the time is cleared', () => {
    notes.update('n1', { dueDay: '2026-11-28', dueTime: '15:00', remind: '1d' })
    expect(notes.update('n1', { dueTime: null })).toMatchObject({
      remind: '1d',
      remindAt: localInstant('2026-11-27', '09:00'),
    })
  })

  it('clearing the day clears the time and reminder', () => {
    notes.update('n1', { dueDay: '2026-11-28', dueTime: '15:00', remind: 'at' })
    expect(notes.update('n1', { dueDay: null })).toMatchObject({
      dueDay: null,
      dueTime: null,
      remind: 'none',
      remindAt: null,
    })
  })

  it('a change re-arms a fired reminder; saving the same values does not', () => {
    notes.update('n1', { dueDay: '2026-11-28', remind: 'morning' })
    handle.sqlite.prepare("UPDATE notes SET reminded_at = 5 WHERE id = 'n1'").run()
    expect(notes.update('n1', { dueDay: '2026-11-28', remind: 'morning' }).remindedAt).toBe(5)
    expect(notes.update('n1', { dueDay: '2026-11-29' }).remindedAt).toBeNull()
  })

  it('refuses a deleted note', () => {
    notes.remove('n1')
    expect(() => notes.update('n1', { dueDay: '2026-11-28' })).toThrow(/missing note/)
  })
})

describe('note_activity', () => {
  it('marks the note active on the day of every save, once a day', () => {
    notes.update('n1', { title: 'a' })
    notes.update('n1', { title: 'b' })
    now += 24 * 60 * 60 * 1000
    notes.update('n1', { title: 'c' })
    expect(rows("SELECT day FROM note_activity WHERE note_id = 'n1' ORDER BY day")).toEqual([
      { day: '2026-11-25' },
      { day: '2026-11-26' },
    ])
  })

  it('counts link changes as activity', () => {
    notes.addLink('n1', 'https://a.dev', null)
    expect(rows('SELECT * FROM note_activity')).toHaveLength(1)
  })
})

describe('note links', () => {
  it('adds links at the end, and get() returns them in order', () => {
    const a = notes.addLink('n1', 'https://a.dev', null)
    const b = notes.addLink('n1', 'https://b.dev', 'B')
    expect([a.position, b.position]).toEqual([0, 1])
    expect(notes.get('n1').links.map((l) => l.url)).toEqual(['https://a.dev', 'https://b.dev'])
  })

  it('updates the url and label, and removes', () => {
    const a = notes.addLink('n1', 'https://a.dev', null)
    expect(notes.updateLink(a.id, { label: 'Docs' })).toMatchObject({
      url: 'https://a.dev',
      label: 'Docs',
    })
    expect(notes.updateLink(a.id, { url: 'https://c.dev', label: null })).toMatchObject({
      url: 'https://c.dev',
      label: null,
    })
    notes.removeLink(a.id)
    expect(notes.get('n1').links).toEqual([])
    expect(() => notes.updateLink(a.id, { label: 'x' })).toThrow(/No such link/)
  })

  it('reorders, and refuses an order that leaves links out or adds others', () => {
    const [a, b, c] = ['a', 'b', 'c'].map((k) => notes.addLink('n1', `https://${k}.dev`, null))
    const ids = notes.reorderLinks('n1', [c!.id, a!.id, b!.id]).map((l) => l.id)
    expect(ids).toEqual([c!.id, a!.id, b!.id])
    expect(notes.get('n1').links.map((l) => l.position)).toEqual([0, 1, 2])
    expect(() => notes.reorderLinks('n1', [a!.id, b!.id])).toThrow(/every link/)
    notes.create({ id: 'n2', title: 'Other', color: 'stone' })
    const other = notes.addLink('n2', 'https://z.dev', null)
    expect(() => notes.reorderLinks('n1', [a!.id, b!.id, other.id])).toThrow(/every link/)
    // A refused order changes nothing.
    expect(notes.get('n1').links.map((l) => l.id)).toEqual([c!.id, a!.id, b!.id])
  })

  it('refuses links on a deleted note', () => {
    notes.addLink('n1', 'https://a.dev', null)
    notes.remove('n1')
    expect(() => notes.addLink('n1', 'https://b.dev', null)).toThrow(/missing note/)
  })
})
