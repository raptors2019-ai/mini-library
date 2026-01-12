import Link from "next/link"
import { Book, Search, Sparkles, Clock, Users, LayoutDashboard } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { BookCarousel } from "@/components/books/book-carousel"
import { PersonalizedRecommendations } from "@/components/home/personalized-recommendations"
import { SearchButton } from "@/components/home/search-button"
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

async function getUserInfo() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .single()

  const { data: preferences } = await supabase
    .from('user_preferences')
    .select('favorite_genres, onboarding_completed')
    .eq('user_id', user.id)
    .single()

  return {
    firstName: profile?.full_name?.split(' ')[0] || 'there',
    favoriteGenres: preferences?.favorite_genres || [],
    onboardingCompleted: preferences?.onboarding_completed || false,
  }
}

export default async function Home() {
  const [trendingBooks, userInfo] = await Promise.all([
    getTrendingBooks(),
    getUserInfo(),
  ])

  const isLoggedIn = !!userInfo

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
        <div className="flex items-center gap-2 text-accent dark:text-primary">
          <Book className="h-12 w-12" />
        </div>
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
          {isLoggedIn ? `Welcome back, ${userInfo.firstName}!` : 'Your Modern Library'}
        </h1>
        <p className="max-w-[600px] text-lg text-subheading">
          {isLoggedIn
            ? 'Discover your next great read with personalized recommendations.'
            : 'Discover, borrow, and explore books with AI-powered search and recommendations. A smarter way to manage your reading journey.'}
        </p>
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 w-full sm:w-auto px-4 sm:px-0">
          {isLoggedIn ? (
            <>
              <Button asChild size="lg" className="w-full sm:w-auto">
                <Link href="/dashboard">
                  <LayoutDashboard className="mr-2 h-4 w-4" />
                  My Dashboard
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="w-full sm:w-auto">
                <Link href="/books">
                  <Book className="mr-2 h-4 w-4" />
                  Browse Books
                </Link>
              </Button>
            </>
          ) : (
            <>
              <Button asChild size="lg" className="w-full sm:w-auto">
                <Link href="/books">
                  <Book className="mr-2 h-4 w-4" />
                  Browse Books
                </Link>
              </Button>
              <SearchButton variant="outline" className="w-full sm:w-auto" />
            </>
          )}
        </div>
      </section>

      {/* Personalized Recommendations for Logged-in Users */}
      {isLoggedIn && userInfo.onboardingCompleted && (
        <PersonalizedRecommendations favoriteGenres={userInfo.favoriteGenres} />
      )}

      {/* Trending Books Carousel */}
      {trendingBooks.length > 0 && (
        <div className="-mx-4 sm:-mx-6 lg:-mx-8">
          <BookCarousel
            books={trendingBooks}
            title="Trending Now"
            subtitle="Popular picks from our collection"
            icon="trending"
          />
        </div>
      )}

      {/* Features Grid */}
      <section className="py-8">
        <h2 className="text-2xl font-bold text-center mb-2">Why Choose Our Library</h2>
        <p className="text-center text-subheading mb-8">Modern features for modern readers</p>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature) => (
            <Card key={feature.title} className="hover:border-accent/50 transition-colors">
              <CardHeader>
                <feature.icon className="h-8 w-8 text-accent dark:text-primary mb-2" />
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
      <section className="flex flex-col items-center text-center gap-4 py-12 border-t border-accent/20">
        {isLoggedIn ? (
          <>
            <h2 className="text-2xl font-bold">Ready to find your next book?</h2>
            <p className="text-subheading">
              Use AI-powered search to discover exactly what you&apos;re looking for.
            </p>
            <SearchButton>Start Searching</SearchButton>
          </>
        ) : (
          <>
            <h2 className="text-2xl font-bold">Ready to start reading?</h2>
            <p className="text-subheading">
              Sign up for free and get access to our entire collection.
            </p>
            <Button asChild size="lg">
              <Link href="/register">Get Started</Link>
            </Button>
          </>
        )}
      </section>
    </div>
  )
}
