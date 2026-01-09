"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Book, Search, LayoutDashboard, Settings, LogIn, LogOut, User } from "lucide-react"
import { ThemeToggle } from "@/components/theme-toggle"
import { NotificationBell } from "@/components/notification-bell"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { createClient } from "@/lib/supabase/client"
import { useEffect, useState } from "react"
import type { Profile } from "@/types/database"

export function Header() {
  const pathname = usePathname()
  const [user, setUser] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function getUser() {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (authUser) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', authUser.id)
          .single()
        setUser(profile)
      }
      setLoading(false)
    }
    getUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single()
        setUser(profile)
      } else {
        setUser(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [supabase])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  const isAdmin = user?.role === 'admin' || user?.role === 'librarian'

  const navItems = [
    { href: "/books", label: "Browse", icon: Book },
    { href: "/search", label: "Search", icon: Search },
  ]

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        <Link href="/" className="mr-6 flex items-center space-x-2">
          <Book className="h-6 w-6" />
          <span className="font-bold">Library</span>
        </Link>

        <nav className="flex items-center space-x-1 text-sm font-medium">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center space-x-1 px-3 py-2 rounded-md transition-colors hover:bg-primary/10 hover:text-primary ${
                pathname === item.href
                  ? "text-primary bg-primary/10"
                  : "text-foreground/60"
              }`}
            >
              <item.icon className="h-4 w-4" />
              <span>{item.label}</span>
            </Link>
          ))}
          {user && (
            <Link
              href="/dashboard"
              className={`flex items-center space-x-1 px-3 py-2 rounded-md transition-colors hover:bg-primary/10 hover:text-primary ${
                pathname.startsWith("/dashboard")
                  ? "text-primary bg-primary/10"
                  : "text-foreground/60"
              }`}
            >
              <LayoutDashboard className="h-4 w-4" />
              <span>Dashboard</span>
            </Link>
          )}
          {isAdmin && (
            <Link
              href="/admin"
              className={`flex items-center space-x-1 px-3 py-2 rounded-md transition-colors hover:bg-primary/10 hover:text-primary ${
                pathname.startsWith("/admin")
                  ? "text-primary bg-primary/10"
                  : "text-foreground/60"
              }`}
            >
              <Settings className="h-4 w-4" />
              <span>Admin</span>
            </Link>
          )}
        </nav>

        <div className="ml-auto flex items-center space-x-2">
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
                      {user.full_name?.charAt(0) || user.email.charAt(0).toUpperCase()}
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
    </header>
  )
}
