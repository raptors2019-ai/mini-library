'use client'

export function Footer(): React.ReactNode {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="border-t mt-auto">
      <div className="container py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">
          Created by Joshua Singarayer
        </p>
        <p className="text-xs text-muted-foreground">
          {currentYear} AILibrary. Built with Next.js and Supabase.
        </p>
      </div>
    </footer>
  )
}
