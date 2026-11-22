import type { Post, StatCardData } from '@aced/types'
import { PostRow } from '@/app/_components/PostRow'
import { StatCard } from '@/components/cards/StatCard'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { VoteButtons } from '@/components/VoteButtons'

// Hex values mirror docs/design-system.md; the swatches themselves use the live tokens.
const COLORS: [string, string, string][] = [
  ['bg', '#ffffff', '#0c0d0f'],
  ['surface', '#f7f8f9', '#141619'],
  ['surface-2', '#eef0f2', '#1c1f23'],
  ['border', '#e3e5e8', '#25282d'],
  ['fg', '#121418', '#eceef1'],
  ['muted', '#5d646e', '#8b919b'],
  ['accent', '#c42f45', '#f06a7c'],
  ['accent-tint', 'rgb(196 47 69 / 0.10)', 'rgb(224 69 90 / 0.16)'],
  ['btn', '#121418', '#eceef1'],
  ['on-btn', '#ffffff', '#0c0d0f'],
  ['success', '#166534', '#4ade80'],
  ['danger', '#c42f45', '#f06a7c'],
]
const TYPE: [string, string][] = [
  ['text-page-title', 'Page title · 22/28 · 600'],
  ['text-section-title', 'Section title · 16/24 · 600'],
  ['text-sm', 'Body · 14/20'],
  ['text-meta text-muted', 'Metadata · 12.5/18'],
  ['text-rail-heading', 'Rail heading · 12/16 · 500'],
  ['text-badge', 'Badge · 11/14'],
]
const SPACING = [4, 8, 12, 16, 20]
const RADII: [string, string][] = [
  ['rounded-sm', '6'],
  ['rounded-md', '8'],
  ['rounded-[10px]', '10'],
  ['rounded-lg', '12'],
]

const post: Post = {
  id: 'design-post',
  kind: 'thread',
  author: { id: 'u', handle: 'frag_queen', avatarUrl: null, role: 'user' },
  board: { id: 'b', slug: 'general', name: 'General' },
  title: "Is Northwind's new IGL the reason for the turnaround?",
  body: '',
  url: null,
  seriesId: null,
  score: 412,
  commentCount: 86,
  isLocked: false,
  isRemoved: false,
  myVote: 0,
  tags: [{ type: 'team', id: 't', name: 'Northwind', slug: 'northwind' }],
  rumorStatus: null,
  data: null,
  createdAt: new Date(Date.now() - 3 * 3_600_000).toISOString(),
  editedAt: null,
}
const stat: StatCardData = {
  type: 'stat_card',
  seriesId: 's',
  mapName: 'Ascent',
  event: { name: 'Kickoff · Americas', slug: 'kickoff' },
  player: { handle: 'kairo', slug: 'kairo' },
  team: { name: 'Northwind', tag: 'NW', slug: 'northwind' },
  opponent: { name: 'Exhale', tag: 'EXH', slug: 'exhale' },
  won: true,
  line: { agent: 'Jett', kills: 31, deaths: 14, assists: 4, acs: 356, adr: 201, firstKills: 6 },
  highlight: '30+ kills',
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h3 className="text-rail-heading">{title}</h3>
      {children}
    </section>
  )
}

/** One theme's tokens and components; `.light`/`.dark` scope the variables to this panel. */
export function Specimen({ theme }: { theme: 'light' | 'dark' }) {
  const i = theme === 'light' ? 1 : 2
  return (
    <div
      className={`${theme} flex flex-col gap-6 rounded-lg border border-border bg-bg p-5 text-fg`}
    >
      <h2 className="text-section-title capitalize">{theme}</h2>
      <Section title="Colors">
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {COLORS.map((c) => (
            <li key={c[0]} className="flex items-center gap-2">
              <span
                className="size-8 shrink-0 rounded-sm border border-border"
                style={{ background: `var(--${c[0]})` }}
              />
              <span className="min-w-0 text-meta">
                <span className="block font-mono">--{c[0]}</span>
                <span className="block truncate font-mono text-muted">{c[i]}</span>
              </span>
            </li>
          ))}
        </ul>
      </Section>
      <Section title="Type">
        {TYPE.map(([cls, label]) => (
          <p key={cls} className={cls}>
            {label}
          </p>
        ))}
        <p className="font-mono text-sm">NW 2 : 1 EXH · 31/14/4 · 356 ACS</p>
      </Section>
      <Section title="Spacing and radius">
        <div className="flex flex-wrap items-end gap-3">
          {SPACING.map((px) => (
            <span key={px} className="flex flex-col items-center gap-1 text-meta text-muted">
              <span className="block bg-accent-tint" style={{ width: px, height: px }} />
              {px}
            </span>
          ))}
          {RADII.map(([cls, px]) => (
            <span key={cls} className="flex flex-col items-center gap-1 text-meta text-muted">
              <span className={`block size-10 border border-border bg-surface-2 ${cls}`} />
              {px}px
            </span>
          ))}
        </div>
      </Section>
      <Section title="Buttons and inputs">
        <div className="flex flex-wrap items-center gap-2">
          <Button>Primary</Button>
          <Button variant="outline">Secondary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="destructive">Delete</Button>
        </div>
        <Input aria-label="Example input" placeholder="Input" />
      </Section>
      <Section title="Tabs">
        <Tabs defaultValue="for-you">
          <TabsList>
            <TabsTrigger value="for-you">For you</TabsTrigger>
            <TabsTrigger value="following">Following</TabsTrigger>
            <TabsTrigger value="teams">Your teams</TabsTrigger>
          </TabsList>
        </Tabs>
      </Section>
      <Section title="Badges, chips and live">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">Thread</Badge>
          <Badge variant="outline" className="text-muted">
            Unconfirmed
          </Badge>
          <Badge variant="outline" className="border-success text-success">
            Confirmed
          </Badge>
          <span className="rounded-[10px] border border-border px-2 py-0.5 font-mono text-xs text-muted">
            #Northwind
          </span>
          <span className="inline-flex items-center gap-1 text-badge font-semibold text-accent">
            <span className="size-1.5 rounded-full bg-accent" />
            LIVE
          </span>
        </div>
      </Section>
      <Section title="Votes">
        <div className="flex gap-6">
          <VoteButtons targetType="post" targetId="a" score={12} myVote={0} />
          <VoteButtons targetType="post" targetId="b" score={13} myVote={1} />
          <VoteButtons targetType="post" targetId="c" score={11} myVote={-1} />
        </div>
      </Section>
      <Section title="Feed row">
        <ul className="overflow-hidden rounded-lg border border-border">
          <PostRow post={post} />
        </ul>
      </Section>
      <Section title="Stat card">
        <StatCard data={stat} />
      </Section>
      <Section title="Rail card">
        <div className="rounded-lg border border-border px-3.5 py-3 text-[13px]">
          <h4 className="mb-2 text-rail-heading">Live and upcoming</h4>
          {[
            ['NW vs EXH', '1–0'],
            ['HAL vs RK', 'in 2h'],
          ].map(([teams, status]) => (
            <div key={teams} className="flex justify-between border-t border-border py-[7px]">
              <span className="font-mono">{teams}</span>
              <span className="text-muted">{status}</span>
            </div>
          ))}
        </div>
      </Section>
    </div>
  )
}
