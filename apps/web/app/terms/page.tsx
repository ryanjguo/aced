import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = { title: 'Terms' }

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <article className="prose-aced">
        <h1 className="text-page-title">Terms</h1>
        <p className="text-meta text-muted">Last updated November 2026</p>
        <p>By using Aced you agree to these terms. They're short on purpose.</p>
        <h2>Your account</h2>
        <ul>
          <li>You need a Google or Discord account to post. One person, one account.</li>
          <li>You're responsible for what you post from your account.</li>
        </ul>
        <h2>Your content</h2>
        <ul>
          <li>
            You own what you post. You let us show it on Aced and in previews of Aced pages (for
            example when a link is shared).
          </li>
          <li>
            Posts must follow the <Link href="/guidelines">community guidelines</Link>. Moderators
            can remove posts and suspend accounts that don't.
          </li>
        </ul>
        <h2>Esports data</h2>
        <p>
          Match, player and team data comes from official esports data. Aced is a fan site, not
          affiliated with or endorsed by Riot Games. Stats can be late or wrong; don't rely on them
          for anything important.
        </p>
        <h2>No guarantees</h2>
        <p>
          Aced is provided as is. We may change or stop the service, and update these terms; if a
          change matters, we'll say so on the site.
        </p>
        <h2>Contact</h2>
        <p>
          [CONTACT EMAIL]. How we handle your data is in the{' '}
          <Link href="/privacy">privacy page</Link>.
        </p>
      </article>
    </main>
  )
}
