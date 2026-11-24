import { expect, type Locator, type Page } from '@playwright/test'

export interface ViewportState {
  x: number
  y: number
  zoom: number
}

/** The canvas view (UI_SPEC §4). */
export class CanvasPage {
  readonly root: Locator
  readonly zoomLabel: Locator

  constructor(readonly page: Page) {
    this.root = page.getByTestId('canvas')
    this.zoomLabel = page.getByTestId('zoom-reset')
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
