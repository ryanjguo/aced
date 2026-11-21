import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { SiteFooter } from './_components/SiteFooter'
import { SiteHeader } from './_components/SiteHeader'
import './globals.css'

export const metadata: Metadata = {
  title: { default: 'Aced', template: '%s · Aced' },
  description: 'The VCT community hub.',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="flex min-h-dvh flex-col antialiased">
        <SiteHeader />
        <div className="flex-1">{children}</div>
        <SiteFooter />
      </body>
    </html>
  )
}
