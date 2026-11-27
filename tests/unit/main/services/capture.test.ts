import { afterAll, afterEach, beforeEach, describe, expect, it } from 'vitest'
import { openDatabase, type DbHandle } from '../../../../src/main/db/client'
import { CanvasService } from '../../../../src/main/services/canvas'
import { CaptureService, viewCenterOf } from '../../../../src/main/services/capture'
import { LogService } from '../../../../src/main/services/log'
import { NotesService } from '../../../../src/main/services/notes'
import { localInstant } from '../../../../src/shared/due'

const savedTz = process.env['TZ']
afterAll(() => {
  if (savedTz === undefined) delete process.env['TZ']
  else process.env['TZ'] = savedTz
})

let handle: DbHandle
let now = 0
let notes: NotesService
let canvas: CanvasService
let log: LogService
let capture: CaptureService

beforeEach(() => {
  process.env['TZ'] = 'Europe/London'
  handle = openDatabase(':memory:')
  now = localInstant('2026-11-25', '10:00') // a Wednesday
  const deps = { db: () => handle, now: () => now }
  notes = new NotesService(deps)
  canvas = new CanvasService(deps)
  log = new LogService(deps)
  capture = new CaptureService({
    ...deps,
    canvas,
    log,
    viewCenter: () => ({ x: 400, y: 300 }),
  })
})
afterEach(() => handle.close())

describe('a note capture', () => {
  it('makes a note on the canvas with its due date, time and an "at" reminder', () => {
    const { noteId } = capture.submit('note', 'Pay rent !fri 10:00\nto Sam')
    const note = notes.get(noteId!)
    expect(note).toMatchObject({
      title: 'Pay rent',
      bodyText: 'to Sam',
      dueDay: '2026-11-27',
      dueTime: '10:00',
      remind: 'at',
      remindAt: localInstant('2026-11-27', '10:00'),
      onCanvas: true,
    })
    expect(canvas.cardOf(noteId!)).toMatchObject({ x: 280, y: 272, w: 240, h: 64 })
  })

  it('sets no reminder for a day without a time, and nothing without a token', () => {
    const a = notes.get(capture.submit('note', 'Gym !tomorrow').noteId!)
    expect(a).toMatchObject({ title: 'Gym', dueDay: '2026-11-26', dueTime: null, remind: 'none' })
    const b = notes.get(capture.submit('note', 'Just a thought!').noteId!)
    expect(b).toMatchObject({ title: 'Just a thought!', dueDay: null, remind: 'none' })
  })

  it('fans captures out 40px down and right instead of stacking them', () => {
    const spots: { x: number; y: number }[] = []
    for (let i = 0; i < 10; i++) {
      const { x, y } = canvas.cardOf(capture.submit('note', `n${i}`).noteId!)!
      spots.push({ x, y })
    }
    expect(spots.slice(0, 3)).toEqual([
      { x: 280, y: 272 },
      { x: 320, y: 312 },
      { x: 360, y: 352 },
    ])
    expect(new Set(spots.map((s) => `${s.x},${s.y}`)).size).toBe(10)
  })

  it('goes back to the middle once the spot there is free again', () => {
    const first = canvas.cardOf(capture.submit('note', 'a').noteId!)!
    canvas.apply([{ op: 'update', id: first.id, patch: { x: 1000, y: 1000 } }])
    expect(canvas.cardOf(capture.submit('note', 'b').noteId!)).toMatchObject({ x: 280, y: 272 })
  })

  it('stacks new captures on top', () => {
    const a = canvas.cardOf(capture.submit('note', 'a').noteId!)!
    const b = canvas.cardOf(capture.submit('note', 'b').noteId!)!
    expect(b.z).toBeGreaterThan(a.z)
  })
})

describe('a log capture', () => {
  it("adds the text to today's log at the current time, lines joined", () => {
    expect(capture.submit('log', 'Called the bank\n  about the card ')).toEqual({ ok: true })
    const [entry] = log.day('2026-11-25').entries
    expect(entry).toMatchObject({ kind: 'manual', text: 'Called the bank about the card', at: now })
    expect(notes.list({ tab: 'all', colors: [], text: '', sort: 'edited' })).toEqual([])
  })

  it('keeps a !date as text', () => {
    capture.submit('log', 'Booked it !fri')
    expect(log.day('2026-11-25').entries[0]?.text).toBe('Booked it !fri')
  })
})

describe('viewCenterOf', () => {
  it('turns the middle of the canvas into world coordinates', () => {
    expect(viewCenterOf({ x: 0, y: 0, zoom: 1 }, { width: 800, height: 600 })).toEqual({
      x: 400,
      y: 300,
    })
    expect(viewCenterOf({ x: -200, y: 100, zoom: 2 }, { width: 800, height: 600 })).toEqual({
      x: 300,
      y: 100,
    })
  })
})
