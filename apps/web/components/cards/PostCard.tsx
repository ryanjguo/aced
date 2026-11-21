import type { PostData } from '@aced/types'
import { ResultCard } from './ResultCard'
import { StatCard } from './StatCard'
import { TransferCard } from './TransferCard'

/** Renders a generated post's structured data. */
export function PostCard({ data }: { data: PostData }) {
  switch (data.type) {
    case 'result':
      return <ResultCard data={data} />
    case 'stat_card':
      return <StatCard data={data} />
    case 'transfer':
      return <TransferCard data={data} />
  }
}
