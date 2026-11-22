import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { TooltipProvider } from '@/components/ui/tooltip'
import { SiteFooter } from './_components/SiteFooter'
import { SiteHeader } from './_components/SiteHeader'
import { TimeZoneCookie } from './_components/TimeZoneCookie'
import './globals.css'

export const metadata: Metadata = {
  title: { default: 'Aced', template: '%s · Aced' },
  description: 'The pro esports community hub: matches, stats, rumors and discussion.',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="flex min-h-dvh flex-col antialiased">
        <TooltipProvider>
          <SiteHeader />
          <div className="flex-1">{children}</div>
          <SiteFooter />
          <TimeZoneCookie />
        </TooltipProvider>
      </body>
    </html>
  )
}
