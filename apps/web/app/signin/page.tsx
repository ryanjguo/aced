import type { Metadata } from 'next'
import Link from 'next/link'
import { SignInButtons } from './_components/SignInButtons'

export const metadata: Metadata = { title: 'Sign in' }

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>
}) {
  const { from } = await searchParams
  // Only same-site paths, so the redirect can't be pointed at another site.
  const callbackPath = from?.startsWith('/') && !from.startsWith('//') ? from : '/'

  return (
    <main className="mx-auto flex max-w-sm flex-col gap-8 px-4 py-16 text-center">
      <div className="flex flex-col gap-2">
        <h1 className="text-page-title">Sign in to Aced</h1>
        <p className="text-sm text-muted">
          Post takes, vote, and follow the teams and players you care about.
        </p>
      </div>
      <SignInButtons callbackPath={callbackPath} />
      <p className="text-meta text-muted">
        By signing in you agree to the{' '}
        <Link href="/terms" className="underline underline-offset-2 hover:text-fg">
          terms
        </Link>{' '}
        and{' '}
        <Link href="/guidelines" className="underline underline-offset-2 hover:text-fg">
          guidelines
        </Link>
        . See how we handle your data in the{' '}
        <Link href="/privacy" className="underline underline-offset-2 hover:text-fg">
          privacy page
        </Link>
        .
      </p>
    </main>
  )
}
