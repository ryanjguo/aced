'use client'

import type { Board, Post } from '@aced/types'
import { useRouter } from 'next/navigation'
import { type FormEvent, useEffect, useState } from 'react'
import { Markdown } from '@/components/Markdown'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { api } from '@/lib/api'
import { apiErrorMessage } from '@/lib/api-error'
import { authClient } from '@/lib/auth-client'
import { type PickedTag, TagPicker } from './TagPicker'

const field = 'flex flex-col gap-2'
const label = 'text-sm font-medium'

/** Creates a thread or link, or edits an existing post's title and body. */
export function PostForm({
  boards,
  post,
  initialBoardId,
}: {
  boards: Board[]
  post?: Post
  initialBoardId?: string
}) {
  const router = useRouter()
  const { data: session, isPending } = authClient.useSession()
  const [kind, setKind] = useState<'thread' | 'link'>(post?.kind === 'link' ? 'link' : 'thread')
  const [boardId, setBoardId] = useState(
    boards.find((b) => b.id === initialBoardId)?.id ?? boards[0]?.id ?? '',
  )
  const [title, setTitle] = useState(post?.title ?? '')
  const [url, setUrl] = useState(post?.url ?? '')
  const [body, setBody] = useState(post?.body ?? '')
  const [tags, setTags] = useState<PickedTag[]>(post?.tags ?? [])
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (isPending) return
    const from = post ? `/p/${post.id}/edit` : '/submit'
    if (!session) router.replace(`/signin?from=${encodeURIComponent(from)}`)
    else if (post && post.author?.id !== session.user.id) router.replace(`/p/${post.id}`)
  }, [isPending, session, post, router])

  async function submit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    const refs = tags.map(({ type, id }) => ({ type, id }))
    try {
      const saved = post
        ? await api.updatePost(
            post.id,
            post.kind === 'take' ? { body, tags: refs } : { title, body, tags: refs },
          )
        : await api.createPost(
            kind === 'link'
              ? { kind, boardId, title, url, body, tags: refs }
              : { kind, boardId, title, body, tags: refs },
          )
      router.push(`/p/${saved.id}`)
      router.refresh()
    } catch (err) {
      setError(apiErrorMessage(err))
      setSaving(false)
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-5">
      {!post && (
        <div className="flex flex-wrap gap-4">
          <fieldset className="flex gap-1 rounded-lg border border-border bg-surface p-1">
            <legend className="sr-only">Post type</legend>
            {(['thread', 'link'] as const).map((k) => (
              <Button
                key={k}
                type="button"
                size="sm"
                variant={kind === k ? 'secondary' : 'ghost'}
                aria-pressed={kind === k}
                onClick={() => setKind(k)}
                className="capitalize"
              >
                {k}
              </Button>
            ))}
          </fieldset>
          <div className="flex items-center gap-2">
            <label htmlFor="board" className={label}>
              Board
            </label>
            <select
              id="board"
              value={boardId}
              onChange={(e) => setBoardId(e.target.value)}
              className="h-9 rounded-md border border-input bg-surface px-3 text-sm"
              required
            >
              {boards.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {post?.kind !== 'take' && (
        <div className={field}>
          <label htmlFor="title" className={label}>
            Title
          </label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={300}
            required
          />
        </div>
      )}

      {!post && kind === 'link' && (
        <div className={field}>
          <label htmlFor="url" className={label}>
            Link
          </label>
          <Input
            id="url"
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://"
            required
          />
        </div>
      )}

      <div className={field}>
        <span className={label} id="body-label">
          {post?.kind === 'take' ? 'Take' : 'Body'}
        </span>
        <Tabs defaultValue="write">
          <TabsList>
            <TabsTrigger value="write">Write</TabsTrigger>
            <TabsTrigger value="preview">Preview</TabsTrigger>
          </TabsList>
          <TabsContent value="write">
            <Textarea
              aria-labelledby="body-label"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={8}
              maxLength={post?.kind === 'take' ? 500 : 40_000}
              required={post?.kind === 'take'}
              placeholder="Markdown supported"
            />
          </TabsContent>
          <TabsContent value="preview">
            <div className="min-h-40 rounded-md border border-border p-3">
              {body.trim() ? (
                <Markdown>{body}</Markdown>
              ) : (
                <p className="text-sm text-muted">Nothing to preview.</p>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <div className={field}>
        <label htmlFor="tags" className={label}>
          Tags
        </label>
        <TagPicker value={tags} onChange={setTags} />
      </div>

      {error && (
        <p role="alert" className="text-sm text-live">
          {error}
        </p>
      )}
      <div>
        <Button type="submit" disabled={saving || isPending || !session}>
          {saving ? 'Saving…' : post ? 'Save' : 'Post'}
        </Button>
      </div>
    </form>
  )
}
