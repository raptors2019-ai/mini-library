export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type UserRole = 'guest' | 'member' | 'premium' | 'librarian' | 'admin'
export type BookStatus = 'available' | 'checked_out' | 'on_hold' | 'inactive'
export type CheckoutStatus = 'active' | 'returned' | 'overdue'
export type WaitlistStatus = 'waiting' | 'notified' | 'claimed' | 'expired' | 'cancelled'
export type NotificationType =
  | 'checkout_confirmed'
  | 'due_soon'
  | 'overdue'
  | 'waitlist_joined'
  | 'waitlist_available'
  | 'waitlist_expired'
  | 'book_returned'
  | 'system'

export type UserBookStatus = 'want_to_read' | 'reading' | 'read' | 'dnf'
export type PreferredLength = 'short' | 'medium' | 'long' | 'any'

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          avatar_url: string | null
          role: UserRole
          checkout_limit: number
          hold_duration_days: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          avatar_url?: string | null
          role?: UserRole
          checkout_limit?: number
          hold_duration_days?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          avatar_url?: string | null
          role?: UserRole
          checkout_limit?: number
          hold_duration_days?: number
          created_at?: string
          updated_at?: string
        }
      }
      books: {
        Row: {
          id: string
          isbn: string | null
          title: string
          author: string
          description: string | null
          ai_summary: string | null
          cover_url: string | null
          page_count: number | null
          publish_date: string | null
          genres: string[] | null
          status: BookStatus
          embedding: number[] | null
          review_summary: string | null
          review_summary_generated_at: string | null
          created_at: string
          updated_at: string
          created_by: string | null
        }
        Insert: {
          id?: string
          isbn?: string | null
          title: string
          author: string
          description?: string | null
          ai_summary?: string | null
          cover_url?: string | null
          page_count?: number | null
          publish_date?: string | null
          genres?: string[] | null
          status?: BookStatus
          embedding?: number[] | null
          review_summary?: string | null
          review_summary_generated_at?: string | null
          created_at?: string
          updated_at?: string
          created_by?: string | null
        }
        Update: {
          id?: string
          isbn?: string | null
          title?: string
          author?: string
          description?: string | null
          ai_summary?: string | null
          cover_url?: string | null
          page_count?: number | null
          publish_date?: string | null
          genres?: string[] | null
          status?: BookStatus
          embedding?: number[] | null
          review_summary?: string | null
          review_summary_generated_at?: string | null
          created_at?: string
          updated_at?: string
          created_by?: string | null
        }
      }
      checkouts: {
        Row: {
          id: string
          book_id: string
          user_id: string
          checked_out_at: string
          due_date: string
          returned_at: string | null
          status: CheckoutStatus
          created_at: string
        }
        Insert: {
          id?: string
          book_id: string
          user_id: string
          checked_out_at?: string
          due_date: string
          returned_at?: string | null
          status?: CheckoutStatus
          created_at?: string
        }
        Update: {
          id?: string
          book_id?: string
          user_id?: string
          checked_out_at?: string
          due_date?: string
          returned_at?: string | null
          status?: CheckoutStatus
          created_at?: string
        }
      }
      waitlist: {
        Row: {
          id: string
          book_id: string
          user_id: string
          position: number
          is_priority: boolean
          notified_at: string | null
          expires_at: string | null
          status: WaitlistStatus
          created_at: string
        }
        Insert: {
          id?: string
          book_id: string
          user_id: string
          position: number
          is_priority?: boolean
          notified_at?: string | null
          expires_at?: string | null
          status?: WaitlistStatus
          created_at?: string
        }
        Update: {
          id?: string
          book_id?: string
          user_id?: string
          position?: number
          is_priority?: boolean
          notified_at?: string | null
          expires_at?: string | null
          status?: WaitlistStatus
          created_at?: string
        }
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          type: NotificationType
          title: string
          message: string
          book_id: string | null
          read: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          type: NotificationType
          title: string
          message: string
          book_id?: string | null
          read?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          type?: NotificationType
          title?: string
          message?: string
          book_id?: string | null
          read?: boolean
          created_at?: string
        }
      }
      user_books: {
        Row: {
          id: string
          user_id: string
          book_id: string
          status: UserBookStatus
          rating: number | null
          review: string | null
          date_started: string | null
          date_finished: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          book_id: string
          status?: UserBookStatus
          rating?: number | null
          review?: string | null
          date_started?: string | null
          date_finished?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          book_id?: string
          status?: UserBookStatus
          rating?: number | null
          review?: string | null
          date_started?: string | null
          date_finished?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      user_preferences: {
        Row: {
          id: string
          user_id: string
          favorite_genres: string[]
          disliked_genres: string[]
          preferred_length: PreferredLength
          reading_moods: string[]
          onboarding_completed: boolean
          taste_embedding: number[] | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          favorite_genres?: string[]
          disliked_genres?: string[]
          preferred_length?: PreferredLength
          reading_moods?: string[]
          onboarding_completed?: boolean
          taste_embedding?: number[] | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          favorite_genres?: string[]
          disliked_genres?: string[]
          preferred_length?: PreferredLength
          reading_moods?: string[]
          onboarding_completed?: boolean
          taste_embedding?: number[] | null
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}

// Convenience types
export type Profile = Database['public']['Tables']['profiles']['Row']
export type Book = Database['public']['Tables']['books']['Row']
export type Checkout = Database['public']['Tables']['checkouts']['Row']
export type Waitlist = Database['public']['Tables']['waitlist']['Row']
export type Notification = Database['public']['Tables']['notifications']['Row']
export type UserBook = Database['public']['Tables']['user_books']['Row']
export type UserPreferences = Database['public']['Tables']['user_preferences']['Row']

// Extended types with relations
export type BookWithCheckout = Book & {
  current_checkout?: Checkout & { user: Profile }
  waitlist_count?: number
}

export type CheckoutWithBook = Checkout & {
  book: Book
}

export type CheckoutWithBookAndUser = Checkout & {
  book: Book
  user: Profile
}

export type UserBookWithBook = UserBook & {
  book: Book
}

export type WaitlistWithBook = Waitlist & {
  book: Book
}

export type WaitlistWithBookAndEstimate = WaitlistWithBook & {
  estimated_days: number | null
}
