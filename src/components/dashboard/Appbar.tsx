'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useState } from 'react'
import { Icon } from '@/components/basics/Icon'
import { ThemeToggle } from '@/components/basics/ThemeToggle'
import { ClerkUserButton } from '@/components/clerk/ClerkUserButton'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'

interface AppbarProps {
  /**
   * Whether to show the user button (requires authentication)
   * @default false
   */
  showUserButton?: boolean
}

const navLinks = [
  { href: '/dashboard', label: 'Home', icon: 'home' as const },
  { href: '/about', label: 'About', icon: 'info' as const },
  { href: '/contact', label: 'Contact', icon: 'mail' as const },
]

export function Appbar({ showUserButton = false }: AppbarProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-16 max-w-screen-xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo + App Name */}
        <div className="flex items-center gap-6 lg:gap-10">
          <Link className="flex items-center gap-2" href="/">
            <Image alt="" className="h-6 w-auto" height={24} priority src="/logo.svg" width={36} />
            <span className="font-bold text-lg">KeepOn</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden items-center gap-6 md:flex">
            {navLinks.map((link) => (
              <Link
                className="font-medium text-foreground/60 text-sm transition-colors hover:text-foreground"
                href={link.href}
                key={link.href}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        {/* Right Side Actions */}
        <div className="flex items-center gap-4">
          <ThemeToggle />
          {showUserButton && <ClerkUserButton />}

          {/* Mobile Menu */}
          <Sheet onOpenChange={setIsOpen} open={isOpen}>
            <SheetTrigger asChild>
              <button
                aria-label="メニューを開く"
                className="inline-flex h-9 w-9 items-center justify-center rounded-md transition-colors hover:bg-accent hover:text-accent-foreground md:hidden"
                type="button"
              >
                <Icon name="menu" size={20} />
              </button>
            </SheetTrigger>
            <SheetContent side="right">
              <SheetHeader>
                <SheetTitle>Menu</SheetTitle>
              </SheetHeader>
              <nav className="mt-6 flex flex-col gap-4">
                {navLinks.map((link) => (
                  <Link
                    className="flex items-center gap-3 rounded-md px-3 py-2 font-medium text-foreground/60 transition-colors hover:bg-accent hover:text-foreground"
                    href={link.href}
                    key={link.href}
                    onClick={() => setIsOpen(false)}
                  >
                    <Icon name={link.icon} size={20} />
                    <span>{link.label}</span>
                  </Link>
                ))}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  )
}
