#!/usr/bin/env npx tsx

import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'

// Get directory name in ESM
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load environment variables from .env.local
const envPath = path.join(__dirname, '..', '.env.local')
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8')
  for (const line of envContent.split('\n')) {
    const [key, ...valueParts] = line.split('=')
    if (key && valueParts.length > 0) {
      const value = valueParts.join('=').trim().replace(/^["']|["']$/g, '')
      if (!process.env[key.trim()]) {
        process.env[key.trim()] = value
      }
    }
  }
}

// Configuration
const SUBJECTS = [
  { name: 'fiction', limit: 80 },
  { name: 'science_fiction', limit: 60 },
  { name: 'mystery', limit: 60 },
  { name: 'history', limit: 60 },
  { name: 'biography', limit: 60 },
  { name: 'science', limit: 60 },
  { name: 'business', limit: 60 },
  { name: 'fantasy', limit: 60 },
]

const TOTAL_TARGET = 500
const BATCH_SIZE = 50
const OPEN_LIBRARY_DELAY = 1000 // 1 second between requests
const OPENAI_DELAY = 500 // 0.5 seconds between AI calls

// Progress file path
const PROGRESS_FILE = path.join(__dirname, '.seed-progress.json')

// Types
interface OpenLibraryBook {
  key: string
  title: string
  author_name?: string[]
  first_publish_year?: number
  number_of_pages_median?: number
  cover_i?: number
  isbn?: string[]
  subject?: string[]
}

interface BookToInsert {
  isbn: string | null
  title: string
  author: string
  description: string | null
  cover_url: string | null
  page_count: number | null
  publish_date: string | null
  genres: string[]
  status: 'available'
}

interface Progress {
  fetchedBooks: BookToInsert[]
  insertedIds: string[]
  enrichedIds: string[]
  phase: 'fetch' | 'insert' | 'enrich' | 'done'
}

// Genre mapping from Open Library subjects to our genres
const GENRE_MAP: Record<string, string> = {
  'fiction': 'Fiction',
  'literary fiction': 'Fiction',
  'science fiction': 'Science Fiction',
  'sci-fi': 'Science Fiction',
  'mystery': 'Mystery',
  'detective': 'Mystery',
  'crime': 'Mystery',
  'thriller': 'Thriller',
  'suspense': 'Thriller',
  'romance': 'Romance',
  'love': 'Romance',
  'fantasy': 'Fantasy',
  'epic fantasy': 'Fantasy',
  'biography': 'Biography',
  'autobiography': 'Biography',
  'memoir': 'Biography',
  'history': 'History',
  'historical': 'History',
  'self-help': 'Self-Help',
  'self help': 'Self-Help',
  'personal development': 'Self-Help',
  'science': 'Science',
  'popular science': 'Science',
  'technology': 'Technology',
  'computers': 'Technology',
  'business': 'Business',
  'economics': 'Business',
  'management': 'Business',
  'children': 'Children',
  "children's": 'Children',
  'juvenile': 'Young Adult',
  'young adult': 'Young Adult',
  'ya': 'Young Adult',
  'non-fiction': 'Non-Fiction',
  'nonfiction': 'Non-Fiction',
}

// Utility functions
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function loadProgress(): Progress {
  if (fs.existsSync(PROGRESS_FILE)) {
    const data = fs.readFileSync(PROGRESS_FILE, 'utf-8')
    return JSON.parse(data)
  }
  return {
    fetchedBooks: [],
    insertedIds: [],
    enrichedIds: [],
    phase: 'fetch',
  }
}

function saveProgress(progress: Progress): void {
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2))
}

function clearProgress(): void {
  if (fs.existsSync(PROGRESS_FILE)) {
    fs.unlinkSync(PROGRESS_FILE)
  }
}

function mapSubjectsToGenres(subjects?: string[]): string[] {
  if (!subjects) return []

  const genres = new Set<string>()
  for (const subject of subjects.slice(0, 10)) { // Only check first 10 subjects
    const lower = subject.toLowerCase()
    for (const [key, genre] of Object.entries(GENRE_MAP)) {
      if (lower.includes(key)) {
        genres.add(genre)
        break
      }
    }
  }
  return Array.from(genres).slice(0, 4) // Max 4 genres
}

// Create Supabase client
function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false }
  })
}

// Fetch books from Open Library
async function fetchBooksFromOpenLibrary(progress: Progress): Promise<BookToInsert[]> {
  if (progress.fetchedBooks.length >= TOTAL_TARGET) {
    console.log(`[Fetch] Using ${progress.fetchedBooks.length} cached books`)
    return progress.fetchedBooks
  }

  console.log('[Fetch] Fetching books from Open Library...')
  const allBooks: BookToInsert[] = [...progress.fetchedBooks]
  const seenTitles = new Set(allBooks.map(b => `${b.title}|${b.author}`.toLowerCase()))

  for (const subject of SUBJECTS) {
    if (allBooks.length >= TOTAL_TARGET) break

    const remaining = Math.min(subject.limit, TOTAL_TARGET - allBooks.length)
    console.log(`[Fetch] Fetching ${subject.name} books (target: ${remaining})...`)

    try {
      const url = `https://openlibrary.org/search.json?subject=${subject.name}&limit=${remaining + 20}&fields=key,title,author_name,first_publish_year,number_of_pages_median,cover_i,isbn,subject`
      const response = await fetch(url)

      if (!response.ok) {
        console.error(`[Fetch] Failed to fetch ${subject.name}: ${response.status}`)
        continue
      }

      const data = await response.json()
      const books: OpenLibraryBook[] = data.docs || []

      for (const book of books) {
        if (allBooks.length >= TOTAL_TARGET) break

        // Skip if no title or already seen
        if (!book.title) continue
        const key = `${book.title}|${book.author_name?.[0] || 'Unknown'}`.toLowerCase()
        if (seenTitles.has(key)) continue
        seenTitles.add(key)

        // Transform to our schema
        const transformed: BookToInsert = {
          isbn: book.isbn?.[0] || null,
          title: book.title.slice(0, 255), // Truncate long titles
          author: book.author_name?.slice(0, 3).join(', ') || 'Unknown',
          description: null, // Open Library search doesn't include description
          cover_url: book.cover_i
            ? `https://covers.openlibrary.org/b/id/${book.cover_i}-L.jpg`
            : null,
          page_count: book.number_of_pages_median || null,
          publish_date: book.first_publish_year
            ? `${book.first_publish_year}-01-01`
            : null,
          genres: mapSubjectsToGenres(book.subject),
          status: 'available',
        }

        // Ensure at least one genre based on the subject we searched
        if (transformed.genres.length === 0) {
          const defaultGenre = GENRE_MAP[subject.name] || 'Fiction'
          transformed.genres = [defaultGenre]
        }

        allBooks.push(transformed)
      }

      console.log(`[Fetch] Got ${allBooks.length}/${TOTAL_TARGET} books`)

      // Save progress after each subject
      progress.fetchedBooks = allBooks
      saveProgress(progress)

      // Rate limit
      await sleep(OPEN_LIBRARY_DELAY)
    } catch (error) {
      console.error(`[Fetch] Error fetching ${subject.name}:`, error)
    }
  }

  console.log(`[Fetch] Complete! Fetched ${allBooks.length} books`)
  progress.fetchedBooks = allBooks
  progress.phase = 'insert'
  saveProgress(progress)

  return allBooks
}

// Insert books into Supabase
async function insertBooks(books: BookToInsert[], progress: Progress): Promise<string[]> {
  if (progress.insertedIds.length >= books.length) {
    console.log(`[Insert] Using ${progress.insertedIds.length} cached inserts`)
    return progress.insertedIds
  }

  const supabase = getSupabaseClient()
  console.log(`[Insert] Inserting ${books.length} books into Supabase...`)

  const insertedIds: string[] = [...progress.insertedIds]
  const startIndex = insertedIds.length

  // Process in batches
  for (let i = startIndex; i < books.length; i += BATCH_SIZE) {
    const batch = books.slice(i, i + BATCH_SIZE)
    const batchNum = Math.floor(i / BATCH_SIZE) + 1
    const totalBatches = Math.ceil(books.length / BATCH_SIZE)

    console.log(`[Insert] Batch ${batchNum}/${totalBatches} (${i + 1}-${Math.min(i + BATCH_SIZE, books.length)}/${books.length})`)

    const { data, error } = await supabase
      .from('books')
      .upsert(batch, {
        onConflict: 'isbn',
        ignoreDuplicates: true
      })
      .select('id')

    if (error) {
      console.error(`[Insert] Error in batch ${batchNum}:`, error.message)
      // Try inserting one by one for this batch
      for (const book of batch) {
        const { data: singleData, error: singleError } = await supabase
          .from('books')
          .insert(book)
          .select('id')
          .single()

        if (singleError) {
          if (!singleError.message.includes('duplicate')) {
            console.error(`[Insert] Failed: ${book.title} - ${singleError.message}`)
          }
        } else if (singleData) {
          insertedIds.push(singleData.id)
        }
      }
    } else if (data) {
      insertedIds.push(...data.map(d => d.id))
    }

    // Save progress after each batch
    progress.insertedIds = insertedIds
    saveProgress(progress)
  }

  console.log(`[Insert] Complete! Inserted ${insertedIds.length} books`)
  progress.phase = 'enrich'
  saveProgress(progress)

  return insertedIds
}

// AI Enrichment (optional)
async function enrichBooks(bookIds: string[], progress: Progress): Promise<void> {
  const openaiKey = process.env.OPENAI_API_KEY
  if (!openaiKey) {
    console.log('[Enrich] Skipping - OPENAI_API_KEY not set')
    return
  }

  // Dynamic import to handle missing key
  const { generateEmbedding, generateBookSummary, createEmbeddingText } = await import('../src/lib/openai.js')

  const supabase = getSupabaseClient()
  const enrichedIds = new Set(progress.enrichedIds)

  // Get ALL books that need enrichment (not just newly inserted)
  const { data: booksToEnrich, error } = await supabase
    .from('books')
    .select('id, title, author, description, genres')
    .is('ai_summary', null)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[Enrich] Error fetching books:', error.message)
    return
  }

  if (!booksToEnrich || booksToEnrich.length === 0) {
    console.log('[Enrich] All books already enriched')
    return
  }

  console.log(`[Enrich] Enriching ${booksToEnrich.length} books with AI...`)

  for (let i = 0; i < booksToEnrich.length; i++) {
    const book = booksToEnrich[i]
    if (enrichedIds.has(book.id)) continue

    const progress_pct = ((i + 1) / booksToEnrich.length * 100).toFixed(1)
    process.stdout.write(`\r[Enrich] ${i + 1}/${booksToEnrich.length} (${progress_pct}%) - ${book.title.slice(0, 40)}...`)

    try {
      // Generate summary
      const summary = await generateBookSummary(book)
      await sleep(OPENAI_DELAY)

      // Generate embedding
      const embeddingText = createEmbeddingText({ ...book, ai_summary: summary })
      const embedding = await generateEmbedding(embeddingText)
      await sleep(OPENAI_DELAY)

      // Update book
      const { error: updateError } = await supabase
        .from('books')
        .update({
          ai_summary: summary,
          embedding: embedding,
        })
        .eq('id', book.id)

      if (updateError) {
        console.error(`\n[Enrich] Failed to update ${book.title}: ${updateError.message}`)
      } else {
        enrichedIds.add(book.id)
        progress.enrichedIds = Array.from(enrichedIds)
        saveProgress(progress)
      }
    } catch (error) {
      console.error(`\n[Enrich] Error enriching ${book.title}:`, error)
    }
  }

  console.log('\n[Enrich] Complete!')
  progress.phase = 'done'
  saveProgress(progress)
}

// Main function
async function main() {
  const args = process.argv.slice(2)
  const shouldEnrich = args.includes('--enrich')
  const shouldReset = args.includes('--reset')

  console.log('='.repeat(50))
  console.log('Open Library Book Seeder')
  console.log('='.repeat(50))
  console.log(`Target: ${TOTAL_TARGET} books`)
  console.log(`AI Enrichment: ${shouldEnrich ? 'Yes' : 'No'}`)
  console.log('='.repeat(50))

  // Reset progress if requested
  if (shouldReset) {
    clearProgress()
    console.log('[Reset] Progress cleared')
  }

  // Load existing progress
  let progress = loadProgress()
  console.log(`[Resume] Starting from phase: ${progress.phase}`)

  try {
    // Phase 1: Fetch books
    const books = await fetchBooksFromOpenLibrary(progress)

    // Phase 2: Insert into Supabase
    const insertedIds = await insertBooks(books, progress)

    // Phase 3: Optional AI enrichment
    if (shouldEnrich && insertedIds.length > 0) {
      await enrichBooks(insertedIds, progress)
    }

    console.log('='.repeat(50))
    console.log('Done!')
    console.log(`Fetched: ${progress.fetchedBooks.length} books`)
    console.log(`Inserted: ${progress.insertedIds.length} books`)
    if (shouldEnrich) {
      console.log(`Enriched: ${progress.enrichedIds.length} books`)
    }
    console.log('='.repeat(50))

    // Clear progress on success
    clearProgress()

  } catch (error) {
    console.error('\n[Error] Script failed:', error)
    console.log('[Info] Progress saved. Run again to resume.')
    process.exit(1)
  }
}

main()
