'use client'

import { useState } from 'react'
import { Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CommandPalette } from '@/components/command-palette'

interface SearchButtonProps {
  size?: 'default' | 'sm' | 'lg'
  variant?: 'default' | 'outline'
  className?: string
  children?: React.ReactNode
}

export function SearchButton({
  size = 'lg',
  variant = 'outline',
  className = '',
  children
}: SearchButtonProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button
        size={size}
        variant={variant}
        className={className}
        onClick={() => setOpen(true)}
      >
        <Search className="mr-2 h-4 w-4" />
        {children || 'Search'}
      </Button>
      <CommandPalette open={open} onOpenChange={setOpen} />
    </>
  )
}
