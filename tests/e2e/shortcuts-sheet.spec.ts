import { expect, test } from './fixtures'
import { CanvasPage } from './pages/CanvasPage'
import { NotePanel } from './pages/NotePanel'
import { Palette } from './pages/Palette'
import { SettingsPage } from './pages/SettingsPage'

test.describe('shortcuts sheet', () => {
  test.beforeEach(async ({ window: page }) => {
    await new CanvasPage(page).ready()
  })

  test('? opens it with every group, Esc and ? close it, and typing ? in a note does not', async ({
    window: page,
  }) => {
    const sheet = page.getByTestId('shortcuts-sheet')
    await page.keyboard.press('Shift+Slash')
    await expect(sheet).toBeVisible()
    await expect(sheet).toContainText('Keyboard shortcuts')
    await expect(sheet.locator('section h2')).toHaveText(['Everywhere', 'Canvas', 'Notes and log'])
    await expect(page.getByTestId('shortcut-palette')).toContainText('Search and commands')
    await expect(page.getByTestId('shortcut-palette').locator('kbd')).toHaveText(['Ctrl', 'K'])
    // Quick capture shows the shortcut as it's set.
    await expect(page.getByTestId('shortcut-capture').locator('kbd')).toHaveText([
      'Ctrl',
      'Shift',
      'Space',
    ])
    await page.keyboard.press('Escape')
    await expect(sheet).toBeHidden()

    // ? toggles it.
    await page.keyboard.press('Shift+Slash')
    await expect(sheet).toBeVisible()
    await page.keyboard.press('Shift+Slash')
    await expect(sheet).toBeHidden()

    // In the note editor, ? is just a character.
    const canvas = new CanvasPage(page)
    const panel = new NotePanel(page)
    await canvas.seed([{ key: 'a', x: 100, y: 120, title: 'Questions' }])
    await canvas.card('Questions').click()
    await page.keyboard.press('Enter')
    await panel.ready()
    await panel.title.press('End')
    await panel.title.press('Shift+Slash')
    await expect(panel.title).toHaveValue('Questions?')
    await expect(sheet).toBeHidden()
  })

  test('opens from the sidebar, the collapsed rail, the palette and Settings', async ({
    window: page,
  }) => {
    const sheet = page.getByTestId('shortcuts-sheet')
    const close = page.getByTestId('shortcuts-sheet-close')

    await page.getByTestId('sidebar-help').click()
    await expect(sheet).toBeVisible()
    await close.click()
    await expect(sheet).toBeHidden()

    await page.keyboard.press('Control+Backslash')
    await expect(page.getByTestId('sidebar')).toHaveAttribute('data-collapsed', 'true')
    await page.getByTestId('sidebar-help').hover()
    await expect(page.getByRole('tooltip')).toContainText('Help and shortcuts?')
    await page.getByTestId('sidebar-help').click()
    await expect(sheet).toBeVisible()
    await close.click()
    await page.keyboard.press('Control+Backslash')

    await new Palette(page).run('>shortcuts', 'palette-command-shortcuts')
    await expect(sheet).toBeVisible()
    await close.click()

    const settings = new SettingsPage(page)
    await settings.open('shortcuts')
    await page.getByTestId('settings-shortcuts-sheet').click()
    await expect(sheet).toBeVisible()
  })
})
