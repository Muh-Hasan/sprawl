import { expect, type Locator, type Page } from '@playwright/test'
import type { LogDay } from '../../../src/shared/types'

/** The daily log view (UI_SPEC §6). */
export class LogPage {
  readonly root: Locator
  readonly date: Locator
  readonly summary: Locator
  readonly entries: Locator
  readonly empty: Locator
  readonly composer: Locator
  readonly stripDays: Locator
  readonly prev: Locator
  readonly next: Locator

  constructor(readonly page: Page) {
    this.root = page.getByTestId('log-page')
    this.date = page.getByTestId('log-date')
    this.summary = page.getByTestId('log-summary')
    this.entries = page.getByTestId('log-entry')
    this.empty = page.getByTestId('log-empty')
    this.composer = page.getByTestId('log-composer')
    this.stripDays = page.getByTestId('log-strip-day')
    this.prev = page.getByTestId('log-prev')
    this.next = page.getByTestId('log-next')
  }

  /** Opens the log from the rail. */
  async open(): Promise<void> {
    await this.page.getByTestId('rail-log').click()
    await expect(this.root).toBeVisible()
  }

  /** Waits until the page shows `day` (`YYYY-MM-DD`). */
  async showing(day: string): Promise<void> {
    await expect(this.date).toHaveAttribute('data-day', day)
  }

  /** The entry whose text is `text`. */
  entry(text: string): Locator {
    return this.entries.filter({
      has: this.page.getByTestId('log-entry-text').getByText(text, { exact: true }),
    })
  }

  /** Types a line into the composer and adds it. */
  async add(text: string): Promise<void> {
    await this.composer.fill(text)
    await this.composer.press('Enter')
    await expect(this.composer).toHaveValue('')
  }

  stripDay(day: string): Locator {
    return this.page.locator(`[data-testid="log-strip-day"][data-day="${day}"]`)
  }

  /** A day's log as main has stored it. */
  async stored(day: string): Promise<LogDay> {
    return this.page.evaluate((d) => self.sprawl.log.day(d), day)
  }
}
