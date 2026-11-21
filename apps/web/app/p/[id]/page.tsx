import { ApiClientError } from '@aced/api-client'
import type { Post } from '@aced/types'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { cache } from 'react'
import { Badge } from '@/components/ui/badge'
import { api } from '@/lib/api'
import { timeAgo } from '@/lib/time-ago'
import { CommentThread } from './_components/CommentThread'

type Props = { params: Promise<{ id: string }> }

const getPost = cache(async (id: string): Promise<Post | 'not_found' | null> => {
  try {
    return await api.post(id, { cache: 'no-store' })
  } catch (err) {
    if (err instanceof ApiClientError && (err.status === 404 || err.status === 400)) {
      return 'not_found'
    }
    return null
  }
})

const headline = (post: Post) => post.title ?? post.body.slice(0, 80)

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const post = await getPost((await params).id)
  if (!post || post === 'not_found') return { title: 'Post' }
  if (post.isRemoved) return { title: '[removed]', robots: { index: false } }
  const description = post.body.slice(0, 160) || undefined
  return {
    title: headline(post),
    description,
    openGraph: { title: headline(post), description, type: 'article' },
  }
}

export default async function PostPage({ params }: Props) {
  const { id } = await params
  const [post, comments] = await Promise.all([
    getPost(id),
    api.postComments(id, undefined, { cache: 'no-store' }).catch(() => null),
  ])
  if (post === 'not_found') notFound()
  if (!post) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-8">
        <p role="alert" className="py-12 text-center text-sm text-muted">
          Couldn't load this post. Try again in a moment.
        </p>
      </main>
    )
  }

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-8">
      <article className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4 sm:p-6">
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
          {post.kind !== 'thread' && (
            <Badge variant="secondary" className="capitalize">
              {post.kind.replace('_', ' ')}
            </Badge>
          )}
          {post.board && (
            <Link href={`/b/${post.board.slug}`} className="hover:text-fg">
              {post.board.name}
            </Link>
          )}
          <span>{post.author && !post.isRemoved ? `@${post.author.handle}` : '[removed]'}</span>
          <time dateTime={post.createdAt}>{timeAgo(post.createdAt)}</time>
          {post.editedAt && <span>edited</span>}
          {post.isLocked && <Badge variant="outline">Locked</Badge>}
        </p>
        {post.title && (
          <h1 className="text-xl font-bold tracking-tight break-words">{post.title}</h1>
        )}
        {post.isRemoved ? (
          <p className="text-sm text-muted italic">[removed]</p>
        ) : (
          <>
            {post.url && (
              <a
                href={post.url}
                rel="noopener noreferrer nofollow ugc"
                target="_blank"
                className="text-sm break-all text-accent hover:underline"
              >
                {post.url}
              </a>
            )}
            {post.body && (
              <p
                className={`break-words whitespace-pre-line ${post.title ? 'text-sm' : 'text-lg'}`}
              >
                {post.body}
              </p>
            )}
          </>
        )}
        <p className="text-xs text-muted">
          {post.score} point{post.score === 1 ? '' : 's'} · {post.commentCount} comment
          {post.commentCount === 1 ? '' : 's'}
        </p>
      </article>

      <section aria-label="Comments">
        {comments ? (
          <CommentThread postId={post.id} initial={comments} />
        ) : (
          <p role="alert" className="py-8 text-center text-sm text-muted">
            Couldn't load comments.
          </p>
        )}
      </section>
    </main>
  )
}
