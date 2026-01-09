'use client'

import Link from 'next/link'
import { Bell, Check, ChevronRight } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { Notification } from '@/types/database'

interface NotificationsPanelProps {
  notifications: Notification[]
  unreadCount: number
  onMarkAsRead?: (id: string) => Promise<void>
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

export function NotificationsPanel({ notifications, unreadCount, onMarkAsRead }: NotificationsPanelProps) {
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
          <Link href="/dashboard/notifications">
            <Button variant="ghost" size="sm" className="text-xs">
              View All
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        {notifications.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Bell className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No notifications</p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
                  !notification.read ? 'bg-muted/50 border-primary/20' : 'bg-card'
                }`}
              >
                <span className="text-xl mt-0.5">{getNotificationIcon(notification.type)}</span>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm ${!notification.read ? 'font-medium' : ''}`}>
                    {notification.title}
                  </p>
                  <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                    {notification.message}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(notification.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </p>
                </div>
                {!notification.read && onMarkAsRead && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    onClick={() => onMarkAsRead(notification.id)}
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
