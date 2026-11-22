import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Community guidelines' }

export default function GuidelinesPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <article className="prose-aced">
        <h1 className="text-page-title">Community guidelines</h1>
        <p>
          Aced is for talking about pro play. Disagree as hard as you like; keep it about the game.
        </p>
        <h2>Be civil</h2>
        <ul>
          <li>Criticise plays, teams and takes, not people.</li>
          <li>
            No harassment, slurs, threats or pile-ons, toward users or pros. No posting anyone's
            private information.
          </li>
          <li>No spam, vote manipulation or alternate accounts.</li>
        </ul>
        <h2>Rumors</h2>
        <ul>
          <li>
            Every rumor needs a source: a link or a named reporter. "Trust me" isn't a source.
          </li>
          <li>Rumors are about competitive moves only: rosters, coaches, transfers, events.</li>
          <li>Nothing about players' private lives, health or families.</li>
          <li>
            Moderators mark rumors Confirmed or Denied when the news lands. A denied rumor stays up,
            marked as denied.
          </li>
        </ul>
        <h2>Off limits</h2>
        <ul>
          <li>Cheats, exploits, account selling and boosting.</li>
          <li>Leaked unreleased content or private team information.</li>
          <li>Anything illegal.</li>
        </ul>
        <h2>Reports and bans</h2>
        <ul>
          <li>Use Report on any post or comment that breaks these rules. Reports are private.</li>
          <li>
            Posts with several reports from established accounts are hidden until a moderator looks
            at them.
          </li>
          <li>
            Moderators remove posts and can suspend accounts for a time or permanently, depending on
            how serious and how repeated the problem is.
          </li>
        </ul>
      </article>
    </main>
  )
}
