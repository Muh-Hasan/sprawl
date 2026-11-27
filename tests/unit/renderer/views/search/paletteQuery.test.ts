import { describe, expect, it } from 'vitest'
import type { NoteListRow } from '../../../../../src/shared/types'
import {
  matchesWords,
  noteContext,
  parseQuery,
} from '../../../../../src/renderer/views/search/paletteQuery'

/** A local wall-clock instant in November 2026; the 25th is a Wednesday. */
const local = (d: number, h: number) => new Date(2026, 10, d, h).getTime()
const NOW = local(25, 10)

const row = (fields: Partial<NoteListRow> = {}): NoteListRow => ({
  id: 'n',
  title: 'Note',
  color: 'stone',
  firstLine: '',
  checkTotal: 0,
  checkDone: 0,
  linkCount: 0,
  dueDay: null,
  dueTime: null,
  doneAt: null,
  createdAt: 0,
  updatedAt: 0,
  onCanvas: true,
  ...fields,
})

describe('parseQuery', () => {
  it('reads a search term, trimmed', () => {
    expect(parseQuery('  groceries ')).toEqual({ commandsOnly: false, term: 'groceries' })
    expect(parseQuery('')).toEqual({ commandsOnly: false, term: '' })
  })

  it('a leading > lists commands only, with or without a space after it', () => {
    expect(parseQuery('>')).toEqual({ commandsOnly: true, term: '' })
    expect(parseQuery('> zoom')).toEqual({ commandsOnly: true, term: 'zoom' })
    expect(parseQuery(' >list')).toEqual({ commandsOnly: true, term: 'list' })
  })

  it('keeps the case of the term (it can become a note title)', () => {
    expect(parseQuery('Call Sam').term).toBe('Call Sam')
  })
})

describe('matchesWords', () => {
  it('matches when every word starts a word of the text, ignoring case', () => {
    expect(matchesWords('Make text bigger', 'text big')).toBe(true)
    expect(matchesWords('Make text bigger', 'BIG')).toBe(true)
    expect(matchesWords('Go to daily log', 'log daily')).toBe(true)
  })

  it('does not match inside a word, or with a word missing', () => {
    expect(matchesWords('Zoom to fit', 'oom')).toBe(false)
    expect(matchesWords('Zoom to fit', 'zoom out')).toBe(false)
  })

  it('an empty term matches everything', () => {
    expect(matchesWords('Open settings', '')).toBe(true)
    expect(matchesWords('Open settings', '   ')).toBe(true)
  })
})

describe('noteContext', () => {
  it('done wins over a due date', () => {
    expect(noteContext(row({ doneAt: NOW, dueDay: '2026-11-20' }), NOW)).toBe('Done')
  })

  it('shows overdue, or when it is due', () => {
    expect(noteContext(row({ dueDay: '2026-11-24' }), NOW)).toBe('Overdue')
    expect(noteContext(row({ dueDay: '2026-11-25', dueTime: '09:00' }), NOW)).toBe('Overdue')
    expect(noteContext(row({ dueDay: '2026-11-25' }), NOW)).toBe('Due Today')
    expect(noteContext(row({ dueDay: '2026-11-27' }), NOW)).toBe('Due Fri')
  })

  it('otherwise says where the note lives', () => {
    expect(noteContext(row(), NOW)).toBe('Canvas')
    expect(noteContext(row({ onCanvas: false }), NOW)).toBe('List')
  })
})
