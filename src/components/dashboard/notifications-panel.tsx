'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Bell, CheckCheck, ChevronRight } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useNotifications, type NotificationWithBook } from '@/context/notification-context'

const NOTIFICATION_ICONS: Record<string, string> = {
  checkout_confirmed: '📚',
  due_soon: '⏰',
  overdue: '⚠️',
  waitlist_joined: '📋',
  waitlist_available: '🎉',
  waitlist_expired: '😔',
  book_returned: '✅',
  book_request_submitted: '📝',
  book_request_approved: '✅',
  book_request_declined: '❌',
  book_request_fulfilled: '🎉',
  admin_new_book_request: '📬',
}

function getNotificationIcon(type: string): string {
  return NOTIFICATION_ICONS[type] ?? '📢'
}

export function NotificationsPanel() {
  const router = useRouter()
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications()

  const handleNotificationClick = async (notification: NotificationWithBook) => {
    // Mark as read if unread
    if (!notification.read) {
      await markAsRead(notification.id)
    }

    // Navigate to book if book_id exists
    if (notification.book_id) {
      router.push(`/books/${notification.book_id}`)
    }
  }

  // Show only first 5 notifications in the dashboard panel
  const displayNotifications = notifications.slice(0, 5)

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notifications
            {unreadCount > 0 && (
              <Badge variant="destructive" className="ml-2">
                {unreadCount}
              </Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
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
        {displayNotifications.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Bell className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No notifications</p>
          </div>
        ) : (
          <div className="space-y-2">
            {displayNotifications.map((notification) => {
              const hasLink = !!notification.book_id

              return (
                <div
                  key={notification.id}
                  className={`flex items-start gap-3 p-3 rounded-lg border transition-all ${
                    !notification.read ? 'bg-muted/50 border-primary/20' : 'bg-card border-transparent'
                  } ${hasLink ? 'cursor-pointer hover:bg-muted/70' : ''}`}
                  onClick={() => hasLink && handleNotificationClick(notification)}
                >
                  <span className="text-xl mt-0.5">{getNotificationIcon(notification.type)}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-2">
                      <p className={`text-sm flex-1 ${!notification.read ? 'font-medium' : ''}`}>
                        {notification.title}
                      </p>
                      {!notification.read && (
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
