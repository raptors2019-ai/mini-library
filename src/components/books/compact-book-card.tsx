'use client'

import Link from 'next/link'
import { BookCoverImage } from './book-cover-image'

interface CompactBookCardProps {
  id: string
  title: string
  author: string
  coverUrl: string | null
}

export function CompactBookCard({ id, title, author, coverUrl }: CompactBookCardProps): React.ReactElement {
  return (
    <Link href={`/books/${id}`} className="group space-y-2">
      <div className="aspect-[2/3] relative bg-muted rounded-lg overflow-hidden">
        <BookCoverImage
          src={coverUrl}
          alt={title}
          className="group-hover:scale-105 transition-transform duration-200"
        />
      </div>
      <div>
        <h4 className="font-medium text-sm line-clamp-2 group-hover:text-primary transition-colors">
          {title}
        </h4>
        <p className="text-xs text-muted-foreground line-clamp-1">{author}</p>
      </div>
    </Link>
  )
}
