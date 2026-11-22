import AxeBuilder from '@axe-core/playwright'
import { expect, type Page, test } from '@playwright/test'
import { API } from '../playwright.config'

/** Fails on serious and critical axe violations, listing them by rule and element. */
async function expectAccessible(page: Page) {
  const { violations } = await new AxeBuilder({ page }).analyze()
  const bad = violations
    .filter((v) => v.impact === 'serious' || v.impact === 'critical')
    .map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)
  expect(bad).toEqual([])
}

test('home, matches, a series, a post and settings have no serious accessibility issues', async ({
  page,
}) => {
  const res = await page.request.post(`${API}/auth/test-login`, { data: { handle: 'frag_queen' } })
  expect(res.status()).toBe(204)

  await page.goto('/')
  await expectAccessible(page)

  await page.goto('/matches')
  await expectAccessible(page)

  await page.getByRole('tab', { name: 'results' }).click()
  await page.getByRole('link', { name: / vs / }).first().click()
  await expect(page).toHaveURL(/\/matches\/[0-9a-f-]{36}$/)
  await expectAccessible(page)

  await page.goto('/b/general')
  await page.locator('a[href^="/p/"]').first().click()
  await expect(page).toHaveURL(/\/p\/[0-9a-f-]{36}$/)
  await expectAccessible(page)

  await page.goto('/settings')
  await expect(page.getByLabel('Handle')).toBeVisible()
  await expectAccessible(page)
})

test('the skip link moves focus past the header', async ({ page }) => {
  await page.goto('/')
  await page.keyboard.press('Tab')
  const skip = page.getByRole('link', { name: 'Skip to content' })
  await expect(skip).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(page.locator('#main')).toBeFocused()
})
