import { getSystemPrompt } from './system-prompt'

describe('getSystemPrompt', () => {
  it('returns system prompt for unauthenticated user', () => {
    const prompt = getSystemPrompt({ isAuthenticated: false })

    expect(prompt).toContain('library assistant')
    expect(prompt).toContain('not logged in')
    expect(prompt).not.toContain('User Preferences')
    expect(prompt).not.toContain('Recently read')
  })

  it('returns system prompt for authenticated user', () => {
    const prompt = getSystemPrompt({
      isAuthenticated: true,
      userName: 'John Doe',
    })

    expect(prompt).toContain('logged in')
    expect(prompt).toContain('John Doe')
    expect(prompt).toContain('personalized recommendations')
  })

  it('includes favorite genres when provided', () => {
    const prompt = getSystemPrompt({
      isAuthenticated: true,
      favoriteGenres: ['Science Fiction', 'Mystery'],
    })

    expect(prompt).toContain('User Preferences')
    expect(prompt).toContain('Science Fiction')
    expect(prompt).toContain('Mystery')
  })

  it('includes recent books when provided', () => {
    const prompt = getSystemPrompt({
      isAuthenticated: true,
      recentBooks: ['The Great Gatsby', '1984'],
    })

    expect(prompt).toContain('Recently read')
    expect(prompt).toContain('The Great Gatsby')
    expect(prompt).toContain('1984')
  })

  it('includes critical guidelines about not hallucinating', () => {
    const prompt = getSystemPrompt({ isAuthenticated: false })

    expect(prompt).toContain('Never Hallucinate Books')
    expect(prompt).toContain('MUST use search_books tool')
    expect(prompt).toContain('search again with different')
  })

  it('includes response format guidelines', () => {
    const prompt = getSystemPrompt({ isAuthenticated: false })

    expect(prompt).toContain('clickable book cards')
    expect(prompt).toContain('Keep responses SHORT')
  })
})
