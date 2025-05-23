import { renderHook, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useLetters } from '../../hooks/useLetters'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'

vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        order: vi.fn(() => ({
          data: [
            {
              id: '1',
              number: 1,
              content: { subject: 'Test Letter' },
              created_at: new Date().toISOString()
            }
          ],
          error: null
        }))
      }))
    }))
  }
}))

describe('useLetters', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false
        }
      }
    })
  })

  it('fetches letters successfully', async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    )

    const { result } = renderHook(() => useLetters(), { wrapper })

    await waitFor(() => {
      expect(result.current.letters).toHaveLength(1)
      expect(result.current.letters[0].number).toBe(1)
    })
  })

  it('handles loading state correctly', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    )

    const { result } = renderHook(() => useLetters(), { wrapper })
    expect(result.current.isLoading).toBe(true)
  })
})