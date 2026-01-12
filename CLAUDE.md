# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Current Todo List

This section tracks active development tasks. Update as tasks are completed and new ones are added.

| Status | Task |
|--------|------|
| Pending | Enable leaked password protection in Supabase Dashboard (manual) |
| Pending | Improve test coverage (target 80%) |
| Pending | Add E2E tests with Playwright |

**Recently Completed:**
- Add checkout management to admin panel (/admin/checkouts)
- Add AI chat widget with OpenAI function calling (floating chatbot for book discovery)
- Add Jest tests for chat functionality (24 tests)
- Redesign Library page with category carousels (Trending, Top Rated, AI Picks)
- Add genre badges to book carousel cards
- Simplify header navigation (Library, Search, Admin)
- Update home button to go to Dashboard when logged in
- Add admin panel with book management (/admin/books)
- Add user management to admin panel (/admin/users)
- Add tests for utils, constants, and BookCard component (35 tests)
- Fix light mode hover effects (header + white buttons) to navy blue
- Fix database security warnings (search_path, RLS policies)
- Add user books, recommendations, reviews, and dashboard features
- Remove duplicate books and fix missing cover images

## Commands

```bash
npm run dev           # Start development server (http://localhost:3000)
npm run build         # Production build
npm run lint          # Run ESLint
npm test              # Run all tests
npm run test:watch    # Run tests in watch mode
npm run test:coverage # Run tests with coverage report
```

Run a single test file:
```bash
npm test -- path/to/file.test.ts
```

## Testing Guidelines

### When to Write Tests
- **Always** for new utility functions, constants, and type definitions
- **Always** for AI/chat features to prevent hallucinations and verify tool behavior
- **Recommended** for React components with complex logic
- **Required** before merging PRs

### Test Patterns

**Unit Tests** (for utilities and pure functions):
```typescript
// src/lib/chat/system-prompt.test.ts
describe('getSystemPrompt', () => {
  it('includes critical guidelines about not hallucinating', () => {
    const prompt = getSystemPrompt({ isAuthenticated: false })
    expect(prompt).toContain('Never Hallucinate Books')
  })
})
```

**API Testing with curl** (for streaming/AI endpoints):
```bash
# Test chat API - verify tool calls and responses
curl -s -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"messages": [{"role": "user", "content": "books similar to tim ferris"}]}'

# Check for:
# 1. Tool calls being made (search_books, etc.)
# 2. Multiple search attempts if first fails
# 3. Only books from actual results mentioned (no hallucinations)
# 4. Proper streaming format (JSON lines)
```

### Testing Checklist for AI Features
1. **Tool Execution**: Verify tools are called with correct parameters
2. **Multi-round Tools**: Test that follow-up searches happen when needed
3. **Hallucination Prevention**: Ensure only database results are mentioned
4. **Error Handling**: Test graceful failures (API down, empty results)
5. **Streaming**: Verify proper chunk format and completion

### Current Test Coverage
- `src/lib/utils.test.ts` - Utility functions
- `src/lib/constants.test.ts` - Constants and role checks
- `src/components/book-card.test.tsx` - BookCard component
- `src/lib/chat/*.test.ts` - Chat system prompt, tools, and types

## Architecture

This is a **Library Management System** built with Next.js 16 (App Router) and Supabase.

### Tech Stack
- **Framework**: Next.js 16 with React 19, TypeScript
- **Database**: Supabase (PostgreSQL with pgvector for semantic search)
- **Auth**: Supabase Auth with SSR support
- **UI**: shadcn/ui (new-york style) + Tailwind CSS v4 + Lucide icons
- **Forms**: react-hook-form + zod validation
- **AI**: OpenAI for book summaries and embeddings
- **Testing**: Jest + React Testing Library

### Brand Colors (Anju Software)

Three core brand colors from [anjusoftware.com](https://www.anjusoftware.com/):

| Color | Hex | Usage |
|-------|-----|-------|
| **Cyan** | `#00b4d8` | Primary buttons, links, focus rings |
| **Magenta** | `#e91e8c` | Accent elements, destructive/warning actions |
| **Navy** | `#0a2540` | Dark mode background, light mode headlines |

Neutral colors:
- **White**: `#ffffff` - Light mode background
- **Light Gray**: `#f5f7f8` - Secondary/muted backgrounds
- **Dark Gray**: `#313131` - Light mode text
- **Medium Gray**: `#444444` - Muted text

CSS variables are defined in `src/app/globals.css`. Theme toggle is light/dark only (no system preference).

### Core Data Model

Five tables with Row Level Security (RLS):
- `profiles` - Users with roles: guest, member, premium, librarian, admin
- `books` - Catalog with AI summaries and 1536-dim embeddings for semantic search
- `checkouts` - Borrowing records with due dates
- `waitlist` - Queue for unavailable books (priority for premium/librarian/admin)
- `notifications` - User alerts (due soon, overdue, waitlist available)

### Route Structure

- `/` - Public landing page
- `/books`, `/search` - Public book browsing
- `/login`, `/register` - Auth (redirects authenticated users to dashboard)
- `/dashboard` - User dashboard (protected, requires auth)
- `/dashboard/my-books` - User's book collection and reading status
- `/dashboard/notifications` - User notifications
- `/onboarding` - New user onboarding wizard
- `/admin` - Admin dashboard (protected, requires librarian or admin role)
- `/admin/books` - Book catalog management
- `/admin/users` - User directory and role management

### Auth & Middleware

The middleware (`src/middleware.ts` → `src/lib/supabase/middleware.ts`) handles:
1. Session refresh on every request
2. Redirect unauthenticated users from `/dashboard`, `/admin` to `/login`
3. Redirect authenticated users from `/login`, `/register` to `/dashboard`
4. Role check for `/admin` routes (librarian or admin only)

### Supabase Clients

Three client patterns in `src/lib/supabase/`:
- `client.ts` - Browser client (use in Client Components)
- `server.ts` - Server client (use in Server Components and API routes)
- `middleware.ts` - Middleware client (session management)

### API Routes

All in `src/app/api/`:

**Books:**
- `books/` - CRUD, search, ISBN lookup, AI enrichment
- `books/[id]/enrich` - Generate AI summary and embeddings
- `books/[id]/similar` - Find semantically similar books
- `books/[id]/reviews` - Book reviews CRUD
- `search/semantic` - AI-powered semantic search (POST)

**User:**
- `user/books` - User's book collection (want to read, reading, read)
- `user/preferences` - User reading preferences
- `user/taste-profile` - AI taste profile for recommendations
- `checkouts/` - Create checkouts
- `checkouts/[id]/return` - Return book (handles waitlist)
- `waitlist/` - Join/leave waitlist
- `notifications/` - Get user notifications
- `notifications/[id]/read` - Mark notification as read
- `notifications/read-all` - Mark all as read

**Recommendations:**
- `recommendations/` - Personalized book recommendations
- `recommendations/because-you-read` - "Because you read X" suggestions

### Recommendation System (Demo Talking Points)

The recommendation engine uses a **three-tier fallback system** to ensure users always get relevant suggestions:

**Tier 1: AI-Powered Personalization (Best)**
- Uses 1536-dimensional embeddings from OpenAI's `text-embedding-3-small` model
- Each user builds a "taste profile" based on books they rate highly
- Cosine similarity (via pgvector) finds books semantically similar to their taste
- Threshold: 0.3 similarity score (higher = more relevant)
- **Demo highlight**: "Our AI understands what you like, not just genres but themes and writing style"

**Tier 2: Genre-Based Matching (Good)**
- Falls back to user's explicitly selected favorite genres
- Uses PostgreSQL array overlap to find matching books
- **Demo highlight**: "Even without AI taste data, we match your genre preferences"

**Tier 3: Popular/New Books (Fallback)**
- Shows recently added books when no personalized data available
- Ensures new users still see compelling content
- **Demo highlight**: "New users see trending titles while we learn their preferences"

**"Because You Read" Feature**
- Takes user's 4+ star rated books
- For each, finds similar books using embedding similarity
- Groups recommendations by source book (e.g., "Because you loved Atomic Habits...")
- Falls back to genre overlap if embedding search fails

**Key Technical Points:**
- `match_books()` - Semantic search across all books
- `find_similar_books()` - Find books similar to a specific book
- Both use pgvector's `<=>` operator for cosine distance
- Embeddings stored in `books.embedding` column (1536-dim vector)
- User taste in `user_preferences.taste_embedding`

**Admin (librarian/admin only):**
- `admin/stats` - Dashboard statistics
- `admin/users` - User directory and role management

**Chat:**
- `chat/` - Streaming chat API with OpenAI function calling (POST)

### AI Chat Widget

A floating chatbot for conversational book discovery. Located in `src/components/chat/`.

**Features:**
- Streaming responses with markdown rendering
- OpenAI function calling (6 tools: search, recommendations, availability, etc.)
- Multi-round tool execution (searches multiple times if needed)
- Clickable book cards in responses
- Personalization for logged-in users

**Key Files:**
- `src/lib/chat/tools.ts` - Tool definitions for function calling
- `src/lib/chat/system-prompt.ts` - Library assistant persona
- `src/lib/chat/execute-tool.ts` - Tool execution logic
- `src/app/api/chat/route.ts` - Streaming API endpoint
- `src/hooks/use-chat.ts` - React state management
- `src/components/chat/chat-widget.tsx` - Root UI component

**Testing the Chat:**
```bash
# Test with curl
curl -s -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"messages": [{"role": "user", "content": "show me mystery books"}]}'
```

### AI Features

Located in `src/lib/openai.ts`:
- `generateEmbedding()` - Create 1536-dim embeddings (text-embedding-3-small)
- `generateBookSummary()` - Generate 2-3 sentence book summary (gpt-4o-mini)
- `generateGenres()` - Auto-suggest genres from title/description

Database functions in `supabase/schema.sql`:
- `match_books()` - Semantic search using pgvector cosine similarity
- `find_similar_books()` - Find books similar to a given book

### Type Safety

`src/types/database.ts` contains full Supabase schema types. Use the convenience types:
```typescript
import { Book, Profile, Checkout, Waitlist, Notification } from '@/types/database'
```

### Adding UI Components

```bash
npx shadcn@latest add <component-name>
```
Components go to `src/components/ui/`. Use the `@/` path alias.

### Database Setup

Schema and seed data are in `supabase/`:
- `schema.sql` - Full schema with RLS policies and pgvector functions
- `seed.sql` - Sample books (20 books across genres)

Run schema first, then seed data in Supabase SQL Editor.
