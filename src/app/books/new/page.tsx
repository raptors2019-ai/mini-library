import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { BookForm } from '@/components/books/book-form'
import { ArrowLeft, Plus, FileQuestion, Info } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import Link from 'next/link'

export default async function NewBookPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login?redirect=/books/new')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const isAdmin = profile?.role === 'librarian' || profile?.role === 'admin'

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
        {isAdmin ? (
          <Plus className="h-6 w-6" />
        ) : (
          <FileQuestion className="h-6 w-6" />
        )}
        <h1 className="text-3xl font-bold">
          {isAdmin ? 'Add New Book' : 'Request a Book'}
        </h1>
      </div>

      {!isAdmin && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>Book Request</AlertTitle>
          <AlertDescription>
            Can&apos;t find a book in our catalog? Submit a request and a librarian will review it.
            You&apos;ll be notified when the book is added to the library.
          </AlertDescription>
        </Alert>
      )}

      <BookForm mode={isAdmin ? 'create' : 'request'} />
    </div>
  )
}
