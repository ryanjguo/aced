// Posts (or updates) one PR comment with line and branch coverage per package.
// Usage in CI: GH_TOKEN, GITHUB_REPOSITORY and PR_NUMBER set; prints the table when PR_NUMBER is missing.
import { execFileSync } from 'node:child_process'
import { existsSync, readdirSync, readFileSync } from 'node:fs'

const MARKER = '<!-- coverage-summary -->'

const rows = ['apps', 'packages'].flatMap((dir) =>
  readdirSync(dir)
    .map((name) => `${dir}/${name}`)
    .filter((path) => existsSync(`${path}/coverage/coverage-summary.json`))
    .map((path) => {
      const { total } = JSON.parse(readFileSync(`${path}/coverage/coverage-summary.json`, 'utf8'))
      return `| \`${path}\` | ${total.lines.pct}% | ${total.branches.pct}% |`
    }),
)

const body = [
  MARKER,
  '### Test coverage',
  '',
  '| Package | Lines | Branches |',
  '| --- | --- | --- |',
  ...rows,
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
