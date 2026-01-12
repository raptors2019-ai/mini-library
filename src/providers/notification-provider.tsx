'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  NotificationContext,
  type NotificationContextValue,
  type NotificationWithBook,
} from '@/context/notification-context'

interface NotificationProviderProps {
  children: React.ReactNode
}

export function NotificationProvider({ children }: NotificationProviderProps) {
  const [notifications, setNotifications] = useState<NotificationWithBook[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const supabase = useMemo(() => createClient(), [])

  const fetchNotifications = useCallback(async () => {
    try {
      const response = await fetch('/api/notifications?limit=10')
      if (response.ok) {
        const data = await response.json()
        setNotifications(data.notifications || [])
        setUnreadCount(data.unread_count || 0)
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  // Get current user ID for subscription filter
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUserId(user?.id ?? null)
    }
    getUser()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUserId(session?.user?.id ?? null)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [supabase])

  // Initial fetch and real-time subscription
  useEffect(() => {
    fetchNotifications()

    // Only set up subscription if we have a user ID
    if (!userId) return

    // Set up real-time subscription for new and updated notifications
    // Using wildcard event (*) and client-side filtering for reliability
    // The RLS policy ensures we only see our own notifications anyway
    const channel = supabase
      .channel(`user-notifications-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
        },
        (payload) => {
          // Client-side filter: only process events for this user
          const newRecord = payload.new as { user_id?: string } | null
          const oldRecord = payload.old as { user_id?: string } | null
          const targetUserId = newRecord?.user_id || oldRecord?.user_id

          if (targetUserId === userId) {
            console.log('[Realtime] Notification event for current user:', payload.eventType)
            fetchNotifications()
          }
        }
      )
      .subscribe((status, err) => {
        if (err) {
          console.error('[Realtime] Subscription error:', err)
        }
        if (status === 'SUBSCRIBED') {
          console.log('[Realtime] Subscribed to notifications channel')
        } else if (status === 'CHANNEL_ERROR') {
          console.error('[Realtime] Channel error - retrying in 5s')
          // Retry after delay
          setTimeout(() => {
            channel.subscribe()
          }, 5000)
        }
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, fetchNotifications, userId])

  const markAsRead = useCallback(async (id: string) => {
    // Optimistic update
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, read: true } : n))
    )
    setUnreadCount(prev => Math.max(0, prev - 1))

    // API call
    await fetch(`/api/notifications/${id}/read`, { method: 'PUT' })
  }, [])

  const markAllAsRead = useCallback(async () => {
    // Optimistic update
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    setUnreadCount(0)

    // API call
    await fetch('/api/notifications/read-all', { method: 'PUT' })
  }, [])

  const refetch = useCallback(async () => {
    await fetchNotifications()
  }, [fetchNotifications])

  const value = useMemo<NotificationContextValue>(
    () => ({
      notifications,
      unreadCount,
      loading,
      markAsRead,
      markAllAsRead,
      refetch,
    }),
    [notifications, unreadCount, loading, markAsRead, markAllAsRead, refetch]
  )

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  )
}
