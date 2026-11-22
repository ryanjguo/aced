import { ApiClientError } from '@aced/api-client'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { PostForm } from '@/app/_components/PostForm'
import { api } from '@/lib/api'

export const metadata: Metadata = { title: 'Edit post', robots: { index: false } }

export default async function EditPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const post = await api.post(id, { cache: 'no-store' }).catch((err: unknown) => {
    if (err instanceof ApiClientError && err.status < 500) notFound()
    return null
  })
  if (post?.isRemoved) notFound()

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-6 text-page-title">Edit post</h1>
      {post ? (
        <PostForm boards={[]} post={post} />
      ) : (
        <p role="alert" className="py-12 text-center text-sm text-muted">
          Couldn't load this post. Try again in a moment.
        </p>
      )}
    </main>
  )
}
