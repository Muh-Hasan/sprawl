import { describe, expect, it } from 'vitest'
import type { CanvasOp } from '../../../../src/shared/types'
import { History, HISTORY_LIMIT } from '../../../../src/renderer/stores/historyStore'

const step = (id: string): CanvasOp[] => [{ op: 'delete', id }]

describe('History', () => {
  it('keeps the latest 200 steps', () => {
    const history = new History()
    for (let i = 0; i < 250; i++) history.record(step(`c${i}`))
    expect(HISTORY_LIMIT).toBe(200)
    expect(history.undoSize).toBe(200)
    const undone: string[] = []
    for (let entry = history.takeUndo(); entry; entry = history.takeUndo()) {
      undone.push((entry.ops[0] as { id: string }).id)
    }
    expect(undone[0]).toBe('c249')
    expect(undone.at(-1)).toBe('c50')
  })

  it('caps redo too, and a new step clears redo', () => {
    const history = new History(3)
    for (let i = 0; i < 5; i++) history.pushRedo(step(`r${i}`))
    expect(history.redoSize).toBe(3)
    history.record(step('new'))
    expect(history.redoSize).toBe(0)
    history.pushUndo(step('redone'))
    expect(history.undoSize).toBe(2)
  })

  it('finds and removes a step by id', () => {
    const history = new History()
    const first = history.record(step('a'))
    const second = history.record(step('b'))
    expect(history.isLatest(second)).toBe(true)
    expect(history.isLatest(first)).toBe(false)
    expect(history.remove(first)?.ops).toEqual(step('a'))
    expect(history.remove(first)).toBeUndefined()
    expect(history.undoSize).toBe(1)
  })
})

describe('History ids', () => {
  it('keeps a step id through undo and redo', () => {
    const history = new History()
    const id = history.record(step('a'))
    const undone = history.takeUndo()!
    history.pushRedo(step('a-inverse'), undone.id)
    const redone = history.takeRedo()!
    history.pushUndo(step('a'), redone.id)
    expect(history.isLatest(id)).toBe(true)
  })
})
