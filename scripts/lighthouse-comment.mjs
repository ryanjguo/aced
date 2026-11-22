// Posts (or updates) one PR comment with Lighthouse scores per page (median run, mobile).
// Usage in CI: GH_TOKEN, GITHUB_REPOSITORY and PR_NUMBER set; prints the table when PR_NUMBER is missing.
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

const MARKER = '<!-- lighthouse-summary -->'
const manifest = JSON.parse(readFileSync('.lighthouseci/reports/manifest.json', 'utf8'))
const score = (n) => (n === undefined ? '–' : Math.round(n * 100))

const rows = manifest
  .filter((run) => run.isRepresentativeRun)
  .map(({ url, summary: s }) => {
    const path = new URL(url).pathname
    return `| \`${path}\` | ${score(s.performance)} | ${score(s.accessibility)} | ${score(s['best-practices'])} | ${score(s.seo)} |`
  })

const body = [
  MARKER,
  '### Lighthouse (mobile, production build)',
  '',
  '| Page | Performance | Accessibility | Best practices | SEO |',
  '| --- | --- | --- | --- | --- |',
  ...rows,
  '',
  'Full reports are in the `lighthouse-reports` artifact. Shared CI runners are slow, so performance is a warning, not a failure.',
].join('\n')

const { PR_NUMBER: pr, GITHUB_REPOSITORY: repo } = process.env
if (!pr || !repo) {
  console.log(body)
  process.exit(0)
}

const gh = (...args) => execFileSync('gh', args, { encoding: 'utf8' })
const existing = JSON.parse(
  gh('api', `repos/${repo}/issues/${pr}/comments`, '--paginate', '--slurp'),
)
  .flat()
  .find((c) => c.body.startsWith(MARKER))

if (existing)
  gh('api', '-X', 'PATCH', `repos/${repo}/issues/comments/${existing.id}`, '-f', `body=${body}`)
else gh('api', '-X', 'POST', `repos/${repo}/issues/${pr}/comments`, '-f', `body=${body}`)
