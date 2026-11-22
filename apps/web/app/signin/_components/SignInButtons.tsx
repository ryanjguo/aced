'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { authClient } from '@/lib/auth-client'

const providers = [
  { id: 'google', label: 'Continue with Google' },
  { id: 'discord', label: 'Continue with Discord' },
] as const

export function SignInButtons({ callbackPath }: { callbackPath: string }) {
  const [pending, setPending] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function signIn(provider: (typeof providers)[number]['id']) {
    setPending(provider)
    setError(null)
    const { error } = await authClient.signIn.social({
      provider,
      // Through /welcome, which shows onboarding once and otherwise forwards to callbackPath.
      callbackURL: `${window.location.origin}/welcome?from=${encodeURIComponent(callbackPath)}`,
    })
    if (error) {
      setError(error.message ?? 'Sign-in failed. Try again.')
      setPending(null)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {providers.map((p) => (
        <Button
          key={p.id}
          variant="outline"
          size="lg"
          disabled={pending !== null}
          onClick={() => signIn(p.id)}
        >
          {pending === p.id ? 'Redirecting…' : p.label}
        </Button>
      ))}
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  )
}
