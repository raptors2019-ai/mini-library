'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Bell, CheckCheck, BookOpen, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import type { Notification } from '@/types/database'

interface NotificationWithBook extends Notification {
  book?: { id: string; title: string; cover_url: string | null } | null
}

interface NotificationsListProps {
  notifications: NotificationWithBook[]
  unreadCount: number
}

function getNotificationIcon(type: string): string {
  switch (type) {
    case 'checkout_confirmed':
      return '📚'
    case 'due_soon':
      return '⏰'
    case 'overdue':
      return '⚠️'
    case 'waitlist_joined':
      return '📋'
    case 'waitlist_available':
      return '🎉'
    case 'waitlist_expired':
      return '😔'
    case 'book_returned':
      return '✅'
    default:
      return '📢'
  }
}

export function NotificationsList({ notifications, unreadCount: initialUnreadCount }: NotificationsListProps) {
  const router = useRouter()
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount)
  const [readIds, setReadIds] = useState<Set<string>>(new Set())

  const handleNotificationClick = async (notification: NotificationWithBook) => {
    // Mark as read if unread
    if (!isRead(notification)) {
      await fetch(`/api/notifications/${notification.id}/read`, { method: 'PUT' })
      setReadIds(prev => new Set([...prev, notification.id]))
      setUnreadCount(prev => Math.max(0, prev - 1))
    }

    // Navigate to relevant page
    if (notification.book_id) {
      router.push(`/books/${notification.book_id}`)
    }
  }

  const markAllAsRead = async () => {
    const response = await fetch('/api/notifications/read-all', { method: 'PUT' })
    if (response.ok) {
      setReadIds(new Set(notifications.map(n => n.id)))
      setUnreadCount(0)
      router.refresh()
    }
  }

  const isRead = (notification: NotificationWithBook) => {
    return notification.read || readIds.has(notification.id)
  }

  return (
    <div className="space-y-4">
      {unreadCount > 0 && (
        <div className="flex justify-end">
          <Button variant="outline" size="sm" onClick={markAllAsRead}>
            <CheckCheck className="h-4 w-4 mr-2" />
            Mark all as read
          </Button>
        </div>
      )}

      {notifications.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No notifications yet</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {notifications.map((notification) => {
            const hasLink = !!notification.book_id
            const read = isRead(notification)

            return (
              <Card
                key={notification.id}
                className={`transition-all ${!read ? 'border-primary/30 bg-muted/30' : ''} ${
                  hasLink ? 'cursor-pointer hover:bg-muted/50' : ''
                }`}
                onClick={() => hasLink && handleNotificationClick(notification)}
              >
                <CardContent className="p-4">
                  <div className="flex gap-4">
                    <span className="text-2xl">{getNotificationIcon(notification.type)}</span>

                    {notification.book && (
                      <div className="flex-shrink-0">
                        <div className="w-12 h-16 relative bg-muted rounded overflow-hidden">
                          {notification.book.cover_url ? (
                            <Image
                              src={notification.book.cover_url}
                              alt={notification.book.title}
                              fill
                              className="object-cover"
                            />
                          ) : (
                            <div className="flex items-center justify-center h-full">
                              <BookOpen className="h-4 w-4 text-muted-foreground/50" />
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start gap-2">
                        <p className={`flex-1 ${!read ? 'font-semibold' : ''}`}>
                          {notification.title}
                        </p>
                        {!read && (
                          <div className="h-2 w-2 rounded-full bg-primary shrink-0 mt-2" />
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {notification.message}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <p className="text-xs text-muted-foreground">
                          {new Date(notification.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                        </p>
                        {hasLink && (
                          <span className="text-xs text-primary flex items-center gap-1">
                            <ExternalLink className="h-3 w-3" />
                            View book
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
