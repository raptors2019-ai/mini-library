import Link from 'next/link'
import { Library, ArrowRight } from 'lucide-react'

interface MyBooksCalloutProps {
  stats: {
    reading: number
    wantToRead: number
    read: number
  }
}

export function MyBooksCallout({ stats }: MyBooksCalloutProps) {
  const totalBooks = stats.reading + stats.wantToRead + stats.read

  return (
    <Link
      href="/dashboard/my-books"
      className="inline-flex items-center gap-2 text-primary hover:underline font-medium group"
    >
      <Library className="h-4 w-4" />
      View my Reading List
      {totalBooks > 0 && (
        <span className="text-muted-foreground font-normal">
          ({totalBooks} {totalBooks === 1 ? 'book' : 'books'})
        </span>
      )}
      <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
    </Link>
  )
}
