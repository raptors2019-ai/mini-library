'use client'

import { useRouter } from 'next/navigation'
import { CurrentCheckouts } from '@/components/dashboard/current-checkouts'
import type { CheckoutWithBook } from '@/types/database'

interface DashboardActionsProps {
  checkouts: CheckoutWithBook[]
  checkoutLimit?: number
}

export function DashboardActions({ checkouts, checkoutLimit }: DashboardActionsProps) {
  const router = useRouter()

  const handleReturnComplete = () => {
    router.refresh()
  }

  return (
    <CurrentCheckouts
      checkouts={checkouts}
      checkoutLimit={checkoutLimit}
      onReturnComplete={handleReturnComplete}
    />
  )
}
