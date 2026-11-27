import { beforeEach, describe, expect, it, vi } from 'vitest'

const get = vi.fn<(key: string) => Promise<unknown>>()
const set = vi.fn<(key: string, value: unknown) => Promise<void>>()
vi.stubGlobal('window', { sprawl: { settings: { get, set } } })

const { useSidebarStore } = await import('../../../../src/renderer/stores/sidebarStore')

beforeEach(() => {
  useSidebarStore.setState({ collapsed: false, loaded: false })
  get.mockReset()
  set.mockReset().mockResolvedValue(undefined)
})

describe('sidebarStore', () => {
  it('loads the saved choice once', async () => {
    get.mockResolvedValue(true)
    await useSidebarStore.getState().load()
    await useSidebarStore.getState().load()
    expect(get).toHaveBeenCalledTimes(1)
    expect(get).toHaveBeenCalledWith('sidebarCollapsed')
    expect(useSidebarStore.getState()).toMatchObject({ collapsed: true, loaded: true })
  })

  it('opens the sidebar when the setting cannot be read', async () => {
    get.mockRejectedValue(new Error('no'))
    await useSidebarStore.getState().load()
    expect(useSidebarStore.getState()).toMatchObject({ collapsed: false, loaded: true })
  })

  it('toggles and saves each choice', () => {
    useSidebarStore.getState().toggle()
    expect(useSidebarStore.getState().collapsed).toBe(true)
    useSidebarStore.getState().toggle()
    expect(useSidebarStore.getState().collapsed).toBe(false)
    expect(set.mock.calls).toEqual([
      ['sidebarCollapsed', true],
      ['sidebarCollapsed', false],
    ])
  })

  it('a toggle before the saved choice arrives wins', async () => {
    let answer: (v: boolean) => void = () => undefined
    get.mockReturnValue(new Promise((resolve) => (answer = resolve)))
    const loading = useSidebarStore.getState().load()
    useSidebarStore.getState().toggle()
    answer(false)
    await loading
    expect(useSidebarStore.getState().collapsed).toBe(true)
  })
})
