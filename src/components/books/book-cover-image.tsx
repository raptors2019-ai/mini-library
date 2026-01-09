'use client'

import { useState } from 'react'
import Image from 'next/image'
import { BookOpen } from 'lucide-react'
import { cn } from '@/lib/utils'

interface BookCoverImageProps {
  src: string | null
  alt: string
  fill?: boolean
  priority?: boolean
  sizes?: string
  className?: string
  iconSize?: 'sm' | 'md' | 'lg'
}

const iconSizes = {
  sm: 'h-12 w-12',
  md: 'h-16 w-16',
  lg: 'h-24 w-24',
}

export function BookCoverImage({
  src,
  alt,
  fill = true,
  priority = false,
  sizes,
  className,
  iconSize = 'md',
}: BookCoverImageProps) {
  const [imageError, setImageError] = useState(false)
  const showPlaceholder = !src || imageError

  if (showPlaceholder) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-muted to-muted/50">
        <BookOpen className={cn('text-muted-foreground/50', iconSizes[iconSize])} />
      </div>
    )
  }

  return (
    <Image
      src={src}
      alt={alt}
      fill={fill}
      priority={priority}
      sizes={sizes}
      className={cn('object-cover', className)}
      onError={() => setImageError(true)}
    />
  )
}
