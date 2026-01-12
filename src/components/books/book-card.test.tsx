import { render, screen } from '@testing-library/react'
import { BookCard } from './book-card'
import type { Book } from '@/types/database'

// Mock next/image
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: { alt: string; src: string }) => {
    // eslint-disable-next-line @next/next/no-img-element
    return <img alt={props.alt} src={props.src} />
  },
}))

// Mock next/link
jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}))

const mockBook: Book = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  isbn: '978-0-13-468599-1',
  title: 'The Great Gatsby',
  author: 'F. Scott Fitzgerald',
  description: 'A novel about the American Dream',
  ai_summary: 'An AI-generated summary',
  cover_url: 'https://example.com/cover.jpg',
  page_count: 180,
  publish_date: '1925-04-10',
  genres: ['Fiction', 'Classic'],
  status: 'available',
  embedding: null,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  created_by: null,
}

describe('BookCard', () => {
  it('should render book title', () => {
    render(<BookCard book={mockBook} />)
    expect(screen.getByText('The Great Gatsby')).toBeInTheDocument()
  })

  it('should render book author', () => {
    render(<BookCard book={mockBook} />)
    expect(screen.getByText('F. Scott Fitzgerald')).toBeInTheDocument()
  })

  it('should render availability badge', () => {
    render(<BookCard book={mockBook} />)
    expect(screen.getByText('Available')).toBeInTheDocument()
  })

  it('should render first genre as badge', () => {
    render(<BookCard book={mockBook} />)
    // Component shows only the first genre as a badge on the cover
    expect(screen.getByText('Fiction')).toBeInTheDocument()
  })

  it('should link to book detail page', () => {
    render(<BookCard book={mockBook} />)
    const link = screen.getByRole('link')
    expect(link).toHaveAttribute('href', '/books/123e4567-e89b-12d3-a456-426614174000')
  })

  it('should render checked out status', () => {
    const checkedOutBook = { ...mockBook, status: 'checked_out' as const }
    render(<BookCard book={checkedOutBook} />)
    expect(screen.getByText('Checked Out')).toBeInTheDocument()
  })

  it('should show placeholder when no cover image', () => {
    const bookNoCover = { ...mockBook, cover_url: null }
    render(<BookCard book={bookNoCover} />)
    // Should show the BookOpen icon placeholder
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })

  it('should show cover image when available', () => {
    render(<BookCard book={mockBook} />)
    const img = screen.getByRole('img')
    expect(img).toHaveAttribute('src', 'https://example.com/cover.jpg')
    expect(img).toHaveAttribute('alt', 'The Great Gatsby')
  })

  it('should only show first genre even with many genres', () => {
    const bookManyGenres = {
      ...mockBook,
      genres: ['Drama', 'Classic', 'Fiction', 'Romance'],
    }
    render(<BookCard book={bookManyGenres} />)
    // Component shows only the first genre as a badge
    expect(screen.getByText('Drama')).toBeInTheDocument()
    expect(screen.queryByText('Classic')).not.toBeInTheDocument()
  })

  it('should not render genres section when no genres', () => {
    const bookNoGenres = { ...mockBook, genres: null }
    render(<BookCard book={bookNoGenres} />)
    expect(screen.queryByText('Fiction')).not.toBeInTheDocument()
  })
})
