import { GeistMono } from 'geist/font/mono'
import { GeistSans } from 'geist/font/sans'
import type { Metadata } from 'next'
import { ThemeProvider } from 'next-themes'
import type { ReactNode } from 'react'
import { TooltipProvider } from '@/components/ui/tooltip'
import { siteUrl } from '@/lib/site-url'
import { MobileTabBar } from './_components/MobileTabBar'
import { SiteFooter } from './_components/SiteFooter'
import { SiteHeader } from './_components/SiteHeader'
import { TimeZoneCookie } from './_components/TimeZoneCookie'
import './globals.css'

export const metadata: Metadata = {
  // Makes relative canonical and share-image URLs absolute.
  metadataBase: new URL(siteUrl),
  title: { default: 'Aced', template: '%s · Aced' },
  description: 'The pro esports community hub: matches, stats, rumors and discussion.',
  openGraph: { siteName: 'Aced', type: 'website' },
  twitter: { card: 'summary_large_image' },
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    // next-themes sets the theme class on <html> before hydration.
    <html
      lang="en"
      className={`${GeistSans.variable} ${GeistMono.variable}`}
      suppressHydrationWarning
    >
      <body className="flex min-h-dvh flex-col pb-16 antialiased md:pb-0">
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
            <MobileTabBar />
            <TimeZoneCookie />
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
