import type { PostTag } from '@aced/types'
import Link from 'next/link'

const href = (tag: PostTag) =>
  ({ player: `/players/${tag.slug}`, team: `/teams/${tag.slug}`, event: `/events/${tag.slug}` })[
    tag.type
  ]

export function TagChips({ tags }: { tags: PostTag[] }) {
  if (tags.length === 0) return null
  return (
    <ul className="flex flex-wrap gap-1.5" aria-label="Tags">
      {tags.map((tag) => (
        <li key={`${tag.type}:${tag.id}`}>
          <Link
            href={href(tag)}
            className="rounded-full border border-border px-2 py-0.5 text-xs text-muted transition-colors hover:border-accent hover:text-fg"
          >
            {tag.type === 'player' ? '@' : '#'}
            {tag.name}
          </Link>
        </li>
      ))}
    </ul>
  )
}
