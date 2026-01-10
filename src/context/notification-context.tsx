'use client'

import { createContext, useContext } from 'react'
import type { Notification } from '@/types/database'

export interface NotificationWithBook extends Notification {
  book?: { id: string; title: string; cover_url: string | null } | null
}

export interface NotificationContextValue {
  notifications: NotificationWithBook[]
  unreadCount: number
  loading: boolean
  markAsRead: (id: string) => Promise<void>
  markAllAsRead: () => Promise<void>
  refetch: () => Promise<void>
}

export const NotificationContext = createContext<NotificationContextValue | null>(null)

export function useNotifications() {
  const context = useContext(NotificationContext)
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider')
  }
  return context
}
