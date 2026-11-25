import { expect, type Locator, type Page } from '@playwright/test'
import type { CanvasItem, CanvasOp } from '../../../src/shared/types'

export interface ViewportState {
  x: number
  y: number
  zoom: number
}

/** The canvas view (UI_SPEC §4). */
export class CanvasPage {
  readonly root: Locator
  readonly zoomLabel: Locator
  readonly cards: Locator
  readonly selected: Locator
  readonly titleInput: Locator

  constructor(readonly page: Page) {
    this.root = page.getByTestId('canvas')
    this.zoomLabel = page.getByTestId('zoom-reset')
    this.cards = page.getByTestId('note-card')
    this.selected = page.locator('[data-testid="note-card"][data-selected]')
    this.titleInput = page.getByTestId('note-card-title-input')
  }

  /** The card showing `title`. */
  card(title: string): Locator {
    return this.cards.filter({
      has: this.page.getByTestId('note-card-title').getByText(title, { exact: true }),
    })
  }

  /**
   * A card's title text. Double-clicking it edits the title inline; a double-click anywhere
   * else on the card opens the note panel (UI_SPEC §4.5).
   */
  titleText(card: Locator): Locator {
    return card.getByTestId('note-card-title').locator('[data-card-title-text]')
  }

  /** The cards as main has stored them. */
  async stored(): Promise<CanvasItem[]> {
    return this.page.evaluate(() => self.sprawl.canvas.load())
  }

  /** Creates note cards through the real IPC (ids `c-<key>`, notes `n-<key>`), then reloads. */
  async seed(cards: { key: string; x: number; y: number; title?: string }[]): Promise<void> {
    const ops: CanvasOp[] = cards.map((c, i) => ({
      op: 'create',
      item: {
        id: `c-${c.key}`,
        kind: 'note',
        refId: `n-${c.key}`,
        url: null,
        title: null,
        x: c.x,
        y: c.y,
        w: 220,
        h: 64,
        z: i + 1,
      },
      note: { id: `n-${c.key}`, title: c.title ?? `Card ${c.key}`, color: 'sand' },
    }))
    await this.page.evaluate((batch) => self.sprawl.canvas.apply(batch), ops)
    await this.page.reload()
    await this.ready()
  }

  /** The page point at world (x, y), with the current viewport. */
  async pagePoint(x: number, y: number): Promise<{ x: number; y: number }> {
    const box = await this.root.boundingBox()
    const vp = await this.viewport()
    if (!box) throw new Error('The canvas is not visible')
    return { x: box.x + vp.x + x * vp.zoom, y: box.y + vp.y + y * vp.zoom }
  }

  /** Drags from one page point to another with the left button, in steps. */
  async dragBetween(
    from: { x: number; y: number },
    to: { x: number; y: number },
    modifiers: ('Shift' | 'Alt')[] = [],
  ): Promise<void> {
    for (const key of modifiers) await this.page.keyboard.down(key)
    await this.page.mouse.move(from.x, from.y)
    await this.page.mouse.down()
    await this.page.mouse.move(to.x, to.y, { steps: 10 })
    await this.page.mouse.up()
    for (const key of modifiers) await this.page.keyboard.up(key)
  }

  /** Drags a card by (dx, dy) screen px, grabbing it near its top-left. */
  async dragCard(card: Locator, dx: number, dy: number): Promise<void> {
    const box = await card.boundingBox()
    if (!box) throw new Error('The card is not visible')
    const from = { x: box.x + box.width / 2, y: box.y + 8 }
    await this.dragBetween(from, { x: from.x + dx, y: from.y + dy })
  }

  /** Waits until the cards and the saved viewport are loaded. */
  async ready(): Promise<void> {
    await expect(this.root).toHaveAttribute('data-ready', 'true')
  }

  /** The live viewport, as the canvas writes it to its data attributes. */
  async viewport(): Promise<ViewportState> {
    return this.root.evaluate((el: HTMLElement) => ({
      x: Number(el.dataset.x),
      y: Number(el.dataset.y),
      zoom: Number(el.dataset.zoom),
    }))
  }

  /** The viewport main has saved to the vault's settings. */
  async savedViewport(): Promise<ViewportState> {
    return this.page.evaluate(() => self.sprawl.settings.get('viewport'))
  }

  /** The middle of the canvas, clear of the toolbar and the zoom pill, in page coordinates. */
  async center(): Promise<{ x: number; y: number }> {
    const box = await this.root.boundingBox()
    if (!box) throw new Error('The canvas is not visible')
    return { x: box.x + box.width / 2, y: box.y + box.height / 2 }
  }

  /** Drags from the center by (dx, dy) with the given mouse button, in a few steps. */
  async drag(dx: number, dy: number, button: 'left' | 'middle' = 'left'): Promise<void> {
    const c = await this.center()
    await this.page.mouse.move(c.x, c.y)
    await this.page.mouse.down({ button })
    await this.page.mouse.move(c.x + dx, c.y + dy, { steps: 8 })
    await this.page.mouse.up({ button })
  }

  /** Ctrl+wheel at a point (what a touchpad pinch sends, too). */
  async ctrlWheel(at: { x: number; y: number }, deltaY: number, times = 1): Promise<void> {
    await this.page.mouse.move(at.x, at.y)
    await this.page.keyboard.down('Control')
    for (let i = 0; i < times; i++) await this.page.mouse.wheel(0, deltaY)
    await this.page.keyboard.up('Control')
  }
}
