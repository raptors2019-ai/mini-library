'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface PaginationProps {
  currentPage: number
  totalPages: number
  total: number
}

function calculatePageNumbers(currentPage: number, totalPages: number): number[] {
  const maxVisible = 5

  if (totalPages <= maxVisible) {
    return Array.from({ length: totalPages }, (_, i) => i + 1)
  }

  const halfVisible = Math.floor(maxVisible / 2)
  let start = currentPage - halfVisible
  let end = currentPage + halfVisible

  if (start < 1) {
    start = 1
    end = maxVisible
  } else if (end > totalPages) {
    end = totalPages
    start = totalPages - maxVisible + 1
  }

  return Array.from({ length: end - start + 1 }, (_, i) => start + i)
}

export function Pagination({ currentPage, totalPages, total }: PaginationProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  if (totalPages <= 1) return null

  function goToPage(page: number): void {
    const params = new URLSearchParams(searchParams.toString())
    params.set('page', page.toString())
    router.push(`?${params.toString()}`)
  }

  const pageNumbers = calculatePageNumbers(currentPage, totalPages)

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
      <p className="text-sm text-muted-foreground">
        Showing page {currentPage} of {totalPages} ({total} books)
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          className="h-10 px-3 sm:h-8 sm:px-2"
          onClick={() => goToPage(currentPage - 1)}
          disabled={currentPage <= 1}
        >
          <ChevronLeft className="h-4 w-4 sm:mr-1" />
          <span className="hidden sm:inline">Previous</span>
        </Button>
        {/* Page numbers - hidden on mobile, show simplified text */}
        <span className="sm:hidden text-sm text-muted-foreground px-2 min-w-[60px] text-center">
          {currentPage} / {totalPages}
        </span>
        <div className="hidden sm:flex items-center gap-1">
          {pageNumbers.map((pageNum) => (
            <Button
              key={pageNum}
              variant={pageNum === currentPage ? 'default' : 'outline'}
              size="sm"
              className="w-8 h-8"
              onClick={() => goToPage(pageNum)}
            >
              {pageNum}
            </Button>
          ))}
        </div>
        <Button
          variant="outline"
          size="sm"
          className="h-10 px-3 sm:h-8 sm:px-2"
          onClick={() => goToPage(currentPage + 1)}
          disabled={currentPage >= totalPages}
        >
          <span className="hidden sm:inline">Next</span>
          <ChevronRight className="h-4 w-4 sm:ml-1" />
        </Button>
      </div>
    </div>
  )
}
