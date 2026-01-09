import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Bell, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { NotificationsList } from './notifications-list'

async function getNotifications() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: notifications } = await supabase
    .from('notifications')
    .select('*, book:books(id, title, cover_url)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50)

  const { count: unreadCount } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('read', false)

  return {
    notifications: notifications || [],
    unreadCount: unreadCount || 0,
  }
}

export default async function NotificationsPage() {
  const data = await getNotifications()

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </Link>
        <div className="flex items-center gap-2">
          <Bell className="h-6 w-6" />
          <h1 className="text-3xl font-bold">Notifications</h1>
        </div>
      </div>

      <NotificationsList
        notifications={data.notifications}
        unreadCount={data.unreadCount}
      />
    </div>
  )
}
