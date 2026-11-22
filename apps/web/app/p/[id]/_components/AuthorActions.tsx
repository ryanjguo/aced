'use client'

import Link from 'next/link'
import { authClient } from '@/lib/auth-client'

/** Edit link, shown only to the post's author. */
export function AuthorActions({ postId, authorId }: { postId: string; authorId: string }) {
  const { data } = authClient.useSession()
  if (data?.user.id !== authorId) return null
  return (
    <Link href={`/p/${postId}/edit`} className="hover:text-fg">
      Edit
    </Link>
  )
}
