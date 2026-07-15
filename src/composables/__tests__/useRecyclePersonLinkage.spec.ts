import { describe, it, expect, vi, beforeEach } from 'vitest'
import { nextTick } from 'vue'

vi.mock('@/composables/useSuggestionFetcher', () => ({
  createSuggestionFetcher: vi.fn((options: Record<string, unknown>) => {
    return vi.fn(async (queryString: string, cb: (results: unknown[]) => void) => {
      if (!queryString || queryString.trim() === '') {
        cb([])
        return
      }
      try {
        let items = await (options.fetchData as (q: string) => Promise<unknown[]>)(queryString.trim())
        if (options.filter) {
          items = items.filter(options.filter as (item: unknown) => boolean)
        }
        let suggestions = items.map(options.transform as (item: unknown) => unknown)
        if (options.keywordMatch) {
          suggestions = suggestions.filter((item: unknown) =>
            (options.keywordMatch as (item: unknown, kw: string) => boolean)(item, queryString),
          )
        }
        if (options.sort) {
          suggestions.sort(options.sort as (a: unknown, b: unknown) => number)
        }
        cb(suggestions)
      } catch {
        cb([])
      }
    })
  }),
}))

import { useRecyclePersonLinkage } from '../useRecyclePersonLinkage'

describe('useRecyclePersonLinkage', () => {
  let mockGetByName: ReturnType<typeof vi.fn>
  let mockGetById: ReturnType<typeof vi.fn>
  let mockOnJobcodeChange: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.clearAllMocks()
    mockGetByName = vi.fn().mockResolvedValue([])
    mockGetById = vi.fn().mockResolvedValue(null)
    mockOnJobcodeChange = vi.fn()
  })

  describe('initialization', () => {
    it('returns correct initial state', () => {
      const { name } = useRecyclePersonLinkage(mockGetByName, mockGetById, mockOnJobcodeChange)

      expect(name.value).toBe('')
    })
  })

  describe('setName', () => {
    it('sets the name value', () => {
      const { name, setName } = useRecyclePersonLinkage(
        mockGetByName, mockGetById, mockOnJobcodeChange,
      )

      setName('John')

      expect(name.value).toBe('John')
    })

    it('triggers watch to resolve jobcode', async () => {
      mockGetByName.mockResolvedValue([{ employee_jobcode: 'EMP-001' }])

      const { setName } = useRecyclePersonLinkage(
        mockGetByName, mockGetById, mockOnJobcodeChange,
      )

      setName('John')
      await nextTick()
      await nextTick()

      expect(mockGetByName).toHaveBeenCalledWith('John')
      expect(mockOnJobcodeChange).toHaveBeenCalledWith('EMP-001')
    })
  })

  describe('handleSelect', () => {
    it('sets name and calls onJobcodeChange', () => {
      const { handleSelect, name } = useRecyclePersonLinkage(
        mockGetByName, mockGetById, mockOnJobcodeChange,
      )

      const suggestion = {
        employee_name: 'Alice',
        employee_jobcode: 'EMP-002',
      } as never

      handleSelect(suggestion)

      expect(name.value).toBe('Alice')
      expect(mockOnJobcodeChange).toHaveBeenCalledWith('EMP-002')
    })
  })

  describe('getNameByCode', () => {
    it('returns name when employee found', async () => {
      mockGetById.mockResolvedValue({ employee_name: 'Bob' })

      const { getNameByCode } = useRecyclePersonLinkage(
        mockGetByName, mockGetById, mockOnJobcodeChange,
      )

      const result = await getNameByCode('EMP-003')

      expect(result).toBe('Bob')
      expect(mockGetById).toHaveBeenCalledWith('EMP-003')
    })

    it('returns null when employee not found', async () => {
      mockGetById.mockResolvedValue(null)

      const { getNameByCode } = useRecyclePersonLinkage(
        mockGetByName, mockGetById, mockOnJobcodeChange,
      )

      const result = await getNameByCode('EMP-999')

      expect(result).toBeNull()
    })
  })

  describe('watch behavior', () => {
    it('clears jobcode when name becomes empty', async () => {
      const { name } = useRecyclePersonLinkage(
        mockGetByName, mockGetById, mockOnJobcodeChange,
      )

      name.value = 'John'
      await nextTick()

      name.value = ''
      await nextTick()

      expect(mockOnJobcodeChange).toHaveBeenCalledWith('')
    })

    it('does not call onJobcodeChange if no employees found', async () => {
      mockGetByName.mockResolvedValue([])

      const { setName } = useRecyclePersonLinkage(
        mockGetByName, mockGetById, mockOnJobcodeChange,
      )

      setName('Unknown')
      await nextTick()
      await nextTick()

      expect(mockGetByName).toHaveBeenCalledWith('Unknown')
      expect(mockOnJobcodeChange).not.toHaveBeenCalledWith(expect.anything())
    })
  })
})
