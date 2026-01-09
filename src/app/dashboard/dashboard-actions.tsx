'use client'

import { useRouter } from 'next/navigation'
import { CurrentCheckouts } from '@/components/dashboard/current-checkouts'
import type { CheckoutWithBook } from '@/types/database'

interface DashboardActionsProps {
  checkouts: CheckoutWithBook[]
}

export function DashboardActions({ checkouts }: DashboardActionsProps) {
  const router = useRouter()

  const handleReturn = async (checkoutId: string) => {
    const response = await fetch(`/api/checkouts/${checkoutId}/return`, {
      method: 'PUT',
    })

    if (response.ok) {
      router.refresh()
    }
  }

  return <CurrentCheckouts checkouts={checkouts} onReturn={handleReturn} />
}
