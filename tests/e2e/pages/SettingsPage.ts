import { expect, type Locator, type Page } from '@playwright/test'

/** The section ids in the renderer's `settingsSections.ts`. */
type SettingsSectionId =
  | 'general'
  | 'appearance'
  | 'canvas'
  | 'notifications'
  | 'capture'
  | 'backup'
  | 'shortcuts'
  | 'about'

/** The Settings view (UI_SPEC §9): a section menu and the chosen section's rows. */
export class SettingsPage {
  constructor(readonly page: Page) {}

  /** A section's menu row. */
  menu(id: SettingsSectionId): Locator {
    return this.page.getByTestId(`settings-section-${id}`)
  }

  /** A section's page, shown once it's picked. */
  section(id: SettingsSectionId): Locator {
    return this.page.getByTestId(`settings-${id}`)
  }

  /** Opens Settings from the sidebar, on `id` (General when it opens). */
  async open(id: SettingsSectionId = 'general'): Promise<void> {
    await this.page.getByTestId('sidebar-settings').click()
    if (id !== 'general') await this.menu(id).click()
    await expect(this.section(id)).toBeVisible()
  }
}
