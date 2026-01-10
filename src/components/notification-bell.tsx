'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Bell, CheckCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { useNotifications, type NotificationWithBook } from '@/context/notification-context'

export function NotificationBell() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const { notifications, unreadCount, loading, markAsRead, markAllAsRead } = useNotifications()

  const handleNotificationClick = async (notification: NotificationWithBook) => {
    // Mark as read if unread
    if (!notification.read) {
      await markAsRead(notification.id)
    }

    // Close dropdown
    setOpen(false)

    // Navigate to relevant page
    if (notification.type === 'admin_new_book_request') {
      router.push('/admin')
    } else if (notification.type === 'book_request_submitted' ||
               notification.type === 'book_request_approved' ||
               notification.type === 'book_request_declined') {
      router.push('/dashboard')
    } else if (notification.book_id) {
      router.push(`/books/${notification.book_id}`)
    } else {
      router.push('/dashboard')
    }
  }

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

  const getNotificationIcon = (type: string): string =>
    NOTIFICATION_ICONS[type] ?? '📢'

  if (loading) {
    return (
      <Button variant="ghost" size="icon" className="relative">
        <Bell className="h-5 w-5" />
      </Button>
    )
  }

  // Auto-mark notifications as read when dropdown is opened
  const handleOpenChange = async (isOpen: boolean) => {
    setOpen(isOpen)
    // When opening the dropdown and there are unread notifications, mark them all as read
    if (isOpen && unreadCount > 0) {
      await markAllAsRead()
    }
  }

  // Get only first 5 for the dropdown
  const displayNotifications = notifications.slice(0, 5)

  return (
    <DropdownMenu open={open} onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-80" align="end">
        <div className="flex items-center justify-between px-3 py-2">
          <span className="font-semibold">Notifications</span>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-auto p-1 text-xs"
              onClick={(e) => {
                e.preventDefault()
                markAllAsRead()
              }}
            >
              <CheckCheck className="h-3 w-3 mr-1" />
              Mark all read
            </Button>
          )}
        </div>
        <DropdownMenuSeparator />
        {displayNotifications.length === 0 ? (
          <div className="px-3 py-6 text-center text-sm text-muted-foreground">
            No notifications
          </div>
        ) : (
          <>
            {displayNotifications.map(notification => (
              <DropdownMenuItem
                key={notification.id}
                className={`flex items-start gap-2 p-3 cursor-pointer ${
                  !notification.read ? 'bg-muted/50' : ''
                }`}
                onClick={() => handleNotificationClick(notification)}
              >
                <span className="text-lg mt-0.5">{getNotificationIcon(notification.type)}</span>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm ${!notification.read ? 'font-medium' : ''}`}>
                    {notification.title}
                  </p>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {notification.message}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(notification.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </p>
                </div>
                {!notification.read && (
                  <div className="h-2 w-2 rounded-full bg-primary shrink-0 mt-1.5" />
                )}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild className="justify-center">
              <Link href="/dashboard/notifications" className="text-sm text-primary">
                View all notifications
              </Link>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
