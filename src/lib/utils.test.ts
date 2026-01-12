import {
  cn,
  estimateReadingTime,
  formatCount,
  stripHtml,
  truncateText,
  formatRelativeTime,
  getInitials,
  isConversationalQuery,
} from './utils'

describe('cn utility', () => {
  it('should merge class names', () => {
    expect(cn('foo', 'bar')).toBe('foo bar')
  })

  it('should handle conditional classes', () => {
    expect(cn('foo', false && 'bar', 'baz')).toBe('foo baz')
  })

  it('should handle undefined and null', () => {
    expect(cn('foo', undefined, null, 'bar')).toBe('foo bar')
  })

  it('should merge tailwind classes correctly', () => {
    expect(cn('px-2 py-1', 'px-4')).toBe('py-1 px-4')
  })

  it('should handle empty input', () => {
    expect(cn()).toBe('')
  })
})

describe('estimateReadingTime', () => {
  it('should return null for null or zero page count', () => {
    expect(estimateReadingTime(null)).toBeNull()
    expect(estimateReadingTime(0)).toBeNull()
  })

  it('should return "< 1 hr" for short books', () => {
    expect(estimateReadingTime(30)).toBe('< 1 hr')
  })

  it('should return "~1 hr" for books around 45-89 pages', () => {
    expect(estimateReadingTime(60)).toBe('~1 hr')
  })

  it('should return rounded hours for longer books', () => {
    expect(estimateReadingTime(180)).toBe('~4 hrs')
  })
})

describe('formatCount', () => {
  it('should return "0" for null', () => {
    expect(formatCount(null)).toBe('0')
  })

  it('should return the number as-is for small numbers', () => {
    expect(formatCount(500)).toBe('500')
  })

  it('should format thousands with K suffix', () => {
    expect(formatCount(1500)).toBe('1.5K')
  })

  it('should format millions with M suffix', () => {
    expect(formatCount(2500000)).toBe('2.5M')
  })
})

describe('stripHtml', () => {
  it('should remove HTML tags', () => {
    expect(stripHtml('<p>Hello <strong>world</strong></p>')).toBe('Hello world')
  })

  it('should convert line breaks to spaces', () => {
    expect(stripHtml('Hello<br>world<br/>there')).toBe('Hello world there')
  })

  it('should handle paragraph breaks', () => {
    expect(stripHtml('<p>First</p><p>Second</p>')).toBe('First Second')
  })

  it('should collapse multiple spaces', () => {
    expect(stripHtml('Hello   world')).toBe('Hello world')
  })
})

describe('truncateText', () => {
  it('should return original text if shorter than max length', () => {
    expect(truncateText('Hello', 10)).toBe('Hello')
  })

  it('should truncate at word boundary', () => {
    expect(truncateText('Hello world there', 12)).toBe('Hello world…')
  })

  it('should handle text with no spaces', () => {
    expect(truncateText('Superlongword', 5)).toBe('Super…')
  })
})

describe('formatRelativeTime', () => {
  it('should return "today" for same day', () => {
    const now = new Date().toISOString()
    expect(formatRelativeTime(now)).toBe('today')
  })

  it('should return "yesterday" for one day ago', () => {
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    expect(formatRelativeTime(yesterday.toISOString())).toBe('yesterday')
  })

  it('should return days ago for less than a week', () => {
    const fiveDaysAgo = new Date()
    fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5)
    expect(formatRelativeTime(fiveDaysAgo.toISOString())).toBe('5d ago')
  })

  it('should return weeks ago for less than a month', () => {
    const twoWeeksAgo = new Date()
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14)
    expect(formatRelativeTime(twoWeeksAgo.toISOString())).toBe('2w ago')
  })

  it('should return months ago for less than a year', () => {
    const threeMonthsAgo = new Date()
    threeMonthsAgo.setDate(threeMonthsAgo.getDate() - 90)
    expect(formatRelativeTime(threeMonthsAgo.toISOString())).toBe('3mo ago')
  })

  it('should return years ago for more than a year', () => {
    const twoYearsAgo = new Date()
    twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2)
    expect(formatRelativeTime(twoYearsAgo.toISOString())).toBe('2y ago')
  })
})

describe('getInitials', () => {
  it('should return initials from first and last name', () => {
    expect(getInitials('John Doe')).toBe('JD')
  })

  it('should handle single name', () => {
    expect(getInitials('John')).toBe('JO')
  })

  it('should handle multiple names', () => {
    expect(getInitials('John Michael Doe')).toBe('JD')
  })

  it('should use fallback when name is null', () => {
    expect(getInitials(null, 'username')).toBe('US')
  })

  it('should return "A" prefix when both are null', () => {
    expect(getInitials(null, null)).toBe('A')
  })
})

describe('isConversationalQuery', () => {
  it('should return false for short queries', () => {
    expect(isConversationalQuery('Harry Potter')).toBe(false)
    expect(isConversationalQuery('Stephen King')).toBe(false)
    expect(isConversationalQuery('Fiction')).toBe(false)
  })

  it('should return true for queries with question words', () => {
    expect(isConversationalQuery('what are some good mystery books')).toBe(true)
    expect(isConversationalQuery('which books do you recommend')).toBe(true)
    expect(isConversationalQuery('how can I find science fiction')).toBe(true)
  })

  it('should return true for recommendation phrases', () => {
    expect(isConversationalQuery('recommend books for wealth building')).toBe(true)
    expect(isConversationalQuery('suggest something similar to Harry Potter')).toBe(true)
    expect(isConversationalQuery('books about money and finance')).toBe(true)
    expect(isConversationalQuery('looking for a good mystery novel')).toBe(true)
  })

  it('should return true for queries with first/second person pronouns', () => {
    expect(isConversationalQuery('books you would recommend for me')).toBe(true)
    expect(isConversationalQuery('I want to read something inspiring')).toBe(true)
    expect(isConversationalQuery('help me find a good book')).toBe(true)
  })

  it('should return true for questions ending with ?', () => {
    expect(isConversationalQuery('any good sci-fi books?')).toBe(true)
  })

  it('should return true for longer descriptive queries', () => {
    expect(isConversationalQuery('books about money and wealth building for beginners')).toBe(true)
  })

  it('should return false for simple genre or topic searches', () => {
    expect(isConversationalQuery('mystery novels')).toBe(false)
    expect(isConversationalQuery('science fiction')).toBe(false)
  })

  it('should return true for "[genre] books" patterns', () => {
    expect(isConversationalQuery('business books')).toBe(true)
    expect(isConversationalQuery('mystery books')).toBe(true)
    expect(isConversationalQuery('fiction book')).toBe(true)
    expect(isConversationalQuery('self-help books')).toBe(true)
  })

  it('should return false for non-genre words followed by books', () => {
    expect(isConversationalQuery('good books')).toBe(false) // "good" is not a genre
    expect(isConversationalQuery('new books')).toBe(false)  // "new" is not a genre
  })
})
