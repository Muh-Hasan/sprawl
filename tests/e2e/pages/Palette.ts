import { expect, type Locator, type Page } from '@playwright/test'

/** The command palette (UI_SPEC §8). */
export class Palette {
  readonly root: Locator
  readonly input: Locator
  readonly notes: Locator
  readonly commands: Locator
  readonly empty: Locator
  /** The highlighted row, which Enter runs. */
  readonly selected: Locator

  constructor(readonly page: Page) {
    this.root = page.getByTestId('palette')
    this.input = page.getByTestId('palette-input')
    this.notes = this.root.locator('[data-testid^="palette-note-"]')
    this.commands = this.root.locator('[data-testid^="palette-command-"]')
    this.empty = page.getByTestId('palette-empty')
    this.selected = this.root.locator('[cmdk-item][data-selected="true"]')
  }

  /** Opens it with Ctrl+K, with the cursor in the input. */
  async open(): Promise<void> {
    await this.page.keyboard.press('Control+KeyK')
    await expect(this.input).toBeFocused()
  }

  note(id: string): Locator {
    return this.page.getByTestId(`palette-note-${id}`)
  }

  command(id: string): Locator {
    return this.page.getByTestId(`palette-command-${id}`)
  }

  /** Opens the palette, types `query`, and runs the highlighted row (`testId`) with Enter. */
  async run(query: string, testId: string): Promise<void> {
    await this.open()
    await this.input.fill(query)
    await expect(this.selected).toHaveAttribute('data-testid', testId)
    await this.page.keyboard.press('Enter')
    await expect(this.root).toBeHidden()
  }
}
