import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { CanvasApplyResult, CanvasOp } from '../../../../src/shared/types'

const apply = vi.fn<(ops: CanvasOp[]) => Promise<CanvasApplyResult>>()
const set = vi.fn<(key: string, value: unknown) => Promise<void>>()

// The store talks to main only through window.sprawl.
vi.stubGlobal('window', { sprawl: { canvas: { apply }, settings: { set } } })

const { canvasGrid, reduceOps, useCanvasStore } =
  await import('../../../../src/renderer/stores/canvasStore')

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
  apply.mockReset().mockResolvedValue({ created: [] })
  set.mockReset().mockResolvedValue(undefined)
  canvasGrid.clear()
  useCanvasStore.setState({ items: new Map(), viewport: { x: 0, y: 0, zoom: 1 } })
})
afterEach(() => vi.useRealTimers())

describe('reduceOps', () => {
  it('applies create, update and delete to a copy', () => {
    const empty = new Map()
    const one = reduceOps(empty, [create('a'), create('b')], 5)
    expect(empty.size).toBe(0)
    expect(one.get('a')).toMatchObject({ createdAt: 5, note: { title: 'a', color: 'stone' } })
    const two = reduceOps(one, [
      { op: 'update', id: 'a', patch: { x: 50 } },
      { op: 'delete', id: 'b' },
      { op: 'update', id: 'gone', patch: { x: 1 } },
    ])
    expect([...two.keys()]).toEqual(['a'])
    expect(two.get('a')?.x).toBe(50)
  })
})

describe('canvas store', () => {
  it('applies ops locally at once and sends them to main in one batch', async () => {
    const { apply: storeApply } = useCanvasStore.getState()
    storeApply([create('a')])
    storeApply([{ op: 'update', id: 'a', patch: { x: 700 } }])
    storeApply([create('b', 2000)])
    expect(useCanvasStore.getState().items.get('a')?.x).toBe(700)
    expect(apply).not.toHaveBeenCalled()
    await Promise.resolve()
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

  it('replaces optimistic copies with the rows main returns', async () => {
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
          note: { title: 'a', color: 'stone' },
        },
      ],
    })
    useCanvasStore.getState().apply([create('a')])
    await vi.waitFor(() => expect(useCanvasStore.getState().items.get('a')?.createdAt).toBe(42))
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
