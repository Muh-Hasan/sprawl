import { expect, relaunch, test } from './fixtures'
import { CanvasPage } from './pages/CanvasPage'

test.describe('notes on the canvas', () => {
  let canvas: CanvasPage
  test.beforeEach(async ({ window }) => {
    canvas = new CanvasPage(window)
    await canvas.ready()
  })

  test('double-click makes a note, typing names it, drag moves it, and it survives a relaunch', async ({
    app,
    window,
    dirs,
    consoleProblems,
  }) => {
    await window.evaluate(() => {
      const log: string[] = ((self as unknown as { __log: string[] }).__log = [])
      document.addEventListener(
        'scroll',
        (e) => {
          const t = e.target as HTMLElement
          log.push(
            `scroll ${t.dataset?.testid ?? t.tagName ?? 'doc'} ${t.scrollLeft},${t.scrollTop}`,
          )
        },
        true,
      )
      for (const type of ['pointerdown', 'focusin', 'animationstart', 'animationend']) {
        document.addEventListener(
          type,
          (e) => {
            const t = e.target as HTMLElement
            log.push(
              `${Math.round(performance.now())} ${type} ${t.dataset?.testid ?? t.tagName} ${(e as MouseEvent).clientX ?? ''},${(e as MouseEvent).clientY ?? ''}`,
            )
          },
          true,
        )
      }
    })
    const at = await canvas.pagePoint(400, 300)
    await window.mouse.dblclick(at.x, at.y)
    await expect(canvas.cards).toHaveCount(1)
    await expect(canvas.titleInput).toBeFocused()
    await window.keyboard.type('Homepage redo')
    await window.keyboard.press('Enter')
    const card = canvas.card('Homepage redo')
    await expect(card).toBeVisible()
    await expect(card).toHaveAttribute('data-selected', 'true')

    // Centered on the click, on the 8px grid.
    await expect
      .poll(async () => (await canvas.stored())[0])
      .toMatchObject({
        x: 280,
        y: 272,
        w: 240,
        h: 64,
        note: { title: 'Homepage redo', color: 'stone' },
      })

    console.log(
      'BOX',
      JSON.stringify(await card.boundingBox()),
      JSON.stringify(await canvas.viewport()),
    )
    await canvas.dragCard(card, 101, 59)
    console.log(
      'LOG',
      (await window.evaluate(() => (self as unknown as { __log: string[] }).__log)).join(' || '),
    )
    // Snapped: the card's corner lands on the grid.
    await expect.poll(async () => (await canvas.stored())[0]).toMatchObject({ x: 384, y: 328 })

    // Alt skips the snap.
    const box = (await card.boundingBox())!
    await canvas.dragBetween({ x: box.x + 20, y: box.y + 6 }, { x: box.x + 23, y: box.y + 11 }, [
      'Alt',
    ])
    await expect.poll(async () => (await canvas.stored())[0]).toMatchObject({ x: 387, y: 333 })

    await app.close()
    await relaunch(dirs, consoleProblems, async (_app, page) => {
      const again = new CanvasPage(page)
      await again.ready()
      await expect(again.card('Homepage redo')).toBeVisible()
      expect((await again.stored())[0]).toMatchObject({ x: 387, y: 333 })
    })
  })

  test('the Note tool, Ctrl+N and pasting text make notes', async ({ app, window }) => {
    await window.keyboard.press('KeyN')
    await expect(window.getByTestId('tool-note')).toHaveAttribute('aria-pressed', 'true')
    await expect(canvas.root).toHaveClass(/cursor-crosshair/)
    const at = await canvas.pagePoint(300, 300)
    await window.mouse.click(at.x, at.y)
    await expect(canvas.titleInput).toBeFocused()
    await window.keyboard.type('From the tool')
    await window.keyboard.press('Enter')
    // The tool goes back to Select after one note.
    await expect(window.getByTestId('tool-select')).toHaveAttribute('aria-pressed', 'true')

    await window.keyboard.press('Control+KeyN')
    await expect(canvas.titleInput).toBeFocused()
    await window.keyboard.type('From Ctrl+N')
    await window.keyboard.press('Escape') // Esc keeps the old (empty) title
    await expect(canvas.cards).toHaveCount(2)
    await expect(canvas.cards.getByText('Untitled')).toBeVisible()

    await app.evaluate(({ clipboard }) => clipboard.writeText('Groceries\neggs\nmilk'))
    await canvas.root.click({ position: { x: 200, y: 520 } }) // clear the selection, focus the board
    await window.keyboard.press('Control+KeyV')
    const pasted = canvas.card('Groceries')
    await expect(pasted).toBeVisible()
    await expect(pasted.getByTestId('note-card-preview')).toHaveText('eggs\nmilk')
    await expect(canvas.cards).toHaveCount(3)

    // It lands under the pointer, and pasting there again fans out 40px instead of stacking.
    const spot = async (title: string) => {
      const item = (await canvas.stored()).find((i) => i.note?.title === title)
      return item && { x: item.x, y: item.y }
    }
    await expect.poll(() => spot('Groceries')).toEqual({ x: 80, y: 488 })
    await app.evaluate(({ clipboard }) => clipboard.writeText('Errands'))
    await canvas.root.click({ position: { x: 200, y: 520 } })
    await window.keyboard.press('Control+KeyV')
    await expect.poll(() => spot('Errands')).toEqual({ x: 120, y: 528 })
  })

  test('the Note tool draws a note at the size you drag', async ({ window }) => {
    await window.getByTestId('tool-note').click()
    await canvas.dragBetween(await canvas.pagePoint(200, 200), await canvas.pagePoint(500, 340))
    await expect(canvas.titleInput).toBeFocused()
    await window.keyboard.press('Enter')
    await expect
      .poll(async () => (await canvas.stored())[0])
      .toMatchObject({ x: 200, y: 200, w: 304, h: 144 })
    await expect(window.getByTestId('tool-select')).toHaveAttribute('aria-pressed', 'true')
  })

  test('double-clicking a title edits it on the card', async ({ window }) => {
    await canvas.seed([{ key: 'a', x: 300, y: 200, title: 'Old name' }])
    await canvas.titleText(canvas.card('Old name')).dblclick()
    await expect(canvas.titleInput).toBeFocused()
    await window.keyboard.type('New name')
    await canvas.root.click({ position: { x: 40, y: 400 } }) // clicking away saves
    await expect(canvas.card('New name')).toBeVisible()
    await expect.poll(async () => (await canvas.stored())[0]?.note?.title).toBe('New name')
  })

  test('resizing from a corner stays within the size limits', async () => {
    await canvas.seed([{ key: 'a', x: 300, y: 200 }])
    const card = canvas.card('Card a')
    await card.click()
    const handle = card.getByTestId('resize-handle-se')
    const box = (await handle.boundingBox())!
    const from = { x: box.x + box.width / 2, y: box.y + box.height / 2 }
    await canvas.dragBetween(from, { x: from.x + 900, y: from.y + 40 })
    await expect.poll(async () => (await canvas.stored())[0]).toMatchObject({ w: 480, h: 104 })
    const nw = (await card.getByTestId('resize-handle-nw').boundingBox())!
    const start = { x: nw.x + nw.width / 2, y: nw.y + nw.height / 2 }
    await canvas.dragBetween(start, { x: start.x + 600, y: start.y + 600 })
    await expect
      .poll(async () => (await canvas.stored())[0])
      .toMatchObject({
        x: 620,
        y: 240,
        w: 160,
        h: 64,
      })
  })

  test('marquee select plus delete, and undo restores', async ({ window }) => {
    await canvas.seed([
      { key: 'a', x: 300, y: 200 },
      { key: 'b', x: 600, y: 200 },
      { key: 'c', x: 300, y: 500 },
    ])
    const from = await canvas.pagePoint(280, 180)
    const to = await canvas.pagePoint(840, 280)
    await canvas.dragBetween(from, to)
    await expect(canvas.selected).toHaveCount(2)
    await expect(window.getByTestId('selection-box')).toBeVisible()

    await window.keyboard.press('Delete')
    await expect(canvas.cards).toHaveCount(1)
    await expect(window.getByText('Deleted')).toBeVisible()
    await expect.poll(async () => (await canvas.stored()).length).toBe(1)

    await window.keyboard.press('Control+KeyZ')
    await expect(canvas.cards).toHaveCount(3)
    await expect.poll(async () => (await canvas.stored()).length).toBe(3)
    await window.keyboard.press('Control+Shift+KeyZ')
    await expect(canvas.cards).toHaveCount(1)

    // The toast's Undo brings them back too.
    await window.getByTestId('toast-undo').click()
    await expect(canvas.cards).toHaveCount(3)
  })

  test('Ctrl+Z undoes create, move, resize and delete one by one', async ({ window }) => {
    const at = await canvas.pagePoint(400, 300)
    await window.mouse.dblclick(at.x, at.y)
    await expect(canvas.titleInput).toBeFocused()
    await window.keyboard.type('Undo me')
    await window.keyboard.press('Enter')
    const card = canvas.card('Undo me')
    await canvas.dragCard(card, 160, 0)
    const handle = (await card.getByTestId('resize-handle-se').boundingBox())!
    await canvas.dragBetween(
      { x: handle.x + 4, y: handle.y + 4 },
      { x: handle.x + 84, y: handle.y + 4 },
    )
    await expect.poll(async () => (await canvas.stored())[0]?.w).toBe(320)
    await window.keyboard.press('Delete')
    await expect(canvas.cards).toHaveCount(0)

    await window.keyboard.press('Control+KeyZ') // delete
    await expect(canvas.card('Undo me')).toBeVisible()
    await window.keyboard.press('Control+KeyZ') // resize
    await expect.poll(async () => (await canvas.stored())[0]).toMatchObject({ w: 240, x: 440 })
    await window.keyboard.press('Control+KeyZ') // move
    await expect.poll(async () => (await canvas.stored())[0]).toMatchObject({ x: 280 })
    await window.keyboard.press('Control+KeyZ') // create
    await expect(canvas.cards).toHaveCount(0)
    await expect.poll(async () => (await canvas.stored()).length).toBe(0)
  })

  test('color, restack and nudge from the toolbar, menu and keys', async ({ window }) => {
    await canvas.seed([
      { key: 'a', x: 300, y: 200 },
      { key: 'b', x: 600, y: 200 },
    ])
    const a = canvas.card('Card a')
    await a.click()
    await window.getByTestId('selection-color-sage').click()
    await expect(a).toHaveClass(/bg-note-sage/)
    // A click on the toolbar leaves focus with the canvas.
    await expect(window.getByTestId('selection-color-sage')).not.toBeFocused()

    await a.click({ button: 'right' })
    await window.getByTestId('menu-color-rose').click()
    await expect(a).toHaveClass(/bg-note-rose/)
    await expect(window.getByTestId('canvas-menu')).toBeHidden()
    await expect.poll(async () => (await canvas.stored())[0]?.note?.color).toBe('rose')

    await window.keyboard.press('Control+BracketRight')
    await expect.poll(async () => (await canvas.stored()).map((i) => i.id)).toEqual(['c-b', 'c-a'])

    // The context menu restacks too.
    await a.click({ button: 'right' })
    await window.getByTestId('menu-back').click()
    await expect.poll(async () => (await canvas.stored()).map((i) => i.id)).toEqual(['c-a', 'c-b'])
    await expect(window.getByTestId('canvas-menu')).toBeHidden()
    await a.click({ button: 'right' })
    await window.getByTestId('menu-front').click()
    await expect.poll(async () => (await canvas.stored()).map((i) => i.id)).toEqual(['c-b', 'c-a'])

    await window.keyboard.press('ArrowRight')
    await window.keyboard.press('Shift+ArrowDown')
    await expect
      .poll(async () => (await canvas.stored()).find((i) => i.id === 'c-a'))
      .toMatchObject({ x: 301, y: 208 })

    await window.keyboard.press('Control+KeyZ')
    await expect
      .poll(async () => (await canvas.stored()).find((i) => i.id === 'c-a'))
      .toMatchObject({ x: 301, y: 200 })
  })

  test('a note made while zoomed out glides into view at 100%', async ({ window }) => {
    for (let i = 0; i < 4; i++) await window.keyboard.press('Control+Minus')
    await expect(canvas.zoomLabel).toHaveText('50%')
    await window.keyboard.press('Control+KeyN')
    await expect(canvas.titleInput).toBeFocused()
    await expect(canvas.zoomLabel).toHaveText('100%')
  })
})
