'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Bell, Check, CheckCheck, BookOpen } from 'lucide-react'
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

  const markAsRead = async (id: string) => {
    const response = await fetch(`/api/notifications/${id}/read`, { method: 'PUT' })
    if (response.ok) {
      setReadIds(prev => new Set([...prev, id]))
      setUnreadCount(prev => Math.max(0, prev - 1))
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
          {notifications.map((notification) => (
            <Card
              key={notification.id}
              className={`transition-colors ${!isRead(notification) ? 'border-primary/30 bg-muted/30' : ''}`}
            >
              <CardContent className="p-4">
                <div className="flex gap-4">
                  <span className="text-2xl">{getNotificationIcon(notification.type)}</span>

                  {notification.book && (
                    <Link href={`/books/${notification.book.id}`} className="flex-shrink-0">
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
                    </Link>
                  )}

                  <div className="flex-1 min-w-0">
                    <p className={`${!isRead(notification) ? 'font-semibold' : ''}`}>
                      {notification.title}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {notification.message}
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      {new Date(notification.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                    </p>
                  </div>

                  {!isRead(notification) && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => markAsRead(notification.id)}
                      className="shrink-0"
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
