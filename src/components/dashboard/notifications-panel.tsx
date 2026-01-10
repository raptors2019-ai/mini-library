'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Bell, CheckCheck, ChevronRight } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { Notification } from '@/types/database'

interface NotificationsPanelProps {
  notifications: Notification[]
}

const NOTIFICATION_ICONS: Record<string, string> = {
  checkout_confirmed: '📚',
  due_soon: '⏰',
  overdue: '⚠️',
  waitlist_joined: '📋',
  waitlist_available: '🎉',
  waitlist_expired: '😔',
  book_returned: '✅',
}

function getNotificationIcon(type: string): string {
  return NOTIFICATION_ICONS[type] ?? '📢'
}

export function NotificationsPanel({ notifications }: NotificationsPanelProps) {
  const router = useRouter()
  const [readIds, setReadIds] = useState<Set<string>>(new Set())

  const isRead = (notification: Notification) => {
    return notification.read || readIds.has(notification.id)
  }

  const handleNotificationClick = async (notification: Notification) => {
    // Mark as read if unread
    if (!isRead(notification)) {
      await fetch(`/api/notifications/${notification.id}/read`, { method: 'PUT' })
      setReadIds(prev => new Set([...prev, notification.id]))
    }

    // Navigate to book if book_id exists
    if (notification.book_id) {
      router.push(`/books/${notification.book_id}`)
    }
  }

  const markAllAsRead = async () => {
    await fetch('/api/notifications/read-all', { method: 'PUT' })
    setReadIds(new Set(notifications.map(n => n.id)))
  }

  const currentUnreadCount = notifications.filter(n => !isRead(n)).length

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notifications
            {currentUnreadCount > 0 && (
              <Badge variant="destructive" className="ml-2">
                {currentUnreadCount}
              </Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-1">
            {currentUnreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs h-8 px-2"
                onClick={markAllAsRead}
              >
                <CheckCheck className="h-3.5 w-3.5 mr-1" />
                Clear all
              </Button>
            )}
            <Link href="/dashboard/notifications">
              <Button variant="ghost" size="sm" className="text-xs h-8 px-2">
                View All
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {notifications.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Bell className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No notifications</p>
          </div>
        ) : (
          <div className="space-y-2">
            {notifications.map((notification) => {
              const read = isRead(notification)
              const hasLink = !!notification.book_id

              return (
                <div
                  key={notification.id}
                  className={`flex items-start gap-3 p-3 rounded-lg border transition-all ${
                    !read ? 'bg-muted/50 border-primary/20' : 'bg-card border-transparent'
                  } ${hasLink ? 'cursor-pointer hover:bg-muted/70' : ''}`}
                  onClick={() => hasLink && handleNotificationClick(notification)}
                >
                  <span className="text-xl mt-0.5">{getNotificationIcon(notification.type)}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-2">
                      <p className={`text-sm flex-1 ${!read ? 'font-medium' : ''}`}>
                        {notification.title}
                      </p>
                      {!read && (
                        <div className="h-2 w-2 rounded-full bg-primary shrink-0 mt-1.5" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                      {notification.message}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(notification.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
