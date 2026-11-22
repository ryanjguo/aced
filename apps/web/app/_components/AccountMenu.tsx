'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { authClient } from '@/lib/auth-client'

export function AccountMenu() {
  const { data, isPending } = authClient.useSession()
  const pathname = usePathname()

  // Reserve the avatar's space so the header doesn't jump while the session loads.
  if (isPending) return <div className="size-8" />

  if (!data) {
    const from = pathname === '/signin' ? '/' : pathname
    return (
      <Button asChild size="sm">
        <Link href={`/signin?from=${encodeURIComponent(from)}`}>Sign in</Link>
      </Button>
    )
  }

  const { handle, image, role } = data.user
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="rounded-full" aria-label="Account menu">
        <Avatar>
          <AvatarImage src={image ?? undefined} alt="" />
          <AvatarFallback>{handle.charAt(0).toUpperCase()}</AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuLabel>@{handle}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href={`/u/${handle}`}>Profile</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/settings">Settings</Link>
        </DropdownMenuItem>
        {(role === 'moderator' || role === 'admin') && (
          <DropdownMenuItem asChild>
            <Link href="/mod">Mod queue</Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onSelect={() => authClient.signOut()}>Sign out</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
