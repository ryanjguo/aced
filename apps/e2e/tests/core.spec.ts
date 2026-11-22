import { expect, type Page, test } from '@playwright/test'
import { API } from '../playwright.config'

/** Signs the page in as a seeded user through the test-only login route. */
async function signIn(page: Page, handle: string) {
  const res = await page.request.post(`${API}/auth/test-login`, { data: { handle } })
  expect(res.status()).toBe(204)
}

/** Creates a take through the API and returns its id. */
async function newTake(page: Page, body: string) {
  const res = await page.request.post(`${API}/posts`, { data: { kind: 'take', body } })
  expect(res.status()).toBe(201)
  return ((await res.json()) as { id: string }).id
}

test('the matches page opens a series', async ({ page }) => {
  await page.goto('/matches')
  await page.getByRole('tab', { name: 'results' }).click()
  const row = page.getByRole('link', { name: / vs / }).first()
  const teamA = ((await row.getAttribute('aria-label')) ?? '').split(' vs ')[0] ?? ''
  await row.click()
  await expect(page).toHaveURL(/\/matches\/[0-9a-f-]{36}$/)
  await expect(page.getByText(teamA, { exact: true }).first()).toBeVisible()
})

test('a signed-in user creates a thread and sees it on the board', async ({ page }) => {
  await signIn(page, 'frag_queen')
  const title = `E2E thread ${Date.now()}`
  await page.goto('/submit')
  await page.getByLabel('Title').fill(title)
  await page.getByRole('button', { name: 'Post' }).click()
  await expect(page).toHaveURL(/\/p\/[0-9a-f-]{36}$/)
  await expect(page.getByRole('heading', { name: title })).toBeVisible()
  await page.goto('/b/general?sort=new')
  await expect(page.getByRole('link', { name: title })).toBeVisible()
})

test('a signed-in user comments and replies', async ({ page }) => {
  await signIn(page, 'eco_round')
  await page.goto(`/p/${await newTake(page, `E2E comments ${Date.now()}`)}`)
  await page.getByRole('textbox', { name: 'Comment' }).fill('First comment')
  await page.getByRole('button', { name: 'Comment', exact: true }).click()
  await expect(page.getByText('First comment')).toBeVisible()
  await page.getByRole('button', { name: 'Reply' }).first().click()
  await page.getByRole('textbox', { name: 'Comment' }).last().fill('A reply')
  await page.locator('form').last().getByRole('button', { name: 'Reply' }).click()
  await expect(page.getByText('A reply')).toBeVisible()
  await page.reload()
  await expect(page.getByText('A reply')).toBeVisible()
})

test('a signed-in user upvotes and then removes the vote', async ({ page }) => {
  await signIn(page, 'op_main')
  const postId = await newTake(page, `E2E votes ${Date.now()}`)
  // Votes on your own posts are rejected, so vote as someone else.
  await signIn(page, 'lurker_42')
  await page.goto(`/p/${postId}`)
  const up = page.getByRole('button', { name: 'Upvote' }).first()
  await up.click()
  await expect(up).toHaveAttribute('aria-pressed', 'true')
  await page.reload()
  await expect(up).toHaveAttribute('aria-pressed', 'true')
  await up.click()
  await expect(up).toHaveAttribute('aria-pressed', 'false')
  await page.reload()
  await expect(up).toHaveAttribute('aria-pressed', 'false')
})

test('a signed-out user is sent to sign in when voting', async ({ page }) => {
  await page.goto('/b/general')
  await page.getByRole('button', { name: 'Upvote' }).first().click()
  await expect(page).toHaveURL(/\/signin\?from=/)
})
