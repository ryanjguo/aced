import { defineConfig, devices } from '@playwright/test'

// Own ports, so the run never touches a dev server on 3000/4000.
export const API = 'http://localhost:4100'
const WEB = 'http://localhost:3100'

export default defineConfig({
  testDir: './tests',
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: { baseURL: WEB, trace: 'retain-on-failure' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      command: 'pnpm --filter @aced/api exec tsx src/index.ts',
      url: `${API}/health`,
      env: { NODE_ENV: 'test', PORT: '4100', WEB_ORIGIN: WEB, BETTER_AUTH_URL: API },
      timeout: 60_000,
    },
    {
      command:
        'pnpm --filter @aced/web exec next build && pnpm --filter @aced/web exec next start -p 3100',
      url: WEB,
      env: { NEXT_PUBLIC_API_URL: API, NEXT_PUBLIC_SITE_URL: WEB },
      timeout: 300_000,
    },
  ],
})
