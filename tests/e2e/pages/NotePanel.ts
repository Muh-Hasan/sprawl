import { expect, type Locator, type Page } from '@playwright/test'
import type { Note } from '../../../src/shared/types'

/** The note panel (UI_SPEC §5). */
export class NotePanel {
  readonly root: Locator
  readonly title: Locator
  readonly editor: Locator
  /** The editable body (BlockNote's contenteditable). */
  readonly body: Locator
  readonly status: Locator

  constructor(readonly page: Page) {
    this.root = page.getByTestId('note-panel')
    this.title = page.getByTestId('note-panel-title')
    this.editor = page.getByTestId('note-editor')
    this.body = this.editor.locator('[contenteditable="true"]')
    this.status = page.getByTestId('note-panel-status')
  }

  /** Waits for the panel to show a note, with the editor loaded. */
  async ready(): Promise<void> {
    await expect(this.root).toHaveAttribute('data-note-id', /.+/)
    await expect(this.body).toBeVisible({ timeout: 10_000 })
  }

  async noteId(): Promise<string> {
    const id = await this.root.getAttribute('data-note-id')
    if (!id) throw new Error('No note is open')
    return id
  }

  /** The open note as main has stored it. */
  async stored(): Promise<Note> {
    const id = await this.noteId()
    return this.page.evaluate((noteId) => self.sprawl.notes.get(noteId), id)
  }

  /** Waits until everything typed has been saved. */
  async saved(): Promise<void> {
    await expect(this.status).toHaveAttribute('data-status', 'saved')
  }

  /** Puts the cursor at the end of the body and types, pressing Enter between lines. */
  async typeLines(...lines: string[]): Promise<void> {
    await this.body.click()
    await this.page.keyboard.press('Control+End')
    for (const [i, line] of lines.entries()) {
      if (i > 0) await this.page.keyboard.press('Enter')
      await this.page.keyboard.type(line)
    }
  }

  /** The checkboxes of the body's checklist items. */
  checkboxes(): Locator {
    return this.editor.locator('[data-content-type="checkListItem"] input[type="checkbox"]')
  }

  async addLink(url: string): Promise<void> {
    await this.page.getByTestId('note-add-link').click()
    await this.page.getByTestId('note-link-input').fill(url)
    await this.page.keyboard.press('Enter')
  }
}
