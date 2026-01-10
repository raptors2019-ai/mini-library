"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Search, Library, Settings, LogIn, LogOut, User, Menu, LayoutDashboard, BookOpen, type LucideIcon } from "lucide-react"
import { ThemeToggle } from "@/components/theme-toggle"
import { NotificationBell } from "@/components/notification-bell"
import { RoleSwitcher } from "@/components/dev/role-switcher"
import { DateSimulator } from "@/components/dev/date-simulator"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { SearchTrigger, CommandPalette } from "@/components/command-palette"
import { createClient } from "@/lib/supabase/client"
import { useEffect, useState } from "react"
import type { Profile } from "@/types/database"

interface NavItem {
  href: string
  label: string
  icon: LucideIcon
}

interface NavLinkProps {
  item: NavItem
  pathname: string
  variant: "desktop" | "mobile"
  onNavigate?: () => void
}

function NavLink({ item, pathname, variant, onNavigate }: NavLinkProps): React.ReactNode {
  const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
  const Icon = item.icon

  if (variant === "mobile") {
    return (
      <Link
        href={item.href}
        onClick={onNavigate}
        className={`flex items-center gap-3 px-3 py-3 min-h-[44px] rounded-md transition-colors hover:bg-hover-muted hover:text-hover ${
          isActive ? "text-primary bg-primary/10" : "text-foreground/60"
        }`}
      >
        <Icon className="h-5 w-5" />
        <span className="text-base">{item.label}</span>
      </Link>
    )
  }

  return (
    <Link
      href={item.href}
      className={`flex items-center space-x-1 px-3 py-2 rounded-md transition-colors hover:bg-hover-muted hover:text-hover ${
        isActive ? "text-primary bg-primary/10" : "text-foreground/60"
      }`}
    >
      <Icon className="h-4 w-4" />
      <span>{item.label}</span>
    </Link>
  )
}

function getAvatarInitial(profile: Profile): string {
  return profile.full_name?.charAt(0) || profile.email.charAt(0).toUpperCase()
}

export function Header(): React.ReactNode {
  const pathname = usePathname()
  const [user, setUser] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    async function fetchProfile(userId: string): Promise<void> {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()
      setUser(profile)
    }

    async function getUser(): Promise<void> {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (authUser) {
        await fetchProfile(authUser.id)
      }
      setLoading(false)
    }
    getUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        await fetchProfile(session.user.id)
      } else {
        setUser(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [supabase])

  async function handleSignOut(): Promise<void> {
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  const isAdmin = user?.role === 'admin' || user?.role === 'librarian'

  // Home link goes to dashboard when logged in, otherwise to landing page
  const homeHref = user ? "/dashboard" : "/"

  // Books is the only nav link - Search is now a command palette trigger
  const navItems = [
    { href: "/books", label: "Books", icon: BookOpen },
  ]

  // Build full nav items including conditional ones (Dashboard in mobile menu only)
  const allNavItems = [
    ...navItems,
    ...(user ? [{ href: "/dashboard", label: "Dashboard", icon: LayoutDashboard }] : []),
    ...(isAdmin ? [{ href: "/admin", label: "Admin", icon: Settings }] : []),
  ]

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        {/* Mobile menu */}
        <div className="md:hidden mr-2">
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="h-10 w-10">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Open menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[280px] sm:w-[320px]">
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <Library className="h-5 w-5" />
                  Library
                </SheetTitle>
              </SheetHeader>
              <nav className="flex flex-col gap-1 mt-6">
                {allNavItems.map((item) => (
                  <NavLink
                    key={item.href}
                    item={item}
                    pathname={pathname}
                    variant="mobile"
                    onNavigate={() => setMobileMenuOpen(false)}
                  />
                ))}
                <SearchTrigger
                  onClick={() => {
                    setMobileMenuOpen(false)
                    setCommandPaletteOpen(true)
                  }}
                  variant="mobile"
                />
              </nav>
              {/* Mobile menu footer with user info or sign in */}
              <div className="absolute bottom-6 left-4 right-4">
                {user ? (
                  <div className="flex items-center gap-3 p-3 rounded-md bg-muted/50">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={user.avatar_url || undefined} alt={user.full_name || ""} />
                      <AvatarFallback>
                        {getAvatarInitial(user)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col min-w-0">
                      {user.full_name && (
                        <span className="font-medium truncate">{user.full_name}</span>
                      )}
                      <span className="text-xs text-muted-foreground truncate">{user.email}</span>
                    </div>
                  </div>
                ) : (
                  <Button asChild className="w-full" onClick={() => setMobileMenuOpen(false)}>
                    <Link href="/login">
                      <LogIn className="mr-2 h-4 w-4" />
                      Sign in
                    </Link>
                  </Button>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>

        <Link href={homeHref} className="mr-2 md:mr-6 flex items-center space-x-2">
          <Library className="h-6 w-6" />
          <span className="font-bold hidden sm:inline">Library</span>
        </Link>

        {/* Desktop nav - hidden on mobile */}
        <nav className="hidden md:flex items-center space-x-1 text-sm font-medium">
          {navItems.map((item) => (
            <NavLink key={item.href} item={item} pathname={pathname} variant="desktop" />
          ))}
          <SearchTrigger
            onClick={() => setCommandPaletteOpen(true)}
            variant="desktop"
          />
          {isAdmin && (
            <NavLink
              item={{ href: "/admin", label: "Admin", icon: Settings }}
              pathname={pathname}
              variant="desktop"
            />
          )}
        </nav>

        <div className="ml-auto flex items-center space-x-2">
          {/* Admin: Date simulator for demo purposes */}
          {isAdmin && <DateSimulator />}
          {/* Dev-only role switcher */}
          {process.env.NODE_ENV === 'development' && user && <RoleSwitcher />}
          <ThemeToggle />
          {user && <NotificationBell />}

          {loading ? (
            <div className="h-8 w-8 animate-pulse rounded-full bg-muted" />
          ) : user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user.avatar_url || undefined} alt={user.full_name || ""} />
                    <AvatarFallback>
                      {getAvatarInitial(user)}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <div className="flex items-center justify-start gap-2 p-2">
                  <div className="flex flex-col space-y-1 leading-none">
                    {user.full_name && (
                      <p className="font-medium">{user.full_name}</p>
                    )}
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                    <p className="text-xs text-muted-foreground capitalize">{user.role}</p>
                  </div>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/dashboard" className="cursor-pointer">
                    <User className="mr-2 h-4 w-4" />
                    Dashboard
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer">
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button asChild variant="default" size="sm">
              <Link href="/login">
                <LogIn className="mr-2 h-4 w-4" />
                Sign in
              </Link>
            </Button>
          )}
        </div>
      </div>

      {/* Command Palette for AI-powered search */}
      <CommandPalette
        open={commandPaletteOpen}
        onOpenChange={setCommandPaletteOpen}
      />
    </header>
  )
}
