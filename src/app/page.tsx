import Link from "next/link"
import { Book, Search, Sparkles, Clock, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingCarousel } from "@/components/landing/trending-carousel"
import { createClient } from "@/lib/supabase/server"
import { getBooksWithCovers } from "@/lib/google-books"

async function getTrendingBooks() {
  const supabase = await createClient()

  const { data: books } = await supabase
    .from('books')
    .select('id, isbn, title, author, status, cover_url, genres')
    .neq('status', 'inactive')

  if (!books || books.length === 0) {
    return []
  }

  // Shuffle books randomly
  const shuffled = [...books].sort(() => Math.random() - 0.5).slice(0, 10)

  // Fetch cover URLs from Google Books
  const coverMap = await getBooksWithCovers(shuffled)

  // Add cover URLs to books
  return shuffled.map(book => ({
    ...book,
    cover_url: coverMap.get(book.id) || book.cover_url || null
  }))
}

export default async function Home() {
  const trendingBooks = await getTrendingBooks()

  const features = [
    {
      icon: Search,
      title: "AI-Powered Search",
      description: "Find books using natural language. Search for 'books about machine learning for beginners' and get relevant results.",
    },
    {
      icon: Sparkles,
      title: "Smart Recommendations",
      description: "Get personalized book recommendations based on your reading history and interests.",
    },
    {
      icon: Clock,
      title: "Easy Checkout",
      description: "Borrow and return books with just a click. Track due dates and get reminders.",
    },
    {
      icon: Users,
      title: "Waitlist System",
      description: "Join the waitlist for popular books and get notified when they're available.",
    },
  ]

  return (
    <div className="flex flex-col gap-8 overflow-hidden">
      {/* Hero Section */}
      <section className="flex flex-col items-center text-center gap-6 py-8">
        <div className="flex items-center gap-2 text-primary">
          <Book className="h-12 w-12" />
        </div>
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
          Your Modern Library
        </h1>
        <p className="max-w-[600px] text-lg text-muted-foreground">
          Discover, borrow, and explore books with AI-powered search and recommendations.
          A smarter way to manage your reading journey.
        </p>
        <div className="flex gap-4">
          <Button asChild size="lg">
            <Link href="/books">
              <Book className="mr-2 h-4 w-4" />
              Browse Books
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/search">
              <Search className="mr-2 h-4 w-4" />
              Search
            </Link>
          </Button>
        </div>
      </section>

      {/* Trending Books Carousel */}
      {trendingBooks.length > 0 && (
        <TrendingCarousel books={trendingBooks} />
      )}

      {/* Features Grid */}
      <section className="py-8">
        <h2 className="text-2xl font-bold text-center mb-8">Why Choose Our Library</h2>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature) => (
            <Card key={feature.title}>
              <CardHeader>
                <feature.icon className="h-8 w-8 text-primary mb-2" />
                <CardTitle className="text-lg">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>{feature.description}</CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="flex flex-col items-center text-center gap-4 py-12 border-t">
        <h2 className="text-2xl font-bold">Ready to start reading?</h2>
        <p className="text-muted-foreground">
          Sign up for free and get access to our entire collection.
        </p>
        <Button asChild size="lg">
          <Link href="/register">Get Started</Link>
        </Button>
      </section>
    </div>
  )
}
