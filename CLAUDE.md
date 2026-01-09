# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Current Todo List

This section tracks active development tasks. Update as tasks are completed and new ones are added.

| Status | Task |
|--------|------|
| Pending | Enable leaked password protection in Supabase Dashboard (manual) |

**Recently Completed:**
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
- `/admin` - Admin panel (protected, requires librarian or admin role)

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
- `books/` - CRUD, search, ISBN lookup, AI enrichment, similar books
- `books/[id]/enrich` - Generate AI summary and embeddings for a book
- `books/[id]/similar` - Find semantically similar books
- `search/semantic` - AI-powered semantic search (POST with query)
- `checkouts/` - Create checkouts
- `checkouts/[id]/return` - Return book (handles waitlist notifications)
- `waitlist/` - Join/leave waitlist
- `notifications/` - Get user notifications
- `notifications/[id]/read` - Mark notification as read
- `notifications/read-all` - Mark all notifications as read
- `admin/stats` - Dashboard statistics (librarian/admin only)

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
