import type { Post } from '@aced/types'
import Link from 'next/link'
import { PostCard } from '@/components/cards/PostCard'
import { RumorBadge } from '@/components/RumorBadge'
import { Badge } from '@/components/ui/badge'
import { VoteButtons } from '@/components/VoteButtons'
import { timeAgo } from '@/lib/time-ago'

const KIND_LABEL: Partial<Record<Post['kind'], string>> = {
  thread: 'Thread',
  take: 'Take',
  link: 'Link',
  clip: 'Clip',
  rumor: 'Rumor',
  match_thread: 'Match thread',
  result: 'Result',
  stat_card: 'Stats',
  transfer: 'Transfer',
}

function domain(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return null
  }
}

const tagHref = (t: Post['tags'][number]) =>
  t.type === 'player'
    ? `/players/${t.slug}`
    : t.type === 'team'
      ? `/teams/${t.slug}`
      : `/events/${t.slug}`

/** A feed row (doc: Feed row): vote column, badges and title, then a metadata line. */
export function PostRow({ post, showBoard = true }: { post: Post; showBoard?: boolean }) {
  const label = KIND_LABEL[post.kind]
  const site = post.url && domain(post.url)
  return (
    <li className="grid grid-cols-[36px_minmax(0,1fr)] gap-3 border-b border-border px-4 py-3 transition-colors last:border-b-0 hover:bg-surface">
      <VoteButtons
        targetType="post"
        targetId={post.id}
        score={post.score}
        myVote={post.myVote}
        ownerId={post.author?.id}
      />
      <div className="min-w-0">
        {post.data ? (
          // Stretched link to the post; links inside the card sit above it.
          <div className="relative">
            <Link
              href={`/p/${post.id}`}
              aria-label={post.title ?? 'Open post'}
              className="absolute inset-0"
            />
            <PostCard data={post.data} />
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            {label && <Badge variant="secondary">{label}</Badge>}
            {post.rumorStatus && <RumorBadge status={post.rumorStatus} />}
            <Link
              href={`/p/${post.id}`}
              className="line-clamp-3 font-medium break-words hover:underline"
            >
              {post.title ?? post.body}
            </Link>
            {site && <span className="text-meta text-muted">({site})</span>}
          </div>
        )}
        <p className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-meta text-muted">
          {post.tags.length > 0 && (
            <>
              <span className="flex flex-wrap gap-x-1.5 font-mono">
                {post.tags.map((t) => (
                  <Link key={`${t.type}:${t.id}`} href={tagHref(t)} className="hover:text-fg">
                    {t.type === 'player' ? '@' : '#'}
                    {t.name}
                  </Link>
                ))}
              </span>
              <span aria-hidden>·</span>
            </>
          )}
          {post.data ? (
            <span>Auto-generated</span>
          ) : (
            post.author && <span>@{post.author.handle}</span>
          )}
          <span aria-hidden>·</span>
          <Link href={`/p/${post.id}`} className="hover:text-fg">
            {post.commentCount} comment{post.commentCount === 1 ? '' : 's'}
          </Link>
          <span aria-hidden>·</span>
          <time dateTime={post.createdAt}>{timeAgo(post.createdAt)}</time>
          {showBoard && post.board && (
            <>
              <span aria-hidden>·</span>
              <Link href={`/b/${post.board.slug}`} className="hover:text-fg">
                {post.board.name}
              </Link>
            </>
          )}
        </p>
      </div>
    </li>
  )
}
