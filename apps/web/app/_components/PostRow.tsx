import type { Post } from '@aced/types'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { timeAgo } from '@/lib/time-ago'

const KIND_LABEL: Partial<Record<Post['kind'], string>> = {
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

export function PostRow({ post, showBoard = true }: { post: Post; showBoard?: boolean }) {
  const label = KIND_LABEL[post.kind]
  const site = post.url && domain(post.url)
  return (
    <li className="flex gap-3 border-b border-border px-4 py-3 last:border-b-0">
      <div className="w-10 shrink-0 pt-0.5 text-center font-mono text-sm tabular-nums text-muted">
        {post.score}
      </div>
      <div className="min-w-0 flex-1">
        <Link
          href={`/p/${post.id}`}
          className="line-clamp-3 font-medium break-words hover:underline"
        >
          {post.title ?? post.body}
        </Link>
        {site && <span className="text-xs text-muted"> ({site})</span>}
        <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
          {label && <Badge variant="secondary">{label}</Badge>}
          {showBoard && post.board && (
            <Link href={`/b/${post.board.slug}`} className="hover:text-fg">
              {post.board.name}
            </Link>
          )}
          {post.author && <span>@{post.author.handle}</span>}
          <time dateTime={post.createdAt}>{timeAgo(post.createdAt)}</time>
          <Link href={`/p/${post.id}`} className="hover:text-fg">
            {post.commentCount} comment{post.commentCount === 1 ? '' : 's'}
          </Link>
        </p>
      </div>
    </li>
  )
}
