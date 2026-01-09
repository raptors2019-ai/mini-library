'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Loader2, Search, X } from 'lucide-react'
import { toast } from 'sonner'
import { Book } from '@/types/database'

const GENRES = [
  'Fiction',
  'Non-Fiction',
  'Mystery',
  'Science Fiction',
  'Fantasy',
  'Romance',
  'Thriller',
  'Biography',
  'History',
  'Self-Help',
  'Science',
  'Technology',
  'Business',
  'Children',
  'Young Adult'
]

const bookSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  author: z.string().min(1, 'Author is required'),
  isbn: z.string().optional(),
  description: z.string().optional(),
  cover_url: z.string().optional(),
  page_count: z.union([z.coerce.number().positive(), z.literal('')]).optional(),
  publish_date: z.string().optional(),
  genres: z.array(z.string()).default([]),
  status: z.enum(['available', 'checked_out', 'on_hold', 'inactive']).default('available')
})

type BookFormValues = z.infer<typeof bookSchema>

interface BookFormProps {
  book?: Book
  mode: 'create' | 'edit'
}

export function BookForm({ book, mode }: BookFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [isbnLoading, setIsbnLoading] = useState(false)

  const form = useForm({
    resolver: zodResolver(bookSchema),
    defaultValues: {
      title: book?.title || '',
      author: book?.author || '',
      isbn: book?.isbn || '',
      description: book?.description || '',
      cover_url: book?.cover_url || '',
      page_count: book?.page_count || '',
      publish_date: book?.publish_date || '',
      genres: book?.genres || [],
      status: book?.status || 'available'
    }
  })

  const selectedGenres = form.watch('genres') || []

  const lookupIsbn = async () => {
    const isbn = form.getValues('isbn')
    if (!isbn) {
      toast.error('Please enter an ISBN first')
      return
    }

    setIsbnLoading(true)
    try {
      const response = await fetch(`/api/books/isbn/${isbn}`)
      if (!response.ok) {
        throw new Error('Book not found')
      }

      const data = await response.json()
      form.setValue('title', data.title)
      form.setValue('author', data.author)
      form.setValue('description', data.description || '')
      form.setValue('cover_url', data.cover_url || '')
      form.setValue('page_count', data.page_count || '')
      form.setValue('publish_date', data.publish_date || '')
      form.setValue('genres', data.genres || [])

      toast.success('Book information loaded!')
    } catch {
      toast.error('Could not find book with this ISBN')
    } finally {
      setIsbnLoading(false)
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const onSubmit = async (values: any) => {
    setLoading(true)
    try {
      const url = mode === 'create' ? '/api/books' : `/api/books/${book?.id}`
      const method = mode === 'create' ? 'POST' : 'PATCH'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...values,
          page_count: values.page_count || null,
          cover_url: values.cover_url || null,
          publish_date: values.publish_date || null
        })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to save book')
      }

      const savedBook = await response.json()
      toast.success(mode === 'create' ? 'Book created!' : 'Book updated!')
      router.push(`/books/${savedBook.id}`)
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save book')
    } finally {
      setLoading(false)
    }
  }

  const addGenre = (genre: string) => {
    const current = form.getValues('genres') || []
    if (!current.includes(genre)) {
      form.setValue('genres', [...current, genre])
    }
  }

  const removeGenre = (genre: string) => {
    const current = form.getValues('genres') || []
    form.setValue('genres', current.filter((g: string) => g !== genre))
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* ISBN Lookup */}
        <div className="flex gap-2">
          <FormField
            control={form.control}
            name="isbn"
            render={({ field }) => (
              <FormItem className="flex-1">
                <FormLabel>ISBN</FormLabel>
                <FormControl>
                  <Input placeholder="Enter ISBN to auto-fill" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button
            type="button"
            variant="outline"
            className="mt-8"
            onClick={lookupIsbn}
            disabled={isbnLoading}
          >
            {isbnLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
          </Button>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Title *</FormLabel>
                <FormControl>
                  <Input placeholder="Book title" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="author"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Author *</FormLabel>
                <FormControl>
                  <Input placeholder="Author name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Book description"
                  className="min-h-[120px]"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid md:grid-cols-3 gap-4">
          <FormField
            control={form.control}
            name="cover_url"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Cover URL</FormLabel>
                <FormControl>
                  <Input placeholder="https://..." {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="page_count"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Page Count</FormLabel>
                <FormControl>
                  <Input type="number" placeholder="300" {...field} value={field.value as string | number | undefined} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="publish_date"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Publish Date</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Genres */}
        <div className="space-y-2">
          <FormLabel>Genres</FormLabel>
          <Select onValueChange={addGenre}>
            <SelectTrigger>
              <SelectValue placeholder="Add genre" />
            </SelectTrigger>
            <SelectContent>
              {GENRES.filter(g => !selectedGenres.includes(g)).map((genre) => (
                <SelectItem key={genre} value={genre}>
                  {genre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedGenres.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {selectedGenres.map((genre) => (
                <Badge key={genre} variant="secondary" className="pr-1">
                  {genre}
                  <button
                    type="button"
                    onClick={() => removeGenre(genre)}
                    className="ml-1 hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </div>

        {mode === 'edit' && (
          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Status</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="available">Available</SelectItem>
                    <SelectItem value="checked_out">Checked Out</SelectItem>
                    <SelectItem value="on_hold">On Hold</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <div className="flex gap-4">
          <Button type="submit" disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {mode === 'create' ? 'Create Book' : 'Update Book'}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
          >
            Cancel
          </Button>
        </div>
      </form>
    </Form>
  )
}
