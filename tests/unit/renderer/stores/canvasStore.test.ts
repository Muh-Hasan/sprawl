import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { CanvasApplyResult, CanvasOp } from '../../../../src/shared/types'
import { cardNote } from '../../helpers/cardNote'

const apply = vi.fn<(ops: CanvasOp[]) => Promise<CanvasApplyResult>>()
const set = vi.fn<(key: string, value: unknown) => Promise<void>>()
const update = vi.fn<(id: string, patch: unknown) => Promise<unknown>>()
/** Every call to main, in order. */
const calls: string[] = []

// The store talks to main only through window.sprawl.
vi.stubGlobal('window', { sprawl: { canvas: { apply }, settings: { set }, notes: { update } } })

const { canvasGrid, useCanvasStore } = await import('../../../../src/renderer/stores/canvasStore')
const { canvasHistory } = await import('../../../../src/renderer/stores/historyStore')
const { useSelectionStore } = await import('../../../../src/renderer/stores/selectionStore')

const create = (id: string, x = 0): CanvasOp => ({
  op: 'create',
  item: {
    id,
    kind: 'note',
    refId: `n-${id}`,
    url: null,
    title: null,
    x,
    y: 0,
    w: 220,
    h: 96,
    z: 1,
  },
  note: { id: `n-${id}`, title: id, color: 'stone' },
})

beforeEach(() => {
  calls.length = 0
  apply.mockReset().mockImplementation(async (ops) => {
    calls.push(`apply:${ops.map((op) => op.op).join(',')}`)
    return { created: [] }
  })
  set.mockReset().mockResolvedValue(undefined)
  update.mockReset().mockImplementation(async (id) => {
    calls.push(`update:${id}`)
    return {}
  })
  canvasGrid.clear()
  canvasHistory.clear()
  useCanvasStore.setState({ items: new Map(), viewport: { x: 0, y: 0, zoom: 1 } })
  useSelectionStore.setState({ selected: new Set(), transient: null, gesture: null })
})
afterEach(() => vi.useRealTimers())

/** Lets the queued batch go out. */
const tick = () => Promise.resolve()
const items = () => useCanvasStore.getState().items

describe('canvas store', () => {
  it('applies ops locally at once and sends them to main in one batch', async () => {
    const { apply: storeApply } = useCanvasStore.getState()
    storeApply([create('a')])
    storeApply([{ op: 'update', id: 'a', patch: { x: 700 } }])
    storeApply([create('b', 2000)])
    expect(items().get('a')?.x).toBe(700)
    expect(apply).not.toHaveBeenCalled()
    await tick()
    expect(apply).toHaveBeenCalledTimes(1)
    expect(apply.mock.calls[0]?.[0].map((op) => op.op)).toEqual(['create', 'update', 'create'])
  })

  it('keeps the spatial grid in step with the items', () => {
    const { apply: storeApply } = useCanvasStore.getState()
    storeApply([create('a'), create('b', 5000)])
    storeApply([
      { op: 'update', id: 'a', patch: { x: 5000 } },
      { op: 'delete', id: 'b' },
    ])
    expect([...canvasGrid.query({ x: 0, y: 0, w: 1000, h: 1000 })]).toEqual([])
    expect([...canvasGrid.query({ x: 4900, y: 0, w: 1000, h: 1000 })]).toEqual(['a'])
  })

  it('takes the timestamps main returns, keeping what changed locally since', async () => {
    apply.mockResolvedValueOnce({
      created: [
        {
          id: 'a',
          kind: 'note',
          refId: 'n-a',
          url: null,
          title: null,
          x: 0,
          y: 0,
          w: 220,
          h: 96,
          z: 1,
          createdAt: 42,
          updatedAt: 42,
          note: cardNote({ title: 'a', color: 'stone', preview: '' }),
        },
      ],
    })
    useCanvasStore.getState().apply([create('a')])
    useCanvasStore.getState().apply([{ op: 'update', id: 'a', patch: { x: 64 } }])
    await vi.waitFor(() => expect(items().get('a')?.createdAt).toBe(42))
    expect(items().get('a')?.x).toBe(64)
  })

  it('debounces viewport saves, and flush saves at once', () => {
    vi.useFakeTimers()
    const { setViewport, flush } = useCanvasStore.getState()
    for (let i = 1; i <= 30; i++) setViewport({ x: i, y: 0, zoom: 1 })
    expect(set).not.toHaveBeenCalled()
    vi.advanceTimersByTime(500)
    expect(set).toHaveBeenCalledTimes(1)
    expect(set).toHaveBeenLastCalledWith('viewport', { x: 30, y: 0, zoom: 1 })
    setViewport({ x: 99, y: 1, zoom: 2 })
    flush()
    expect(set).toHaveBeenCalledTimes(2)
    expect(set).toHaveBeenLastCalledWith('viewport', { x: 99, y: 1, zoom: 2 })
  })
})

describe('undo and redo', () => {
  it('undoes a create with a delete, and redoes it with a restore of the same card', async () => {
    const { apply: storeApply, undo, redo } = useCanvasStore.getState()
    storeApply([create('a')])
    storeApply([{ op: 'update', id: 'a', patch: { x: 40 } }])
    await tick()

    undo()
    expect(items().get('a')?.x).toBe(0)
    undo()
    expect(items().has('a')).toBe(false)
    redo()
    expect(items().get('a')).toMatchObject({ x: 0, note: { title: 'a', color: 'stone' } })
    redo()
    expect(items().get('a')?.x).toBe(40)
    await tick()
    expect(calls).toEqual(['apply:create,update', 'apply:update,delete,restore,update'])
    expect(apply.mock.calls[1]?.[0][2]).toMatchObject({ op: 'restore', item: { id: 'a', x: 0 } })
  })

  it('drops the redo steps when a new step is made, and prunes the selection', () => {
    const { apply: storeApply, undo, redo } = useCanvasStore.getState()
    storeApply([create('a')])
    useSelectionStore.getState().select(['a'])
    undo()
    expect(useSelectionStore.getState().selected.size).toBe(0)
    storeApply([create('b')])
    redo()
    expect(items().has('a')).toBe(false)
  })

  it("a toast's Undo takes back its own step even after later ones", () => {
    const { apply: storeApply, undoStep } = useCanvasStore.getState()
    storeApply([create('a'), create('b', 500)])
    const deleted = storeApply([{ op: 'delete', id: 'a' }])
    storeApply([{ op: 'update', id: 'b', patch: { x: 900 } }])
    undoStep(deleted!)
    expect(items().get('a')?.note?.title).toBe('a')
    expect(items().get('b')?.x).toBe(900)
    // Undoing the restore is a step of its own.
    useCanvasStore.getState().undo()
    expect(items().has('a')).toBe(false)
  })

  it('records nothing when asked not to', () => {
    useCanvasStore.getState().apply([create('a')], { record: false })
    expect(canvasHistory.undoSize).toBe(0)
  })
})

describe('gestures', () => {
  it("doesn't write to the DB during a drag, then writes one batch on pointerup", async () => {
    useCanvasStore.getState().apply([create('a'), create('b', 300)])
    await tick()
    apply.mockClear()

    const sel = useSelectionStore.getState()
    sel.beginGesture(
      'move',
      new Map([
        ['a', { x: 0, y: 0, w: 220, h: 96 }],
        ['b', { x: 300, y: 0, w: 220, h: 96 }],
      ]),
    )
    for (let i = 1; i <= 60; i++) {
      sel.setTransient(
        new Map([
          ['a', { x: i * 4, y: i, w: 220, h: 96 }],
          ['b', { x: 300 + i * 4, y: i, w: 220, h: 96 }],
        ]),
      )
      await tick()
    }
    expect(apply).not.toHaveBeenCalled()
    expect(items().get('a')?.x).toBe(0) // the stored rects don't move until the end

    useSelectionStore.getState().commitGesture()
    await tick()
    expect(apply).toHaveBeenCalledTimes(1)
    expect(apply.mock.calls[0]?.[0]).toEqual([
      { op: 'update', id: 'a', patch: { x: 240, y: 60 } },
      { op: 'update', id: 'b', patch: { x: 540, y: 60 } },
    ])
    expect(useSelectionStore.getState().transient).toBeNull()

    useCanvasStore.getState().undo()
    expect(items().get('b')?.x).toBe(300)
  })

  it('writes nothing for a cancelled gesture or one that ends where it began', async () => {
    useCanvasStore.getState().apply([create('a')])
    await tick()
    apply.mockClear()
    const sel = useSelectionStore.getState()
    sel.beginGesture('resize', new Map([['a', { x: 0, y: 0, w: 220, h: 96 }]]))
    sel.setTransient(new Map([['a', { x: 0, y: 0, w: 400, h: 96 }]]))
    sel.cancelGesture()
    sel.beginGesture('nudge', new Map([['a', { x: 0, y: 0, w: 220, h: 96 }]]))
    sel.commitGesture()
    await tick()
    expect(apply).not.toHaveBeenCalled()
    expect(canvasHistory.undoSize).toBe(1)
  })
})

describe('renameNote', () => {
  it('updates the card at once and sends the title after the queued create', async () => {
    const { apply: storeApply, renameNote } = useCanvasStore.getState()
    storeApply([create('a')])
    renameNote('a', 'Groceries')
    expect(items().get('a')?.note?.title).toBe('Groceries')
    await tick()
    expect(calls).toEqual(['apply:create', 'update:n-a'])
    expect(update).toHaveBeenCalledWith('n-a', { title: 'Groceries' })
    renameNote('a', 'Groceries')
    expect(update).toHaveBeenCalledTimes(1)
  })
})
