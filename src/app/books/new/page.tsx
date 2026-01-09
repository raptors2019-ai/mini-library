import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { BookForm } from '@/components/books/book-form'
import { ArrowLeft, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default async function NewBookPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || !['librarian', 'admin'].includes(profile.role)) {
    redirect('/books')
  }

  return (
    <div className="flex flex-col gap-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-4">
        <Link href="/books">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </Link>
      </div>

      <div className="flex items-center gap-2">
        <Plus className="h-6 w-6" />
        <h1 className="text-3xl font-bold">Add New Book</h1>
      </div>

      <BookForm mode="create" />
    </div>
  )
}
