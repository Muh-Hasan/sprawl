import type { Page } from '@playwright/test'
import type { CanvasOp } from '../../src/shared/types'
import { expect, relaunch, test } from './fixtures'
import { CanvasPage } from './pages/CanvasPage'

/** Creates note cards through the real IPC, then reloads so the canvas loads them. */
async function seed(page: Page, cards: { id: string; x: number; y: number }[]): Promise<void> {
  const ops: CanvasOp[] = cards.map((c, i) => ({
    op: 'create',
    item: {
      id: c.id,
      kind: 'note',
      refId: `n-${c.id}`,
      url: null,
      title: null,
      x: c.x,
      y: c.y,
      w: 220,
      h: 96,
      z: i,
    },
    note: { id: `n-${c.id}`, title: `Card ${c.id}`, color: 'sand' },
  }))
  await page.evaluate((batch) => self.sprawl.canvas.apply(batch), ops)
  await page.reload()
}

test.describe('canvas viewport', () => {
  let canvas: CanvasPage
  test.beforeEach(async ({ window }) => {
    canvas = new CanvasPage(window)
    await canvas.ready()
  })

  test('dragging the background with space held pans it', async ({ window }) => {
    const before = await canvas.viewport()
    await canvas.drag(120, 80) // no space: the Select tool doesn't pan
    expect(await canvas.viewport()).toEqual(before)

    await window.keyboard.down('Space')
    await expect(canvas.root).toHaveClass(/cursor-grab/)
    await canvas.drag(120, 80)
    await window.keyboard.up('Space')
    await expect(canvas.root).toHaveClass(/cursor-default/)
    await expect
      .poll(() => canvas.viewport())
      .toEqual({
        x: before.x + 120,
        y: before.y + 80,
        zoom: 1,
      })
  })

  test('the Hand tool, a middle-mouse drag and the wheel pan too', async ({ window }) => {
    await window.keyboard.press('KeyH')
    await expect(window.getByTestId('tool-hand')).toHaveAttribute('aria-pressed', 'true')
    await canvas.drag(-50, 30)
    await expect.poll(() => canvas.viewport()).toMatchObject({ x: -50, y: 30 })

    await window.getByTestId('tool-select').click()
    await expect(window.getByTestId('tool-select')).toHaveAttribute('aria-pressed', 'true')
    await canvas.drag(40, 40, 'middle')
    await expect.poll(() => canvas.viewport()).toMatchObject({ x: -10, y: 70 })

    const c = await canvas.center()
    await window.mouse.move(c.x, c.y)
    await window.mouse.wheel(0, 100)
    await expect.poll(() => canvas.viewport()).toEqual({ x: -10, y: -30, zoom: 1 })
  })

  test('Ctrl+scroll zooms around the cursor and changes the percentage', async () => {
    await expect(canvas.zoomLabel).toHaveText('100%')
    const box = (await canvas.root.boundingBox())!
    const at = { x: box.x + 300, y: box.y + 200 }
    const local = { x: 300, y: 200 }

    await canvas.ctrlWheel(at, -100, 3)
    await expect(canvas.zoomLabel).not.toHaveText('100%')
    const zoomedIn = await canvas.viewport()
    expect(zoomedIn.zoom).toBeGreaterThan(1)
    // The world point under the cursor (300, 200 at 100%) stays put.
    expect((local.x - zoomedIn.x) / zoomedIn.zoom).toBeCloseTo(300, 6)
    expect((local.y - zoomedIn.y) / zoomedIn.zoom).toBeCloseTo(200, 6)
    await expect(canvas.zoomLabel).toHaveText(`${Math.round(zoomedIn.zoom * 100)}%`)

    await canvas.ctrlWheel(at, 100, 40)
    await expect(canvas.zoomLabel).toHaveText('10%')
  })

  test('zoom shortcuts and the zoom pill step between 10% and 400%', async ({ window }) => {
    await window.keyboard.press('Control+Equal')
    await expect(canvas.zoomLabel).toHaveText('110%')
    await window.keyboard.press('Control+Minus')
    await window.keyboard.press('Control+Minus')
    await expect(canvas.zoomLabel).toHaveText('90%')
    await window.keyboard.press('Control+Digit0')
    await expect(canvas.zoomLabel).toHaveText('100%')

    for (let i = 0; i < 20; i++) await window.getByTestId('zoom-in').click()
    await expect(canvas.zoomLabel).toHaveText('400%')
    for (let i = 0; i < 20; i++) await window.getByTestId('zoom-out').click()
    await expect(canvas.zoomLabel).toHaveText('10%')
    await canvas.zoomLabel.click()
    await expect(canvas.zoomLabel).toHaveText('100%')

    // The page itself never zooms (ARCHITECTURE §2).
    expect(await window.evaluate(() => self.visualViewport?.scale ?? 1)).toBe(1)
  })

  test('the viewport is restored after relaunch', async ({
    app,
    window,
    dirs,
    consoleProblems,
  }) => {
    await window.keyboard.down('Space')
    await canvas.drag(-200, 150)
    await window.keyboard.up('Space')
    await canvas.ctrlWheel(await canvas.center(), -100, 2)
    const moved = await canvas.viewport()
    expect(moved.zoom).toBeGreaterThan(1)
    // Saved once it stops moving; never on every frame.
    await expect.poll(() => canvas.savedViewport()).toEqual(moved)
    await app.close()

    await relaunch(dirs, consoleProblems, async (_app, page) => {
      const again = new CanvasPage(page)
      await again.ready()
      await expect.poll(() => again.viewport()).toEqual(moved)
      await expect(again.zoomLabel).toHaveText(`${Math.round(moved.zoom * 100)}%`)
    })
  })

  test('only cards near the view are rendered, simplified below 40%', async ({ window }) => {
    await seed(window, [
      { id: 'near', x: 100, y: 100 },
      { id: 'far', x: 6000, y: 100 },
    ])
    await canvas.ready()
    const cards = window.getByTestId('note-card')
    await expect(cards).toHaveCount(1)
    await expect(cards.first()).toHaveAttribute('data-id', 'near')
    await expect(cards.first()).toContainText('Card near')
    await expect(cards.first()).not.toHaveAttribute('data-simplified')

    // Zoom out until both are in view: they switch to the simplified rendering.
    await canvas.ctrlWheel(await canvas.center(), 100, 30)
    await expect(cards).toHaveCount(2)
    for (const card of await cards.all()) await expect(card).toHaveAttribute('data-simplified')
  })

  test('Shift+1 zooms to fit every card', async ({ window }) => {
    await seed(window, [
      { id: 'a', x: -3000, y: -400 },
      { id: 'b', x: 2780, y: 304 },
    ])
    await canvas.ready()
    await window.keyboard.press('Shift+Digit1')
    // Bounds are 6000 × 800 world px around (0, 0); once the 240ms animation ends, (0, 0) is
    // in the middle of the canvas and the zoom fits the 6000px width.
    const size = (await canvas.root.boundingBox())!
    await expect
      .poll(async () => {
        const vp = await canvas.viewport()
        return [Math.round(vp.x), Math.round(vp.y), Number(vp.zoom.toFixed(4))]
      })
      .toEqual([
        Math.round(size.width / 2),
        Math.round(size.height / 2),
        Number(((size.width - 128) / 6000).toFixed(4)),
      ])
    await expect(window.getByTestId('note-card')).toHaveCount(2)
  })

  test('main rejects invalid canvas ops and keeps the batch atomic', async ({ window }) => {
    const errors = await window.evaluate(async () => {
      const api = self.sprawl.canvas as unknown as { apply(ops: unknown): Promise<unknown> }
      const attempt = async (ops: unknown) => {
        try {
          await api.apply(ops)
          return null
        } catch (err) {
          return String(err)
        }
      }
      return [
        await attempt([]),
        await attempt([{ op: 'delete', id: '../../etc' }]),
        await attempt([{ op: 'update', id: 'x', patch: { x: 'far' } }]),
        await attempt('DROP TABLE notes'),
      ]
    })
    for (const error of errors) expect(error).toMatch(/\[invalid-input\] canvas:apply/)
    expect(await window.evaluate(() => self.sprawl.canvas.load())).toEqual([])
  })
})
