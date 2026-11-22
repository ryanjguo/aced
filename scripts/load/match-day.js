// k6 load test for a match-day spike: 500 readers and 50 voters against the API.
// Needs a seeded DB, the API built and started with NODE_ENV=test (for /auth/test-login), and
// one user per voter (votes are limited to 300 per user per hour), all set up by run.sh:
//   scripts/load/run.sh http://host.docker.internal:4300
import { check, sleep } from 'k6'
import http from 'k6/http'

const API = __ENV.API || 'http://localhost:4100'
const HANDLES = Array.from({ length: 50 }, (_, i) => `load_${i}`)

export const options = {
  scenarios: {
    readers: {
      executor: 'ramping-vus',
      exec: 'read',
      stages: [
        { duration: '1m', target: 500 },
        { duration: '2m', target: 500 },
        { duration: '30s', target: 0 },
      ],
    },
    voters: {
      executor: 'ramping-vus',
      exec: 'vote',
      stages: [
        { duration: '1m', target: 50 },
        { duration: '2m', target: 50 },
        { duration: '30s', target: 0 },
      ],
    },
  },
  // A p95 budget per endpoint, which also makes k6 report each one separately.
  thresholds: {
    http_req_failed: ['rate<0.01'],
    ...Object.fromEntries(
      ['feed', 'series', 'series_detail', 'post', 'comments', 'trending', 'search', 'vote'].map(
        (e) => [`http_req_duration{endpoint:${e}}`, ['p(95)<500']],
      ),
    ),
  },
}

/** Ids to read and sign-in cookies for the voters, fetched once. */
export function setup() {
  const posts = http
    .get(`${API}/feed/for-you`)
    .json('items')
    .map((p) => p.id)
  const series = http
    .get(`${API}/series`)
    .json('items')
    .map((s) => s.id)
  const cookies = HANDLES.map((handle) => {
    const res = http.post(`${API}/auth/test-login`, JSON.stringify({ handle }), {
      headers: { 'content-type': 'application/json' },
    })
    check(res, { 'signed in': (r) => r.status === 204 })
    return res.headers['Set-Cookie'].split(';')[0]
  })
  return { posts, series, cookies }
}

const pick = (list) => list[Math.floor(Math.random() * list.length)]
const get = (path, endpoint) => {
  const res = http.get(`${API}${path}`, { tags: { endpoint } })
  check(res, { [`${endpoint} 200`]: (r) => r.status === 200 })
}

/** A fan refreshing during a match: feed, live scores, the series, a post and its comments. */
export function read(data) {
  const roll = Math.random()
  if (roll < 0.35) get('/feed/for-you', 'feed')
  else if (roll < 0.55) get('/series?status=live', 'series')
  else if (roll < 0.7) get(`/series/${pick(data.series)}`, 'series_detail')
  else if (roll < 0.8) get(`/posts/${pick(data.posts)}`, 'post')
  else if (roll < 0.9) get(`/posts/${pick(data.posts)}/comments`, 'comments')
  else if (roll < 0.95) get('/trending', 'trending')
  else get(`/search/entities?q=${pick(['nor', 'exh', 'sab', 'kick'])}`, 'search')
  sleep(1 + Math.random())
}

/** A voter flipping votes on feed posts (votes skip the per-user post and comment limits). */
export function vote(data) {
  const res = http.put(
    `${API}/votes`,
    JSON.stringify({ targetType: 'post', targetId: pick(data.posts), value: pick([1, -1, 0]) }),
    {
      headers: { 'content-type': 'application/json', cookie: pick(data.cookies) },
      tags: { endpoint: 'vote' },
      // 400 is "can't vote on your own post", expected with a few seed users.
      responseCallback: http.expectedStatuses(200, 400),
    },
  )
  check(res, { 'vote ok': (r) => r.status === 200 || r.status === 400 })
  sleep(1 + Math.random())
}
