import type { Metadata } from 'next'
import { ThemeProvider } from 'next-themes'
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
    // next-themes sets the theme class on <html> before hydration.
    <html lang="en" suppressHydrationWarning>
      <body className="flex min-h-dvh flex-col antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <TooltipProvider>
            <SiteHeader />
            <div className="flex-1">{children}</div>
            <SiteFooter />
            <TimeZoneCookie />
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
