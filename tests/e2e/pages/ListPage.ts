import { expect, type Locator, type Page } from '@playwright/test'
import type { NoteColor, RemindOption } from '../../../src/shared/constants'
import type { NoteListQuery, NoteListRow } from '../../../src/shared/types'

export interface SeedNote {
  id: string
  title: string
  color?: NoteColor
  due?: [day: string, time: string | null]
  remind?: RemindOption
  /** A card centered at this world point; none = a list-only note. */
  card?: { x: number; y: number }
  done?: boolean
}

/** The List view (UI_SPEC §5b). */
export class ListPage {
  readonly root: Locator
  readonly rows: Locator
  readonly count: Locator
  readonly empty: Locator
  /** The empty state's line, under its title. */
  readonly emptyText: Locator
  readonly filter: Locator
  readonly badge: Locator

  constructor(readonly page: Page) {
    this.root = page.getByTestId('list-view')
    this.rows = page.getByTestId('list-row')
    this.count = page.getByTestId('list-count')
    this.empty = page.getByTestId('list-empty')
    this.emptyText = page.getByTestId('list-empty-text')
    this.filter = page.getByTestId('list-filter')
    this.badge = page.getByTestId('sidebar-list-badge')
  }

  async open(): Promise<void> {
    await this.page.getByTestId('sidebar-list').click()
    await expect(this.root).toBeVisible()
    await expect(this.count).not.toBeEmpty()
  }

  tab(name: NoteListQuery['tab']): Locator {
    return this.page.getByTestId(`list-tab-${name}`)
  }

  /** How many notes a tab holds, as its label shows. */
  tabCount(name: NoteListQuery['tab']): Locator {
    return this.page.getByTestId(`list-tab-${name}-count`)
  }

  color(name: NoteColor): Locator {
    return this.page.getByTestId(`list-color-${name}`)
  }

  row(title: string): Locator {
    return this.rows.filter({
      has: this.page.getByTestId('list-row-title').getByText(title, { exact: true }),
    })
  }

  group(name: string): Locator {
    return this.page.getByTestId(`list-group-${name}`)
  }

  /** The row titles in the order shown. */
  async titles(scope: Locator = this.root): Promise<string[]> {
    return scope.getByTestId('list-row-title').allTextContents()
  }

  /** Hovers a row until its hover actions show (they replace the edited time). */
  async hover(row: Locator): Promise<void> {
    await expect(async () => {
      await row.hover()
      await expect(row.getByTestId('list-row-menu')).toBeVisible({ timeout: 500 })
    }).toPass()
  }

  /** Hovers a row and picks an item from its ⋯ menu. */
  async menu(title: string, item: 'place' | 'pin' | 'duplicate' | 'delete'): Promise<void> {
    const row = this.row(title).first()
    await this.hover(row)
    await row.getByTestId('list-row-menu').click()
    await this.page
      .locator('[role="menu"][data-state="open"]')
      .getByTestId(`list-row-${item}`)
      .click()
  }

  /** Clicks Undo on the newest toast (several can be up at once). */
  async undo(): Promise<void> {
    await this.page.getByTestId('toast-undo').first().click()
  }

  /** Creates notes through the API, in order (later ones are edited later). */
  async seed(notes: SeedNote[]): Promise<void> {
    await this.page.evaluate(async (list) => {
      for (const n of list) {
        await self.sprawl.notes.create({ id: n.id, title: n.title, color: n.color ?? 'stone' })
        if (n.due) {
          await self.sprawl.notes.update(n.id, {
            dueDay: n.due[0],
            dueTime: n.due[1],
            ...(n.remind ? { remind: n.remind } : {}),
          })
        }
        if (n.card) await self.sprawl.notes.placeOnCanvas(n.id, n.card)
        if (n.done) await self.sprawl.notes.setDone(n.id, true)
      }
    }, notes)
  }

  /** What `notes.list` gives for a query, straight from main. */
  async stored(query: Partial<NoteListQuery> = {}): Promise<NoteListRow[]> {
    return this.page.evaluate((q) => self.sprawl.notes.list(q), {
      tab: 'all',
      colors: [],
      text: '',
      sort: 'edited',
      ...query,
    } as NoteListQuery)
  }
}
