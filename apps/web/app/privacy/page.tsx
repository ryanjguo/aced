import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = { title: 'Privacy' }

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <article className="prose-aced">
        <h1 className="text-page-title">Privacy</h1>
        <p className="text-meta text-muted">Last updated November 2026</p>
        <h2>What we store</h2>
        <ul>
          <li>
            <strong>Your account:</strong> when you sign in with Google or Discord we get your name,
            email address and profile picture. We give you a public handle.
          </li>
          <li>
            <strong>What you do here:</strong> your posts, comments, votes, follows and reports.
            Posts, comments and your handle are public; votes, follows and reports are not.
          </li>
          <li>
            <strong>Cookies:</strong> a session cookie to keep you signed in, and one with your time
            zone so match times show in your local time. Your light or dark theme is kept in your
            browser.
          </li>
          <li>
            <strong>Error reports:</strong> when something breaks we may record the error and the
            page it happened on, so we can fix it.
          </li>
        </ul>
        <h2>What we don't do</h2>
        <ul>
          <li>We don't sell your data or share it with advertisers.</li>
          <li>We don't use tracking cookies. Any analytics we add will be cookieless.</li>
          <li>We never show your email address to other users.</li>
        </ul>
        <h2>Deleting your account</h2>
        <p>
          Go to <Link href="/settings">Settings</Link> to download your data or delete your account.
          Deleting removes your sign-in, votes and follows; your posts and comments stay without
          your name, so threads still make sense.
        </p>
        <h2>Contact</h2>
        <p>
          Questions about your data: [CONTACT EMAIL]. See also the <Link href="/terms">terms</Link>{' '}
          and <Link href="/guidelines">community guidelines</Link>.
        </p>
      </article>
    </main>
  )
}
